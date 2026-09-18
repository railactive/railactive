import type { FilterState } from './types/cycleway';

export const BASEMAP_IDS = ['dark', 'light', 'satellite', 'osm'] as const;
export type BasemapId = (typeof BASEMAP_IDS)[number];

const COLOR_BY_VALUES: FilterState['colorBy'][] = ['category', 'classification', 'developer', 'kml'];
const MANAGED_PARAMS = [
  'basemap',
  'developer',
  'category',
  'classification',
  'section',
  'q',
  'color',
  'hide',
  'segment',
  'sidebar'
];

export interface AppUrlState {
  basemap: BasemapId;
  sidebarOpen: boolean;
  filters: FilterState;
  selectedSegmentKey: string | null;
}

function getLimitedParam(params: URLSearchParams, key: string, maxLength = 200): string {
  return (params.get(key) || '').trim().slice(0, maxLength);
}

export function readUrlState(url: URL): AppUrlState {
  const params = url.searchParams;
  const requestedBasemap = params.get('basemap');
  const requestedColorBy = params.get('color');

  return {
    basemap: BASEMAP_IDS.includes(requestedBasemap as BasemapId)
      ? requestedBasemap as BasemapId
      : 'dark',
    sidebarOpen: params.get('sidebar') !== 'closed',
    filters: {
      developer: getLimitedParam(params, 'developer'),
      category: getLimitedParam(params, 'category'),
      classification: getLimitedParam(params, 'classification'),
      section: getLimitedParam(params, 'section', 50),
      searchTerm: getLimitedParam(params, 'q'),
      colorBy: COLOR_BY_VALUES.includes(requestedColorBy as FilterState['colorBy'])
        ? requestedColorBy as FilterState['colorBy']
        : 'classification',
      hiddenLegendItems: [...new Set(
        params.getAll('hide').map(value => value.trim().slice(0, 200)).filter(Boolean)
      )]
    },
    selectedSegmentKey: getLimitedParam(params, 'segment', 100) || null
  };
}

export function writeUrlState(url: URL, state: AppUrlState): string {
  const nextUrl = new URL(url);

  for (const key of MANAGED_PARAMS) {
    nextUrl.searchParams.delete(key);
  }
  nextUrl.searchParams.delete('pwd');

  if (state.basemap !== 'dark') nextUrl.searchParams.set('basemap', state.basemap);
  if (state.filters.developer) nextUrl.searchParams.set('developer', state.filters.developer);
  if (state.filters.category) nextUrl.searchParams.set('category', state.filters.category);
  if (state.filters.classification) nextUrl.searchParams.set('classification', state.filters.classification);
  if (state.filters.section) nextUrl.searchParams.set('section', state.filters.section);
  if (state.filters.searchTerm) nextUrl.searchParams.set('q', state.filters.searchTerm);
  if (state.filters.colorBy !== 'classification') nextUrl.searchParams.set('color', state.filters.colorBy);
  for (const item of state.filters.hiddenLegendItems) {
    nextUrl.searchParams.append('hide', item);
  }
  if (state.selectedSegmentKey) nextUrl.searchParams.set('segment', state.selectedSegmentKey);
  if (!state.sidebarOpen) nextUrl.searchParams.set('sidebar', 'closed');

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function hasValidMapHash(hash: string): boolean {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('map');
  if (!value) return false;

  const values = value.split('/').map(Number);
  if (values.length < 3 || values.some(number => !Number.isFinite(number))) return false;

  const [zoom, latitude, longitude] = values;
  return zoom >= 0 && zoom <= 24
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}
