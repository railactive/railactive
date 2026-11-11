import type { CyclewaySegmentProperties, FilterState } from './types/cycleway';

// Single source of truth for every colour drawn on the map, the legend and
// the sidebar composition bar. Raw attribute values are grouped into a small
// number of visually distinct classes; fine-grained values remain visible in
// popups and the detail panel.

export type ColorBy = FilterState['colorBy'];
type GroupField = 'classification' | 'category' | 'osm_infrastructure' | 'developer' | 'status';

export interface ColorGroup {
  label: string;
  color: string;
  /** Raw attribute values in this group. Omitted on the scheme's one catch-all group. */
  values?: string[];
  /** Keep this row visible in the legend even when 0 km match in the current dataset. */
  alwaysShow?: boolean;
}

interface ColorScheme {
  field: GroupField;
  groups: ColorGroup[];
}

const HS2_ORANGE = '#c2410c';
const HS2_GREENWAY = '#0f766e';
const HS2_MAT = '#d97706';
const GREEN = '#14532d';
const LIGHT_GREEN = '#22c55e';
const BLUE = '#1d4ed8';
const TEAL = '#0f766e';
const PURPLE = '#7c3aed';
const YELLOW = '#b45309';
const GREY = '#64748b';

const SUPERSEDED_COLOR = '#94a3b8';
const PENDING_COLOR = '#a855f7';
const OLD_ALIGNMENT = 'Old active travel route alignment';
export const SUPERSEDED_LABEL = 'Superseded';
export const PENDING_LABEL = 'Pending';
export const INTERVENTION_COLOR = '#0f766e';

export function formatStatusLabel(status?: string): string {
  if (!status) return '';
  if (status.toLowerCase() === 'alternative') return 'Complimentary';
  if (status.toLowerCase() === 'pending') return 'Pending';
  return status;
}

const SENTENCE_CASE_CLASSIFICATIONS: Record<string, string> = {
  'New Greenway': 'New greenway',
  'Canal Towpath Upgrade': 'Canal towpath upgrade',
  'Local Road Quietway': 'Local road quietway',
  'Quiet Lane': 'Quiet lane',
  'Main Road-Cycle tracks': 'Main road - cycle tracks',
  'Existing Footway Level Cycle Track': 'Existing footway level cycle track',
  'Proposed Footway Level Cycle Track': 'Proposed footway level cycle track'
};

export function normalizeClassification(c?: string): string {
  if (!c) return '';
  if (
    c === 'HS2 aligned route'
    || c === 'HS2 Aligned Route'
    || c === 'HS2 aligned greenway'
    || c === 'HS2 Aligned Greenway'
    || c === 'Repurposed HS2 TCR'
    || c === 'Repurposed HS2 temporary construction road (TCR)'
    || c === 'HS2 Delivery'
    || c === 'HS2 Haulage'
    || c === 'HS2 delivered greenway'
    || c === 'HS2 Legacy'
    || c === 'Dual Use of HS2 Maintenance Access Tracks (MATs)'
    || c === 'Dual use of HS2 maintenance access tracks (MATs)'
    || c === 'HS2 MAT'
  ) {
    return 'HS2 aligned route';
  }
  return SENTENCE_CASE_CLASSIFICATIONS[c] || c;
}

export function classificationSynonyms(c: string): string[] {
  if (
    c === 'HS2 aligned route'
    || c === 'HS2 Aligned Route'
    || c === 'HS2 aligned greenway'
    || c === 'HS2 Aligned Greenway'
    || c === 'Repurposed HS2 TCR'
    || c === 'Repurposed HS2 temporary construction road (TCR)'
    || c === 'HS2 Haulage'
    || c === 'HS2 Delivery'
    || c === 'HS2 delivered greenway'
    || c === 'HS2 Legacy'
    || c === 'Dual Use of HS2 Maintenance Access Tracks (MATs)'
    || c === 'Dual use of HS2 maintenance access tracks (MATs)'
    || c === 'HS2 MAT'
  ) {
    return [
      'HS2 aligned route',
      'HS2 Aligned Route',
      'HS2 aligned greenway',
      'HS2 Aligned Greenway',
      'Repurposed HS2 TCR',
      'Repurposed HS2 temporary construction road (TCR)',
      'HS2 Haulage',
      'HS2 Delivery',
      'HS2 delivered greenway',
      'HS2 Legacy',
      'Dual Use of HS2 Maintenance Access Tracks (MATs)',
      'Dual use of HS2 maintenance access tracks (MATs)',
      'HS2 MAT'
    ];
  }
  for (const [raw, normalized] of Object.entries(SENTENCE_CASE_CLASSIFICATIONS)) {
    if (c === raw || c === normalized) {
      return [raw, normalized];
    }
  }
  return [c];
}

