/** Papierformate in Millimetern (Hochformat-Maße). */
export interface PaperFormat {
  id: string;
  label: string;
  w: number;
  h: number;
}

export type Orientation = 'portrait' | 'landscape';

export const FORMATS: PaperFormat[] = [
  { id: 'a4', label: 'A4', w: 210, h: 297 },
  { id: 'a3', label: 'A3', w: 297, h: 420 },
  { id: '30x40', label: '30 × 40', w: 300, h: 400 },
  { id: '50x70', label: '50 × 70', w: 500, h: 700 },
  { id: 'square', label: '30 × 30', w: 300, h: 300 },
];

export function getFormat(id: string): PaperFormat {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[1];
}

export function isSquare(f: PaperFormat): boolean {
  return f.w === f.h;
}

/** Tatsächliche Papiergröße in mm unter Berücksichtigung der Ausrichtung. */
export function paperSize(formatId: string, orientation: Orientation): { w: number; h: number } {
  const f = getFormat(formatId);
  return orientation === 'landscape' ? { w: f.h, h: f.w } : { w: f.w, h: f.h };
}

/**
 * Logische Pixel pro Millimeter (CSS-Referenz: 96 px pro Zoll).
 * Die Karte wird in Vorschau und Export in dieser logischen Auflösung „gelayoutet",
 * damit Linienstärken und Beschriftungen auf jedem Gerät gleich aussehen.
 */
export const PX_PER_MM = 96 / 25.4;

export function paperLabel(formatId: string, orientation: Orientation): string {
  const f = getFormat(formatId);
  const { w, h } = paperSize(formatId, orientation);
  return `${f.label} (${Math.round(w / 10)} × ${Math.round(h / 10)} cm)`;
}
