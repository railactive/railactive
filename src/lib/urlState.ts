import type { FilterState } from './types/cycleway';

export const BASEMAP_IDS = ['light', 'dark', 'satellite', 'opencyclemap', 'osm'] as const;
export type BasemapId = (typeof BASEMAP_IDS)[number];
export type PrintMode = 'legend' | 'clean' | null;

const COLOR_BY_VALUES: FilterState['colorBy'][] = ['category', 'classification', 'infrastructure_type_detailed', 'detailed_classification', 'developer', 'status', 'kml'];
const MANAGED_PARAMS = [
  'basemap',
  'developer',
  'category',
  'classification',
  'section',
  'status',
  'q',
  'color',
  'hide',
  'superseded',
  'pending',
  'segment',
  'sidebar',
  'ncn',
  'openroads',
  'studyarea',
  'labels',
  'print',
  'ui'
];

export interface AppUrlState {
  basemap: BasemapId;
  sidebarOpen: boolean;
  filters: FilterState;
  selectedSegmentKey: string | null;
  showNcn: boolean;
  showOpenRoads: boolean;
  showStudyArea: boolean;
  showPlaceNames: boolean;
  printMode: PrintMode;
}

function getLimitedParam(params: URLSearchParams, key: string, maxLength = 200): string {
  return (params.get(key) || '').trim().slice(0, maxLength);
}

export function readUrlState(url: URL): AppUrlState {
  const params = url.searchParams;
  const requestedBasemap = params.get('basemap');
  const requestedColorBy = params.get('color');
  const printParam = (params.get('print') || '').trim().toLowerCase();
  const uiParam = (params.get('ui') || '').trim().toLowerCase();
  const hasPrintParam = params.has('print');

  let printMode: PrintMode = null;
  if (printParam === 'clean' || uiParam === '0' || uiParam === 'false') {
    printMode = 'clean';
  } else if (
    printParam === 'true'
    || printParam === '1'
    || printParam === 'legend'
    || (hasPrintParam && printParam === '')
  ) {
    printMode = 'legend';
  }

  return {
    basemap: BASEMAP_IDS.includes(requestedBasemap as BasemapId)
      ? requestedBasemap as BasemapId
      : 'light',
    sidebarOpen: params.get('sidebar') !== 'closed',
    filters: {
      developer: getLimitedParam(params, 'developer'),
      category: getLimitedParam(params, 'category'),
      classification: getLimitedParam(params, 'classification'),
      section: getLimitedParam(params, 'section', 50),
      status: getLimitedParam(params, 'status', 50),
      searchTerm: getLimitedParam(params, 'q'),
      colorBy: COLOR_BY_VALUES.includes(requestedColorBy as FilterState['colorBy'])
        ? requestedColorBy as FilterState['colorBy']
        : 'classification',
      hiddenLegendItems: [...new Set(
        params.getAll('hide').map(value => value.trim().slice(0, 200)).filter(Boolean)
      )],
      showSuperseded: params.get('superseded') === 'true',
      showPending: params.get('pending') === 'true'
    },
    selectedSegmentKey: getLimitedParam(params, 'segment', 100) || null,
    showNcn: params.get('ncn') === 'true' || params.get('ncn') === '1',
    showOpenRoads: params.get('openroads') === 'true',
    showStudyArea: params.get('studyarea') === 'true' || params.get('study_area') === 'true',
    showPlaceNames: params.get('labels') !== '0' && params.get('labels') !== 'false',
    printMode
  };
}

export function writeUrlState(url: URL, state: AppUrlState): string {
  const nextUrl = new URL(url);

  for (const key of MANAGED_PARAMS) {
    nextUrl.searchParams.delete(key);
  }
  nextUrl.searchParams.delete('pwd');

  if (state.basemap !== 'light') nextUrl.searchParams.set('basemap', state.basemap);
  if (state.filters.developer) nextUrl.searchParams.set('developer', state.filters.developer);
  if (state.filters.category) nextUrl.searchParams.set('category', state.filters.category);
  if (state.filters.classification) nextUrl.searchParams.set('classification', state.filters.classification);
  if (state.filters.section) nextUrl.searchParams.set('section', state.filters.section);
  if (state.filters.status) nextUrl.searchParams.set('status', state.filters.status);
  if (state.filters.searchTerm) nextUrl.searchParams.set('q', state.filters.searchTerm);
  if (state.filters.colorBy !== 'classification') nextUrl.searchParams.set('color', state.filters.colorBy);
  for (const item of state.filters.hiddenLegendItems) {
    nextUrl.searchParams.append('hide', item);
  }
  if (state.filters.showSuperseded) nextUrl.searchParams.set('superseded', 'true');
  if (state.filters.showPending) nextUrl.searchParams.set('pending', 'true');
  if (state.selectedSegmentKey) nextUrl.searchParams.set('segment', state.selectedSegmentKey);
  if (!state.sidebarOpen) nextUrl.searchParams.set('sidebar', 'closed');
  if (state.showNcn) nextUrl.searchParams.set('ncn', 'true');
  if (state.showOpenRoads) nextUrl.searchParams.set('openroads', 'true');
  if (state.showStudyArea) nextUrl.searchParams.set('studyarea', 'true');
  if (!state.showPlaceNames) nextUrl.searchParams.set('labels', '0');
  if (state.printMode === 'legend') nextUrl.searchParams.set('print', 'true');
  else if (state.printMode === 'clean') nextUrl.searchParams.set('print', 'clean');

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
