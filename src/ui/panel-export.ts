import { config } from '../config';
import { coordsTextFor, styleFor } from '../map/stage';
import { download, exportPoster, planExport, type ExportType } from '../export/exporter';
import { t } from '../i18n';
import { store } from '../state';
import type { AppContext } from './context';
import { section, segmented } from './controls';
import { h, svg } from './dom';
import { icons } from './icons';

let fileType: ExportType = 'png';
let dpi = 300;
let busy = false;

export function exportPanel(ctx: AppContext): HTMLElement {
  const s = store.get();
  const summary = h('p.export-summary');
  const note = h('p.export-note');
  const status = h('p.export-status', { role: 'status', 'aria-live': 'polite' });

  const updateSummary = () => {
    const snap = ctx.stage.snapshot();
    const plan = planExport(snap.state, snap.layout, dpi);
    summary.textContent = t('export.summary', {
      w: plan.pxW.toLocaleString(),
      h: plan.pxH.toLocaleString(),
      dpi: plan.dpi,
      paper: plan.paper,
    });
    note.textContent = plan.limited ? t('export.limited', { dpi: plan.dpi }) : '';
  };

  const button = h(
    'button.btn-primary.btn-block',
    {
      type: 'button',
      onclick: async () => {
        if (busy) return;
        busy = true;
        button.disabled = true;
        button.classList.add('is-busy');
        try {
          const snap = ctx.stage.snapshot();
          const result = await exportPoster(
            {
              style: styleFor(snap.state),
              center: snap.center,
              zoom: snap.zoom,
              state: snap.state,
              layout: snap.layout,
              coordsText: coordsTextFor(snap.state, snap.center),
            },
            fileType,
            dpi,
            (step) => (status.textContent = t(`export.${step}`)),
          );
          download(result.blob, result.filename);
          status.textContent = `${t('export.done')} (${(result.blob.size / 1e6).toFixed(1)} MB)`;
        } catch (err) {
          console.error(err);
          status.textContent = t('export.failed', { msg: (err as Error).message });
        } finally {
          busy = false;
          button.disabled = false;
          button.classList.remove('is-busy');
        }
      },
    },
    svg(icons.download),
    t('export.download'),
  );

  updateSummary();

  return h(
    'div.panel',
    {},
    h('h2.panel-title', {}, t('export.title')),
    h('p.panel-lead', {}, t('export.lead')),
    section(
      t('export.settings'),
      segmented<ExportType>(
        t('export.fileType'),
        [
          { value: 'png', label: 'PNG' },
          { value: 'pdf', label: 'PDF' },
        ],
        fileType,
        (v) => (fileType = v),
      ),
      segmented(
        t('export.quality'),
        (['150', '300', '400'] as const).map((v) => ({ value: v, label: t(`export.dpi.${v}`) })),
        String(dpi) as '150' | '300' | '400',
        (v) => {
          dpi = Number(v);
          updateSummary();
        },
      ),
      segmented(
        t('export.attribution'),
        [
          { value: 'normal', label: t('export.attribution.normal') },
          { value: 'small', label: t('export.attribution.small') },
        ],
        s.attribution,
        (v) => store.set({ attribution: v }),
      ),
      h('p.fineprint', {}, config.attribution),
    ),
    h('div.export-box', {}, summary, note, button, status),
    h('p.fineprint', {}, t('export.privacy')),
  );
}
