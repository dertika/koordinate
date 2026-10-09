import type { ThemeColors } from '../themes';
import type { PosterLayout, TextLine } from './layout';

export interface DrawOptions {
  /** Gerätepixel pro logischem Pixel. */
  scale: number;
  offsetX?: number;
  offsetY?: number;
  /** Fertig gerenderte Karte (Export). Ohne Bild bleibt das Kartenfenster transparent (Vorschau). */
  mapImage?: CanvasImageSource;
  ink: string;
}

const supportsLetterSpacing =
  typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function drawLine(ctx: CanvasRenderingContext2D, line: TextLine): void {
  ctx.font = line.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const chars = Array.from(line.text);
  const natural = ctx.measureText(line.text).width;
  const total = natural + line.tracking * Math.max(0, chars.length - 1);
  const startX = line.align === 'center' ? line.x - total / 2 : line.x;

  if (line.tracking === 0) {
    ctx.fillText(line.text, startX, line.baseline);
  } else if (supportsLetterSpacing) {
    ctx.letterSpacing = `${line.tracking}px`;
    ctx.fillText(line.text, startX, line.baseline);
    ctx.letterSpacing = '0px';
  } else {
    let x = startX;
    for (const ch of chars) {
      ctx.fillText(ch, x, line.baseline);
      x += ctx.measureText(ch).width + line.tracking;
    }
  }
}

/**
 * Zeichnet Papier, Text, Rahmen und Attribution.
 * Wird identisch für die Live-Vorschau (Overlay über der interaktiven Karte)
 * und den hochaufgelösten Export verwendet – so entspricht das Ergebnis exakt der Vorschau.
 */
export function drawPoster(
  ctx: CanvasRenderingContext2D,
  layout: PosterLayout,
  colors: ThemeColors,
  opts: DrawOptions,
): void {
  const { width: W, height: H, map } = layout;
  ctx.save();
  ctx.setTransform(opts.scale, 0, 0, opts.scale, opts.offsetX ?? 0, opts.offsetY ?? 0);

  // Papier (in der Vorschau mit Aussparung für die Karte).
  ctx.fillStyle = colors.paper;
  if (opts.mapImage) {
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(opts.mapImage, map.x, map.y, map.w, map.h);
  } else {
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(map.x, map.y, map.w, map.h);
    ctx.fill('evenodd');
  }

  // Weicher Übergang, wenn der Text auf der Karte steht.
  if (layout.fade) {
    const { top, solid, bottom } = layout.fade;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    const span = bottom - top || 1;
    g.addColorStop(0, hexToRgba(colors.paper, 0));
    g.addColorStop(Math.min(1, (solid - top) / span), hexToRgba(colors.paper, 0.94));
    g.addColorStop(1, hexToRgba(colors.paper, 1));
    ctx.fillStyle = g;
    ctx.fillRect(map.x, top, map.w, bottom - top);
  }

  if (layout.frame) {
    const { rect, thickness } = layout.frame;
    ctx.strokeStyle = opts.ink;
    ctx.lineWidth = thickness;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  ctx.fillStyle = opts.ink;
  for (const line of layout.lines) drawLine(ctx, line);

  if (layout.divider) {
    const d = layout.divider;
    ctx.fillRect(d.x, d.y - d.thickness / 2, d.w, d.thickness);
  }

  // Attribution – dezent, aber immer vorhanden.
  const a = layout.attribution;
  ctx.font = `400 ${a.size}px "Inter Variable", "Inter", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  if (a.box) {
    const w = ctx.measureText(a.text).width;
    const pad = a.size * 0.45;
    ctx.fillStyle = hexToRgba(colors.paper, 0.78);
    ctx.fillRect(a.x - w - pad, a.y - a.size - pad * 0.4, w + pad * 2, a.size + pad * 1.2);
  }
  ctx.fillStyle = hexToRgba(colors.ink, 0.62);
  ctx.fillText(a.text, a.x, a.y);

  ctx.restore();
}
