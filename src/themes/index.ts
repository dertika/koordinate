import type { Theme, ThemeColors } from './types';
import { papier } from './presets/papier';
import { nacht } from './presets/nacht';
import { sepia } from './presets/sepia';
import { pastell } from './presets/pastell';
import { blaupause } from './presets/blaupause';
import { tusche } from './presets/tusche';
import { salbei } from './presets/salbei';
import { terrakotta } from './presets/terrakotta';

export const THEMES: Theme[] = [papier, nacht, sepia, pastell, blaupause, tusche, salbei, terrakotta];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Theme-Farben inklusive Nutzer-Überschreibungen. */
export function resolveColors(themeId: string, overrides: Partial<ThemeColors>): ThemeColors {
  const base = getTheme(themeId).colors;
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    if (v && /^#[0-9a-f]{6}$/i.test(v)) out[k as keyof ThemeColors] = v;
  }
  return out;
}

export type { Theme, ThemeColors };
