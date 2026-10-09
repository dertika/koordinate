import { coordsTextFor } from '../map/stage';
import { t } from '../i18n';
import { FONT_PRESETS, cssFont } from '../poster/fonts';
import { store } from '../state';
import type { AppContext } from './context';
import { section, segmented, slider, textInput, toggle } from './controls';
import { h } from './dom';

export function textPanel(ctx: AppContext): HTMLElement {
  const s = store.get();
  const touch = () => (ctx.textTouched = true);

  const fonts = h('div.font-grid', { role: 'radiogroup', 'aria-label': t('text.font') });
  for (const preset of FONT_PRESETS) {
    const sample = h('span.font-sample', { style: `font:${cssFont(preset.title, 26)}` }, preset.title.upper ? 'AB' : 'Ab');
    fonts.append(
      h(
        'button.font-card',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': String(preset.id === s.font),
          onclick: () => {
            store.set({ font: preset.id });
            ctx.rerender();
          },
        },
        sample,
        h('span.font-name', {}, t(preset.labelKey)),
      ),
    );
  }

  const coordsOverride = textInput(
    t('text.coordsOverride'),
    s.coordsText,
    (v) => store.set({ coordsText: v }),
    { placeholder: coordsTextFor({ ...s, coordsText: '' }), maxLength: 80 },
  );
  coordsOverride.classList.toggle('is-disabled', !s.showCoords);

  return h(
    'div.panel',
    {},
    h('h2.panel-title', {}, t('text.title')),
    section(
      t('text.title'),
      textInput(t('text.titleLabel'), s.title, (v) => {
        touch();
        store.set({ title: v });
      }),
      textInput(t('text.subtitleLabel'), s.subtitle, (v) => {
        touch();
        store.set({ subtitle: v });
      }),
      textInput(t('text.dedicationLabel'), s.dedication, (v) => store.set({ dedication: v }), {
        placeholder: t('text.dedicationPlaceholder'),
        maxLength: 160,
      }),
    ),
    section(
      t('text.coords'),
      toggle(t('text.coords'), s.showCoords, (v) => {
        store.set({ showCoords: v });
        ctx.rerender();
      }),
      segmented(
        t('text.coordsFormat'),
        [
          { value: 'dms', label: t('text.coords.dms') },
          { value: 'dec', label: t('text.coords.dec') },
        ],
        s.coordsStyle,
        (v) => store.set({ coordsStyle: v }),
      ),
      coordsOverride,
    ),
    section(
      t('text.font'),
      fonts,
      slider(
        t('text.size'),
        s.textScale,
        { min: 0.6, max: 1.5, step: 0.05, format: (v) => `${Math.round(v * 100)} %` },
        (v) => store.set({ textScale: v }),
      ),
      segmented(
        t('text.align'),
        [
          { value: 'center', label: t('text.align.center') },
          { value: 'left', label: t('text.align.left') },
        ],
        s.align,
        (v) => store.set({ align: v }),
      ),
    ),
  );
}
