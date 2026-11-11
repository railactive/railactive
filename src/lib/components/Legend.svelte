<script lang="ts">
  import {
    INTERVENTION_COLOR,
    INTERVENTION_LEGACY_COLOR,
    INTERVENTION_LEGACY_OPACITY,
    PENDING_COLOR,
    REFERENCE_COLORS as ref
  } from '../palette';
  import { isDevEnvironment } from '../urlState';
  import type { FilterState } from '../types/cycleway';

  const showDetailedColorOptions = isDevEnvironment();

  interface LegendItem {
    label: string;
    color: string;
    km?: number;
  }

  interface Props {
    colorBy: FilterState['colorBy'];
    items: LegendItem[];
    hiddenItems: string[];
    onToggleItem: (label: string) => void;
    onIsolateItem: (label: string) => void;
    onShowAll: () => void;
    showHs2Railway?: boolean;
    hs2RailwayKm?: number;
    onToggleHs2Railway?: () => void;
    showInterventions?: boolean;
    interventionCount?: number;
    activePointCount?: number;
    supersededPointCount?: number;
    pendingPointCount?: number;
    showActivePoints?: boolean;
    showSupersededPoints?: boolean;
    showPendingPoints?: boolean;
    onToggleInterventions?: () => void;
    onToggleActivePoints?: () => void;
    onToggleSupersededPoints?: () => void;
    onTogglePendingPoints?: () => void;
    showNcn: boolean;
    onToggleNcn: () => void;
    showOpenRoads: boolean;
    onToggleOpenRoads: () => void;
    showStudyArea?: boolean;
    onToggleStudyArea?: () => void;
  }

  let {
    colorBy = $bindable(),
    items,
    hiddenItems = [],
    onToggleItem,
    onIsolateItem,
    onShowAll,
    showHs2Railway = true,
    hs2RailwayKm = 0,
    onToggleHs2Railway,
    showInterventions = false,
    interventionCount = 0,
    activePointCount = 0,
    supersededPointCount = 0,
    pendingPointCount = 0,
    showActivePoints = true,
    showSupersededPoints = false,
    showPendingPoints = false,
    onToggleInterventions,
    onToggleActivePoints,
    onToggleSupersededPoints,
    onTogglePendingPoints,
    showNcn,
    onToggleNcn,
    showOpenRoads,
    onToggleOpenRoads,
    showStudyArea = false,
    onToggleStudyArea
  }: Props = $props();

  function isVisible(label: string) {
    return !hiddenItems.includes(label);
  }
</script>

