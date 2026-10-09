import { Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { paperLabel, paperSize } from '../formats';
import type { PosterLayout } from '../poster/layout';
import { drawPoster } from '../poster/render';
import { ensureFonts, getFontPreset } from '../poster/fonts';
import type { PosterState } from '../state';
import { resolveColors } from '../themes';
import { gpuMaxSize, maxCanvasArea, maxCanvasDimension } from './limits';
import { jpegToPdf } from './pdf';
import { withDpi } from './png';

export type ExportType = 'png' | 'pdf';
export type ExportStep = 'rendering' | 'composing' | 'encoding';

export interface ExportPlan {
  requestedDpi: number;
  dpi: number;
  /** Gerätepixel pro logischem Pixel. */
  k: number;
  pxW: number;
  pxH: number;
  limited: boolean;
  paper: string;
}

/** Logische Pixel sind CSS-Pixel (96 dpi) → Skalierung = dpi / 96. */
export function planExport(state: PosterState, layout: PosterLayout, requestedDpi: number): ExportPlan {
  const gpu = gpuMaxSize();
  const kMax = Math.min(
    gpu / layout.map.w,
    gpu / layout.map.h,
    Math.sqrt(maxCanvasArea() / (layout.width * layout.height)),
    maxCanvasDimension() / Math.max(layout.width, layout.height),
  );
  const dpi = Math.max(72, Math.min(requestedDpi, Math.floor(kMax * 96)));
  const k = dpi / 96;
  return {
    requestedDpi,
    dpi,
    k,
    pxW: Math.round(layout.width * k),
    pxH: Math.round(layout.height * k),
    limited: dpi < requestedDpi,
    paper: paperLabel(state.format, state.orientation),
  };
}

interface RenderInput {
  style: StyleSpecification;
  center: [number, number];
  zoom: number;
  state: PosterState;
  layout: PosterLayout;
  coordsText: string;
}

/**
 * Rendert die Karte offscreen in der logischen Größe des Kartenfensters,
 * aber mit hoher Pixeldichte. Zoom und logische Größe entsprechen der Vorschau,
 * daher sind Ausschnitt, Linien und Beschriftung identisch – nur schärfer.
 */
async function renderMap(input: RenderInput, k: number): Promise<{ canvas: HTMLCanvasElement; dispose: () => void }> {
  const { map: win } = input.layout;
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-${Math.ceil(win.w) + 200}px;top:0;width:${win.w}px;height:${win.h}px;pointer-events:none;`;
  container.setAttribute('aria-hidden', 'true');
  document.body.append(container);

  const max = gpuMaxSize();
  const map = new MapLibreMap({
    container,
    style: input.style,
    center: input.center,
    zoom: input.zoom,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    pixelRatio: k,
    maxCanvasSize: [max, max],
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
  });

  const dispose = () => {
    map.remove();
    container.remove();
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Zeitüberschreitung beim Laden der Kacheln')), 90_000);
      map.once('idle', () => {
        window.clearTimeout(timeout);
        resolve();
      });
      map.on('error', (e) => console.warn('[Koordinate] Export-Kartenfehler', e.error));
    });
    // Ein zusätzlicher Frame stellt sicher, dass die Zeichenfläche vollständig ist.
    map.triggerRepaint();
    await new Promise<void>((r) => map.once('render', () => r()));
    return { canvas: map.getCanvas(), dispose };
  } catch (err) {
    dispose();
    throw err;
  }
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  plan: ExportPlan;
}

export async function exportPoster(
  input: RenderInput,
  type: ExportType,
  requestedDpi: number,
  onStep: (step: ExportStep) => void,
): Promise<ExportResult> {
  const { state, layout } = input;
  const plan = planExport(state, layout, requestedDpi);
  const colors = resolveColors(state.theme, state.colors);

  await ensureFonts(getFontPreset(state.font), [state.title, state.subtitle, state.dedication, input.coordsText]);

  onStep('rendering');
  const { canvas: mapCanvas, dispose } = await renderMap(input, plan.k);

  onStep('composing');
  const out = document.createElement('canvas');
  out.width = plan.pxW;
  out.height = plan.pxH;
  const ctx = out.getContext('2d');
  if (!ctx) {
    dispose();
    throw new Error('Canvas zu groß für diesen Browser');
  }
  try {
    drawPoster(ctx, layout, colors, { scale: plan.k, mapImage: mapCanvas, ink: colors.ink });
  } finally {
    dispose();
  }

  onStep('encoding');
  await nextFrame();
  const paper = paperSize(state.format, state.orientation);
  const base = filenameBase(state);
  let blob: Blob;
  if (type === 'pdf') {
    const jpeg = await toBlob(out, 'image/jpeg', 0.93);
    blob = await jpegToPdf(jpeg, plan.pxW, plan.pxH, paper.w, paper.h, state.title || 'Koordinate');
  } else {
    blob = await withDpi(await toBlob(out, 'image/png'), plan.dpi);
  }
  // Speicher der großen Canvas sofort freigeben.
  out.width = out.height = 0;
  return { blob, filename: `${base}.${type}`, plan };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht kodiert werden'))), type, quality),
  );
}

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function filenameBase(state: PosterState): string {
  const slug = (state.title || 'karte')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/ß/g, 'ss')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `koordinate-${slug || 'karte'}-${state.format}`;
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
