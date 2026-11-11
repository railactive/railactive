<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import DetailPanel from './lib/components/DetailPanel.svelte';
  import PasswordGate from './lib/components/PasswordGate.svelte';
  import PrintLegend from './lib/components/PrintLegend.svelte';
  import { featureCenter } from './lib/components/MapButtons.svelte';
  import MapView from './lib/map/MapView.svelte';
  import { hasValidMapHash, isMobileViewport, readUrlState, writeUrlState, type AppUrlState, type PrintMode } from './lib/urlState';
  import {
    annotatePointRouteDistances,
    effectiveHiddenGroups,
    groupFor,
    groupsFor,
    isLegacyIntervention,
    isPending,
    isSuperseded,
    normalizeClassification,
    PENDING_LABEL,
    showsPending,
    showsSuperseded,
    SUPERSEDED_LABEL
  } from './lib/palette';
  import type { 
    CyclewayFeatureCollection, 
    FilterState, 
    CyclewayStats, 
    CyclewaySegmentProperties 
  } from './lib/types/cycleway';

  const initialUrl = new URL(window.location.href);
  const initialUrlState = readUrlState(initialUrl);
  const hasInitialMapView = hasValidMapHash(initialUrl.hash);

  let rawData: CyclewayFeatureCollection | null = $state(null);
  let loading: boolean = $state(true);
  let error: string | null = $state(null);
  let isExampleData: boolean = $state(false);
  let isAuthenticated: boolean = $state(true); // default true for seamless local dev, checks session on mount

  let sidebarOpen: boolean = $state(initialUrlState.sidebarOpen);
  let basemap: string = $state(initialUrlState.basemap);
  let selectedSegment: CyclewaySegmentProperties | null = $state(null);
  let clickedSegmentCenter: [number, number] | null = $state(null);
  let selectedSegmentCenter = $derived.by(() => {
    if (!selectedSegment) return null;
    if (clickedSegmentCenter) return clickedSegmentCenter;
    const match = rawData?.features.find(f => f.properties.id === selectedSegment?.id);
    return match ? featureCenter(match.geometry) : null;
  });
  let showHs2Railway: boolean = $state(initialUrlState.showHs2Railway);
  let showInterventions: boolean = $state(initialUrlState.showInterventions);
  let showActivePoints: boolean = $state(initialUrlState.showActivePoints);
  let showSupersededPoints: boolean = $state(initialUrlState.showSupersededPoints);
  let showPendingPoints: boolean = $state(initialUrlState.showPendingPoints);
  let showNcn: boolean = $state(initialUrlState.showNcn);
  let showOpenRoads: boolean = $state(initialUrlState.showOpenRoads);
  let showStudyArea: boolean = $state(initialUrlState.showStudyArea);
  let showPlaceNames: boolean = $state(initialUrlState.showPlaceNames);
  let printMode: PrintMode = $state(initialUrlState.printMode);
  let urlStateReady: boolean = $state(false);

  let mapViewRef: any = $state(null);

  let filters: FilterState = $state(initialUrlState.filters);

  // Check password authentication on mount
  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pwdParam = urlParams.get('pwd');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Check authentication
    const hasAuth = sessionStorage.getItem('railactive_auth') === 'granted' || pwdParam === 'railactive!' || (isLocalhost && !urlParams.has('protect'));
    if (!hasAuth) {
      isAuthenticated = false;
    } else {
      isAuthenticated = true;
      sessionStorage.setItem('railactive_auth', 'granted');
    }

    const forceExample = urlParams.get('example') === 'true' || import.meta.env.MODE === 'example';

    try {
      if (forceExample) {
        console.info('Loading open example dataset (public/data/example.geojson)...');
        const resp = await fetch('./data/example.geojson');
        if (!resp.ok) throw new Error(`Example dataset error (${resp.status})`);
        rawData = annotatePointRouteDistances(await resp.json());
        isExampleData = true;
      } else {
        // Try production dataset first (bypass browser cache so updated local GeoJSON is always loaded)
        try {
          const resp = await fetch('./data/north_south_cycleway.json?v=0.5.0', { cache: 'no-cache' });
          if (resp.ok) {
            rawData = annotatePointRouteDistances(await resp.json());
            isExampleData = false;
          } else {
            throw new Error(`Production data not found (${resp.status})`);
          }
        } catch (prodErr) {
          console.warn('Production dataset not found, falling back to open example dataset...');
          const fallbackResp = await fetch('./data/example.geojson');
          if (!fallbackResp.ok) throw new Error(`Example dataset fallback failed (${fallbackResp.status})`);
          rawData = annotatePointRouteDistances(await fallbackResp.json());
          isExampleData = true;
        }
      }
      validateInitialFilters();
      restoreSelectedSegment(initialUrlState.selectedSegmentKey);
      loading = false;
    } catch (err: any) {
      error = err.message || 'Error loading cycleway dataset';
      loading = false;
    } finally {
      urlStateReady = true;
    }
  });

  function validateInitialFilters() {
    if (!rawData) return;

    const activeFeatures = rawData.features.filter(feature =>
      feature.properties.layer_type !== 'hs2_railway'
      && feature.properties.layer_type !== 'intervention'
      && !isSuperseded(feature.properties)
      && !isPending(feature.properties)
    );
    const developers = new Set(activeFeatures.map(feature => feature.properties.developer).filter(Boolean));
    const categories = new Set(activeFeatures.map(feature => feature.properties.category).filter(Boolean));
    const classifications = new Set(
      activeFeatures.map(feature => {
        const classification = feature.properties.classification;
        return normalizeClassification(classification) || 'Existing routes';
      })
    );
    const sections = new Set(activeFeatures.map(feature => feature.properties.section).filter(Boolean));
    const legendValues = new Set(groupsFor(filters.colorBy).map(group => group.label));

    filters = {
      ...filters,
      developer: developers.has(filters.developer) ? filters.developer : '',
      category: categories.has(filters.category) ? filters.category : '',
      classification: classifications.has(filters.classification) ? filters.classification : '',
      section: sections.has(filters.section) ? filters.section : '',
      status: ['preferred', 'alternative'].includes(filters.status) ? filters.status : '',
      hiddenLegendItems: filters.hiddenLegendItems.filter(item => legendValues.has(item))
    };
  }

  function restoreSelectedSegment(segmentKey: string | null) {
    if (!rawData || !segmentKey) return;
    selectedSegment = rawData.features.find(feature =>
      feature.properties.link_id === segmentKey
      || String(feature.properties.id) === segmentKey
    )?.properties ?? null;
  }

  function currentUrlState(): AppUrlState {
    return {
      basemap: basemap as AppUrlState['basemap'],
      sidebarOpen,
      filters: {
        developer: filters.developer,
        category: filters.category,
        classification: filters.classification,
        section: filters.section,
        status: filters.status,
        searchTerm: filters.searchTerm,
        colorBy: filters.colorBy,
        hiddenLegendItems: [...filters.hiddenLegendItems],
        showSuperseded: filters.showSuperseded,
        showPending: filters.showPending
      },
      selectedSegmentKey: selectedSegment?.link_id || (selectedSegment ? String(selectedSegment.id) : null),
      showHs2Railway,
      showInterventions,
      showActivePoints,
      showSupersededPoints,
      showPendingPoints,
      showNcn,
      showOpenRoads,
      showStudyArea,
      showPlaceNames,
      printMode
    };
  }

  function syncUrlState() {
    const relativeUrl = writeUrlState(new URL(window.location.href), currentUrlState());
    window.history.replaceState(window.history.state, '', relativeUrl);
    return new URL(relativeUrl, window.location.origin).href;
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(syncUrlState());
  }

  $effect(() => {
    const state = currentUrlState();
    if (!urlStateReady) return;

    const timer = setTimeout(() => {
      const relativeUrl = writeUrlState(new URL(window.location.href), state);
      window.history.replaceState(window.history.state, '', relativeUrl);
    }, 350);

    return () => clearTimeout(timer);
  });

  // Active travel routes, separated from the underlying railway line and intervention points
  let routeFeatures = $derived.by(() => {
    if (!rawData) return [];
    return rawData.features.filter(f =>
      f.properties.layer_type !== 'hs2_railway'
      && f.properties.layer_type !== 'intervention'
    );
  });

  // Total length of the rendered HS2 railway alignment reference layer
  let hs2RailwayKm = $derived.by(() => {
    if (!rawData) return 0;
    return rawData.features
      .filter(f => f.properties.layer_type === 'hs2_railway' && !isPending(f.properties) && !isSuperseded(f.properties))
      .reduce((sum, f) => sum + (Number(f.properties.length_km) || 0), 0);
  });

  // Junction / intervention points grouped by active route, superseded/legacy, and pending
  let allPointFeatures = $derived.by(() => {
    if (!rawData) return [];
    return rawData.features.filter(f => f.geometry.type === 'Point');
  });

  let activePointCount = $derived(
    allPointFeatures.filter(f => !isPending(f.properties) && !isLegacyIntervention(f.properties)).length
  );
  let supersededPointCount = $derived(
    allPointFeatures.filter(f => !isPending(f.properties) && isLegacyIntervention(f.properties)).length
  );
  let pendingPointCount = $derived(
    allPointFeatures.filter(f => isPending(f.properties)).length
  );

  let effectiveShowActivePoints = $derived(showActivePoints);
  let effectiveShowSupersededPoints = $derived(showSupersededPoints || showsSuperseded(filters));
  let effectiveShowPendingPoints = $derived(showPendingPoints || showsPending(filters));

  let interventionCount = $derived(
    (effectiveShowActivePoints ? activePointCount : 0)
    + (effectiveShowSupersededPoints ? supersededPointCount : 0)
    + (effectiveShowPendingPoints ? pendingPointCount : 0)
  );

  // The current network, without superseded or pending alignments; drives the filter dropdown options
  let activeNetworkFeatures = $derived(routeFeatures.filter(f => !isSuperseded(f.properties) && !isPending(f.properties)));

  // Superseded and pending alignments are only in scope for the alignment-status legend, where they are
  // opt-in rows (hidden until ticked)
  let scopeFeatures = $derived(filters.colorBy === 'status' ? routeFeatures : activeNetworkFeatures);

  // Legend groups switched off, including Superseded and Pending while unticked
  let hiddenGroups = $derived(effectiveHiddenGroups(filters));

  // A superseded or pending link/point can't stay selected once its opt-in layer is hidden
  $effect(() => {
    if (!selectedSegment) return;
    if (selectedSegment.layer_type === 'intervention') {
      if (!showInterventions) {
        selectedSegment = null;
      } else if (isPending(selectedSegment) && !effectiveShowPendingPoints) {
        selectedSegment = null;
      } else if (!isPending(selectedSegment) && isLegacyIntervention(selectedSegment) && !effectiveShowSupersededPoints) {
        selectedSegment = null;
      } else if (!isPending(selectedSegment) && !isLegacyIntervention(selectedSegment) && !effectiveShowActivePoints) {
        selectedSegment = null;
      }
    } else if (isSuperseded(selectedSegment) && !showsSuperseded(filters)) {
      selectedSegment = null;
    } else if (isPending(selectedSegment) && !showsPending(filters)) {
      selectedSegment = null;
    }
  });

  // Extract unique filter lists
  let availableDevelopers = $derived.by(() => {
    const devs = new Set<string>();
    for (const f of activeNetworkFeatures) {
      if (f.properties.developer) devs.add(f.properties.developer);
    }
    return Array.from(devs).sort();
  });

  let availableCategories = $derived.by(() => {
    const cats = new Set<string>();
    for (const f of activeNetworkFeatures) {
      if (f.properties.category) cats.add(f.properties.category);
    }
    return Array.from(cats).sort();
  });

  let availableClassifications = $derived.by(() => {
    const cls = new Set<string>();
    for (const f of activeNetworkFeatures) {
      const c = f.properties.classification;
      if (c) {
        cls.add(normalizeClassification(c));
      }
    }
    return Array.from(cls).sort();
  });

  let availableSections = $derived.by(() => {
    const secs = new Set<string>();
    for (const f of activeNetworkFeatures) {
      if (f.properties.section) secs.add(f.properties.section);
    }
    return Array.from(secs).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  });

  // Features matching the sidebar filters (legend visibility is applied separately so
  // hidden legend groups keep their km and can be switched back on)
  let matchingFeatures = $derived.by(() => {
    return scopeFeatures.filter(f => {
      const p = f.properties;
      if (filters.developer && p.developer !== filters.developer) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.classification) {
        const pCls = normalizeClassification(p.classification);
        if (pCls !== normalizeClassification(filters.classification)) return false;
      }
      if (filters.section && p.section !== filters.section) return false;
      if (filters.status && !isSuperseded(p) && !isPending(p) && (p.status || 'preferred') !== filters.status) return false;
      const term = filters.searchTerm.trim().toLowerCase();
      if (term) {
        const matchName = p.name && p.name.toLowerCase().includes(term);
        const matchId = p.link_id && p.link_id.toLowerCase().includes(term);
        const matchRemarks = p.remarks && p.remarks.toLowerCase().includes(term);
        if (!matchName && !matchId && !matchRemarks) return false;
      }
      return true;
    });
  });

  let visibleMatchingFeatures = $derived(
    matchingFeatures.filter(f => !hiddenGroups.includes(groupFor(filters.colorBy, f.properties).label))
  );

  // Matching features that count towards km totals. Alternatives would double-count the
  // preferred spine, so they only count when selected or when colouring by status.
  let countedFeatures = $derived(matchingFeatures.filter(f =>
    filters.status === 'alternative' || filters.colorBy === 'status' || f.properties.status !== 'alternative'
  ));

  // Km per colour group, in legend order, for the given features
  function groupKm(features: typeof activeNetworkFeatures) {
    const kmByLabel = new Map<string, number>();
    for (const f of features) {
      const label = groupFor(filters.colorBy, f.properties).label;
      kmByLabel.set(label, (kmByLabel.get(label) ?? 0) + (f.properties.length_km || 0));
    }
    return groupsFor(filters.colorBy)
      .map(({ label, color }) => ({ label, color, km: kmByLabel.get(label) ?? 0 }));
  }

  // Legend: every group present in the data (plus alwaysShow groups), with km under the current filters
  let legendItems = $derived.by(() => {
    const present = new Set(scopeFeatures.map(f => groupFor(filters.colorBy, f.properties).label));
    const always = new Set(groupsFor(filters.colorBy).filter(g => g.alwaysShow).map(g => g.label));
    return groupKm(countedFeatures).filter(item => present.has(item.label) || always.has(item.label));
  });

  // Live statistics: the visible legend groups only
  let stats: CyclewayStats = $derived.by(() => {
    const visible = countedFeatures.filter(f => !hiddenGroups.includes(groupFor(filters.colorBy, f.properties).label));
    const composition = groupKm(visible).filter(item => item.km > 0);
    return {
      totalKm: composition.reduce((sum, item) => sum + item.km, 0),
      totalSegments: visible.length,
      composition
    };
  });

  // Store the legend's hidden groups, splitting out the opt-in Superseded and Pending rows
  function setHiddenGroups(hidden: string[]) {
    filters = {
      ...filters,
      hiddenLegendItems: hidden.filter(label => label !== SUPERSEDED_LABEL && label !== PENDING_LABEL),
      showSuperseded: filters.colorBy === 'status' ? !hidden.includes(SUPERSEDED_LABEL) : filters.showSuperseded,
      showPending: filters.colorBy === 'status' ? !hidden.includes(PENDING_LABEL) : filters.showPending
    };
  }

  // Toggle individual legend item visibility (Add / Remove layer)
  function handleToggleLegendItem(label: string) {
    setHiddenGroups(hiddenGroups.includes(label)
      ? hiddenGroups.filter(l => l !== label)
      : [...hiddenGroups, label]);
  }

  // Isolate a single legend item layer
  function handleIsolateLegendItem(label: string) {
    const allLabels = legendItems.map(i => i.label);
    const isAlreadyIsolated = hiddenGroups.length === allLabels.length - 1 && !hiddenGroups.includes(label);
    setHiddenGroups(isAlreadyIsolated ? [] : allLabels.filter(l => l !== label));
  }

  function handleShowAllLegendItems() {
    setHiddenGroups([]);
  }

  function handleResetFilters() {
    filters = {
      developer: '',
      category: '',
      classification: '',
      section: '',
      status: '',
      searchTerm: '',
      colorBy: 'classification',
      hiddenLegendItems: [],
      showSuperseded: false,
      showPending: false
    };
  }

  function handleZoomTo(id: number) {
    if (isMobileViewport()) {
      sidebarOpen = false;
    }
    if (mapViewRef && typeof mapViewRef.zoomToSegment === 'function') {
      mapViewRef.zoomToSegment(id);
    }
  }

  function handleZoomToSearch() {
    if (visibleMatchingFeatures.length === 0) return;
    if (visibleMatchingFeatures.length === 1) {
      selectedSegment = visibleMatchingFeatures[0].properties;
      clickedSegmentCenter = null;
    }
    if (isMobileViewport()) {
      sidebarOpen = false;
    }
    if (mapViewRef && typeof mapViewRef.zoomToFeatures === 'function') {
      mapViewRef.zoomToFeatures(visibleMatchingFeatures.map(f => f.properties.id));
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isInput = target && (
      target.tagName === 'INPUT'
      || target.tagName === 'SELECT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
    );
    if (event.key === 'Escape' && printMode) {
      printMode = null;
    } else if (!isInput && !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'p' || event.key === 'P')) {
      printMode = printMode === null ? 'legend' : (printMode === 'legend' ? 'clean' : null);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !isAuthenticated}
  <PasswordGate onAuthenticated={() => isAuthenticated = true} />
{/if}

{#if !printMode}
  <div class="header-shell">
    <Header 
      {sidebarOpen} 
      onCopyLink={copyShareLink}
      onToggleSidebar={() => {
        sidebarOpen = !sidebarOpen;
        if (!isMobileViewport()) {
          setTimeout(() => {
            if (mapViewRef && typeof mapViewRef.fitCorridorBounds === 'function') {
              mapViewRef.fitCorridorBounds();
            }
          }, 300);
        }
      }}
      {isExampleData}
      {basemap}
      {showPlaceNames}
      onChangeBasemap={(style) => basemap = style}
      onTogglePlaceNames={() => showPlaceNames = !showPlaceNames}
      onSelectPlace={(bbox) => {
        if (isMobileViewport()) sidebarOpen = false;
        mapViewRef?.zoomToPlace(bbox);
      }}
      onEnterPrintView={() => (printMode = 'legend')}
    />
  </div>
{/if}

<main class="main-viewport" class:print-active={Boolean(printMode)}>
  {#if loading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading Active Travel Network...</p>
    </div>
  {:else if error}
    <div class="error-overlay">
      <h3>Failed to load network data</h3>
      <p>{error}</p>
    </div>
  {/if}

  {#if !printMode}
    <div class="sidebar-shell">
      <Sidebar 
        open={sidebarOpen}
        onClose={() => (sidebarOpen = false)}
        {stats}
        bind:filters={filters}
        legend={{
          items: legendItems,
          hiddenItems: hiddenGroups,
          onToggleItem: handleToggleLegendItem,
          onIsolateItem: handleIsolateLegendItem,
          onShowAll: handleShowAllLegendItems,
          showHs2Railway,
          hs2RailwayKm,
          onToggleHs2Railway: () => showHs2Railway = !showHs2Railway,
          showInterventions,
          interventionCount,
          activePointCount,
          supersededPointCount,
          pendingPointCount,
          showActivePoints: effectiveShowActivePoints,
          showSupersededPoints: effectiveShowSupersededPoints,
          showPendingPoints: effectiveShowPendingPoints,
          onToggleInterventions: () => showInterventions = !showInterventions,
          onToggleActivePoints: () => showActivePoints = !showActivePoints,
          onToggleSupersededPoints: () => showSupersededPoints = !showSupersededPoints,
          onTogglePendingPoints: () => showPendingPoints = !showPendingPoints,
          showNcn,
          onToggleNcn: () => showNcn = !showNcn,
          showOpenRoads,
          onToggleOpenRoads: () => showOpenRoads = !showOpenRoads,
          showStudyArea,
          onToggleStudyArea: () => showStudyArea = !showStudyArea
        }}
        {availableDevelopers}
        {availableCategories}
        {availableClassifications}
        {availableSections}
        searchMatchCount={visibleMatchingFeatures.length}
        onZoomToSearch={handleZoomToSearch}
        onResetFilters={handleResetFilters}
      />
    </div>
  {/if}

  {#if !loading && !error && printMode !== 'clean'}
    <div class="print-legend-shell" class:visible-on-screen={printMode === 'legend'}>
      <PrintLegend
        colorBy={filters.colorBy}
        {filters}
        items={legendItems}
        hiddenItems={hiddenGroups}
        {stats}
        {showHs2Railway}
        {hs2RailwayKm}
        {showInterventions}
        {activePointCount}
        {supersededPointCount}
        {pendingPointCount}
        showActivePoints={effectiveShowActivePoints}
        showSupersededPoints={effectiveShowSupersededPoints}
        showPendingPoints={effectiveShowPendingPoints}
        {showNcn}
        {showOpenRoads}
        {showStudyArea}
      />
    </div>
  {/if}

  {#if printMode}
    <div class="print-hover-zone" role="region" aria-label="Print view controls">
      <div class="print-hover-toolbar">
        <button
          type="button"
          class="print-pill-btn"
          class:active={printMode === 'legend'}
          onclick={() => (printMode = 'legend')}
          title="Publication view with compact read-only legend (?print=true)"
        >
          Legend
        </button>
        <button
          type="button"
          class="print-pill-btn"
          class:active={printMode === 'clean'}
          onclick={() => (printMode = 'clean')}
          title="Pure map canvas without overlays (?print=clean)"
        >
          Clean
        </button>
        <button
          type="button"
          class="print-pill-btn"
          onclick={() => mapViewRef?.exportMapCanvasPng()}
          title="Download WebGL map canvas as PNG"
        >
          PNG
        </button>
        <button
          type="button"
          class="print-pill-btn"
          onclick={() => window.print()}
          title="Open browser print / Save as PDF"
        >
          Print
        </button>
        <button
          type="button"
          class="print-pill-btn exit"
          onclick={() => (printMode = null)}
          title="Exit print view (Esc)"
        >
          Exit (Esc)
        </button>
      </div>
    </div>
  {/if}

  <MapView 
    bind:this={mapViewRef}
    data={rawData}
    {filters}
    {basemap}
    {sidebarOpen}
    {hasInitialMapView}
    {selectedSegment}
    onSelectSegment={(seg, center = null) => {
      selectedSegment = seg;
      clickedSegmentCenter = center;
    }}
    {showHs2Railway}
    {showInterventions}
    {showActivePoints}
    {showSupersededPoints}
    {showPendingPoints}
    {showNcn}
    {showOpenRoads}
    {showStudyArea}
    {showPlaceNames}
    {printMode}
  />

  {#if !printMode}
    <div class="detail-shell">
      <DetailPanel
        segment={selectedSegment}
        center={selectedSegmentCenter}
        onClose={() => {
          selectedSegment = null;
          clickedSegmentCenter = null;
        }}
        onZoomTo={handleZoomTo}
      />
    </div>
  {/if}
</main>

<style>
  .main-viewport {
    flex: 1;
    min-height: 0;
    position: relative;
    width: 100%;
    height: calc(100vh - 56px);
    height: calc(100dvh - 56px);
    overflow: hidden;
    background: var(--bg-primary);
  }

  .main-viewport.print-active {
    height: 100vh;
    height: 100dvh;
  }

  .print-legend-shell {
    display: none;
  }

  .print-legend-shell.visible-on-screen {
    display: block;
  }

  .print-hover-zone {
    position: absolute;
    top: 0;
    right: 0;
    padding: 12px 14px 28px 28px;
    z-index: 40;
  }

  .print-hover-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-strong);
    border-radius: 9999px;
    padding: 4px;
    box-shadow: var(--shadow-md);
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .print-hover-zone:hover .print-hover-toolbar,
  .print-hover-toolbar:focus-within {
    opacity: 1;
    transform: translateY(0);
  }

  @media (hover: none), (max-width: 767px) {
    .print-hover-toolbar {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .print-pill-btn {
    background: transparent;
    border: none;
    border-radius: 9999px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .print-pill-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .print-pill-btn.active {
    background: var(--accent-civic);
    color: #ffffff;
  }

  .print-pill-btn.exit {
    color: var(--accent-rose);
  }

  .print-pill-btn.exit:hover {
    background: #fef2f2;
    color: #b91c1c;
  }

  @media print {
    .header-shell,
    .sidebar-shell,
    .detail-shell,
    .print-hover-zone {
      display: none !important;
    }

    .main-viewport {
      height: 100vh !important;
    }

    .print-legend-shell {
      display: block !important;
    }
  }
</style>