{#snippet checkbox(checked: boolean)}
  <span class="toggle-box" class:checked>
    {#if checked}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    {/if}
  </span>
{/snippet}

<div
  class="legend"
  style="--ncn-off: {ref.ncnOffRoad}; --ncn-on: {ref.ncnOnRoad}; --road-haulage: {ref.roadHaulage}; --road-major: {ref.roadMajor}; --road-minor: {ref.roadMinor}; --road-local: {ref.roadLocal}; --study-area: {ref.studyArea}; --study-area-outline: {ref.studyAreaOutline};"
>
  <div class="colorby-row">
    <label for="colorby-select">Colour by</label>
    <select id="colorby-select" bind:value={colorBy}>
      <option value="classification">Delivery category</option>
      {#if showDetailedColorOptions}
        <option value="infrastructure_type_detailed">Delivery category (detailed)</option>
        <option value="detailed_classification">Detailed classification</option>
      {/if}
      <option value="category">Infrastructure type</option>
      {#if showDetailedColorOptions}
        <option value="osm_infrastructure">Current infrastructure (OSM)</option>
      {/if}
      <option value="developer">Lead developer</option>
      <option value="status">Alignment status</option>
      {#if showDetailedColorOptions}
        <option value="kml">Original KML colours</option>
      {/if}
    </select>
    {#if hiddenItems.length > 0}
      <button class="show-all-btn" onclick={onShowAll}>Show all</button>
    {/if}
  </div>

  <div class="legend-items">
    {#each items as item (item.label)}
      {@const visible = isVisible(item.label)}
      <div class="legend-row" class:hidden-layer={!visible}>
        <button
          class="legend-item-btn"
          onclick={() => onToggleItem(item.label)}
          title={visible ? `Hide ${item.label}` : `Show ${item.label}`}
          aria-pressed={visible}
        >
          {@render checkbox(visible)}
          <span class="color-bar" style="background-color: {item.color};"></span>
          <span class="item-label">{item.label}</span>
          {#if item.km !== undefined}
            <span class="item-km">{item.km.toFixed(1)} km</span>
          {/if}
        </button>
        <button class="solo-btn" onclick={() => onIsolateItem(item.label)} title={`Show only ${item.label}`}>
          only
        </button>
      </div>
    {/each}
  </div>

  <div class="subheading">Reference layers</div>
  <div class="legend-items">
    <div class="legend-row" class:hidden-layer={!showHs2Railway}>
      <button class="legend-item-btn" onclick={onToggleHs2Railway} aria-pressed={showHs2Railway}>
        {@render checkbox(showHs2Railway)}
        <span class="color-bar hs2-color-bar"></span>
        <span class="item-label">HS2 railway alignment</span>
        {#if hs2RailwayKm > 0}
          <span class="item-km">{hs2RailwayKm.toFixed(1)} km</span>
        {/if}
      </button>
    </div>

    <div class="legend-row" class:hidden-layer={!showInterventions}>
      <button class="legend-item-btn" onclick={onToggleInterventions} aria-pressed={showInterventions}>
        {@render checkbox(showInterventions)}
        <span class="point-swatch-wrap"><span class="point-swatch" style="background-color: {INTERVENTION_COLOR};"></span></span>
        <span class="item-label">Point interventions</span>
        <span class="item-km">{interventionCount.toLocaleString()} pts</span>
      </button>
    </div>
    {#if showInterventions}
      <div class="sublegend sublegend-checks">
        <button
          type="button"
          class="subcheck-btn"
          class:unchecked={!showActivePoints}
          onclick={onToggleActivePoints}
          aria-pressed={showActivePoints}
        >
          {@render checkbox(showActivePoints)}
          <span class="point-swatch point-swatch-sm" style="background-color: {INTERVENTION_COLOR};"></span>
          <span class="subcheck-label">Active route ({activePointCount.toLocaleString()})</span>
        </button>
        <button
          type="button"
          class="subcheck-btn"
          class:unchecked={!showSupersededPoints}
          onclick={onToggleSupersededPoints}
          aria-pressed={showSupersededPoints}
        >
          {@render checkbox(showSupersededPoints)}
          <span
            class="point-swatch point-swatch-sm"
            style="background-color: {INTERVENTION_LEGACY_COLOR}; opacity: {INTERVENTION_LEGACY_OPACITY};"
          ></span>
          <span class="subcheck-label">Superseded / legacy ({supersededPointCount.toLocaleString()})</span>
        </button>
        <button
          type="button"
          class="subcheck-btn"
          class:unchecked={!showPendingPoints}
          onclick={onTogglePendingPoints}
          aria-pressed={showPendingPoints}
        >
          {@render checkbox(showPendingPoints)}
          <span class="point-swatch point-swatch-sm" style="background-color: {PENDING_COLOR};"></span>
          <span class="subcheck-label">Pending ({pendingPointCount.toLocaleString()})</span>
        </button>
      </div>
    {/if}

    <div class="legend-row" class:hidden-layer={!showNcn}>
      <button class="legend-item-btn" onclick={onToggleNcn} aria-pressed={showNcn}>
        {@render checkbox(showNcn)}
        <span class="color-bar ncn-color-bar"></span>
        <span class="item-label">National Cycle Network</span>
        <span class="item-km">19,752 km</span>
      </button>
    </div>
    {#if showNcn}
      <div class="sublegend">
        <div class="sublegend-item"><span class="sample ncn-sample-solid"></span>Traffic-free (8,315 km)</div>
        <div class="sublegend-item"><span class="sample ncn-sample-on-road"></span>On-road (11,383 km)</div>
      </div>
    {/if}

    <div class="legend-row" class:hidden-layer={!showOpenRoads}>
      <button class="legend-item-btn" onclick={onToggleOpenRoads} aria-pressed={showOpenRoads}>
        {@render checkbox(showOpenRoads)}
        <span class="color-bar openroads-color-bar"></span>
        <span class="item-label">OS OpenRoads (10 km)</span>
        <span class="item-km">39,356 km</span>
      </button>
    </div>
    {#if showOpenRoads}
      <div class="sublegend">
        <div class="sublegend-item"><span class="sample openroads-sample-haulage"></span>Possible HS2 haulage</div>
        <div class="sublegend-item"><span class="sample openroads-sample-major"></span>Motorway / A road</div>
        <div class="sublegend-item"><span class="sample openroads-sample-minor"></span>B road</div>
        <div class="sublegend-item"><span class="sample openroads-sample-local"></span>Local road</div>
      </div>
    {/if}

    <div class="legend-row" class:hidden-layer={!showStudyArea}>
      <button class="legend-item-btn" onclick={onToggleStudyArea} aria-pressed={showStudyArea}>
        {@render checkbox(showStudyArea)}
        <span class="color-bar studyarea-color-bar"></span>
        <span class="item-label">Study area (10 km)</span>
        <span class="item-km">12,009 km²</span>
      </button>
    </div>
  </div>
</div>

<style>
  .legend {
    margin-bottom: 16px;
  }

  .colorby-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .colorby-row label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .colorby-row select {
    flex: 1;
    min-width: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    padding: 5px 8px;
    font-size: 12px;
    outline: none;
  }

  .colorby-row select:focus {
    border-color: var(--accent-civic);
  }

  .show-all-btn {
    background: none;
    border: none;
    color: var(--accent-civic);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .show-all-btn:hover {
    color: var(--accent-civic-hover);
    text-decoration: underline;
  }

  .subheading {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 10px 0 2px;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: var(--radius-sm);
  }

  .legend-row:hover {
    background: var(--bg-secondary);
  }

  .legend-row.hidden-layer {
    opacity: 0.5;
  }

  .legend-item-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    padding: 5px 4px;
    cursor: pointer;
    text-align: left;
    flex: 1;
    min-width: 0;
  }

  .toggle-box {
    width: 13px;
    height: 13px;
    border-radius: 3px;
    border: 1.5px solid var(--border-strong);
    background: var(--bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toggle-box.checked {
    background: var(--accent-civic);
    border-color: var(--accent-civic);
    color: #ffffff;
  }

  .color-bar {
    width: 14px;
    height: 4px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .item-label {
    flex: 1;
    font-size: 12px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-km {
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-secondary);
  }

  .solo-btn {
    opacity: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
    cursor: pointer;
    margin-right: 4px;
    box-shadow: var(--shadow-sm);
  }

  .legend-row:hover .solo-btn,
  .solo-btn:focus-visible {
    opacity: 1;
  }

  @media (hover: none), (max-width: 767px) {
    .colorby-row select {
      padding: 7px 8px;
      font-size: 13px;
    }

    .legend-item-btn {
      padding: 7px 4px;
      min-height: 34px;
    }

    .toggle-box {
      width: 15px;
      height: 15px;
    }

    .solo-btn {
      opacity: 1;
      padding: 3px 7px;
      font-size: 10.5px;
    }
  }

  .solo-btn:hover {
    background: var(--accent-civic);
    border-color: var(--accent-civic);
    color: #ffffff;
  }

  .sublegend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 0 4px 6px 47px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .sublegend-checks {
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 1px;
    padding: 1px 4px 6px 26px;
  }

  .subcheck-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    padding: 3px 4px;
    font-size: 11.5px;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }

  .subcheck-btn:hover {
    background: var(--bg-secondary);
  }

  .subcheck-btn.unchecked {
    opacity: 0.58;
  }

  .subcheck-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sublegend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .sample {
    width: 14px;
    height: 3px;
    border-radius: 2px;
  }

  .ncn-color-bar {
    background: linear-gradient(90deg, var(--ncn-off) 50%, var(--ncn-on) 50%);
  }

  .hs2-color-bar {
    border-radius: 1px;
    background: repeating-linear-gradient(
      90deg,
      #000000 0px,
      #000000 3px,
      #ffffff 3px,
      #ffffff 5px
    );
    border: 1px solid #000000;
  }

  .ncn-sample-solid {
    background: var(--ncn-off);
  }

  .ncn-sample-on-road {
    background: var(--ncn-on);
  }

  .openroads-color-bar {
    background: linear-gradient(90deg, var(--road-major), var(--road-local));
  }

  .openroads-sample-haulage {
    background: repeating-linear-gradient(90deg, var(--road-haulage), var(--road-haulage) 4px, transparent 4px, transparent 7px);
  }

  .openroads-sample-major {
    background: var(--road-major);
  }

  .openroads-sample-minor {
    height: 2px;
    background: var(--road-minor);
  }

  .openroads-sample-local {
    height: 1.5px;
    background: var(--road-local);
  }

  .studyarea-color-bar {
    height: 8px;
    background: color-mix(in srgb, var(--study-area) 35%, transparent);
    border: 1px dashed var(--study-area-outline);
  }

  .point-swatch-wrap {
    width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .point-swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid #ffffff;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.28);
    flex-shrink: 0;
  }

  .point-swatch-sm {
    width: 8px;
    height: 8px;
  }
</style>