const SCHEMES: Record<Exclude<ColorBy, 'kml'>, ColorScheme> = {
  classification: {
    field: 'classification',
    groups: [
      {
        label: 'HS2 aligned route',
        color: HS2_ORANGE,
        alwaysShow: true,
        values: [
          'HS2 aligned route',
          'HS2 Aligned Route',
          'HS2 aligned greenway',
          'HS2 Aligned Greenway',
          'Repurposed HS2 TCR',
          'Repurposed HS2 temporary construction road (TCR)',
          'HS2 Haulage',
          'HS2 Delivery',
          'HS2 delivered greenway',
          'HS2 Legacy',
          'Dual Use of HS2 Maintenance Access Tracks (MATs)',
          'Dual use of HS2 maintenance access tracks (MATs)',
          'HS2 MAT'
        ]
      },
      { label: 'New greenway', color: GREEN, values: ['New Greenway', 'New greenway'] },
      { label: 'Path & towpath upgrades', color: LIGHT_GREEN, values: ['Upgrade PROW', 'Canal Towpath Upgrade', 'Canal towpath upgrade'] },
      { label: 'Quiet roads & lanes', color: BLUE, values: ['Local Road Quietway', 'Local road quietway', 'Quiet Lane', 'Quiet lane', 'Town or village centre'] },
      {
        label: 'Cycle tracks',
        color: PURPLE,
        values: [
          'Main Road-Cycle tracks',
          'Main road - cycle tracks',
          'Existing Footway Level Cycle Track',
          'Existing footway level cycle track',
          'Proposed Footway Level Cycle Track',
          'Proposed footway level cycle track'
        ]
      },
      { label: 'Existing routes', color: GREY }
    ]
  },
  infrastructure_type_detailed: {
    field: 'classification',
    groups: [
      {
        label: 'Repurposed HS2 TCR',
        color: HS2_ORANGE,
        alwaysShow: true,
        values: [
          'Repurposed HS2 TCR',
          'Repurposed HS2 temporary construction road (TCR)',
          'HS2 Haulage',
          'HS2 Delivery'
        ]
      },
      {
        label: 'HS2 delivered greenway',
        color: HS2_GREENWAY,
        alwaysShow: true,
        values: [
          'HS2 delivered greenway',
          'HS2 Legacy'
        ]
      },
      {
        label: 'Dual use of HS2 maintenance access tracks (MATs)',
        color: HS2_MAT,
        values: [
          'Dual Use of HS2 Maintenance Access Tracks (MATs)',
          'Dual use of HS2 maintenance access tracks (MATs)',
          'HS2 MAT'
        ]
      },
      { label: 'New greenway', color: GREEN, values: ['New Greenway', 'New greenway'] },
      { label: 'Path & towpath upgrades', color: LIGHT_GREEN, values: ['Upgrade PROW', 'Canal Towpath Upgrade', 'Canal towpath upgrade'] },
      { label: 'Quiet roads & lanes', color: BLUE, values: ['Local Road Quietway', 'Local road quietway', 'Quiet Lane', 'Quiet lane', 'Town or village centre'] },
      {
        label: 'Cycle tracks',
        color: PURPLE,
        values: [
          'Main Road-Cycle tracks',
          'Main road - cycle tracks',
          'Existing Footway Level Cycle Track',
          'Existing footway level cycle track',
          'Proposed Footway Level Cycle Track',
          'Proposed footway level cycle track'
        ]
      },
      { label: 'Existing routes', color: GREY }
    ]
  },
  detailed_classification: {
    field: 'classification',
    groups: [
      {
        label: 'Repurposed HS2 TCR',
        color: HS2_ORANGE,
        alwaysShow: true,
        values: [
          'Repurposed HS2 TCR',
          'Repurposed HS2 temporary construction road (TCR)',
          'HS2 Haulage',
          'HS2 Delivery'
        ]
      },
      {
        label: 'HS2 delivered greenway',
        color: HS2_GREENWAY,
        alwaysShow: true,
        values: [
          'HS2 delivered greenway',
          'HS2 Legacy'
        ]
      },
      {
        label: 'Dual use of HS2 maintenance access tracks (MATs)',
        color: HS2_MAT,
        values: [
          'Dual Use of HS2 Maintenance Access Tracks (MATs)',
          'Dual use of HS2 maintenance access tracks (MATs)',
          'HS2 MAT'
        ]
      },
      { label: 'New greenway', color: GREEN, values: ['New Greenway', 'New greenway'] },
      { label: 'Path & towpath upgrades', color: LIGHT_GREEN, values: ['Upgrade PROW', 'Canal Towpath Upgrade', 'Canal towpath upgrade'] },
      { label: 'Quiet roads & lanes', color: BLUE, values: ['Local Road Quietway', 'Local road quietway', 'Quiet Lane', 'Quiet lane', 'Town or village centre'] },
      {
        label: 'Cycle tracks',
        color: PURPLE,
        values: [
          'Main Road-Cycle tracks',
          'Main road - cycle tracks',
          'Existing Footway Level Cycle Track',
          'Existing footway level cycle track',
          'Proposed Footway Level Cycle Track',
          'Proposed footway level cycle track'
        ]
      },
      { label: 'Existing routes', color: GREY }
    ]
  },
  category: {
    field: 'category',
    groups: [
      {
        label: 'Traffic-free path',
        color: GREEN,
        values: [
          'Traffic-free path away from highway',
          'HS2 aligned route',
          'Repurposed HS2 temporary construction road (TCR)',
          'Repurposed HS2 TCR',
          'Cycleway beside HS2',
          'HS2 delivered greenway',
          'Dual Use of HS2 Maintenance Access Tracks (MATs)',
          'Dual use of HS2 maintenance access tracks (MATs)'
        ]
      },
      { label: 'Canal towpath', color: LIGHT_GREEN, values: ['Canal tow path or new path close by canal'] },
      { label: '20mph / protected on-road', color: BLUE, values: ['20mph and traffic calmed or protected cycle lane'] },
      { label: 'Other', color: GREY }
    ]
  },
  osm_infrastructure: {
    field: 'osm_infrastructure',
    groups: [
      { label: 'Cycle track / cycleway', color: PURPLE, values: ['Cycle track / cycleway'] },
      { label: 'Shared path / bridleway', color: GREEN, values: ['Shared path / bridleway'] },
      { label: 'Canal towpath', color: LIGHT_GREEN, values: ['Canal towpath'] },
      { label: 'Footpath / farm track', color: HS2_MAT, values: ['Footpath / farm track'] },
      { label: 'Quiet / local road', color: BLUE, values: ['Quiet / local road'] },
      { label: 'Main road (A / B / C road)', color: '#dc2626', values: ['Main road (A / B / C road)'] },
      { label: 'Greenfield / no existing way', color: GREY }
    ]
  },
  developer: {
    field: 'developer',
    groups: [
      { label: 'HS2', color: HS2_ORANGE, values: ['HS2'] },
      { label: 'Local authority', color: GREEN, values: ['Local Authority'] },
      { label: 'Canal & River Trust', color: TEAL, values: ['Canals & River Trust', 'Canals &amp; River Trust'] },
      { label: 'DfT', color: BLUE, values: ['DfT'] },
      { label: 'Sustrans', color: YELLOW, values: ['Sustrans'] },
      { label: 'Other', color: GREY }
    ]
  },
  status: {
    field: 'status',
    groups: [
      // Unset status is treated as preferred, matching the status filter
      { label: 'Preferred', color: BLUE },
      { label: 'Complimentary', color: YELLOW, values: ['alternative'] },
      { label: PENDING_LABEL, color: PENDING_COLOR, values: ['pending'] },
      { label: SUPERSEDED_LABEL, color: SUPERSEDED_COLOR, values: ['superseded'] }
    ]
  }
};

