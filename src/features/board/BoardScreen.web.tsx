import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fitSize, toWorld, zoomAt, type View as Cam } from '@/core/board/view';
import { usePalette, type IconName } from '@/ui/theme';
import { F } from '@/ui/type';

import { addBoardItem, removeBoardItem, updateBoardItem, useBoardItems, type BoardItem, type BoardKind } from './data';

type Tool = 'select' | 'hand' | 'note' | 'text' | 'rect' | 'ellipse' | 'arrow' | 'line' | 'pen' | 'eraser';
const TOOLS: [Tool, IconName, string][] = [
  ['select', 'navigate-outline', 'Select and move'],
  ['hand', 'hand-left-outline', 'Pan'],
  ['note', 'document-text-outline', 'Sticky note'],
  ['text', 'text-outline', 'Text'],
  ['rect', 'square-outline', 'Rectangle'],
  ['ellipse', 'ellipse-outline', 'Circle'],
  ['arrow', 'arrow-forward-outline', 'Arrow'],
  ['line', 'remove-outline', 'Line'],
  ['pen', 'brush-outline', 'Pen'],
  ['eraser', 'close-circle-outline', 'Eraser'],
];
const COLORS = ['#FFD15C', '#C8F25A', '#5EE6C8', '#5AA9FF', '#FF7AB6', '#8B5CF6', '#FF8A4C', '#F4F1FF', '#1A1A2E'];
const MAX_IMAGE = 1600; // px on the longer side; pictures are stored in the local database

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; cam: Cam }
  | { kind: 'move'; id: string; wx: number; wy: number; x: number; y: number }
  | { kind: 'resize'; id: string; wx: number; wy: number; w: number; h: number }
  | { kind: 'draw'; item: Draft; pts: number[] }
  | null;
type Draft = Omit<BoardItem, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id: string };

