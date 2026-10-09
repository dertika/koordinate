import { t } from '../i18n';
import { store } from '../state';
import { THEMES, resolveColors, type Theme } from '../themes';
import { THEME_COLOR_KEYS } from '../themes/types';
import type { AppContext } from './context';
import { section, slider, toggle } from './controls';
import { h } from './dom';

/** Kleine Vorschau-Grafik eines Themes aus seinen eigenen Farben. */
function swatch(theme: Theme): string {
  const c = theme.colors;
  return `<svg viewBox="0 0 60 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="60" height="76" fill="${c.paper}"/>
    <rect x="5" y="5" width="50" height="52" fill="${c.land}"/>
    <path d="M5 40c10-4 16 3 26-1s14-9 24-6v24H5Z" fill="${c.water}"/>
    <rect x="34" y="10" width="14" height="10" fill="${c.green}"/>
    <rect x="12" y="12" width="7" height="6" fill="${c.building}"/><rect x="21" y="22" width="6" height="7" fill="${c.building}"/>
    <path d="M5 30 55 18M22 5l8 52M5 13l22 44" stroke="${c.roadMajor}" stroke-width="1.6" fill="none"/>
    <path d="M5 22 40 57M42 5 30 57M5 48l50-20" stroke="${c.roadMinor}" stroke-width=".7" fill="none"/>
    <rect x="18" y="62" width="24" height="3" rx="1" fill="${c.ink}"/>
    <rect x="23" y="68" width="14" height="1.6" rx=".8" fill="${c.ink}" opacity=".6"/>
  </svg>`;
}

export function stylePanel(ctx: AppContext): HTMLElement {
  const s = store.get();

  const grid = h('div.theme-grid', { role: 'radiogroup', 'aria-label': t('style.themes') });
  for (const theme of THEMES) {
    const btn = h(
      'button.theme-card',
      {
        type: 'button',
        role: 'radio',
        'aria-checked': String(theme.id === s.theme),
        onclick: () => {
          store.set({ theme: theme.id, colors: {} });
          ctx.rerender();
        },
      },
      h('span.theme-swatch'),
      h('span.theme-name', {}, t(`theme.${theme.id}` as Parameters<typeof t>[0])),
    );
    btn.querySelector('.theme-swatch')!.innerHTML = swatch(theme);
    grid.append(btn);
  }

  const colors = resolveColors(s.theme, s.colors);
  const colorList = h('div.color-list');
  let pending: number | undefined;
  for (const key of THEME_COLOR_KEYS) {
    const input = h('input', { type: 'color', value: colors[key] });
    const code = h('code', {}, colors[key]);
    input.addEventListener('input', () => {
      code.textContent = input.value;
      // Farbwähler feuern sehr häufig – auf einen Frame bündeln.
      cancelAnimationFrame(pending ?? 0);
      pending = requestAnimationFrame(() => store.set({ colors: { ...store.get().colors, [key]: input.value } }));
    });
    colorList.append(
      h('label.color-row', {}, h('span.color-chip', {}, input), h('span', {}, t(`style.color.${key}`)), code),
    );
  }
  const reset = h(
    'button.btn-link',
    {
      type: 'button',
      disabled: Object.keys(s.colors).length === 0,
      onclick: () => {
        store.set({ colors: {} });
        ctx.rerender();
      },
    },
    t('style.reset'),
  );

  return h(
    'div.panel',
    {},
    h('h2.panel-title', {}, t('style.title')),
    section(t('style.themes'), grid),
    section(t('style.colors'), colorList, reset),
    section(
      t('style.details'),
      toggle(t('style.buildings'), s.showBuildings, (v) => store.set({ showBuildings: v })),
      toggle(t('style.paths'), s.showPaths, (v) => store.set({ showPaths: v })),
      toggle(t('style.labels'), s.showLabels, (v) => store.set({ showLabels: v })),
      slider(
        t('style.lineWeight'),
        s.lineWeight,
        { min: 0.5, max: 2, step: 0.05, format: (v) => `${Math.round(v * 100)} %` },
        (v) => store.set({ lineWeight: v }),
      ),
    ),
  );
}
