import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

import { config } from '../config';
import { formatCoords } from '../geo';
import { getLang } from '../i18n';
import { computeLayout, type PosterLayout } from '../poster/layout';
import { drawPoster } from '../poster/render';
import { ensureFonts, getFontPreset } from '../poster/fonts';
import { store, type PosterState } from '../state';
import { resolveColors } from '../themes';
import { buildStyle } from './style';

setWorkerUrl(workerUrl);

const STYLE_KEYS: (keyof PosterState)[] = [
  'theme',
  'colors',
  'showBuildings',
  'showPaths',
  'showLabels',
  'lineWeight',
];

export function styleFor(state: PosterState) {
  return buildStyle({
    theme: state.theme,
    colors: state.colors,
    showBuildings: state.showBuildings,
    showPaths: state.showPaths,
    showLabels: state.showLabels,
    lineWeight: state.lineWeight,
    lang: getLang(),
  });
}

export function coordsTextFor(state: PosterState, center: [number, number] = state.center): string {
  return state.coordsText.trim() || formatCoords(center, state.coordsStyle);
}

/**
 * Die Arbeitsfläche: interaktive Karte + Poster-Overlay.
 *
 * Die Karte wird in der logischen Postergröße gelayoutet und per CSS-Transform
 * auf den Bildschirm skaliert. Dadurch zeigt die Vorschau exakt dieselben
 * Linienstärken und Beschriftungsgrößen wie der spätere Export.
 */
export class Stage {
  readonly map: MapLibreMap;
  private readonly stageEl: HTMLDivElement;
  private readonly overlay: HTMLCanvasElement;
  private layout: PosterLayout;
  private scale = 1;
  private posterX = 0;
  private posterY = 0;
  private frameRequested = false;
  private readonly onCenterListeners = new Set<(center: [number, number]) => void>();