/** The Board: a free canvas for notes, text, shapes, arrows, drawings and pictures, saved locally. */
export function BoardScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const items = useBoardItems();
  const [cam, setCam] = useState<Cam>({ x: -80, y: -60, zoom: 1 });
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(COLORS[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Partial<BoardItem>>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  // A new note or text box shows (with the cursor in it) before its save lands, so no keystroke is lost.
  const [pending, setPending] = useState<BoardItem | null>(null);
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const [notice, setNotice] = useState<string | null>(null);
  const gesture = useRef<Gesture>(null);
  const area = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const space = useRef(false);

  const topZ = () => items.reduce((m, i) => Math.max(m, i.z), 0) + 1;
  const local = (e: { clientX: number; clientY: number }) => {
    const r = area.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };
  const world = (e: { clientX: number; clientY: number }) => {
    const { sx, sy } = local(e);
    return toWorld(sx, sy, cam);
  };
  const center = () => {
    const r = area.current!.getBoundingClientRect();
    return toWorld(r.width / 2, r.height / 2, cam);
  };
  const say = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 4000);
  };

  // Pictures: from files, the clipboard or a web page (downloaded, so they stay when offline).
  const addImage = async (src: string, at: { x: number; y: number }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight, MAX_IMAGE);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const shown = fitSize(w, h, 480);
    await addBoardItem({ kind: 'image', x: Math.round(at.x - shown.w / 2), y: Math.round(at.y - shown.h / 2), w: shown.w, h: shown.h, color: '#000000', text: null, points: null, image: canvas.toDataURL('image/webp', 0.85), z: topZ() });
  };
  const fileToImage = (file: File, at: { x: number; y: number }) =>
    new Promise<void>((done) => {
      const reader = new FileReader();
      reader.onload = () => addImage(String(reader.result), at).then(done, () => (say('That file is not a picture we can read.'), done()));
      reader.readAsDataURL(file);
    });
  const urlToImage = async (url: string, at: { x: number; y: number }) => {
    try {
      // The desktop app downloads through Windows directly; a browser can only fetch sites that allow it.
      const tauri = (window as unknown as { __TAURI__?: { core: { invoke: (cmd: string, args: object) => Promise<string> } } }).__TAURI__;
      const dataUrl = tauri
        ? await tauri.core.invoke('fetch_image', { url })
        : await fetch(url).then(async (r) => {
            const blob = await r.blob();
            return await new Promise<string>((ok) => {
              const fr = new FileReader();
              fr.onload = () => ok(String(fr.result));
              fr.readAsDataURL(blob);
            });
          });
      await addImage(dataUrl, at);
    } catch {
      say("Couldn't download that picture. Save it to your computer, then drop the file here.");
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editing) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) return files.forEach((f) => fileToImage(f, center()));
      const text = e.clipboardData?.getData('text/plain')?.trim() ?? '';
      if (/^https?:\/\/\S+$/i.test(text)) return void urlToImage(text, center());
      if (text) addBoardItem({ kind: 'note', ...center(), x: Math.round(center().x - 100), y: Math.round(center().y - 100), w: 200, h: 200, color, text, points: null, image: null, z: topZ() });
    };
    const onKey = (e: KeyboardEvent) => {
      if (editing || (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ') space.current = e.type === 'keydown';
      if (e.type !== 'keydown') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        removeBoardItem(selected);
        setSelected(null);
      }
      if (e.key === 'Escape') setSelected(null);
      // Enter on a selected note or text starts typing in it.
      const sel = items.find((i) => i.id === selected);
      if (e.key === 'Enter' && sel && (sel.kind === 'note' || sel.kind === 'text')) {
        e.preventDefault();
        setEditing(sel.id);
      }
    };
    document.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  });

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) setCam((v) => zoomAt(v, Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top));
      else setCam((v) => ({ ...v, x: v.x + e.deltaX / v.zoom, y: v.y + e.deltaY / v.zoom }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (editing) return;
    // The board handles the press itself: no browser focus change (it would close a note just opened) or text selection.
    e.preventDefault();
    area.current!.setPointerCapture(e.pointerId);
    const p = world(e);
    const target = (e.target as HTMLElement).closest('[data-id]') as HTMLElement | null;
    const id = target?.dataset.id ?? null;
    const item = items.find((i) => i.id === id);
    if (tool === 'hand' || e.button === 1 || space.current || (tool === 'select' && !item)) {
      setSelected(null);
      const { sx, sy } = local(e);
      gesture.current = { kind: 'pan', sx, sy, cam };
      return;
    }
    if (tool === 'eraser') {
      if (item) removeBoardItem(item.id);
      return;
    }
    if (tool === 'select' && item) {
      setSelected(item.id);
      gesture.current = (e.target as HTMLElement).dataset.handle
        ? { kind: 'resize', id: item.id, wx: p.x, wy: p.y, w: item.w, h: item.h }
        : { kind: 'move', id: item.id, wx: p.x, wy: p.y, x: item.x, y: item.y };
      return;
    }
    const base = { id: 'draft', x: Math.round(p.x), y: Math.round(p.y), color, text: null, points: null, image: null, z: topZ() };
    if (tool === 'note' || tool === 'text') {
      const now = Date.now();
      const box = tool === 'note' ? { x: base.x - 100, y: base.y - 100, w: 200, h: 200 } : { x: base.x, y: base.y - 20, w: 260, h: 48 };
      const item: BoardItem = { ...base, ...box, kind: tool, text: '', id: crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null };
      setPending(item);
      setTool('select');
      setSelected(item.id);
      setEditing(item.id);
      saving.current = addBoardItem(item);
      return;
    }
    const kind = tool as BoardKind; // select, hand and eraser returned above
    const d: Draft = { ...base, kind, w: 0, h: 0, points: tool === 'pen' || tool === 'arrow' || tool === 'line' ? '[0,0]' : null };
    gesture.current = { kind: 'draw', item: d, pts: [0, 0] };
    setDraft(d);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const p = world(e);
    if (g.kind === 'pan') {
      const { sx, sy } = local(e);
      setCam({ ...g.cam, x: g.cam.x - (sx - g.sx) / g.cam.zoom, y: g.cam.y - (sy - g.sy) / g.cam.zoom });
    } else if (g.kind === 'move') {
      setOverrides((o) => ({ ...o, [g.id]: { x: Math.round(g.x + p.x - g.wx), y: Math.round(g.y + p.y - g.wy) } }));
    } else if (g.kind === 'resize') {
      setOverrides((o) => ({ ...o, [g.id]: { w: Math.max(24, Math.round(g.w + p.x - g.wx)), h: Math.max(24, Math.round(g.h + p.y - g.wy)) } }));
    } else {
      const d = g.item;
      const dx = Math.round(p.x - d.x);
      const dy = Math.round(p.y - d.y);
      if (d.kind === 'pen') {
        // Every sample the pointer reported since the last frame, so fast strokes stay smooth.
        const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
        for (const s of samples.length ? samples : [e.nativeEvent]) {
          const q = world(s);
          g.pts.push(Math.round(q.x - d.x), Math.round(q.y - d.y));
        }
        d.points = JSON.stringify(g.pts);
      } else if (d.kind === 'arrow' || d.kind === 'line') d.points = JSON.stringify([0, 0, dx, dy]);
      d.w = dx;
      d.h = dy;
      setDraft({ ...d });
    }
  };

  const up = async () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.kind === 'pan') return;
    if (g.kind === 'move' || g.kind === 'resize') {
      // The override is kept (same values as the saved copy), so the item never jumps back while saving.
      const patch = overrides[g.id];
      if (patch) await updateBoardItem(g.id, patch);
      return;
    }
    const d = g.item;
    let id: string | null = null;
    if (d.kind === 'rect' || d.kind === 'ellipse') {
      // A click without dragging makes a medium shape; a drag in any direction is normalised.
      const tiny = Math.abs(d.w) < 8 && Math.abs(d.h) < 8;
      const [w, h] = tiny ? [180, 120] : [Math.abs(d.w), Math.abs(d.h)];
      const x = tiny ? d.x - 90 : Math.min(d.x, d.x + d.w);
      const y = tiny ? d.y - 60 : Math.min(d.y, d.y + d.h);
      id = await addBoardItem({ ...d, x, y, w, h });
    } else if (Math.abs(d.w) > 3 || Math.abs(d.h) > 3) {
      id = await addBoardItem({ ...d, w: Math.abs(d.w), h: Math.abs(d.h) });
    }
    setDraft(null); // after the save, so the new shape doesn't blink
    // Shapes, arrows and lines go back to Select with the new one picked; the pen keeps drawing.
    if (id && d.kind !== 'pen') {
      setTool('select');
      setSelected(id);
    }
  };

  const drop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const at = world(e);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (files.length) return files.forEach((f, i) => fileToImage(f, { x: at.x + i * 24, y: at.y + i * 24 }));
    // From a web page: the picture's address, either as a link or inside the dragged HTML.
    const html = e.dataTransfer.getData('text/html');
    const src = /<img[^>]+src="([^"]+)"/i.exec(html)?.[1] ?? e.dataTransfer.getData('text/uri-list').split('\n')[0]?.trim();
    if (src) await urlToImage(src.replace(/&amp;/g, '&'), at);
  };

  const shown = [...items.map((i) => ({ ...i, ...overrides[i.id] })), ...(pending && !items.some((i) => i.id === pending.id) ? [pending] : []), ...(draft ? [draft as BoardItem] : [])];
  const layer: CSSProperties = { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)` };
  const cursor = tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : tool === 'eraser' ? 'not-allowed' : 'crosshair';

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top }]}>
      <div
        ref={area}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop}
        style={{ position: 'relative', flex: 1, overflow: 'hidden', cursor, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', backgroundImage: `radial-gradient(${c.dots} 1.5px, transparent 1.6px)`, backgroundSize: `${24 * cam.zoom}px ${24 * cam.zoom}px`, backgroundPosition: `${-cam.x * cam.zoom}px ${-cam.y * cam.zoom}px` }}
      >
        <div style={layer}>
          {shown.map((it) => (
            <Item key={it.id} it={it} selected={it.id === selected} editing={it.id === editing} ink={c.ink} accent={c.accentText} onEdit={() => setEditing(it.id)} onEditEnd={(text) => (saving.current.then(() => (it.kind === 'text' && !text.trim() ? removeBoardItem(it.id) : updateBoardItem(it.id, { text }))), setEditing(null), setPending(null))} />
          ))}
        </div>
        {!items.length && !draft && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: c.muted, fontFamily: F.semi, fontSize: 15, textAlign: 'center', padding: 24 }}>
            Your board is empty. Pick a tool on the left, or drop and paste pictures here.
          </div>
        )}
      </div>

      <View style={[styles.tools, { top: insets.top + 12, backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
        {TOOLS.map(([t, icon, label]) => (
          <Pressable key={t} accessibilityRole="button" accessibilityLabel={label} aria-pressed={tool === t} onPress={() => setTool(t)} style={[styles.tool, tool === t && { backgroundColor: c.accent }]}>
            <Ionicons name={icon} size={19} color={tool === t ? c.accentInk : c.ink} />
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Add a picture from a file" onPress={() => fileInput.current?.click()} style={styles.tool}>
          <Ionicons name="image-outline" size={19} color={c.ink} />
        </Pressable>
      </View>

      <View style={[styles.colors, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
        {COLORS.map((col) => (
          <Pressable
            key={col}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${col}`}
            aria-pressed={color === col}
            onPress={() => {
              setColor(col);
              if (selected) updateBoardItem(selected, { color: col });
            }}
            style={[styles.swatch, { backgroundColor: col, borderColor: color === col ? c.ink : 'transparent' }]}
          />
        ))}
      </View>

      <View style={[styles.zoom, { backgroundColor: c.panel, boxShadow: c.raisedSm }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => setCam((v) => zoomAt(v, 1 / 1.25, area.current!.clientWidth / 2, area.current!.clientHeight / 2))} style={styles.tool}>
          <Ionicons name="remove" size={18} color={c.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Reset zoom" onPress={() => setCam({ x: -80, y: -60, zoom: 1 })}>
          <Text style={[styles.zoomText, { color: c.ink }]}>{Math.round(cam.zoom * 100)}%</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => setCam((v) => zoomAt(v, 1.25, area.current!.clientWidth / 2, area.current!.clientHeight / 2))} style={styles.tool}>
          <Ionicons name="add" size={18} color={c.ink} />
        </Pressable>
      </View>

      {notice && (
        <View style={[styles.notice, { backgroundColor: c.ink }]}>
          <Text style={[styles.noticeText, { color: c.panel }]}>{notice}</Text>
        </View>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          [...(e.target.files ?? [])].forEach((f, i) => {
            const p = center();
            fileToImage(f, { x: p.x + i * 24, y: p.y + i * 24 });
          });
          e.target.value = '';
        }}
      />
    </View>
  );
}

