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
    hiddenItems: string[];
    onToggleItem: (label: string) => void;
    onIsolateItem: (label: string) => void;
    onShowAll: () => void;
  }

  let { 
    title, 
    items, 
    hiddenItems = [], 
    onToggleItem,
    onIsolateItem,
    onShowAll
  }: Props = $props();

  let collapsed: boolean = $state(false);

  function isVisible(label: string) {
    return !hiddenItems.includes(label);
  }
</script>

<div class="floating-legend" class:collapsed>
  <div class="legend-header">
    <div class="title-wrap">
      <span class="legend-title">{title}</span>
      <span class="legend-badge">{items.length - hiddenItems.length}/{items.length} active</span>
    </div>
    <div class="header-actions">
      {#if hiddenItems.length > 0}
        <button class="reset-btn" onclick={onShowAll} title="Show all layers">All</button>
      {/if}
      <button class="collapse-btn" onclick={() => collapsed = !collapsed} title={collapsed ? 'Expand Legend' : 'Collapse Legend'}>
        {collapsed ? '▲' : '▼'}
      </button>
    </div>
  </div>

  {#if !collapsed}
    <div class="legend-items">
      {#each items as item}
        {@const visible = isVisible(item.label)}
        <div class="legend-row" class:hidden-layer={!visible}>
          <!-- Toggle checkbox / click row to toggle layer -->
          <button 
            class="legend-item-btn" 
            onclick={() => onToggleItem(item.label)}
            title={visible ? `Hide ${item.label} layer` : `Show ${item.label} layer`}
            aria-pressed={visible}
          >
            <span class="toggle-box" class:checked={visible}>
              {#if visible}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {/if}
            </span>
            <span class="color-bar" style="background-color: {item.color};"></span>
            <span class="item-label">{item.label}</span>
            {#if item.km !== undefined && item.km > 0}
              <span class="item-km">{item.km.toFixed(1)} km</span>
            {/if}
          </button>

          <!-- Solo / Isolate button -->
          <button 
            class="solo-btn" 
            onclick={() => onIsolateItem(item.label)}
            title={`Show ONLY ${item.label}`}
          >
            only
          </button>
        </div>
      {/each}
    </div>
    <div class="legend-footer">
      <span>Click item to toggle layer on/off &bull; Click "only" to isolate</span>
    </div>
  {/if}
</div>

<style>
  .floating-legend {
    position: absolute;
    bottom: 24px;
    right: 24px;
    width: 290px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-panel);
    z-index: 20;
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .floating-legend.collapsed {
    width: 210px;
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .reset-btn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #60a5fa;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .reset-btn:hover {
    background: rgba(59, 130, 246, 0.35);
    color: #ffffff;
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
    max-height: 220px;
    overflow-y: auto;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;
  }

  .legend-row:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .legend-row.hidden-layer {
    opacity: 0.45;
  }

  .legend-item-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: transparent;
    border: none;
    padding: 4px 6px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    flex: 1;
    min-width: 0;
  }

  .toggle-box {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border: 1.5px solid var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .toggle-box.checked {
    background: var(--accent-cyan);
    border-color: var(--accent-cyan);
    color: #0f172a;
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

  .legend-row:not(.hidden-layer) .item-label {
    color: #f1f5f9;
  }

  .item-km {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted);
  }

  .solo-btn {
    opacity: 0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-secondary);
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 4px;
    border-radius: 3px;
    cursor: pointer;
    margin-right: 4px;
    transition: all 0.15s ease;
  }

  .legend-row:hover .solo-btn {
    opacity: 1;
  }

  .solo-btn:hover {
    background: var(--accent-blue);
    color: #ffffff;
    border-color: var(--accent-blue);
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
