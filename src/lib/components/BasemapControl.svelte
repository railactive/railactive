<script lang="ts">
  interface Props {
    basemap: string;
    showPlaceNames: boolean;
    onChangeBasemap: (style: string) => void;
    onTogglePlaceNames: () => void;
  }

  let {
    basemap,
    showPlaceNames = true,
    onChangeBasemap,
    onTogglePlaceNames
  }: Props = $props();

  let menuOpen: boolean = $state(false);

  const basemapOptions = [
    { id: 'light', label: 'Light Canvas', description: 'Clean civic greyscale canvas' },
    { id: 'dark', label: 'Dark Canvas', description: 'Muted dark cartography' },
    { id: 'satellite', label: 'Satellite', description: 'High-res aerial imagery' },
    { id: 'opencyclemap', label: 'OpenCycleMap', description: 'Cycle network, NCN & contours' },
    { id: 'osm', label: 'Outdoors', description: 'Paths, bridleways & terrain' }
  ];
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') menuOpen = false; }} />

<div class="basemap-control-wrapper">
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

      <div class="menu-divider"></div>
      <label class="placenames-toggle" title="Show or hide town, city, and road labels above route alignments">
        <input
          type="checkbox"
          checked={showPlaceNames}
          onchange={onTogglePlaceNames}
        />
        <span class="switch-track"><span class="switch-thumb"></span></span>
        <span class="opt-label">Place names</span>
      </label>
    </div>
  {/if}

  <div class="btn-group">
    <button
      class="outline-btn basemap-btn"
      class:active={menuOpen}
      onclick={() => menuOpen = !menuOpen}
      title="Change Basemap Style"
      aria-label="Change Basemap Style"
      aria-expanded={menuOpen}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
      <span class="btn-text">Basemap</span>
    </button>

    <button
      class="outline-btn basemap-btn"
      class:active={showPlaceNames}
      onclick={onTogglePlaceNames}
      title={showPlaceNames ? 'Hide place names on map' : 'Show place names on map'}
      aria-label="Toggle place names"
      aria-pressed={showPlaceNames}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
      <span class="btn-text">Place names</span>
    </button>
  </div>
</div>

<style>
  .basemap-control-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }

  .btn-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .basemap-btn {
    position: relative;
    z-index: 45;
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }

  .menu-divider {
    height: 1px;
    background: var(--border-color);
    margin: 4px 4px 2px 4px;
  }

  .placenames-toggle {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    user-select: none;
  }

  .placenames-toggle:hover {
    background: var(--bg-secondary);
  }

  .placenames-toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .switch-track {
    width: 30px;
    height: 17px;
    background: var(--border-strong);
    border-radius: 999px;
    position: relative;
    transition: background 0.15s ease;
    flex-shrink: 0;
  }

  .placenames-toggle input:checked + .switch-track {
    background: var(--accent-civic);
  }

  .switch-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #ffffff;
    transition: transform 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .placenames-toggle input:checked + .switch-track .switch-thumb {
    transform: translateX(13px);
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
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
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
      transform: translateY(-6px);
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

  @media (max-width: 900px) {
    .btn-text {
      display: none;
    }
  }
</style>
