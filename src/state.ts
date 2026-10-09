import type { Orientation } from './formats';
import type { ThemeColorKey } from './themes/types';

export type MarginId = 'none' | 's' | 'm' | 'l';
export type TextMode = 'bar' | 'overlay' | 'none';

export interface PosterState {
  center: [number, number];
  zoom: number;
  format: string;
  orientation: Orientation;
  theme: string;
  /** Farbüberschreibungen des aktuellen Themes. */
  colors: Partial<Record<ThemeColorKey, string>>;
  showBuildings: boolean;
  showPaths: boolean;
  showLabels: boolean;
  lineWeight: number;
  title: string;
  subtitle: string;
  dedication: string;
  showCoords: boolean;
  coordsStyle: 'dms' | 'dec';
  coordsText: string;
  font: string;
  textScale: number;
  align: 'center' | 'left';
  margin: MarginId;
  textMode: TextMode;
  frameLine: boolean;
  attribution: 'normal' | 'small';
}

export const DEFAULT_STATE: PosterState = {
  center: [8.6821, 50.1109],
  zoom: 12.4,
  format: 'a3',
  orientation: 'portrait',
  theme: 'papier',
  colors: {},
  showBuildings: true,
  showPaths: true,
  showLabels: false,
  lineWeight: 1,
  title: 'Frankfurt am Main',
  subtitle: 'Deutschland',
  dedication: '',
  showCoords: true,
  coordsStyle: 'dms',
  coordsText: '',
  font: 'elegant',
  textScale: 1,
  align: 'center',
  margin: 'm',
  textMode: 'bar',
  frameLine: false,
  attribution: 'normal',
};

type Listener = (state: PosterState, changed: Set<keyof PosterState>) => void;

class Store {
  private state: PosterState;
  private listeners = new Set<Listener>();

  constructor(initial: PosterState) {
    this.state = initial;
  }

  get(): PosterState {
    return this.state;
  }

  set(patch: Partial<PosterState>): void {
    const changed = new Set<keyof PosterState>();
    for (const key of Object.keys(patch) as (keyof PosterState)[]) {
      if (JSON.stringify(this.state[key]) !== JSON.stringify(patch[key])) changed.add(key);
    }
    if (!changed.size) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state, changed));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

// ---------------------------------------------------------------------------
// Serialisierung (URL-Hash + localStorage)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'koordinate:draft';

/** Kurze Schlüssel für den URL-Hash, damit geteilte Links lesbar bleiben. */
const KEYS: Record<string, keyof PosterState> = {
  f: 'format',
  o: 'orientation',
  th: 'theme',
  b: 'showBuildings',
  p: 'showPaths',
  l: 'showLabels',
  lw: 'lineWeight',
  t: 'title',
  s: 'subtitle',
  d: 'dedication',
  k: 'showCoords',
  ks: 'coordsStyle',
  kt: 'coordsText',
  fo: 'font',
  ts: 'textScale',
  a: 'align',
  m: 'margin',
  tm: 'textMode',
  fr: 'frameLine',
  at: 'attribution',
};

export function serialize(state: PosterState): string {
  const params = new URLSearchParams();
  params.set('c', `${state.center[1].toFixed(5)},${state.center[0].toFixed(5)}`);
  params.set('z', state.zoom.toFixed(2));
  for (const [short, key] of Object.entries(KEYS)) {
    const value = state[key];
    if (JSON.stringify(value) === JSON.stringify(DEFAULT_STATE[key])) continue;
    params.set(short, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  const colors = Object.entries(state.colors).filter(([, v]) => v);
  if (colors.length) params.set('col', colors.map(([k, v]) => `${k}:${v!.replace('#', '')}`).join(','));
  return params.toString();
}

export function deserialize(input: string): Partial<PosterState> | null {
  const params = new URLSearchParams(input.replace(/^#/, ''));
  if (!params.has('c') && !params.has('z')) return null;
  const out: Partial<PosterState> = {};
  const c = params.get('c')?.split(',').map(Number);
  if (c && c.length === 2 && c.every(Number.isFinite)) out.center = [c[1], c[0]];
  const z = Number(params.get('z'));
  if (params.has('z') && Number.isFinite(z)) out.zoom = Math.max(1, Math.min(19, z));
  for (const [short, key] of Object.entries(KEYS)) {
    const raw = params.get(short);
    if (raw === null) continue;
    const def = DEFAULT_STATE[key];
    if (typeof def === 'boolean') (out as Record<string, unknown>)[key] = raw === '1';
    else if (typeof def === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) (out as Record<string, unknown>)[key] = n;
    } else (out as Record<string, unknown>)[key] = raw;
  }
  const col = params.get('col');
  if (col) {
    const colors: Record<string, string> = {};
    for (const part of col.split(',')) {
      const [k, v] = part.split(':');
      if (k && v && /^[0-9a-f]{6}$/i.test(v)) colors[k] = `#${v}`;
    }
    out.colors = colors;
  }
  return out;
}

function loadInitial(): PosterState {
  const fromHash = deserialize(location.hash);
  if (fromHash) return { ...DEFAULT_STATE, ...fromHash };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const fromStorage = deserialize(raw);
      if (fromStorage) return { ...DEFAULT_STATE, ...fromStorage };
    }
  } catch {
    /* localStorage evtl. gesperrt (Privatmodus) */
  }
  return { ...DEFAULT_STATE };
}

export const store = new Store(loadInitial());

let persistTimer: number | undefined;
store.subscribe((state) => {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    const encoded = serialize(state);
    history.replaceState(null, '', `#${encoded}`);
    try {
      localStorage.setItem(STORAGE_KEY, encoded);
    } catch {
      /* ignorieren */
    }
  }, 350);
});

window.addEventListener('hashchange', () => {
  const next = deserialize(location.hash);
  if (next && serialize({ ...store.get(), ...next }) !== serialize(store.get())) {
    store.set({ ...DEFAULT_STATE, ...next });
  }
});
