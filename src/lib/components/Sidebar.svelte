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

  let activeFilterCount = $derived(
    [filters.developer, filters.category, filters.classification, filters.section, filters.status, filters.searchTerm]
      .filter(Boolean).length
  );
  let filtersOpen = $state(false);
</script>

<aside class="sidebar" class:closed={!open}>
  <div class="sidebar-content">
    <div class="section-title">Corridor Metrics</div>
    <KPICards {stats} />

    <div class="section-title">Map Layers</div>
    <Legend bind:colorBy={filters.colorBy} {...legend} />

    <button
      type="button"
      class="section-title filters-toggle"
      onclick={() => filtersOpen = !filtersOpen}
      aria-expanded={filtersOpen}
    >
      <span>Filters{#if activeFilterCount > 0} ({activeFilterCount}){/if}</span>
      <svg
        class="chevron"
        class:open={filtersOpen}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    {#if filtersOpen}
      <FilterPanel
        bind:filters={filters}
        {availableDevelopers}
        {availableCategories}
        {availableClassifications}
        {availableSections}
        {onResetFilters}
      />
    {/if}
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
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    box-shadow: 2px 0 12px rgba(15, 23, 42, 0.04);
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
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 4px;
    margin-bottom: 10px;
    margin-top: 4px;
  }

  .filters-toggle {
    width: 100%;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 4px 0 6px 0;
    font-family: inherit;
    transition: color 0.15s ease;
  }

  .filters-toggle:hover {
    color: var(--text-primary);
  }

  .chevron {
    transition: transform 0.18s ease;
  }

  .chevron.open {
    transform: rotate(180deg);
  }
</style>
