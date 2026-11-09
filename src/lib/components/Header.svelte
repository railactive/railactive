<script lang="ts">
  import BasemapControl from './BasemapControl.svelte';
  import PlaceSearch from './PlaceSearch.svelte';

  interface Props {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    isExampleData: boolean;
    onCopyLink: () => Promise<void>;
    isNetAssign?: boolean;
    basemap?: string;
    showPlaceNames?: boolean;
    onChangeBasemap?: (style: string) => void;
    onTogglePlaceNames?: () => void;
    onSelectPlace?: (bbox: [number, number, number, number], name: string) => void;
    onEnterPrintView?: () => void;
  }

  let { 
    sidebarOpen, 
    onToggleSidebar, 
    isExampleData = false,
    onCopyLink,
    isNetAssign = false,
    basemap = 'light',
    showPlaceNames = true,
    onChangeBasemap = () => {},
    onTogglePlaceNames = () => {},
    onSelectPlace = () => {},
    onEnterPrintView = () => {}
  }: Props = $props();

  let copyStatus: 'idle' | 'copied' | 'error' = $state('idle');

  async function copyLink() {
    try {
      await onCopyLink();
      copyStatus = 'copied';
      setTimeout(() => {
        if (copyStatus === 'copied') copyStatus = 'idle';
      }, 2000);
    } catch (error) {
      console.error('Unable to copy share link:', error);
      copyStatus = 'error';
    }
  }
</script>

<header class="app-header">
  <div class="left-section">
    <button
      class="outline-btn toggle-btn"
      onclick={onToggleSidebar}
      title={sidebarOpen ? 'Close side panel' : 'Open side panel'}
      aria-label={sidebarOpen ? 'Close side panel' : 'Open side panel'}
      aria-expanded={sidebarOpen}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span class="toggle-label">{sidebarOpen ? 'Close panel' : 'Open panel'}</span>
    </button>

    <div class="brand">
      <div class="logo-icon" title="RailActive Multi-Modal Corridor">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3 7 7 10 10 12 13 16 16 21 21"></path>
          <path d="M19 4 17 7 14 9 12 13"></path>
          <circle cx="3" cy="3" r="1.5" fill="currentColor"></circle>
          <circle cx="19" cy="4" r="1.5" fill="currentColor"></circle>
          <circle cx="12" cy="13" r="1.5" fill="currentColor"></circle>
          <circle cx="21" cy="21" r="1.5" fill="currentColor"></circle>
        </svg>
      </div>
      <div class="title-group">
        <div class="title-row">
          <h1>RailActive</h1>
          {#if isNetAssign}
            <span class="badge" title="NetAssign Active Travel Demand Model">/netassign</span>
          {:else if isExampleData}
            <span class="badge warning" title="Running with open example dataset">Example Data</span>
          {/if}
        </div>
        <span class="subtitle">
          {isNetAssign ? 'Phase 4 Active Travel Demand & Flow Model' : 'North-South Greenway'}
        </span>
      </div>
    </div>
  </div>

  {#if !isNetAssign}
    <div class="center-section">
      <PlaceSearch onSelect={onSelectPlace} />
      <BasemapControl
        {basemap}
        {showPlaceNames}
        {onChangeBasemap}
        {onTogglePlaceNames}
      />
    </div>
  {/if}

  <div class="right-section">
    {#if isNetAssign}
      <a href="/" class="outline-btn nav-btn" title="Return to Corridor Alignment Explorer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <span>Corridor Map</span>
      </a>
    {/if}
    <a
      href="/docs/"
      target="_blank"
      rel="noreferrer"
      class="outline-btn nav-btn"
      title="View Project Documentation, Methodology, and Data Dictionary"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
      <span>Docs</span>
    </a>
    {#if !isNetAssign}
      <button
        class="outline-btn nav-btn"
        onclick={onEnterPrintView}
        title="Switch to clean publication print view (P)"
        aria-label="Switch to print view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        <span>Print</span>
      </button>
    {/if}
    <button
      class="outline-btn nav-btn share-link"
      class:copied={copyStatus === 'copied'}
      class:error={copyStatus === 'error'}
      onclick={copyLink}
      title={copyStatus === 'error' ? 'Unable to copy link' : 'Copy a link to this view'}
      aria-label="Copy a link to this view"
      aria-pressed={copyStatus === 'copied'}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>{copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Failed' : 'Share'}</span>
    </button>
  </div>
</header>

<style>
  .app-header {
    height: 56px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 30;
  }

  .left-section, .center-section, .right-section, .brand, .title-row {
    display: flex;
    align-items: center;
  }

  .left-section {
    gap: 12px;
    flex-shrink: 0;
  }

  .center-section {
    gap: 8px;
    flex: 1;
    justify-content: center;
    padding: 0 16px;
    min-width: 0;
  }

  .right-section {
    gap: 8px;
    flex-shrink: 0;
  }

  .toggle-btn {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }

  .toggle-label {
    font-size: 11px;
    white-space: nowrap;
  }

  .brand {
    gap: 10px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--accent-civic);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 2px 4px rgba(29, 78, 216, 0.2);
  }

  .title-row {
    gap: 8px;
  }

  .title-group h1 {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border: 1px solid var(--border-strong);
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }

  .badge.warning {
    background: #fffbeb;
    color: var(--accent-amber);
    border-color: #fde68a;
  }

  .subtitle {
    font-size: 11px;
    color: var(--text-secondary);
    display: block;
    line-height: 1.1;
  }

  .nav-btn {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
    text-decoration: none;
  }

  .share-link.copied {
    color: var(--accent-emerald);
    border-color: var(--accent-emerald);
    background: #ecfdf5;
  }

  .share-link.error {
    color: var(--accent-rose);
    border-color: var(--accent-rose);
  }

  @media (max-width: 960px) {
    .subtitle, .toggle-label {
      display: none;
    }
  }

  @media (max-width: 540px) {
    .app-header {
      padding: 0 10px;
    }
    .nav-btn span {
      display: none;
    }
  }
</style>
