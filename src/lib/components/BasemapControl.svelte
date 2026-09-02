<script lang="ts">
  interface Props {
    basemap: string;
    sidebarOpen: boolean;
    onChangeBasemap: (style: string) => void;
  }

  let { basemap, sidebarOpen, onChangeBasemap }: Props = $props();

  let menuOpen: boolean = $state(false);

  const basemapOptions = [
    { id: 'dark', label: 'Dark Canvas', description: 'Muted dark cartography' },
    { id: 'light', label: 'Light Canvas', description: 'Clean light background' },
    { id: 'satellite', label: 'Satellite', description: 'High-res satellite imagery' },
    { id: 'osm', label: 'OpenStreetMap', description: 'Standard street & terrain' }
  ];
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') menuOpen = false; }} />

<div class="basemap-control-wrapper" class:sidebar-open={sidebarOpen}>
  {#if menuOpen}
    <!-- Click backdrop -->
    <div class="backdrop" onclick={() => menuOpen = false} aria-hidden="true"></div>

    <!-- Popup Menu -->
    <div class="basemap-menu" role="menu">
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

  <!-- Toggle Button -->
  <button
    class="basemap-btn"
    class:active={menuOpen}
    onclick={() => menuOpen = !menuOpen}
    title="Change Basemap Style"
    aria-label="Change Basemap Style"
    aria-expanded={menuOpen}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    display: flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 12px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-panel);
    transition: all 0.15s ease;
  }

  .basemap-btn:hover {
    background: rgba(30, 41, 59, 0.95);
    border-color: var(--accent-cyan);
    color: #ffffff;
  }

  .basemap-btn.active {
    border-color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.15);
    color: #38bdf8;
  }

  .btn-text {
    font-size: 12px;
    letter-spacing: -0.01em;
  }

  .basemap-menu {
    position: absolute;
    bottom: 44px;
    left: 0;
    z-index: 25;
    width: 220px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-md);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
    background: rgba(255, 255, 255, 0.06);
  }

  .menu-item.active {
    background: rgba(6, 182, 212, 0.12);
    border-color: rgba(6, 182, 212, 0.35);
  }

  .radio-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--text-muted);
    margin-top: 2px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .menu-item.active .radio-indicator {
    border-color: var(--accent-cyan);
    background: var(--accent-cyan);
    box-shadow: 0 0 6px rgba(6, 182, 212, 0.6);
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
    color: #38bdf8;
  }

  .opt-desc {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.2;
  }
</style>
