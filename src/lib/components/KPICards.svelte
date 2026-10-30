<script lang="ts">
  import type { CyclewayStats } from '../types/cycleway';

  interface Props {
    stats: CyclewayStats;
  }

  let { stats }: Props = $props();

  function pct(km: number) {
    return stats.totalKm > 0 ? (km / stats.totalKm) * 100 : 0;
  }

  let summary = $derived(
    stats.composition.map(item => `${item.label} ${item.km.toFixed(1)} km`).join(', ')
  );
</script>

<div class="metrics">
  <div class="headline">
    <span class="total">{stats.totalKm.toFixed(1)} <span class="unit">km</span></span>
    <span class="segments">{stats.totalSegments} segments</span>
  </div>

  <!-- Composition bar uses the same colour groups as the map legend -->
  <div class="bar" role="img" aria-label="Composition: {summary}">
    {#each stats.composition as item (item.label)}
      <div
        class="bar-segment"
        style="width: {pct(item.km)}%; background: {item.color};"
        title="{item.label}: {item.km.toFixed(1)} km ({pct(item.km).toFixed(0)}%)"
      ></div>
    {/each}
  </div>
</div>

<style>
  .metrics {
    margin-bottom: 16px;
  }

  .headline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .total {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
    line-height: 1.1;
  }

  .unit {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .segments {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .bar {
    height: 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9999px;
    overflow: hidden;
    display: flex;
    gap: 1px;
  }

  .bar-segment {
    height: 100%;
    transition: width 0.3s ease;
  }
</style>
