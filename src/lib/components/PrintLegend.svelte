<script lang="ts">
  import {
    formatStatusLabel,
    INTERVENTION_COLOR,
    INTERVENTION_LEGACY_COLOR,
    INTERVENTION_LEGACY_OPACITY,
    INTERVENTION_LEGACY_THRESHOLD_M,
    REFERENCE_COLORS as ref
  } from '../palette';
  import type { CyclewayStats, FilterState } from '../types/cycleway';

  interface LegendItem {
    label: string;
    color: string;
    km?: number;
  }

  interface Props {
    colorBy: FilterState['colorBy'];
    filters: FilterState;
    items: LegendItem[];
    hiddenItems: string[];
    stats: CyclewayStats;
    showHs2Railway?: boolean;
    hs2RailwayKm?: number;
    showInterventions?: boolean;
    interventionCount?: number;
    onRouteInterventionCount?: number;
    legacyInterventionCount?: number;
    showNcn: boolean;
    showOpenRoads: boolean;
    showStudyArea: boolean;
  }

  let {
    colorBy,
    filters,
    items,
    hiddenItems = [],
    stats,
    showHs2Railway = true,
    hs2RailwayKm = 0,
    showInterventions = false,
    interventionCount = 0,
    onRouteInterventionCount = 0,
    legacyInterventionCount = 0,
    showNcn = false,
    showOpenRoads = false,
    showStudyArea = false
  }: Props = $props();

  const schemeLabels: Record<FilterState['colorBy'], string> = {
    classification: 'By delivery category',
    infrastructure_type_detailed: 'By delivery category (detailed)',
    detailed_classification: 'By detailed classification',
    category: 'By infrastructure type',
    osm_infrastructure: 'By current infrastructure (OSM)',
    developer: 'By lead developer',
    status: 'By alignment status',
    kml: 'By KML source colour'
  };

  let visibleItems = $derived(
    items.filter(item => !hiddenItems.includes(item.label) && (item.km ?? 0) > 0)
  );

  let activeFilterBadges = $derived.by(() => {
    const badges: string[] = [];
    if (filters.section) badges.push(`Section: ${filters.section}`);
    if (filters.developer) badges.push(filters.developer);
    if (filters.classification) badges.push(filters.classification);
    if (filters.category) badges.push(filters.category);
    if (filters.status) badges.push(formatStatusLabel(filters.status));
    if (filters.searchTerm) badges.push(`"${filters.searchTerm}"`);
    return badges;
  });
</script>

<aside
  class="print-legend"
  aria-label="Map legend"
  style="--ncn-off: {ref.ncnOffRoad}; --ncn-on: {ref.ncnOnRoad}; --road-haulage: {ref.roadHaulage}; --road-major: {ref.roadMajor}; --road-minor: {ref.roadMinor}; --road-local: {ref.roadLocal}; --study-area: {ref.studyArea}; --study-area-outline: {ref.studyAreaOutline}; --intervention: {INTERVENTION_COLOR};"
