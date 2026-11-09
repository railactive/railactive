<script lang="ts">
  import type { CyclewaySegmentProperties } from '../types/cycleway';
  import { formatStatusLabel, normalizeClassification } from '../palette';
  import MapButtons from './MapButtons.svelte';

  interface Props {
    segment: CyclewaySegmentProperties | null;
    center?: [number, number] | null;
    onClose: () => void;
    onZoomTo: (id: number) => void;
  }

  let { segment, center = null, onClose, onZoomTo }: Props = $props();
</script>

{#if segment}
  <div class="detail-card panel-card">
    <div class="detail-header">
      <div class="title-wrap">
        <div class="badge-row">
          <span class="badge-section">{segment.layer_type === 'intervention' ? 'Intervention' : `Section ${segment.section || 'N/A'}`}</span>
          {#if segment.status}
            <span class="badge-status status-{segment.status.toLowerCase()}">{formatStatusLabel(segment.status)}</span>
          {/if}
        </div>
        <h3>{segment.name || (segment.layer_type === 'intervention' ? `Point #${segment.id}` : `Segment #${segment.id}`)}</h3>
      </div>
      <button class="close-btn" onclick={onClose} aria-label="Close detail panel">×</button>
    </div>

    <div class="detail-body">
      <div class="attr-grid">
        <div class="attr-item">
          <span class="attr-label">{segment.layer_type === 'intervention' ? 'Point ID' : 'Link ID'}</span>
          <span class="attr-value font-mono">{segment.link_id || segment.id}</span>
        </div>
        {#if segment.status}
          <div class="attr-item">
            <span class="attr-label">Status</span>
            <span class="attr-value capitalize">{formatStatusLabel(segment.status)}</span>
          </div>
        {/if}
        {#if segment.layer_type !== 'intervention'}
          <div class="attr-item">
            <span class="attr-label">Length</span>
            <span class="attr-value font-mono">{segment.length_km ? segment.length_km.toFixed(2) + ' km' : 'N/A'}</span>
          </div>
        {/if}
        <div class="attr-item full">
          <span class="attr-label">Delivery category</span>
          <span class="attr-value">{segment.category || (segment.layer_type === 'intervention' ? 'Active Route Treatment' : 'Uncategorized')}</span>
        </div>
        <div class="attr-item full">
          <span class="attr-label">Classification</span>
          <span class="attr-value">{normalizeClassification(segment.classification) || (segment.layer_type === 'intervention' ? 'Intervention Point' : 'Unclassified')}</span>
        </div>
        {#if segment.folder}
          <div class="attr-item full">
            <span class="attr-label">Corridor Section</span>
            <span class="attr-value">{segment.folder}</span>
          </div>
        {/if}
        {#if segment.layer_type !== 'intervention'}
          <div class="attr-item">
            <span class="attr-label">Lead Developer</span>
            <span class="attr-value">{segment.developer || 'Unassigned'}</span>
          </div>
          <div class="attr-item">
            <span class="attr-label">Setting</span>
            <span class="attr-value">{segment.setting || 'Rural'}</span>
          </div>
        {/if}
        {#if segment.remarks}
          <div class="attr-item full">
            <span class="attr-label">Remarks</span>
            <span class="attr-value text-muted">{segment.remarks}</span>
          </div>
        {/if}
      </div>

      <button class="civic-btn zoom-btn" onclick={() => onZoomTo(segment.id)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        {segment.layer_type === 'intervention' ? 'Zoom to Point' : 'Zoom to Segment'}
      </button>

      <MapButtons {center} />
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
    z-index: 25;
    overflow: hidden;
    animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
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
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 4px;
    line-height: 1.25;
  }

  .badge-row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .badge-section {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    background: #eff6ff;
    color: var(--accent-civic);
    border: 1px solid #bfdbfe;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .badge-status {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .badge-status.status-preferred {
    background: #ecfdf5;
    color: var(--accent-emerald);
    border: 1px solid #a7f3d0;
  }

  .badge-status.status-alternative {
    background: #fffbeb;
    color: var(--accent-amber);
    border: 1px solid #fde68a;
  }

  .badge-status.status-superseded {
    background: var(--bg-secondary);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
  }

  .badge-status.status-pending {
    background: #faf5ff;
    color: #9333ea;
    border: 1px solid #e9d5ff;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 2px 4px;
    transition: color 0.15s ease;
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
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  .attr-value {
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
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
    padding: 8px;
  }
</style>
