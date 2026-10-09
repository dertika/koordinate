import { FORMATS, getFormat, isSquare, paperSize } from '../formats';
import { t } from '../i18n';
import { store, type MarginId, type TextMode } from '../state';
import type { AppContext } from './context';
import { section, segmented, toggle } from './controls';
import { h } from './dom';

export function formatPanel(ctx: AppContext): HTMLElement {
  const s = store.get();
  const square = isSquare(getFormat(s.format));

  const cards = h('div.format-grid', { role: 'radiogroup', 'aria-label': t('format.size') });
  for (const f of FORMATS) {
    const landscape = s.orientation === 'landscape' && !isSquare(f);
    const rw = landscape ? f.h : f.w;
    const rh = landscape ? f.w : f.h;
    const max = 34;
    const k = max / Math.max(rw, rh);
    cards.append(
      h(
        'button.format-card',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': String(f.id === s.format),
          onclick: () => {
            store.set({ format: f.id });
            ctx.rerender();
          },
        },
        h('span.format-shape', { style: `width:${rw * k}px;height:${rh * k}px` }),
        h('span.format-name', {}, f.label),
        h('span.format-dim', {}, isSquare(f) ? t('format.square') : `${f.w / 10} × ${f.h / 10} cm`),
      ),
    );
  }

  const orientation = segmented(
    t('format.orientation'),
    [
      { value: 'portrait', label: t('format.portrait') },
      { value: 'landscape', label: t('format.landscape') },
    ],
    s.orientation,
    (v) => {
      store.set({ orientation: v });
      ctx.rerender();
    },
  );
  if (square) orientation.classList.add('is-disabled');
  orientation.querySelectorAll('input').forEach((i) => (i.disabled = square));

  const paper = paperSize(s.format, s.orientation);

  return h(
    'div.panel',
    {},
    h('h2.panel-title', {}, t('format.title')),
    section(
      t('format.size'),
      cards,
      orientation,
      h('p.fineprint', {}, `${paper.w} × ${paper.h} mm`),
    ),
    section(
      t('format.layout'),
      segmented<MarginId>(
        t('format.margin'),
        (['none', 's', 'm', 'l'] as MarginId[]).map((v) => ({ value: v, label: t(`format.margin.${v}`) })),
        s.margin,
        (v) => store.set({ margin: v }),
      ),
      segmented<TextMode>(
        t('format.textMode'),
        (['bar', 'overlay', 'none'] as TextMode[]).map((v) => ({ value: v, label: t(`format.textMode.${v}`) })),
        s.textMode,
        (v) => store.set({ textMode: v }),
      ),
      toggle(t('format.frame'), s.frameLine, (v) => store.set({ frameLine: v })),
    ),
  );
}
