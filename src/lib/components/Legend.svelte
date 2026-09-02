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
    activeFilterValue: string;
    onToggleItem: (label: string) => void;
  }

  let { 
    title, 
    items, 
    activeFilterValue, 
    onToggleItem 
  }: Props = $props();

  let collapsed: boolean = $state(false);
</script>

<div class="floating-legend" class:collapsed>
  <div class="legend-header">
    <div class="title-wrap">
      <span class="legend-title">{title}</span>
      <span class="legend-badge">{items.length} classes</span>
    </div>
    <button class="collapse-btn" onclick={() => collapsed = !collapsed} title={collapsed ? 'Expand Legend' : 'Collapse Legend'}>
      {collapsed ? '▲' : '▼'}
    </button>
  </div>

  {#if !collapsed}
    <div class="legend-items">
      {#each items as item}
        <button 
          class="legend-item-btn" 
          class:selected={activeFilterValue === item.label}
          onclick={() => onToggleItem(item.label)}
          title={`Filter map to: ${item.label}`}
        >
          <span class="color-bar" style="background-color: {item.color};"></span>
          <span class="item-label">{item.label}</span>
          {#if item.km !== undefined && item.km > 0}
            <span class="item-km">{item.km.toFixed(1)} km</span>
          {/if}
        </button>
      {/each}
    </div>
    <div class="legend-footer">
      <span>Click any item to filter map</span>
    </div>
  {/if}
</div>

<style>
  .floating-legend {
    position: absolute;
    bottom: 24px;
    right: 24px;
    width: 280px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-panel);
    z-index: 20;
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .floating-legend.collapsed {
    width: 200px;
  }

  .legend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-color);
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: capitalize;
  }

  .legend-badge {
    font-size: 9px;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 4px;
  }

  .collapse-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 10px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .collapse-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.1);
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px;
    max-height: 200px;
    overflow-y: auto;
  }

  .legend-item-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid transparent;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: all 0.15s ease;
  }

  .legend-item-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .legend-item-btn.selected {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
  }

  .color-bar {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .item-label {
    flex: 1;
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .legend-item-btn.selected .item-label {
    color: #ffffff;
    font-weight: 600;
  }

  .item-km {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted);
  }

  .legend-footer {
    padding: 4px 10px 8px 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 9px;
    color: var(--text-muted);
    text-align: center;
    font-style: italic;
  }
</style>
