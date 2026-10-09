import { config } from './config';
import { getLang } from './i18n';

export interface GeocodeResult {
  id: string;
  name: string;
  context: string;
  country: string;
  center: [number, number];
  bbox: [number, number, number, number] | null;
}

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  boundingbox?: [string, string, string, string];
  address?: Record<string, string>;
}

/**
 * Nominatim-Client gemäß Nutzungsrichtlinie:
 * höchstens eine Anfrage pro Sekunde, Ergebnisse werden zwischengespeichert,
 * veraltete Anfragen werden abgebrochen. Das Debouncing übernimmt die UI.
 */
class Geocoder {
  private lastRequest = 0;
  private cache = new Map<string, GeocodeResult[]>();
  private controller: AbortController | null = null;

  async search(query: string): Promise<GeocodeResult[]> {
    const q = query.trim();
    const lang = getLang();
    const key = `${lang}:${q.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;

    const wait = this.lastRequest + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    if (controller.signal.aborted) throw new DOMException('aborted', 'AbortError');
    this.lastRequest = Date.now();

    const url = new URL(config.geocoderUrl, location.href);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '6');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', lang);
    if (config.geocoderEmail) url.searchParams.set('email', config.geocoderEmail);

    const res = await fetch(url, {
      signal: controller.signal,
      // Der Origin wird als Referer übermittelt, damit die Anfrage zuordenbar bleibt.
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = (await res.json()) as NominatimItem[];
    const results = items.map(toResult);
    this.cache.set(key, results);
    return results;
  }
}

function toResult(item: NominatimItem): GeocodeResult {
  const parts = item.display_name.split(',').map((p) => p.trim());
  const name = item.name || parts[0];
  const context = parts.filter((p) => p !== name).slice(0, 3).join(', ');
  const bb = item.boundingbox?.map(Number);
  return {
    id: String(item.place_id),
    name,
    context,
    country: item.address?.country ?? parts[parts.length - 1] ?? '',
    center: [Number(item.lon), Number(item.lat)],
    // Nominatim: [süd, nord, west, ost]
    bbox: bb && bb.every(Number.isFinite) ? [bb[2], bb[0], bb[3], bb[1]] : null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const geocoder = new Geocoder();
