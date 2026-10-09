import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { config } from '../config';
import { getTheme, resolveColors, type ThemeColors } from '../themes';

export interface StyleOptions {
  theme: string;
  colors: Partial<ThemeColors>;
  showBuildings: boolean;
  showPaths: boolean;
  showLabels: boolean;
  lineWeight: number;
  lang: string;
}

const SOURCE = 'omt';
type Stops = [number, number][];

/** Zoomabhängige Linienbreite; `factor` darf ein Daten-Ausdruck sein (z. B. pro Straßenklasse). */
function width(stops: Stops, scale: number, factor: number | ExpressionSpecification = 1): ExpressionSpecification {
  const flat: (number | ExpressionSpecification)[] = [];
  for (const [z, w] of stops) {
    flat.push(z, typeof factor === 'number' ? w * scale * factor : ['*', w * scale, factor]);
  }
  return ['interpolate', ['exponential', 1.55], ['zoom'], ...flat] as ExpressionSpecification;
}

const tunnelOpacity = (base: number): ExpressionSpecification => [
  'case',
  ['==', ['get', 'brunnel'], 'tunnel'],
  base * 0.35,
  base,
];

const visible = (on: boolean) => (on ? 'visible' : 'none') as 'visible' | 'none';

/**
 * Erzeugt das komplette MapLibre-Style-JSON für ein Theme.
 * Alle Themes teilen sich dieselbe Ebenenstruktur (OpenMapTiles-Schema);
 * die Farbwerte stammen aus src/themes/presets/*.ts plus Nutzer-Überschreibungen.
 */
export function buildStyle(opts: StyleOptions): StyleSpecification {
  const theme = getTheme(opts.theme);
  const c = resolveColors(opts.theme, opts.colors);
  const s = opts.lineWeight * theme.roadWidth;
  const name: ExpressionSpecification = ['coalesce', ['get', `name:${opts.lang}`], ['get', 'name']];

  const layers: LayerSpecification[] = [
    { id: 'background', type: 'background', paint: { 'background-color': c.land } },
    {
      id: 'landcover-green',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'wetland', 'scrub']]],
      paint: {
        'fill-color': c.green,
        'fill-opacity': [
          'match',
          ['get', 'class'],
          'wood',
          theme.greenOpacity,
          theme.greenOpacity * 0.75,
        ],
        'fill-antialias': true,
      },
    },
    {
      id: 'landuse-green',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['cemetery', 'pitch', 'playground', 'garden', 'stadium']]],
      paint: { 'fill-color': c.green, 'fill-opacity': theme.greenOpacity * 0.8 },
    },
    {
      id: 'park',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'park',
      paint: { 'fill-color': c.green, 'fill-opacity': theme.greenOpacity },
    },
    {
      id: 'water',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'water',
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: { 'fill-color': c.water, 'fill-antialias': true },
    },
    {
      id: 'waterway',
      type: 'line',
      source: SOURCE,
      'source-layer': 'waterway',
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.water,
        'line-width': width(
          [
            [8, 0.5],
            [12, 1.2],
            [15, 3],
            [18, 8],
          ],
          1,
          ['match', ['get', 'class'], 'river', 1.6, 'canal', 1.3, 0.6],
        ),
      },
    },
    {
      id: 'building',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'building',
      minzoom: 13,
      layout: { visibility: visible(opts.showBuildings) },
      paint: {
        'fill-color': c.building,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, theme.buildingOpacity],
      },
    },
    {
      id: 'rail',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 11,
      filter: ['in', ['get', 'class'], ['literal', ['rail', 'transit']]],
      layout: { visibility: visible(opts.showPaths), 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinor,
        'line-opacity': tunnelOpacity(0.55),
        'line-width': width(
          [
            [11, 0.3],
            [14, 0.7],
            [17, 1.4],
          ],
          s,
        ),
        'line-dasharray': [3, 2],
      },
    },
    {
      id: 'path',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]],
      layout: { visibility: visible(opts.showPaths), 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinor,
        'line-opacity': tunnelOpacity(0.7),
        'line-width': width(
          [
            [13, 0.25],
            [15, 0.6],
            [17, 1.2],
            [19, 2.2],
          ],
          s,
        ),
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 10,
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'service']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinor,
        'line-opacity': tunnelOpacity(1),
        'line-width': width(
          [
            [10, 0.15],
            [13, 0.55],
            [15, 1.5],
            [17, 4.2],
            [19, 11],
          ],
          s,
          ['match', ['get', 'class'], 'service', 0.55, 1],
        ),
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 8,
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMajor,
        'line-opacity': tunnelOpacity(1),
        'line-width': width(
          [
            [8, 0.25],
            [11, 0.7],
            [13, 1.5],
            [16, 4.5],
            [18, 12],
          ],
          s,
          ['match', ['get', 'class'], 'tertiary', 0.85, 1],
        ),
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 6,
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMajor,
        'line-opacity': tunnelOpacity(1),
        'line-width': width(
          [
            [6, 0.3],
            [10, 1],
            [13, 2.2],
            [16, 6],
            [18, 16],
          ],
          s,
        ),
      },
    },
    {
      id: 'road-motorway',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 4,
      filter: ['==', ['get', 'class'], 'motorway'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMajor,
        'line-opacity': tunnelOpacity(1),
        'line-width': width(
          [
            [4, 0.3],
            [8, 0.9],
            [11, 1.8],
            [14, 3.5],
            [16, 7],
            [18, 19],
          ],
          s,
        ),
      },
    },
    ...(['point', 'line'] as const).map(
      (placement): LayerSpecification => ({
        id: `label-water-${placement}`,
        type: 'symbol',
        source: SOURCE,
        'source-layer': 'water_name',
        filter: ['==', ['geometry-type'], placement === 'line' ? 'LineString' : 'Point'],
        layout: {
          visibility: visible(opts.showLabels),
          'text-field': name,
          'text-font': ['Noto Sans Italic'],
          'text-size': 12,
          'text-letter-spacing': 0.1,
          'symbol-placement': placement,
        },
        paint: { 'text-color': c.ink, 'text-opacity': 0.65, 'text-halo-color': c.water, 'text-halo-width': 1.2 },
      }),
    ),
    {
      id: 'label-road',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk', 'minor']]],
      layout: {
        visibility: visible(opts.showLabels),
        'symbol-placement': 'line',
        'text-field': name,
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 9, 17, 12],
      },
      paint: { 'text-color': c.ink, 'text-opacity': 0.75, 'text-halo-color': c.land, 'text-halo-width': 1.4 },
    },
    {
      id: 'label-place',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'quarter']]],
      layout: {
        visibility: visible(opts.showLabels),
        'text-field': name,
        'text-font': ['match', ['get', 'class'], ['city', 'town'], ['literal', ['Noto Sans Bold']], ['literal', ['Noto Sans Regular']]],
        'text-size': ['match', ['get', 'class'], 'city', 18, 'town', 15, 'village', 12, 11],
        'text-transform': ['match', ['get', 'class'], ['suburb', 'quarter'], 'uppercase', 'none'],
        'text-letter-spacing': ['match', ['get', 'class'], ['suburb', 'quarter'], 0.15, 0.02],
        'text-max-width': 8,
      },
      paint: { 'text-color': c.ink, 'text-halo-color': c.land, 'text-halo-width': 1.6 },
    },
  ];

  return {
    version: 8,
    name: `Koordinate – ${theme.id}`,
    glyphs: config.glyphsUrl,
    sources: {
      [SOURCE]: { type: 'vector', url: config.tileJsonUrl },
    },
    layers,
  };
}
