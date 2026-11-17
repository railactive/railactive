<script lang="ts">
  import {
    downloadCleanGeoPackage,
    exportCsv,
    exportGeoJson,
    exportKml
  } from '../dataExport';
  import type { ColorBy } from '../palette';
  import type { CyclewayFeature } from '../types/cycleway';
  import { isDevEnvironment } from '../urlState';

  interface Props {
    visibleRoutes: CyclewayFeature[];
    fullRoutes: CyclewayFeature[];
    visiblePoints: CyclewayFeature[];
    fullPoints: CyclewayFeature[];
    showInterventions: boolean;
    colorBy: ColorBy;
  }

  let {
    visibleRoutes,
    fullRoutes,
    visiblePoints,
    fullPoints,
    showInterventions,
    colorBy
  }: Props = $props();

  const isDev = isDevEnvironment();

  let scope: 'visible' | 'full' = $state('visible');
  let includePoints: boolean = $state(false);
  let userToggledPoints: boolean = $state(false);
  let includeDevFields: boolean = $state(false);

  $effect(() => {
    const mapPointsOn = showInterventions;
    if (!userToggledPoints) {
      includePoints = scope === 'full' ? true : mapPointsOn;
    }
  });

  let selectedRoutes = $derived(scope === 'visible' ? visibleRoutes : fullRoutes);
  let selectedPoints = $derived(
    !includePoints
      ? []
      : scope === 'visible'
        ? (visiblePoints.length > 0 ? visiblePoints : fullPoints)
        : fullPoints
  );

  let selectedKm = $derived(
    selectedRoutes.reduce((sum, f) => sum + (Number(f.properties.length_km) || 0), 0)
  );

  let filenameBase = $derived(
    scope === 'visible' ? 'north-south-greenway-selection' : 'north-south-greenway'
  );

  function setScope(next: 'visible' | 'full') {
    scope = next;
    if (!userToggledPoints) {
      includePoints = next === 'full' ? true : showInterventions;
    }
  }

  function togglePoints() {
    userToggledPoints = true;
    includePoints = !includePoints;
  }

  function handleGeoJson() {
    exportGeoJson(selectedRoutes, selectedPoints, {
      includeDevFields: isDev && includeDevFields,
      filenameBase
    });
  }

  function handleCsv() {
    exportCsv(selectedRoutes, selectedPoints, {
      includeDevFields: isDev && includeDevFields,
      filenameBase
    });
  }

  function handleKml() {
    exportKml(selectedRoutes, selectedPoints, {
      includeDevFields: isDev && includeDevFields,
      colorBy,
      filenameBase
    });
  }

  function handleGpkg() {
    downloadCleanGeoPackage();
  }
</script>

<div class="download-box">
  <div class="scope-tabs" role="radiogroup" aria-label="Download scope">
    <button
      type="button"
      class="scope-tab"
      class:active={scope === 'visible'}
      role="radio"
      aria-checked={scope === 'visible'}
      onclick={() => setScope('visible')}
    >
      Visible on map
    </button>
    <button
      type="button"
      class="scope-tab"
      class:active={scope === 'full'}
      role="radio"
      aria-checked={scope === 'full'}
      onclick={() => setScope('full')}
    >
      Full active network
    </button>
  </div>

  <div class="summary-line">
    <span class="summary-primary">
      <strong>{selectedRoutes.length.toLocaleString()}</strong> segments ({selectedKm.toFixed(1)} km)
    </span>
    {#if includePoints && selectedPoints.length > 0}
      <span class="summary-sep">·</span>
      <span class="summary-pts"><strong>{selectedPoints.length.toLocaleString()}</strong> pts</span>
    {/if}
  </div>

  <div class="options-stack">
    <label class="opt-check">
      <input
        type="checkbox"
        checked={includePoints}
        onchange={togglePoints}
      />
      <span>Include point interventions ({(scope === 'visible' && visiblePoints.length > 0 ? visiblePoints.length : fullPoints.length).toLocaleString()})</span>
    </label>

    {#if isDev}
      <label class="opt-check">
        <input
          type="checkbox"
          bind:checked={includeDevFields}
        />
        <span>Include dev fields (OSM &amp; geocoding)</span>
      </label>
    {/if}
  </div>

  <div class="format-grid">
    <button
      type="button"
      class="fmt-btn"
      disabled={selectedRoutes.length === 0 && selectedPoints.length === 0}
      onclick={handleGeoJson}
      title="Download GeoJSON for QGIS, ArcGIS Pro, R, or Python"
    >
      <span class="fmt-top">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span class="fmt-name">GeoJSON</span>
      </span>
      <span class="fmt-ext">.geojson · GIS</span>
    </button>

    <button
      type="button"
      class="fmt-btn"
      disabled={selectedRoutes.length === 0 && selectedPoints.length === 0}
      onclick={handleCsv}
      title="Download spreadsheet-ready CSV table (Excel compatible)"
    >
      <span class="fmt-top">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="8" y1="13" x2="16" y2="13"></line>
          <line x1="8" y1="17" x2="16" y2="17"></line>
        </svg>
        <span class="fmt-name">Excel / CSV</span>
      </span>
      <span class="fmt-ext">.csv · Table</span>
    </button>

    <button
      type="button"
      class="fmt-btn"
      disabled={selectedRoutes.length === 0 && selectedPoints.length === 0}
      onclick={handleKml}
      title="Download styled KML for Google Earth and Google My Maps"
    >
      <span class="fmt-top">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span class="fmt-name">KML</span>
      </span>
      <span class="fmt-ext">.kml · Google Earth</span>
    </button>

    <button
      type="button"
      class="fmt-btn"
      onclick={handleGpkg}
      title="Download full active network GeoPackage (routes + point_interventions layers)"
    >
      <span class="fmt-top">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
        <span class="fmt-name">GeoPackage</span>
      </span>
      <span class="fmt-ext">.gpkg · Full GIS</span>
    </button>
  </div>
</div>

<style>
  .download-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .scope-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    padding: 2px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .scope-tab {
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 5px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .scope-tab:hover {
    color: var(--text-primary);
  }

  .scope-tab.active {
    background: var(--accent-civic);
    color: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
  }

  .summary-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .summary-line strong {
    color: var(--text-primary);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .summary-sep {
    color: var(--text-muted);
  }

  .options-stack {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .opt-check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .opt-check input[type="checkbox"] {
    margin: 0;
    width: 13px;
    height: 13px;
    accent-color: var(--accent-civic);
    cursor: pointer;
  }

  .format-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .fmt-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 7px 9px;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .fmt-btn:hover:not(:disabled) {
    border-color: var(--accent-civic);
    background: #f8fafc;
    box-shadow: 0 1px 3px rgba(29, 78, 216, 0.08);
  }

  .fmt-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .fmt-top {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--accent-civic);
  }

  .fmt-name {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .fmt-ext {
    font-size: 10px;
    color: var(--text-muted);
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  }

  @media (max-width: 767px) {
    .fmt-btn {
      padding: 8px 10px;
      min-height: 44px;
    }
  }
</style>
