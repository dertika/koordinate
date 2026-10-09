import { PX_PER_MM, paperSize } from '../formats';
import type { PosterState } from '../state';
import { cssFont, getFontPreset, type TextSpec } from './fonts';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextLine {
  kind: 'title' | 'subtitle' | 'coords' | 'dedication';
  text: string;
  font: string;
  size: number;
  tracking: number;
  x: number;
  baseline: number;
  align: 'center' | 'left';
}

export interface PosterLayout {
  /** Papiergröße in logischen Pixeln. */
  width: number;
  height: number;
  /** Kurze Papierseite – Basis aller Proportionen. */
  S: number;
  map: Rect;
  lines: TextLine[];
  divider: { x: number; y: number; w: number; thickness: number } | null;
  /** Verlauf über der Karte im Modus „Auf der Karte". */
  fade: { top: number; solid: number; bottom: number } | null;
  frame: { rect: Rect; thickness: number } | null;
  attribution: { text: string; x: number; y: number; size: number; box: boolean };
}

const MARGIN: Record<PosterState['margin'], number> = { none: 0, s: 0.035, m: 0.06, l: 0.09 };

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string, tracking: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 10;
  measureCtx.font = font;
  return measureCtx.measureText(text).width + tracking * Math.max(0, Array.from(text).length - 1);
}

interface PendingLine {
  kind: TextLine['kind'];
  text: string;
  spec: TextSpec;
  size: number;
  gapBefore: number;
}

export function computeLayout(state: PosterState, coordsText: string, attributionText: string): PosterLayout {
  const paper = paperSize(state.format, state.orientation);
  const W = paper.w * PX_PER_MM;
  const H = paper.h * PX_PER_MM;
  const S = Math.min(W, H);
  const m = Math.round(S * MARGIN[state.margin]);
  const preset = getFontPreset(state.font);
  const k = state.textScale;

  // ------------------------------------------------------------------ Textzeilen
  const pending: PendingLine[] = [];
  const withText = state.textMode !== 'none';
  const title = state.title.trim();
  const subtitle = state.subtitle.trim();
  const coords = state.showCoords ? coordsText.trim() : '';
  const dedication = state.dedication.trim();
  if (withText) {
    if (title) pending.push({ kind: 'title', text: title, spec: preset.title, size: S * 0.068 * k * preset.title.size, gapBefore: 0 });
    if (subtitle)
      pending.push({ kind: 'subtitle', text: subtitle, spec: preset.subtitle, size: S * 0.023 * k * preset.subtitle.size, gapBefore: S * 0.012 * k });
    if (coords) pending.push({ kind: 'coords', text: coords, spec: preset.coords, size: S * 0.0165 * k * preset.coords.size, gapBefore: 0 });
    if (dedication)
      pending.push({ kind: 'dedication', text: dedication, spec: preset.dedication, size: S * 0.021 * k * preset.dedication.size, gapBefore: S * 0.01 * k });
  }
  const hasHead = pending.some((l) => l.kind === 'title' || l.kind === 'subtitle');
  const dividerGap = S * 0.022 * k;

  const padX = Math.max(S * 0.05, m * 0.5);
  const innerW = W - 2 * m;
  const maxTextW = innerW - 2 * padX;

  // Zu breite Zeilen schrumpfen, damit nichts aus dem Bild läuft.
  for (const line of pending) {
    if (line.spec.upper) line.text = line.text.toLocaleUpperCase();
    const width = measure(line.text, cssFont(line.spec, line.size), line.spec.tracking * line.size);
    if (width > maxTextW) line.size *= maxTextW / width;
  }

  // Höhe des Textblocks bestimmen (Zeilenhöhe ≈ 1.25 × Schriftgröße).
  let contentH = 0;
  let firstFoot = true;
  for (const line of pending) {
    let gap = line.gapBefore;
    if ((line.kind === 'coords' || line.kind === 'dedication') && firstFoot) {
      firstFoot = false;
      if (hasHead) gap = dividerGap * 2;
    }
    if (contentH === 0) gap = 0;
    contentH += gap + line.size * 1.25;
  }

  const padY = S * 0.05;
  const hasContent = pending.length > 0;

  // ------------------------------------------------------------------ Karte
  let map: Rect;
  let blockTop = 0;
  let fade: PosterLayout['fade'] = null;
  if (state.textMode === 'bar' && hasContent) {
    const barH = contentH + 2 * padY;
    map = { x: m, y: m, w: innerW, h: H - 2 * m - barH };
    blockTop = map.y + map.h + padY;
  } else {
    map = { x: m, y: m, w: innerW, h: H - 2 * m };
    if (state.textMode === 'overlay' && hasContent) {
      blockTop = map.y + map.h - padY - contentH;
      fade = {
        top: Math.max(map.y, blockTop - S * 0.16),
        solid: Math.max(map.y, blockTop - S * 0.02),
        bottom: map.y + map.h,
      };
    }
  }

  const align = state.align;
  const x = align === 'center' ? W / 2 : m + padX;
  const lines: TextLine[] = [];
  let divider: PosterLayout['divider'] = null;
  let y = blockTop;
  firstFoot = true;
  for (const line of pending) {
    let gap = line.gapBefore;
    if ((line.kind === 'coords' || line.kind === 'dedication') && firstFoot) {
      firstFoot = false;
      if (hasHead) {
        gap = dividerGap * 2;
        const dw = S * 0.05;
        divider = {
          x: align === 'center' ? W / 2 - dw / 2 : x,
          y: y + dividerGap,
          w: dw,
          thickness: Math.max(0.6, S * 0.0012),
        };
      }
    }
    if (lines.length === 0) gap = 0;
    y += gap;
    lines.push({
      kind: line.kind,
      text: line.text,
      font: cssFont(line.spec, line.size),
      size: line.size,
      tracking: line.spec.tracking * line.size,
      x,
      // Grundlinie eine Schriftgröße unter der Zeilenoberkante – ausgewogen für alle Presets.
      baseline: y + line.size * 1.0,
      align,
    });
    y += line.size * 1.25;
  }

  // ------------------------------------------------------------------ Rahmenlinie
  const frame = state.frameLine
    ? {
        rect:
          m > 0
            ? { x: map.x - S * 0.008, y: map.y - S * 0.008, w: map.w + S * 0.016, h: map.h + S * 0.016 }
            : { x: map.x + S * 0.02, y: map.y + S * 0.02, w: map.w - S * 0.04, h: map.h - S * 0.04 },
        thickness: Math.max(0.6, S * 0.0012),
      }
    : null;

  // ------------------------------------------------------------------ Attribution
  const aSize = S * (state.attribution === 'small' ? 0.0055 : 0.0085);
  let attribution: PosterLayout['attribution'];
  if (m >= aSize * 2.4) {
    attribution = { text: attributionText, x: W - m, y: H - m / 2 + aSize * 0.35, size: aSize, box: false };
  } else if (state.textMode === 'bar' && hasContent) {
    attribution = { text: attributionText, x: W - m - S * 0.015, y: H - m - aSize * 1.1, size: aSize, box: false };
  } else {
    const inset = S * 0.012;
    attribution = {
      text: attributionText,
      x: map.x + map.w - inset,
      y: map.y + map.h - inset,
      size: aSize,
      box: !fade,
    };
  }

  return { width: W, height: H, S, map, lines, divider, fade, frame, attribution };
}
