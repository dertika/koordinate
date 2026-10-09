// Schriften werden lokal mitgeliefert (Fontsource) – keine Anfragen an Google Fonts.
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/josefin-sans/300.css';
import '@fontsource/josefin-sans/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/great-vibes/400.css';

import type { MessageKey } from '../i18n';

export interface TextSpec {
  family: string;
  weight: number;
  italic?: boolean;
  upper?: boolean;
  /** Laufweite in em. */
  tracking: number;
  /** Größenfaktor relativ zur Grundgröße der Zeile. */
  size: number;
}

export interface FontPreset {
  id: string;
  labelKey: MessageKey;
  title: TextSpec;
  subtitle: TextSpec;
  coords: TextSpec;
  dedication: TextSpec;
}

const CORMORANT = 'Cormorant Garamond';
const PLAYFAIR = 'Playfair Display';
const MONTSERRAT = 'Montserrat';
const JOSEFIN = 'Josefin Sans';
const PLEX = 'IBM Plex Mono';
const VIBES = 'Great Vibes';

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'elegant',
    labelKey: 'font.elegant',
    title: { family: CORMORANT, weight: 500, upper: true, tracking: 0.14, size: 1 },
    subtitle: { family: CORMORANT, weight: 400, italic: true, tracking: 0.02, size: 1.15 },
    coords: { family: CORMORANT, weight: 600, upper: true, tracking: 0.22, size: 1 },
    dedication: { family: CORMORANT, weight: 400, italic: true, tracking: 0.01, size: 1.1 },
  },
  {
    id: 'editorial',
    labelKey: 'font.editorial',
    title: { family: PLAYFAIR, weight: 700, tracking: 0, size: 1 },
    subtitle: { family: MONTSERRAT, weight: 400, upper: true, tracking: 0.32, size: 0.72 },
    coords: { family: PLEX, weight: 400, tracking: 0.06, size: 0.9 },
    dedication: { family: PLAYFAIR, weight: 400, italic: true, tracking: 0, size: 1 },
  },
  {
    id: 'modern',
    labelKey: 'font.modern',
    title: { family: MONTSERRAT, weight: 600, upper: true, tracking: 0.3, size: 0.78 },
    subtitle: { family: MONTSERRAT, weight: 300, upper: true, tracking: 0.3, size: 0.8 },
    coords: { family: MONTSERRAT, weight: 400, tracking: 0.18, size: 0.85 },
    dedication: { family: MONTSERRAT, weight: 300, tracking: 0.04, size: 0.85 },
  },
  {
    id: 'deco',
    labelKey: 'font.deco',
    title: { family: JOSEFIN, weight: 300, upper: true, tracking: 0.42, size: 0.9 },
    subtitle: { family: JOSEFIN, weight: 400, upper: true, tracking: 0.36, size: 0.8 },
    coords: { family: JOSEFIN, weight: 300, upper: true, tracking: 0.28, size: 0.9 },
    dedication: { family: JOSEFIN, weight: 300, tracking: 0.08, size: 0.95 },
  },
  {
    id: 'technisch',
    labelKey: 'font.technisch',
    title: { family: PLEX, weight: 500, upper: true, tracking: 0.12, size: 0.72 },
    subtitle: { family: PLEX, weight: 400, upper: true, tracking: 0.2, size: 0.75 },
    coords: { family: PLEX, weight: 400, tracking: 0.08, size: 0.9 },
    dedication: { family: PLEX, weight: 400, tracking: 0, size: 0.85 },
  },
  {
    id: 'handschrift',
    labelKey: 'font.handschrift',
    title: { family: VIBES, weight: 400, tracking: 0, size: 1.35 },
    subtitle: { family: CORMORANT, weight: 500, upper: true, tracking: 0.28, size: 0.85 },
    coords: { family: CORMORANT, weight: 500, tracking: 0.16, size: 1 },
    dedication: { family: CORMORANT, weight: 400, italic: true, tracking: 0, size: 1.1 },
  },
];

export function getFontPreset(id: string): FontPreset {
  return FONT_PRESETS.find((f) => f.id === id) ?? FONT_PRESETS[0];
}

export function cssFont(spec: TextSpec, px: number): string {
  return `${spec.italic ? 'italic ' : ''}${spec.weight} ${px}px "${spec.family}"`;
}

/**
 * Lädt alle Schnitte eines Presets für die gegebenen Texte.
 * Canvas-Text wird erst korrekt gezeichnet, wenn die Schrift geladen ist.
 */
export async function ensureFonts(preset: FontPreset, texts: string[]): Promise<void> {
  const sample = `${texts.join(' ')} AÄÖÜ°′″·–0123456789`;
  const specs = [preset.title, preset.subtitle, preset.coords, preset.dedication];
  await Promise.all(specs.map((s) => document.fonts.load(cssFont(s, 32), sample).catch(() => [])));
}
