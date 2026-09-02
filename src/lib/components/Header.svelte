<script lang="ts">
  interface Props {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
    isExampleData: boolean;
  }

  let { 
    sidebarOpen, 
    onToggleSidebar, 
    isExampleData = false
  }: Props = $props();
</script>

<header class="app-header">
  <div class="left-section">
    <button
      class="toggle-btn"
      onclick={onToggleSidebar}
      title={sidebarOpen ? 'Close side panel' : 'Open side panel'}
      aria-label={sidebarOpen ? 'Close side panel' : 'Open side panel'}
      aria-expanded={sidebarOpen}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span class="toggle-label">{sidebarOpen ? 'Close panel' : 'Open panel'}</span>
    </button>
    <div class="brand">
      <div class="logo-icon" title="RailActive Multi-Modal Corridor">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19c4-8 4-6 8-10s4-2 8-5"></path>
          <circle cx="4" cy="19" r="2" fill="currentColor"></circle>
          <circle cx="12" cy="9" r="2" fill="currentColor"></circle>
          <circle cx="20" cy="4" r="2" fill="currentColor"></circle>
        </svg>
      </div>
      <div class="title-group">
        <div class="title-row">
          <h1>RailActive</h1>
          {#if isExampleData}
            <span class="example-badge" title="Running with minimal open example dataset">Example Data</span>
          {/if}
        </div>
        <span class="subtitle">North-South Active Travel Corridor</span>
      </div>
    </div>
  </div>

  <div class="right-section">
    <a 
      href="https://github.com/railactive/railactive" 
      target="_blank" 
      rel="noreferrer" 
      class="github-link"
      title="View on GitHub"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    </a>
  </div>
</header>

<style>
  .app-header {
    height: 56px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 30;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .toggle-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    min-width: 36px;
    height: 36px;
    padding: 0 9px;
    gap: 6px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .toggle-label {
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title-group h1 {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .example-badge {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.4);
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }

  .subtitle {
    font-size: 11px;
    color: var(--text-secondary);
    display: block;
    line-height: 1;
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .github-link {
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;
  }

  .github-link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 520px) {
    .app-header {
      padding: 0 12px;
    }

    .left-section {
      gap: 8px;
    }

    .subtitle {
      display: none;
    }
  }
</style>