  constructor(private readonly workspace: HTMLElement) {
    const state = store.get();
    this.stageEl = document.createElement('div');
    this.stageEl.className = 'stage';
    this.overlay = document.createElement('canvas');
    this.overlay.className = 'stage-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
    workspace.append(this.stageEl, this.overlay);

    this.layout = computeLayout(state, coordsTextFor(state), config.attribution);

    this.map = new MapLibreMap({
      container: this.stageEl,
      style: styleFor(state),
      center: state.center,
      zoom: state.zoom,
      minZoom: 2,
      maxZoom: 18.5,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 0,
      // Kein Shift-Box-Zoom: verträgt sich nicht gut mit der skalierten Bühne.
      boxZoom: false,
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.keyboard.disableRotation();

    this.map.on('move', () => {
      this.requestDraw();
      const c = this.map.getCenter();
      this.onCenterListeners.forEach((fn) => fn([c.lng, c.lat]));
    });
    this.map.on('moveend', () => {
      const c = this.map.getCenter();
      store.set({ center: [round(c.lng, 6), round(c.lat, 6)], zoom: round(this.map.getZoom(), 3) });
    });
    this.map.on('load', () => workspace.classList.add('is-loaded'));
    this.map.on('error', (e) => {
      console.warn('[Koordinate] Kartenfehler', e.error);
      workspace.classList.add('has-map-error');
    });
    this.map.on('data', () => workspace.classList.remove('has-map-error'));

    new ResizeObserver(() => this.relayout()).observe(workspace);
    store.subscribe((s, changed) => this.onState(s, changed));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.requestDraw());
    this.loadFontsAndRelayout();
    this.relayout();
  }

  onCenter(fn: (center: [number, number]) => void): void {
    this.onCenterListeners.add(fn);
  }

  /** Aktuelles Layout, Kartenmitte und Zoom – Grundlage des Exports. */
  snapshot() {
    const c = this.map.getCenter();
    const state = store.get();
    const center: [number, number] = [c.lng, c.lat];
    return {
      state,
      center,
      zoom: this.map.getZoom(),
      layout: computeLayout(state, coordsTextFor(state, center), config.attribution),
    };
  }

  refreshStyle(): void {
    this.map.setStyle(styleFor(store.get()), { diff: true });
  }

  zoomBy(delta: number): void {
    this.map.easeTo({ zoom: this.map.getZoom() + delta, duration: 250 });
  }

  /** Größe des Kartenfensters in logischen Pixeln (für Zoom-auf-Bounding-Box). */
  mapWindowSize(): { w: number; h: number } {
    return { w: this.layout.map.w, h: this.layout.map.h };
  }

  private async loadFontsAndRelayout(): Promise<void> {
    const s = store.get();
    await ensureFonts(getFontPreset(s.font), [s.title, s.subtitle, s.dedication, coordsTextFor(s)]);
    this.relayout();
  }

  private onState(state: PosterState, changed: Set<keyof PosterState>): void {
    if (STYLE_KEYS.some((k) => changed.has(k))) this.refreshStyle();

    if (changed.has('format') || changed.has('orientation')) {
      // Bei Formatwechsel ungefähr denselben geografischen Ausschnitt behalten.
      const before = this.layout.map;
      const next = computeLayout(state, coordsTextFor(state), config.attribution).map;
      const dz = Math.log2(Math.min(next.w, next.h) / Math.min(before.w, before.h));
      if (Number.isFinite(dz) && Math.abs(dz) > 0.01) {
        this.map.setZoom(this.map.getZoom() + dz);
      }
    }

    if (changed.has('center') || changed.has('zoom')) {
      const c = this.map.getCenter();
      const moved =
        Math.abs(c.lng - state.center[0]) > 1e-5 ||
        Math.abs(c.lat - state.center[1]) > 1e-5 ||
        Math.abs(this.map.getZoom() - state.zoom) > 1e-3;
      if (moved) this.map.flyTo({ center: state.center, zoom: state.zoom, duration: 1400, essential: true });
    }

    if (changed.has('font') || changed.has('title') || changed.has('subtitle') || changed.has('dedication')) {
      this.loadFontsAndRelayout();
    }
    const onlyCamera = [...changed].every((k) => k === 'center' || k === 'zoom');
    if (onlyCamera) this.requestDraw();
    else this.relayout();
  }

  /** Berechnet Skalierung, Bühnengröße und Karten-Padding neu. */
  relayout(): void {
    const state = store.get();
    const center = this.map.getCenter();
    this.layout = computeLayout(state, coordsTextFor(state, [center.lng, center.lat]), config.attribution);

    const wsW = this.workspace.clientWidth;
    const wsH = this.workspace.clientHeight;
    if (!wsW || !wsH) return;
    const pad = wsW < 720 ? 16 : 48;
    const { width: W, height: H, map: win } = this.layout;
    const s = Math.max(0.05, Math.min((wsW - 2 * pad) / W, (wsH - 2 * pad) / H));
    this.scale = s;
    this.posterX = Math.round((wsW - W * s) / 2);
    this.posterY = Math.round((wsH - H * s) / 2);

    const stageW = wsW / s;
    const stageH = wsH / s;
    this.stageEl.style.width = `${stageW}px`;
    this.stageEl.style.height = `${stageH}px`;
    this.stageEl.style.transform = `scale(${s})`;

    const dpr = window.devicePixelRatio || 1;
    this.map.setPixelRatio(Math.max(0.5, s * dpr));
    this.map.resize();

    const left = this.posterX / s + win.x;
    const top = this.posterY / s + win.y;
    this.map.setPadding({
      left,
      top,
      right: Math.max(0, stageW - left - win.w),
      bottom: Math.max(0, stageH - top - win.h),
    });
    this.map.jumpTo({ center });

    this.overlay.width = Math.round(wsW * dpr);
    this.overlay.height = Math.round(wsH * dpr);
    this.overlay.style.width = `${wsW}px`;
    this.overlay.style.height = `${wsH}px`;
    this.draw();
  }

  private requestDraw(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      const state = store.get();
      if (state.showCoords && !state.coordsText.trim()) {
        const c = this.map.getCenter();
        this.layout = computeLayout(state, coordsTextFor(state, [c.lng, c.lat]), config.attribution);
      }
      this.draw();
    });
  }

  private draw(): void {
    const ctx = this.overlay.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const state = store.get();
    const colors = resolveColors(state.theme, state.colors);
    const { width: W, height: H } = this.layout;
    const pw = W * this.scale * dpr;
    const ph = H * this.scale * dpr;
    const px = this.posterX * dpr;
    const py = this.posterY * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

    // Umgebung abdunkeln, Poster mit weichem Schatten hervorheben.
    const css = getComputedStyle(this.workspace);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.overlay.width, this.overlay.height);
    ctx.rect(px, py, pw, ph);
    ctx.clip('evenodd');
    ctx.fillStyle = css.getPropertyValue('--ws-dim').trim() || 'rgba(246,244,239,0.82)';
    ctx.fillRect(0, 0, this.overlay.width, this.overlay.height);
    ctx.shadowColor = css.getPropertyValue('--ws-shadow').trim() || 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 36 * dpr;
    ctx.shadowOffsetY = 10 * dpr;
    ctx.fillStyle = colors.paper;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();

    drawPoster(ctx, this.layout, colors, {
      scale: this.scale * dpr,
      offsetX: px,
      offsetY: py,
      ink: colors.ink,
    });
  }
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
