<script lang="ts">
  import type { CyclewayStats } from '../types/cycleway';

  interface Props {
    stats: CyclewayStats;
  }

  let { stats }: Props = $props();
</script>

<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Total Corridor</div>
    <div class="kpi-value">{stats.totalKm.toFixed(1)} <span class="unit">km</span></div>
    <div class="kpi-sub">{stats.totalSegments} segments</div>
  </div>

  <div class="kpi-card highlight-hs2">
    <div class="kpi-label">HS2 Delivery</div>
    <div class="kpi-value">{stats.hs2Km.toFixed(1)} <span class="unit">km</span></div>
    <div class="kpi-sub">Construction & Legacy</div>
  </div>

  <div class="kpi-card highlight-greenway">
    <div class="kpi-label">New Greenways</div>
    <div class="kpi-value">{stats.greenwayKm.toFixed(1)} <span class="unit">km</span></div>
    <div class="kpi-sub">Traffic-Free Routes</div>
  </div>
</div>

<style>
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }

  .kpi-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .kpi-card.highlight-hs2 {
    border-color: rgba(6, 182, 212, 0.4);
    background: rgba(6, 182, 212, 0.08);
  }

  .kpi-card.highlight-greenway {
    border-color: rgba(16, 185, 129, 0.4);
    background: rgba(16, 185, 129, 0.08);
  }

  .kpi-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .kpi-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    font-family: 'JetBrains Mono', monospace;
  }

  .unit {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
  }

  .kpi-sub {
    font-size: 9px;
    color: var(--text-muted);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
