<script lang="ts">
  interface Props {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    isExampleData: boolean;
    onCopyLink: () => Promise<void>;
    isNetAssign?: boolean;
  }

  let { 
    sidebarOpen, 
    onToggleSidebar, 
    isExampleData = false,
    onCopyLink,
    isNetAssign = false
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
          {isNetAssign ? 'Phase 4 Active Travel Demand & Flow Model' : 'North-South Active Travel Corridor'}
        </span>
      </div>
    </div>
  </div>

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
    <a 
      href="https://github.com/railactive/railactive" 
      target="_blank" 
      rel="noreferrer" 
      class="github-link"
      title="View on GitHub"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    </a>
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

  .left-section, .right-section, .brand, .title-row {
    display: flex;
    align-items: center;
  }

  .left-section {
    gap: 12px;
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

  .right-section {
    gap: 8px;
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

  .github-link {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease;
  }

  .github-link:hover {
    color: var(--text-primary);
  }

  @media (max-width: 540px) {
    .app-header {
      padding: 0 10px;
    }
    .subtitle, .toggle-label, .nav-btn span {
      display: none;
    }
  }
</style>
