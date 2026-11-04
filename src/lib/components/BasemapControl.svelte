<script lang="ts">
  interface Props {
    basemap: string;
    sidebarOpen: boolean;
    onChangeBasemap: (style: string) => void;
  }

  let { basemap, sidebarOpen, onChangeBasemap }: Props = $props();

  let menuOpen: boolean = $state(false);

  const basemapOptions = [
    { id: 'light', label: 'Light Canvas', description: 'Clean light background' },
    { id: 'dark', label: 'Dark Canvas', description: 'Muted dark cartography' },
    { id: 'satellite', label: 'Satellite', description: 'High-res satellite imagery' },
    { id: 'osm', label: 'OpenStreetMap', description: 'Standard street & terrain' }
  ];
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') menuOpen = false; }} />

<div class="basemap-control-wrapper" class:sidebar-open={sidebarOpen}>
  {#if menuOpen}
    <div class="backdrop" onclick={() => menuOpen = false} aria-hidden="true"></div>

    <div class="basemap-menu panel-card" role="menu">
      <div class="menu-title">Select Basemap</div>
      {#each basemapOptions as opt}
        <button
          class="menu-item"
          class:active={basemap === opt.id}
          onclick={() => {
            onChangeBasemap(opt.id);
            menuOpen = false;
          }}
          role="menuitemradio"
          aria-checked={basemap === opt.id}
        >
          <span class="radio-indicator"></span>
          <div class="opt-text">
            <span class="opt-label">{opt.label}</span>
            <span class="opt-desc">{opt.description}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  <button
    class="outline-btn basemap-btn"
    class:active={menuOpen}
    onclick={() => menuOpen = !menuOpen}
    title="Change Basemap Style"
    aria-label="Change Basemap Style"
    aria-expanded={menuOpen}
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
    <span class="btn-text">Basemap</span>
  </button>
</div>

<style>
  .basemap-control-wrapper {
    position: absolute;
    bottom: 24px;
    left: 360px;
    z-index: 25;
    transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .basemap-control-wrapper:not(.sidebar-open) {
    left: 24px;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
  }

  .basemap-btn {
    position: relative;
    z-index: 25;
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
    box-shadow: var(--shadow-md);
  }

  .basemap-btn.active {
    border-color: var(--accent-civic);
    background: #eff6ff;
    color: var(--accent-civic);
  }

  .btn-text {
    font-size: 12px;
    font-weight: 600;
  }

  .basemap-menu {
    position: absolute;
    bottom: 44px;
    left: 0;
    z-index: 25;
    width: 220px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    animation: menuFadeIn 0.15s ease-out;
  }

  @keyframes menuFadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 6px 8px 4px 8px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 4px;
  }

  .menu-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: transparent;
    border: 1px solid transparent;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: all 0.15s ease;
  }

  .menu-item:hover {
    background: var(--bg-secondary);
  }

  .menu-item.active {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .radio-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    background: var(--bg-surface);
    margin-top: 2px;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .menu-item.active .radio-indicator {
    border-color: var(--accent-civic);
    background: var(--accent-civic);
    box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.15);
  }

  .opt-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .opt-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .menu-item.active .opt-label {
    color: var(--accent-civic);
  }

  .opt-desc {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.2;
  }
</style>
