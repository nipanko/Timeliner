import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { ScaleId } from '@/core/timeline/scales';
import { EntrySheet } from '@/features/entries/EntrySheet';

/** `/entry/new?at=…&layer=…&scale=…` adds; `/entry/<id>` edits. */
export default function EntryRoute() {
  const { id, at, layer, scale } = useLocalSearchParams<{ id: string; at?: string; layer?: string; scale?: ScaleId }>();
  const [openedAt] = useState(Date.now);
  const atMs = Number(at);
  return <EntrySheet id={id === 'new' ? null : id} at={Number.isFinite(atMs) && at ? atMs : openedAt} layerId={layer} scaleId={scale ?? 'hour'} />;
}
