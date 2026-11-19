// The Board's camera: world = what is stored, screen = pixels in the board area.
export type View = { x: number; y: number; zoom: number };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export const toWorld = (sx: number, sy: number, v: View) => ({ x: v.x + sx / v.zoom, y: v.y + sy / v.zoom });

/** Zoom by `factor` keeping the world point under the screen point (sx, sy) in place. */
export function zoomAt(v: View, factor: number, sx: number, sy: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
  const p = toWorld(sx, sy, v);
  return { zoom, x: p.x - sx / zoom, y: p.y - sy / zoom };
}

/** Scale an image down to fit `max` on its longer side (pictures are stored inside the local database). */
export function fitSize(w: number, h: number, max: number) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}