/** Reference (context) layers: kept off the route hues so they never read as proposed routes. */
export const REFERENCE_COLORS = {
  // NCN: traffic-free pine/teal, on-road crimson
  ncnOffRoad: '#0f766e',
  ncnOnRoad: '#b91c1c',
  roadHaulage: '#c2410c',
  roadMajor: '#475569',
  roadMinor: '#64748b',
  roadLocal: '#94a3b8',
  roadCasing: '#ffffff',
  studyArea: '#4f46e5',
  studyAreaOutline: '#4338ca'
};

export function isSuperseded(props: CyclewaySegmentProperties): boolean {
  return props.folder === 'Superseded'
    || props.status === 'superseded'
    || props.category === OLD_ALIGNMENT
    || props.classification === OLD_ALIGNMENT;
}

export function isPending(props: CyclewaySegmentProperties): boolean {
  return props.folder === 'Pending' || props.status === 'pending';
}

const SUPERSEDED_EXPRESSION = [
  'any',
  ['==', ['coalesce', ['get', 'folder'], ''], 'Superseded'],
  ['==', ['coalesce', ['get', 'status'], ''], 'superseded'],
  ['==', ['coalesce', ['get', 'category'], ''], OLD_ALIGNMENT],
  ['==', ['coalesce', ['get', 'classification'], ''], OLD_ALIGNMENT]
];

