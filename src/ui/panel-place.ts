import { zoomForBounds } from '../geo';
import { t } from '../i18n';
import { geocoder, type GeocodeResult } from '../search';
import { store } from '../state';
import type { AppContext } from './context';
import { h, svg } from './dom';
import { icons } from './icons';

const DEBOUNCE_MS = 650;

export function placePanel(ctx: AppContext): HTMLElement {
  const input = h('input.search-input', {
    type: 'search',
    placeholder: t('place.searchPlaceholder'),
    autocomplete: 'off',
    enterkeyhint: 'search',
    'aria-label': t('place.searchPlaceholder'),
  });
  const status = h('p.search-status', { role: 'status', 'aria-live': 'polite' });
  const list = h('ul.results', { role: 'listbox' });

  let timer: number | undefined;
  let seq = 0;

  const run = async (q: string) => {
    if (q.trim().length < 3) {
      list.replaceChildren();
      status.textContent = '';
      return;
    }
    const my = ++seq;
    status.textContent = t('place.searching');
    try {
      const results = await geocoder.search(q);
      if (my !== seq) return;
      status.textContent = results.length ? '' : t('place.noResults');
      list.replaceChildren(...results.map((r) => resultItem(r)));
    } catch (err) {
      if ((err as Error).name === 'AbortError' || my !== seq) return;
      status.textContent = t('place.error');
    }
  };

  const select = (r: GeocodeResult) => {
    const win = ctx.stage.mapWindowSize();
    const zoom = r.bbox ? Math.min(16, zoomForBounds(r.bbox, win.w, win.h)) : 14;
    const patch: Parameters<typeof store.set>[0] = { center: r.center, zoom };
    if (!ctx.textTouched) {
      patch.title = r.name;
      patch.subtitle = r.country && r.country !== r.name ? r.country : '';
    }
    store.set(patch);
    list.replaceChildren();
    status.textContent = '';
    input.value = r.name;
    input.blur();
  };

  const resultItem = (r: GeocodeResult) =>
    h(
      'li',
      {},
      h(
        'button.result',
        { type: 'button', role: 'option', onclick: () => select(r) },
        svg(icons.pin),
        h('span.result-text', {}, h('span.result-name', {}, r.name), h('span.result-context', {}, r.context)),
      ),
    );

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => run(input.value), DEBOUNCE_MS);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.clearTimeout(timer);
      const first = list.querySelector<HTMLButtonElement>('button.result');
      if (first && list.dataset.q === input.value) first.click();
      else run(input.value);
      list.dataset.q = input.value;
    } else if (e.key === 'ArrowDown') {
      list.querySelector<HTMLButtonElement>('button.result')?.focus();
      e.preventDefault();
    }
  });
  list.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll<HTMLButtonElement>('button.result')];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') items[Math.min(items.length - 1, i + 1)]?.focus();
    else if (e.key === 'ArrowUp') (i <= 0 ? input : items[i - 1]).focus();
    else return;
    e.preventDefault();
  });

  const locate = h(
    'button.btn-ghost',
    {
      type: 'button',
      onclick: () => {
        if (!navigator.geolocation) {
          status.textContent = t('place.locateError');
          return;
        }
        status.textContent = t('place.searching');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            status.textContent = '';
            store.set({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14.5 });
          },
          () => (status.textContent = t('place.locateError')),
          { enableHighAccuracy: false, timeout: 10_000 },
        );
      },
    },
    svg(icons.locate),
    t('place.locate'),
  );

  return h(
    'div.panel',
    {},
    h('h2.panel-title', {}, t('place.title')),
    h('p.panel-lead', {}, t('place.lead')),
    h('div.search', {}, svg(icons.search), input),
    status,
    list,
    locate,
    h('p.hint', {}, t('place.hint')),
    h('p.fineprint', {}, t('place.searchCredit')),
  );
}
