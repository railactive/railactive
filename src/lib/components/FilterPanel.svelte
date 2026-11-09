<script lang="ts">
  import type { FilterState } from '../types/cycleway';

  interface Props {
    filters: FilterState;
    availableDevelopers: string[];
    availableCategories: string[];
    availableClassifications: string[];
    availableSections: string[];
    onResetFilters: () => void;
  }

  let {
    filters = $bindable(),
    availableDevelopers,
    availableCategories,
    availableClassifications,
    availableSections,
    onResetFilters
  }: Props = $props();
</script>

<div class="filter-container">
  <!-- Search Input -->
  <div class="form-group">
    <label for="search-input">Search Links / ID</label>
    <div class="input-wrapper">
      <input 
        id="search-input"
        type="text" 
        placeholder="e.g. 202, Curzon, Greenway..." 
        bind:value={filters.searchTerm}
      />
      {#if filters.searchTerm}
        <button class="clear-btn" onclick={() => filters.searchTerm = ''}>×</button>
      {/if}
    </div>
  </div>

  <!-- Route Status Filter -->
  <div class="form-group">
    <label for="status-select">Alignment Status</label>
    <select id="status-select" bind:value={filters.status}>
      <option value="">All Active (Preferred & Complimentary)</option>
      <option value="preferred">Preferred Spine Only</option>
      <option value="alternative">Complimentary Alignments Only</option>
    </select>
  </div>

  <!-- Category Filter -->
  <div class="form-group">
    <label for="category-select">Route Category</label>
    <select id="category-select" bind:value={filters.category}>
      <option value="">All Categories ({availableCategories.length})</option>
      {#each availableCategories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
  </div>

  <!-- Classification Filter -->
  <div class="form-group">
    <label for="class-select">Classification</label>
    <select id="class-select" bind:value={filters.classification}>
      <option value="">All Classifications ({availableClassifications.length})</option>
      {#each availableClassifications as cls}
        <option value={cls}>{cls}</option>
      {/each}
    </select>
  </div>

  <!-- Developer Filter -->
  <div class="form-group">
    <label for="developer-select">Lead Delivery Body</label>
    <select id="developer-select" bind:value={filters.developer}>
      <option value="">All Delivery Bodies ({availableDevelopers.length})</option>
      {#each availableDevelopers as dev}
        <option value={dev}>{dev}</option>
      {/each}
    </select>
  </div>

  <!-- Section Filter -->
  <div class="form-group">
    <label for="section-select">Corridor Section</label>
    <select id="section-select" bind:value={filters.section}>
      <option value="">All Sections (1 – 35)</option>
      {#each availableSections as sec}
        <option value={sec}>Section {sec}</option>
      {/each}
    </select>
  </div>

  <!-- Reset Button -->
  <button class="reset-btn" onclick={onResetFilters}>
    Reset All Filters
  </button>
</div>

<style>
  .filter-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input[type="text"], select {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    padding: 7px 10px;
    font-size: 12px;
    outline: none;
    transition: all 0.15s ease;
  }

  input[type="text"]:focus, select:focus {
    border-color: var(--accent-civic);
    box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.12);
  }

  .clear-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
  }

  .reset-btn {
    margin-top: 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 7px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .reset-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
</style>