type ItemProps = { it: BoardItem; selected: boolean; editing: boolean; ink: string; accent: string; onEdit: () => void; onEditEnd: (text: string) => void };

function Item({ it, selected, editing, ink, accent, onEdit, onEditEnd }: ItemProps) {
  const box: CSSProperties = { position: 'absolute', left: it.x, top: it.y, width: it.w, height: it.h, zIndex: it.z, outline: selected ? `2px dashed ${accent}` : 'none', outlineOffset: 4 };
  const handle = selected && it.kind !== 'pen' && it.kind !== 'arrow' && it.kind !== 'line' && <div data-id={it.id} data-handle="1" style={{ position: 'absolute', right: -10, bottom: -10, width: 14, height: 14, borderRadius: 4, background: accent, cursor: 'nwse-resize' }} />;

  if (it.kind === 'pen' || it.kind === 'arrow' || it.kind === 'line') {
    const pts: number[] = JSON.parse(it.points ?? '[]');
    const d = pts.reduce((s, v, i) => (i % 2 ? `${s},${v}` : `${s}${i ? ' L' : 'M'}${v}`), '');
    const [x2, y2] = [pts[pts.length - 2] ?? 0, pts[pts.length - 1] ?? 0];
    const a = Math.atan2(y2, x2);
    const head = `M${x2},${y2} L${x2 - 16 * Math.cos(a - 0.45)},${y2 - 16 * Math.sin(a - 0.45)} M${x2},${y2} L${x2 - 16 * Math.cos(a + 0.45)},${y2 - 16 * Math.sin(a + 0.45)}`;
    return (
      <svg data-id={it.id} style={{ position: 'absolute', left: it.x, top: it.y, overflow: 'visible', zIndex: it.z, width: 1, height: 1, pointerEvents: 'none' }}>
        <path d={d} stroke="transparent" strokeWidth={16} fill="none" style={{ pointerEvents: 'stroke' }} data-id={it.id} />
        <path d={it.kind === 'arrow' ? `${d} ${head}` : d} stroke={it.color} strokeWidth={selected ? 5 : 3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ pointerEvents: 'none' }} />
      </svg>
    );
  }
  if (it.kind === 'image') {
    return (
      <div data-id={it.id} style={box}>
        <img src={it.image ?? ''} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, pointerEvents: 'none' }} />
        {handle}
      </div>
    );
  }
  if (it.kind === 'rect' || it.kind === 'ellipse') {
    return (
      <div data-id={it.id} style={{ ...box, border: `3px solid ${it.color}`, background: `${it.color}33`, borderRadius: it.kind === 'ellipse' ? '50%' : 10, boxSizing: 'border-box' }}>
        {handle}
      </div>
    );
  }
  // Notes and text: double-click to type.
  const note = it.kind === 'note';
  const textStyle: CSSProperties = { width: '100%', height: note ? '100%' : 'auto', boxSizing: 'border-box', padding: note ? 14 : 4, fontFamily: F.semi, fontSize: note ? 16 : 22, lineHeight: 1.35, color: note ? '#1A1A2E' : it.color === '#1A1A2E' ? ink : it.color, whiteSpace: 'pre-wrap', overflow: 'hidden', wordBreak: 'break-word' };
  return (
    <div data-id={it.id} onDoubleClick={onEdit} style={{ ...box, ...(note ? {} : { height: 'auto', minHeight: it.h }), ...(note ? { background: it.color, border: '3px solid #07070F', borderRadius: 10, boxShadow: '0 4px 0 #07070F', boxSizing: 'border-box' } : {}) }}>
      {editing ? (
        <textarea
          autoFocus
          defaultValue={it.text ?? ''}
          onBlur={(e) => onEditEnd(e.target.value)}
          // Text boxes grow with what you type.
          onInput={note ? undefined : (e) => ((e.currentTarget.style.height = 'auto'), (e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`))}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ ...textStyle, border: 'none', outline: 'none', resize: 'none', background: 'transparent', userSelect: 'text', WebkitUserSelect: 'text' }}
        />
      ) : (
        <div style={textStyle}>{it.text || (note ? 'Double-click to write' : 'Double-click to type')}</div>
      )}
      {handle}
    </div>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tools: { position: 'absolute', left: 12, padding: 6, gap: 4, borderRadius: 16 },
  tool: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  colors: { position: 'absolute', left: '50%', transform: [{ translateX: '-50%' }], bottom: 12, flexDirection: 'row', gap: 8, padding: 8, borderRadius: 16 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 3 },
  zoom: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: 14 },
  zoomText: { fontSize: 13, fontFamily: F.bold, minWidth: 48, textAlign: 'center' },
  notice: { position: 'absolute', alignSelf: 'center', top: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, maxWidth: 420 },
  noticeText: { fontSize: 13.5, fontFamily: F.semi },
});
