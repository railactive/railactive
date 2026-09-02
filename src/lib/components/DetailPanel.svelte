<script lang="ts">
  import type { CyclewaySegmentProperties } from '../types/cycleway';

  interface Props {
    segment: CyclewaySegmentProperties | null;
    onClose: () => void;
    onZoomTo: (id: number) => void;
  }

  let { segment, onClose, onZoomTo }: Props = $props();
</script>

{#if segment}
  <div class="detail-card">
    <div class="detail-header">
      <div class="title-wrap">
        <span class="badge-section">Section {segment.section || 'N/A'}</span>
        <h3>{segment.name || `Segment #${segment.id}`}</h3>
      </div>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>

    <div class="detail-body">
      <div class="attr-grid">
        <div class="attr-item">
          <span class="attr-label">Link ID</span>
          <span class="attr-value font-mono">{segment.link_id || segment.id}</span>
        </div>
        <div class="attr-item">
          <span class="attr-label">Length</span>
          <span class="attr-value font-mono">{segment.length_km ? segment.length_km.toFixed(2) + ' km' : 'N/A'}</span>
        </div>
        <div class="attr-item full">
          <span class="attr-label">Category</span>
          <span class="attr-value">{segment.category || 'Uncategorized'}</span>
        </div>
        <div class="attr-item full">
          <span class="attr-label">Classification</span>
          <span class="attr-value">{segment.classification || 'Unclassified'}</span>
        </div>
        <div class="attr-item">
          <span class="attr-label">Lead Developer</span>
          <span class="attr-value">{segment.developer || 'Unassigned'}</span>
        </div>
        <div class="attr-item">
          <span class="attr-label">Setting</span>
          <span class="attr-value">{segment.setting || 'Rural'}</span>
        </div>
        {#if segment.remarks}
          <div class="attr-item full">
            <span class="attr-label">Remarks</span>
            <span class="attr-value text-muted">{segment.remarks}</span>
          </div>
        {/if}
      </div>

      <button class="zoom-btn" onclick={() => onZoomTo(segment.id)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Zoom to Segment
      </button>
    </div>
  </div>
{/if}

<style>
  .detail-card {
    position: absolute;
    bottom: 24px;
    right: 24px;
    width: 320px;
    max-width: calc(100vw - 48px);
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-panel);
    z-index: 25;
    overflow: hidden;
    animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 14px 8px 14px;
    border-bottom: 1px solid var(--border-color);
  }

  .title-wrap h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 4px;
  }

  .badge-section {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .detail-body {
    padding: 12px 14px;
  }

  .attr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    margin-bottom: 12px;
  }

  .attr-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .attr-item.full {
    grid-column: span 2;
  }

  .attr-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .attr-value {
    font-size: 12px;
    color: var(--text-primary);
  }

  .font-mono {
    font-family: 'JetBrains Mono', monospace;
  }

  .text-muted {
    color: var(--text-secondary);
    font-size: 11px;
    font-style: italic;
  }

  .zoom-btn {
    width: 100%;
    background: linear-gradient(135deg, #0284c7, #2563eb);
    border: none;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    padding: 8px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .zoom-btn:hover {
    opacity: 0.9;
  }
</style>
