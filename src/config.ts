/**
 * Zentrale Konfiguration. Reihenfolge der Quellen:
 * 1. window.KOORDINATE_CONFIG (aus public/config.js, beim Hosting überschreibbar)
 * 2. VITE_*-Umgebungsvariablen zur Build-Zeit
 * 3. Defaults
 */
export interface AppConfig {
  /** Nominatim-kompatibler Such-Endpoint (…/search). */
  geocoderUrl: string;
  /** Optionale Kontaktadresse, wird gemäß Nominatim-Policy als `email` mitgesendet. */
  geocoderEmail: string;
  /** TileJSON der Vektorkacheln im OpenMapTiles-Schema. */
  tileJsonUrl: string;
  /** Glyph-Endpoint für Kartenbeschriftungen. */
  glyphsUrl: string;
  /** Attribution, die in Vorschau und Export erscheint. */
  attribution: string;
}

declare global {
  interface Window {
    KOORDINATE_CONFIG?: Partial<AppConfig>;
  }
}

const env = import.meta.env;

const defaults: AppConfig = {
  geocoderUrl: env.VITE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search',
  geocoderEmail: env.VITE_GEOCODER_EMAIL || '',
  tileJsonUrl: env.VITE_TILEJSON_URL || 'https://tiles.openfreemap.org/planet',
  glyphsUrl: env.VITE_GLYPHS_URL || 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  attribution: env.VITE_ATTRIBUTION || '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles',
};

function clean(partial: Partial<AppConfig> | undefined): Partial<AppConfig> {
  const out: Partial<AppConfig> = {};
  if (!partial) return out;
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v === 'string' && v.trim() !== '') (out as Record<string, string>)[k] = v.trim();
  }
  return out;
}

export const config: AppConfig = { ...defaults, ...clean(window.KOORDINATE_CONFIG) };
