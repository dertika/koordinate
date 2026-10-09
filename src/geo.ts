/** Kleine Geo-Hilfsfunktionen. */

export type LngLat = [number, number];

function dms(value: number, pos: string, neg: string): string {
  const hemi = value >= 0 ? pos : neg;
  let abs = Math.abs(value);
  let d = Math.floor(abs);
  abs = (abs - d) * 60;
  let m = Math.floor(abs);
  let s = Math.round((abs - m) * 60);
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″${hemi}`;
}

export function formatCoords([lng, lat]: LngLat, style: 'dms' | 'dec'): string {
  if (style === 'dec') {
    const la = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lo = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
    return `${la}  ·  ${lo}`;
  }
  return `${dms(lat, 'N', 'S')}  ·  ${dms(lng, 'E', 'W')}`;
}

const TILE = 512;

function mercX(lng: number): number {
  return (lng + 180) / 360;
}

function mercY(lat: number): number {
  const s = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

/** Zoomstufe, bei der eine Bounding-Box in ein Fenster der Größe w×h (logische px) passt. */
export function zoomForBounds(
  [west, south, east, north]: [number, number, number, number],
  w: number,
  h: number,
  fill = 0.85,
): number {
  const dx = Math.abs(mercX(east) - mercX(west)) || 1e-9;
  const dy = Math.abs(mercY(south) - mercY(north)) || 1e-9;
  const z = Math.log2(Math.min((w * fill) / (dx * TILE), (h * fill) / (dy * TILE)));
  return Math.max(2, Math.min(17, z));
}
