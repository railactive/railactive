<script lang="ts">
  import type { CyclewayStats } from '../types/cycleway';

  interface Props {
    stats: CyclewayStats;
  }

  let { stats }: Props = $props();

  let hs2Pct = $derived(stats.totalKm > 0 ? (stats.hs2Km / stats.totalKm) * 100 : 0);
  let greenwayPct = $derived(stats.totalKm > 0 ? (stats.greenwayKm / stats.totalKm) * 100 : 0);
  let otherPct = $derived(Math.max(0, 100 - hs2Pct - greenwayPct));
  let otherKm = $derived(Math.max(0, stats.totalKm - stats.hs2Km - stats.greenwayKm));
</script>

<div class="kpi-wrapper">
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Corridor</div>
      <div class="kpi-value">{stats.totalKm.toFixed(1)} <span class="unit">km</span></div>
      <div class="kpi-sub">{stats.totalSegments} segments</div>
    </div>

    <div class="kpi-card highlight-hs2">
      <div class="kpi-label">HS2 Haulage</div>
      <div class="kpi-value">{stats.hs2Km.toFixed(1)} <span class="unit">km</span></div>
      <div class="kpi-sub">{hs2Pct.toFixed(0)}% of total</div>
    </div>

    <div class="kpi-card highlight-greenway">
      <div class="kpi-label">Greenways</div>
      <div class="kpi-value">{stats.greenwayKm.toFixed(1)} <span class="unit">km</span></div>
      <div class="kpi-sub">{greenwayPct.toFixed(0)}% of total</div>
    </div>
  </div>

  <!-- Distribution Progress Bar -->
  <div class="distribution-section">
    <div class="dist-header">
      <span class="dist-title">Corridor Composition</span>
      <span class="dist-meta">{stats.totalKm.toFixed(1)} km</span>
    </div>
    <div class="dist-bar">
      {#if hs2Pct > 0}
        <div class="bar-segment hs2-bar" style="width: {hs2Pct}%;" title="HS2 Haulage: {stats.hs2Km.toFixed(1)} km ({hs2Pct.toFixed(0)}%)"></div>
      {/if}
      {#if greenwayPct > 0}
        <div class="bar-segment greenway-bar" style="width: {greenwayPct}%;" title="New Greenways: {stats.greenwayKm.toFixed(1)} km ({greenwayPct.toFixed(0)}%)"></div>
      {/if}
      {#if otherPct > 0}
        <div class="bar-segment other-bar" style="width: {otherPct}%;" title="Existing Routes & Quietways: {otherKm.toFixed(1)} km ({otherPct.toFixed(0)}%)"></div>
      {/if}
    </div>
    <div class="dist-legend">
      <span class="legend-chip"><span class="dot hs2"></span> HS2 Haulage ({hs2Pct.toFixed(0)}%)</span>
      <span class="legend-chip"><span class="dot greenway"></span> Greenway ({greenwayPct.toFixed(0)}%)</span>
      <span class="legend-chip"><span class="dot other"></span> Existing/Other ({otherPct.toFixed(0)}%)</span>
    </div>
  </div>
</div>

<style>
  .kpi-wrapper {
    margin-bottom: 16px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 10px;
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
    border-color: rgba(249, 115, 22, 0.45);
    background: rgba(249, 115, 22, 0.1);
  }

  .kpi-card.highlight-greenway {
    border-color: rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.1);
  }

  .kpi-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .kpi-card.highlight-hs2 .kpi-label {
    color: #fb923c;
  }

  .kpi-card.highlight-greenway .kpi-label {
    color: #34d399;
  }

  .kpi-value {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    font-family: 'JetBrains Mono', monospace;
  }

  .unit {
    font-size: 10px;
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

  .distribution-section {
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
  }

  .dist-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .dist-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }

  .dist-meta {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted);
  }

  .dist-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9999px;
    overflow: hidden;
    display: flex;
    margin-bottom: 6px;
  }

  .bar-segment {
    height: 100%;
    transition: width 0.3s ease;
  }

  .hs2-bar {
    background: #f97316;
  }

  .greenway-bar {
    background: #10b981;
  }

  .other-bar {
    background: #3b82f6;
  }

  .dist-legend {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--text-muted);
    gap: 4px;
  }

  .legend-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .dot.hs2 { background: #f97316; }
  .dot.greenway { background: #10b981; }
  .dot.other { background: #3b82f6; }
</style>
