<script lang="ts">
  import { REFERENCE_COLORS as ref } from '../palette';
  import type { FilterState } from '../types/cycleway';

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
  style="--ncn: {ref.ncn}; --road-haulage: {ref.roadHaulage}; --road-major: {ref.roadMajor}; --road-minor: {ref.roadMinor}; --road-local: {ref.roadLocal}; --study-area: {ref.studyArea}; --study-area-outline: {ref.studyAreaOutline};"
>
  <div class="colorby-row">
    <label for="colorby-select">Colour by</label>
    <select id="colorby-select" bind:value={colorBy}>
      <option value="classification">Classification</option>
      <option value="category">Category</option>
      <option value="developer">Lead developer</option>
      <option value="status">Alignment status</option>
      <option value="kml">Original KML colours</option>
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
    <div class="legend-row" class:hidden-layer={!showNcn}>
      <button class="legend-item-btn" onclick={onToggleNcn} aria-pressed={showNcn}>
        {@render checkbox(showNcn)}
        <span class="color-bar ncn-color-bar"></span>
        <span class="item-label">National Cycle Network</span>
      </button>
    </div>
    {#if showNcn}
      <div class="sublegend">
        <div class="sublegend-item"><span class="sample ncn-sample-solid"></span>Traffic-free</div>
        <div class="sublegend-item"><span class="sample ncn-sample-dashed"></span>On-road</div>
      </div>
    {/if}

    <div class="legend-row" class:hidden-layer={!showOpenRoads}>
      <button class="legend-item-btn" onclick={onToggleOpenRoads} aria-pressed={showOpenRoads}>
        {@render checkbox(showOpenRoads)}
        <span class="color-bar openroads-color-bar"></span>
        <span class="item-label">OS OpenRoads (10 km)</span>
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
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    padding: 5px 8px;
    font-size: 12px;
    outline: none;
  }

  .colorby-row select:focus {
    border-color: var(--accent-blue);
  }

  .show-all-btn {
    background: none;
    border: none;
    color: #60a5fa;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .show-all-btn:hover {
    color: var(--text-primary);
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
    background: rgba(255, 255, 255, 0.05);
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
    border: 1.5px solid var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toggle-box.checked {
    background: var(--text-primary);
    border-color: var(--text-primary);
    color: #0f172a;
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
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
    cursor: pointer;
    margin-right: 4px;
  }

  .legend-row:hover .solo-btn,
  .solo-btn:focus-visible {
    opacity: 1;
  }

  .solo-btn:hover {
    background: var(--accent-blue);
    border-color: var(--accent-blue);
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

  .ncn-color-bar,
  .ncn-sample-solid {
    background: var(--ncn);
  }

  .ncn-sample-dashed {
    background: repeating-linear-gradient(90deg, var(--ncn), var(--ncn) 3px, transparent 3px, transparent 6px);
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
</style>
