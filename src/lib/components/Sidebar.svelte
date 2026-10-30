<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import KPICards from './KPICards.svelte';
  import Legend from './Legend.svelte';
  import FilterPanel from './FilterPanel.svelte';
  import type { FilterState, CyclewayStats } from '../types/cycleway';

  type LegendProps = Omit<ComponentProps<typeof Legend>, 'colorBy'>;

  interface Props {
    open: boolean;
    stats: CyclewayStats;
    filters: FilterState;
    legend: LegendProps;
    availableDevelopers: string[];
    availableCategories: string[];
    availableClassifications: string[];
    availableSections: string[];
    onResetFilters: () => void;
  }

  let {
    open,
    stats,
    filters = $bindable(),
    legend,
    availableDevelopers,
    availableCategories,
    availableClassifications,
    availableSections,
    onResetFilters
  }: Props = $props();
</script>

<aside class="sidebar" class:closed={!open}>
  <div class="sidebar-content">
    <div class="section-title">Corridor Metrics</div>
    <KPICards {stats} />

    <div class="section-title">Map Layers</div>
    <Legend bind:colorBy={filters.colorBy} {...legend} />

    <div class="section-title">Filters</div>
    <FilterPanel
      bind:filters={filters}
      {availableDevelopers}
      {availableCategories}
      {availableClassifications}
      {availableSections}
      {onResetFilters}
    />
  </div>
</aside>

<style>
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 340px;
    max-width: calc(100vw - 32px);
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(16px);
    border-right: 1px solid var(--border-color);
    z-index: 20;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
  }

  .sidebar.closed {
    transform: translateX(-100%);
  }

  .sidebar-content {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
</style>