const PENDING_EXPRESSION = [
  'any',
  ['==', ['coalesce', ['get', 'folder'], ''], 'Pending'],
  ['==', ['coalesce', ['get', 'status'], ''], 'pending']
];

// Superseded (old) and Pending alignments are opt-in: they appear only when their row is ticked in
// the alignment-status legend, and are absent from every other view
export function showsSuperseded(f: FilterState): boolean {
  return f.colorBy === 'status' && f.showSuperseded;
}

export function showsPending(f: FilterState): boolean {
  return f.colorBy === 'status' && f.showPending;
}

/** Legend groups switched off, including the opt-in Superseded and Pending groups while unticked. */
export function effectiveHiddenGroups(f: FilterState): string[] {
  const hidden = [...f.hiddenLegendItems];
  if (f.colorBy === 'status') {
    if (!f.showPending && !hidden.includes(PENDING_LABEL)) hidden.push(PENDING_LABEL);
    if (!f.showSuperseded && !hidden.includes(SUPERSEDED_LABEL)) hidden.push(SUPERSEDED_LABEL);
  }
  return hidden;
}

/** MapLibre filter clauses for superseded/pending visibility and the alignment status filter. */
export function statusFilterExpressions(f: FilterState): any[] {
  const expressions: any[] = [];
  if (!showsSuperseded(f)) expressions.push(['!', SUPERSEDED_EXPRESSION]);
  if (!showsPending(f)) expressions.push(['!', PENDING_EXPRESSION]);
  if (f.status) {
    // The status filter narrows current alignments; ticked superseded/pending ones stay visible
    const match = ['==', ['coalesce', ['get', 'status'], 'preferred'], f.status];
    const optIn: any[] = [match];
    if (showsSuperseded(f)) optIn.push(SUPERSEDED_EXPRESSION);
    if (showsPending(f)) optIn.push(PENDING_EXPRESSION);
    expressions.push(optIn.length > 1 ? ['any', ...optIn] : match);
  }
  return expressions;
}

export function schemeFor(colorBy: ColorBy): ColorScheme {
  // KML mode draws the source colours but groups the legend by classification
  return colorBy === 'kml' ? SCHEMES.classification : SCHEMES[colorBy];
}

export function groupsFor(colorBy: ColorBy): ColorGroup[] {
  return schemeFor(colorBy).groups;
}

function catchAllGroup(groups: ColorGroup[]): ColorGroup {
  return groups.find(g => !g.values)!;
}

export function groupFor(colorBy: ColorBy, props: CyclewaySegmentProperties): ColorGroup {
  const { field, groups } = schemeFor(colorBy);
  const value = props[field] || '';
  return groups.find(g => g.values?.includes(value)) ?? catchAllGroup(groups);
}

/** MapLibre colour expression for the active colour scheme. */
export function colorExpression(colorBy: ColorBy): any {
  const { field, groups } = schemeFor(colorBy);
  const catchAll = catchAllGroup(groups).color;
  if (colorBy === 'kml') return ['coalesce', ['get', 'color'], catchAll];

  const pairs = groups.flatMap(g => (g.values ?? []).flatMap(v => [v, g.color]));
  return ['match', ['coalesce', ['get', field], ''], ...pairs, catchAll];
}

/** MapLibre filter clauses that exclude the given hidden legend groups. */
export function hiddenGroupExpressions(colorBy: ColorBy, hiddenLabels: string[]): any[] {
  const { field, groups } = schemeFor(colorBy);
  const value = ['coalesce', ['get', field], ''];
  const listed = groups.flatMap(g => g.values ?? []);

  return hiddenLabels.flatMap(label => {
    const group = groups.find(g => g.label === label);
    if (!group) return [];
    // Hiding the catch-all keeps only features whose value is explicitly listed
    return group.values
      ? [['!', ['in', value, ['literal', group.values]]]]
      : [['in', value, ['literal', listed]]];
  });
}
