<script lang="ts">
  interface LegendItem {
    label: string;
    color: string;
    count?: number;
    km?: number;
  }

  interface Props {
    title: string;
    items: LegendItem[];
  }

  let { title, items }: Props = $props();
</script>

<div class="legend-container">
  <div class="legend-header">
    <span class="legend-title">{title}</span>
    <span class="legend-sub">Active Legend</span>
  </div>
  <div class="legend-items">
    {#each items as item}
      <div class="legend-item">
        <span class="color-bar" style="background-color: {item.color};"></span>
        <div class="item-info">
          <span class="item-label">{item.label}</span>
          {#if item.km !== undefined}
            <span class="item-km">{item.km.toFixed(1)} km</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .legend-container {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 10px;
  }

  .legend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border-color);
  }

  .legend-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary);
    text-transform: capitalize;
  }

  .legend-sub {
    font-size: 9px;
    color: var(--text-muted);
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 180px;
    overflow-y: auto;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-bar {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .item-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 11px;
  }

  .item-label {
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }

  .item-km {
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
  }
</style>
