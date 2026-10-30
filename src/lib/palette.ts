import type { CyclewaySegmentProperties, FilterState } from './types/cycleway';

// Single source of truth for every colour drawn on the map, the legend and
// the sidebar composition bar. Raw attribute values are grouped into a small
// number of visually distinct classes; fine-grained values remain visible in
// popups and the detail panel.

export type ColorBy = FilterState['colorBy'];
type GroupField = 'classification' | 'category' | 'developer' | 'status';

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

const HS2_ORANGE = '#f97316';
const HS2_GREENWAY = '#84cc16';
const HS2_MAT = '#fb923c';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const TEAL = '#2dd4bf';
const YELLOW = '#eab308';
const GREY = '#94a3b8';

const SUPERSEDED_COLOR = '#64748b';
const OLD_ALIGNMENT = 'Old active travel route alignment';
export const SUPERSEDED_LABEL = 'Superseded';
export const INTERVENTION_COLOR = '#f8fafc';

export function normalizeClassification(c?: string): string {
  if (!c) return '';
  if (
    c === 'HS2 Delivery'
    || c === 'HS2 Haulage'
    || c === 'Repurposed HS2 temporary construction road (TCR)'
  ) {
    return 'Repurposed HS2 TCR';
  }
  if (c === 'HS2 Legacy') {
    return 'HS2 delivered greenway';
  }
  if (c === 'HS2 MAT') {
    return 'Dual Use of HS2 Maintenance Access Tracks (MATs)';
  }
  return c;
}

export function classificationSynonyms(c: string): string[] {
  if (
    c === 'Repurposed HS2 TCR'
    || c === 'Repurposed HS2 temporary construction road (TCR)'
    || c === 'HS2 Haulage'
    || c === 'HS2 Delivery'
  ) {
    return [
      'Repurposed HS2 TCR',
      'Repurposed HS2 temporary construction road (TCR)',
      'HS2 Haulage',
      'HS2 Delivery'
    ];
  }
  if (c === 'HS2 delivered greenway' || c === 'HS2 Legacy') {
    return ['HS2 delivered greenway', 'HS2 Legacy'];
  }
  if (c === 'Dual Use of HS2 Maintenance Access Tracks (MATs)' || c === 'HS2 MAT') {
    return ['Dual Use of HS2 Maintenance Access Tracks (MATs)', 'HS2 MAT'];
  }
  return [c];
}

const SCHEMES: Record<GroupField, ColorScheme> = {
  classification: {
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
        values: ['HS2 delivered greenway', 'HS2 Legacy']
      },
      {
        label: 'Dual Use of HS2 Maintenance Access Tracks (MATs)',
        color: HS2_MAT,
        alwaysShow: true,
        values: ['Dual Use of HS2 Maintenance Access Tracks (MATs)', 'HS2 MAT']
      },
      { label: 'New greenway', color: GREEN, values: ['New Greenway'] },
      { label: 'Path & towpath upgrade', color: TEAL, values: ['Upgrade PROW', 'Canal Towpath Upgrade'] },
      { label: 'Quiet roads & lanes', color: BLUE, values: ['Local Road Quietway', 'Quiet Lane', 'Town or village centre'] },
      {
        label: 'Cycle tracks',
        color: YELLOW,
        values: ['Main Road-Cycle tracks', 'Existing Footway Level Cycle Track', 'Proposed Footway Level Cycle Track']
      },
      { label: 'Existing routes', color: GREY }
    ]
  },
  category: {
    field: 'category',
    groups: [
      {
        label: 'Repurposed HS2 temporary construction road (TCR)',
        color: HS2_ORANGE,
        alwaysShow: true,
        values: [
          'Repurposed HS2 temporary construction road (TCR)',
          'Repurposed HS2 TCR',
          'Cycleway beside HS2'
        ]
      },
      {
        label: 'HS2 delivered greenway',
        color: HS2_GREENWAY,
        alwaysShow: true,
        values: ['HS2 delivered greenway']
      },
      {
        label: 'Dual Use of HS2 Maintenance Access Tracks (MATs)',
        color: HS2_MAT,
        alwaysShow: true,
        values: ['Dual Use of HS2 Maintenance Access Tracks (MATs)']
      },
      { label: 'Traffic-free path', color: GREEN, values: ['Traffic-free path away from highway'] },
      { label: 'Canal towpath', color: TEAL, values: ['Canal tow path or new path close by canal'] },
      { label: '20mph / protected on-road', color: BLUE, values: ['20mph and traffic calmed or protected cycle lane'] },
      { label: 'Other', color: GREY }
    ]
  },
  developer: {
    field: 'developer',
    groups: [
      { label: 'HS2', color: HS2_ORANGE, values: ['HS2'] },
      { label: 'Local Authority', color: GREEN, values: ['Local Authority'] },
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
      { label: 'Alternative', color: YELLOW, values: ['alternative'] },
      { label: SUPERSEDED_LABEL, color: SUPERSEDED_COLOR, values: ['superseded'] }
    ]
  }
};

/** Reference (context) layers: kept off the route hues so they never read as proposed routes. */
export const REFERENCE_COLORS = {
  // NCN: dark blue-green traffic-free, dark red on-road
  ncnOffRoad: '#0e7490',
  ncnOnRoad: '#b91c1c',
  roadHaulage: '#f8fafc',
  roadMajor: '#cbd5e1',
  roadMinor: '#94a3b8',
  roadLocal: '#64748b',
  roadCasing: '#0f172a',
  studyArea: '#8b5cf6',
  studyAreaOutline: '#7c3aed'
};

export function isSuperseded(props: CyclewaySegmentProperties): boolean {
  return props.folder === 'Superseded'
    || props.status === 'superseded'
    || props.category === OLD_ALIGNMENT
    || props.classification === OLD_ALIGNMENT;
}

const SUPERSEDED_EXPRESSION = [
  'any',
  ['==', ['coalesce', ['get', 'folder'], ''], 'Superseded'],
  ['==', ['coalesce', ['get', 'status'], ''], 'superseded'],
  ['==', ['coalesce', ['get', 'category'], ''], OLD_ALIGNMENT],
  ['==', ['coalesce', ['get', 'classification'], ''], OLD_ALIGNMENT]
];

// Superseded (old) alignments are opt-in: they appear only when their row is ticked in
// the alignment-status legend, and are absent from every other view
export function showsSuperseded(f: FilterState): boolean {
  return f.colorBy === 'status' && f.showSuperseded;
}

/** Legend groups switched off, including the opt-in Superseded group while unticked. */
export function effectiveHiddenGroups(f: FilterState): string[] {
  return f.colorBy === 'status' && !f.showSuperseded
    ? [...f.hiddenLegendItems, SUPERSEDED_LABEL]
    : f.hiddenLegendItems;
}

/** MapLibre filter clauses for superseded visibility and the alignment status filter. */
export function statusFilterExpressions(f: FilterState): any[] {
  const expressions: any[] = [];
  if (!showsSuperseded(f)) expressions.push(['!', SUPERSEDED_EXPRESSION]);
  if (f.status) {
    // The status filter narrows current alignments; ticked superseded ones stay visible
    const match = ['==', ['coalesce', ['get', 'status'], 'preferred'], f.status];
    expressions.push(showsSuperseded(f) ? ['any', SUPERSEDED_EXPRESSION, match] : match);
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