>
  <div class="print-legend-header">
    <div class="print-brand-row">
      <span class="print-brand-tag">RailActive</span>
      <span class="print-total-km">{stats.totalKm.toFixed(1)} km</span>
    </div>
    <h2 class="print-title">North-South Greenway</h2>
    <div class="print-subtitle">{schemeLabels[colorBy]} &middot; {stats.totalSegments} segments</div>

    {#if activeFilterBadges.length > 0}
      <div class="print-filter-badges">
        {#each activeFilterBadges as badge}
          <span class="print-filter-chip">{badge}</span>
        {/each}
      </div>
    {/if}
  </div>

  {#if stats.totalKm > 0 && visibleItems.length > 1}
    <div class="print-composition-bar" aria-hidden="true">
      {#each visibleItems as item (item.label)}
        <span
          class="print-composition-seg"
          style="width: {((item.km ?? 0) / stats.totalKm) * 100}%; background-color: {item.color};"
        ></span>
      {/each}
    </div>
  {/if}

  <div class="print-group-list">
    {#each visibleItems as item (item.label)}
      <div class="print-row">
        <span class="swatch-line" style="background-color: {item.color};"></span>
        <span class="row-label">{item.label}</span>
        {#if item.km !== undefined}
          <span class="row-km">{item.km.toFixed(1)} km</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="print-divider"></div>

  <div class="print-ref-list">
    {#if showHs2Railway}
      <div class="print-row">
        <span class="swatch-hs2"></span>
        <span class="row-label">HS2 railway alignment</span>
        {#if hs2RailwayKm > 0}
          <span class="row-km">{hs2RailwayKm.toFixed(1)} km</span>
        {/if}
      </div>
    {/if}
    {#if showInterventions}
      <div class="print-row">
        <span class="swatch-point"></span>
        <span class="row-label">Intervention point (&le; {INTERVENTION_LEGACY_THRESHOLD_M} m)</span>
        {#if onRouteInterventionCount > 0}
          <span class="row-km">{onRouteInterventionCount.toLocaleString()} pts</span>
        {:else if interventionCount > 0}
          <span class="row-km">{interventionCount.toLocaleString()} pts</span>
        {/if}
      </div>
      {#if legacyInterventionCount > 0}
        <div class="print-row">
          <span
            class="swatch-point"
            style="background: {INTERVENTION_LEGACY_COLOR}; opacity: {INTERVENTION_LEGACY_OPACITY};"
          ></span>
          <span class="row-label">Legacy point (&gt; {INTERVENTION_LEGACY_THRESHOLD_M} m)</span>
          <span class="row-km">{legacyInterventionCount.toLocaleString()} pts</span>
        </div>
      {/if}
    {/if}

    {#if showStudyArea}
      <div class="print-row">
        <span class="swatch-studyarea"></span>
        <span class="row-label">Study area (10 km buffer)</span>
        <span class="row-km">12,009 km²</span>
      </div>
    {/if}

    {#if showNcn}
      <div class="print-row">
        <span class="swatch-ncn"></span>
        <span class="row-label">NCN (traffic-free / on-road)</span>
        <span class="row-km">19,752 km</span>
      </div>
    {/if}

    {#if showOpenRoads}
      <div class="print-row">
        <span class="swatch-haulage"></span>
        <span class="row-label">Possible HS2 haulage road</span>
      </div>
      <div class="print-row">
        <span class="swatch-roads"></span>
        <span class="row-label">OS OpenRoads (10 km)</span>
        <span class="row-km">39,356 km</span>
      </div>
    {/if}
  </div>
</aside>

<style>
  .print-legend {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 25;
    width: 276px;
    max-width: calc(100vw - 32px);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(8px);
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px 14px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
    color: #0f172a;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-legend-header {
    margin-bottom: 8px;
  }

  .print-brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .print-brand-tag {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1d4ed8;
  }

  .print-total-km {
    font-size: 11px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: #0f172a;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .print-title {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.25;
    color: #0f172a;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .print-subtitle {
    font-size: 10.5px;
    color: #475569;
    margin-top: 2px;
  }

  .print-filter-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 5px;
  }

  .print-filter-chip {
    font-size: 9.5px;
    font-weight: 600;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    padding: 1px 5px;
    border-radius: 3px;
  }

  .print-composition-bar {
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
    display: flex;
    background: #e2e8f0;
    margin-bottom: 8px;
  }

  .print-composition-seg {
    height: 100%;
  }

  .print-group-list,
  .print-ref-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .print-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 7px 0;
  }

  .print-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    line-height: 1.3;
  }

  .row-label {
    flex: 1;
    min-width: 0;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-km {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: #475569;
    flex-shrink: 0;
  }

  .swatch-line {
    width: 16px;
    height: 4px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .swatch-hs2 {
    width: 16px;
    height: 4px;
    border-radius: 1px;
    flex-shrink: 0;
    background: repeating-linear-gradient(
      90deg,
      #000000 0px,
      #000000 3px,
      #ffffff 3px,
      #ffffff 5px
    );
    border: 1px solid #000000;
  }

  .swatch-point {
    width: 9px;
    height: 9px;
    margin: 0 3.5px;
    border-radius: 50%;
    background: var(--intervention);
    border: 1.5px solid #ffffff;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.28);
    flex-shrink: 0;
  }

  .swatch-studyarea {
    width: 16px;
    height: 7px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--study-area) 25%, transparent);
    border: 1px dashed var(--study-area-outline);
    flex-shrink: 0;
  }

  .swatch-ncn {
    width: 16px;
    height: 3.5px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--ncn-off) 50%, var(--ncn-on) 50%);
    flex-shrink: 0;
  }

  .swatch-haulage {
    width: 16px;
    height: 3.5px;
    background: repeating-linear-gradient(
      90deg,
      var(--road-haulage) 0px,
      var(--road-haulage) 4px,
      transparent 4px,
      transparent 6px
    );
    flex-shrink: 0;
  }

  .swatch-roads {
    width: 16px;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--road-major), var(--road-local));
    flex-shrink: 0;
  }

  @media (max-width: 767px) {
    .print-legend {
      top: 50px;
      left: 10px;
      width: min(260px, calc(100vw - 20px));
      max-height: calc(100dvh - 64px);
      overflow-y: auto;
      padding: 10px 12px;
    }
  }
</style>
