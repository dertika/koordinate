import { formatCoords } from '../geo';
import { LANGS, getLang, onLangChange, setLang, t, type MessageKey } from '../i18n';
import { Stage } from '../map/stage';
import { store } from '../state';
import type { AppContext, TabId } from './context';
import { h, svg } from './dom';
import { icons } from './icons';
import { exportPanel } from './panel-export';
import { formatPanel } from './panel-format';
import { placePanel } from './panel-place';
import { stylePanel } from './panel-style';
import { textPanel } from './panel-text';

const TABS: { id: TabId; icon: string; label: MessageKey; render: (ctx: AppContext) => HTMLElement }[] = [
  { id: 'place', icon: icons.place, label: 'tab.place', render: placePanel },
  { id: 'format', icon: icons.format, label: 'tab.format', render: formatPanel },
  { id: 'style', icon: icons.style, label: 'tab.style', render: stylePanel },
  { id: 'text', icon: icons.text, label: 'tab.text', render: textPanel },
  { id: 'export', icon: icons.export, label: 'tab.export', render: exportPanel },
];

// ------------------------------------------------------------------ Hell/Dunkel

type UiTheme = 'light' | 'dark';
const UI_KEY = 'koordinate:ui';

function effectiveUiTheme(): UiTheme {
  const forced = document.documentElement.dataset.theme as UiTheme | undefined;
  if (forced) return forced;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initUiTheme(): void {
  try {
    const stored = localStorage.getItem(UI_KEY);
    if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored;
  } catch {
    /* ignorieren */
  }
}

function toggleUiTheme(): void {
  const next: UiTheme = effectiveUiTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(UI_KEY, next);
  } catch {
    /* ignorieren */
  }
}

// ------------------------------------------------------------------ App

export function mountApp(root: HTMLElement): void {
  initUiTheme();
  document.documentElement.lang = getLang();

  const workspace = h('main.workspace', { 'aria-label': 'Karte' });
  const header = h('header.app-header');
  const tabbar = h('nav.tabbar', { role: 'tablist' });
  const panelHost = h('div.panel-host', { role: 'tabpanel' });
  const sheet = h('aside.sheet', {}, h('div.sheet-handle', { 'aria-hidden': 'true' }), tabbar, panelHost);
  root.append(header, workspace, sheet);

  const stage = new Stage(workspace);
  let active: TabId = 'place';

  const ctx: AppContext = {
    stage,
    textTouched: false,
    showTab(id) {
      active = id;
      sheet.classList.remove('is-collapsed');
      renderTabs();
      renderPanel();
    },
    rerender: () => renderPanel(),
  };

  // Workspace-Bedienelemente
  const zoomCtl = h(
    'div.zoom-controls',
    {},
    h('button.icon-btn', { type: 'button', 'aria-label': t('place.zoomIn'), onclick: () => stage.zoomBy(0.5) }, svg(icons.plus)),
    h('button.icon-btn', { type: 'button', 'aria-label': t('place.zoomOut'), onclick: () => stage.zoomBy(-0.5) }, svg(icons.minus)),
  );
  const loading = h('div.ws-message.ws-loading', {}, t('workspace.loading'));
  const error = h('div.ws-message.ws-error', { role: 'alert' }, t('workspace.mapError'));
  workspace.append(zoomCtl, loading, error);

  // Header
  const coordsReadout = h('span.coords-readout', { 'aria-live': 'off' });
  const updateCoords = (c: [number, number]) => (coordsReadout.textContent = formatCoords(c, 'dec'));
  updateCoords(store.get().center);
  stage.onCenter(updateCoords);

  function renderHeader(): void {
    const shareBtn = h(
      'button.btn-ghost.btn-share',
      {
        type: 'button',
        title: t('header.share'),
        onclick: async () => {
          const label = shareBtn.querySelector('.label');
          try {
            await navigator.clipboard.writeText(location.href);
            if (label) label.textContent = t('header.shareDone');
          } catch {
            prompt(t('header.share'), location.href);
          }
          setTimeout(() => label && (label.textContent = t('header.share')), 1800);
        },
      },
      svg(icons.share),
      h('span.label', {}, t('header.share')),
    );

    const lang = h('select.lang-select', { 'aria-label': t('header.language') });
    for (const l of LANGS) lang.append(h('option', { value: l, selected: l === getLang() }, l.toUpperCase()));
    lang.addEventListener('change', () => setLang(lang.value as (typeof LANGS)[number]));

    header.replaceChildren(
      h(
        'div.brand',
        {},
        h('span.brand-logo', {}),
        h('div.brand-text', {}, h('span.brand-name', {}, 'Koordinate'), coordsReadout),
      ),
      h(
        'div.header-actions',
        {},
        shareBtn,
        lang,
        h(
          'button.icon-btn',
          { type: 'button', 'aria-label': t('header.uiTheme'), title: t('header.uiTheme'), onclick: toggleUiTheme },
          svg(icons.sun),
          svg(icons.moon),
        ),
        h('button.btn-primary.btn-small', { type: 'button', onclick: () => ctx.showTab('export') }, svg(icons.download), h('span', {}, t('header.export'))),
      ),
    );
    header.querySelector('.brand-logo')!.append(svg(icons.logo));
  }

  function renderTabs(): void {
    tabbar.replaceChildren(
      ...TABS.map((tab) =>
        h(
          'button.tab',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': String(tab.id === active),
            onclick: () => {
              // Auf dem Handy: aktiven Tab erneut antippen klappt das Sheet ein.
              if (tab.id === active && matchMedia('(max-width: 820px)').matches) {
                sheet.classList.toggle('is-collapsed');
                return;
              }
              ctx.showTab(tab.id);
            },
          },
          svg(tab.icon),
          h('span', {}, t(tab.label)),
        ),
      ),
    );
  }

  function renderPanel(): void {
    const scroll = panelHost.scrollTop;
    const tab = TABS.find((x) => x.id === active)!;
    panelHost.replaceChildren(tab.render(ctx));
    panelHost.scrollTop = scroll;
  }

  function renderAll(): void {
    renderHeader();
    renderTabs();
    renderPanel();
    zoomCtl.children[0].setAttribute('aria-label', t('place.zoomIn'));
    zoomCtl.children[1].setAttribute('aria-label', t('place.zoomOut'));
    loading.textContent = t('workspace.loading');
    error.textContent = t('workspace.mapError');
  }

  onLangChange(() => {
    renderAll();
    stage.refreshStyle();
  });
  window.addEventListener('hashchange', () => renderPanel());
  renderAll();
}
