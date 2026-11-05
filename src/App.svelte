<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import DetailPanel from './lib/components/DetailPanel.svelte';
  import PasswordGate from './lib/components/PasswordGate.svelte';
  import NetAssignView from './lib/components/NetAssignView.svelte';
  import MapView from './lib/map/MapView.svelte';
  import { hasValidMapHash, readUrlState, writeUrlState, type AppUrlState } from './lib/urlState';
  import {
    effectiveHiddenGroups,
    groupFor,
    groupsFor,
    isSuperseded,
    normalizeClassification,
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
  const isNetAssignRoute = initialUrl.pathname.startsWith('/netassign') || initialUrl.searchParams.get('view') === 'netassign';
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
  let showNcn: boolean = $state(initialUrlState.showNcn);
  let showOpenRoads: boolean = $state(initialUrlState.showOpenRoads);
  let showStudyArea: boolean = $state(initialUrlState.showStudyArea);
  let showPlaceNames: boolean = $state(initialUrlState.showPlaceNames);
  let urlStateReady: boolean = $state(false);

  let mapViewRef: any = $state(null);

  let filters: FilterState = $state(initialUrlState.filters);

  // Check password authentication on mount
  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pwdParam = urlParams.get('pwd');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Check authentication
    const hasAuth = isNetAssignRoute || sessionStorage.getItem('railactive_auth') === 'granted' || pwdParam === 'railactive!' || (isLocalhost && !urlParams.has('protect'));
    if (!hasAuth) {
      isAuthenticated = false;
    } else {
      isAuthenticated = true;
      sessionStorage.setItem('railactive_auth', 'granted');
    }

    if (isNetAssignRoute) {
      loading = false;
      return;
    }

    const forceExample = urlParams.get('example') === 'true' || import.meta.env.MODE === 'example';

    try {
      if (forceExample) {
        console.info('Loading open example dataset (public/data/example.geojson)...');
        const resp = await fetch('./data/example.geojson');
        if (!resp.ok) throw new Error(`Example dataset error (${resp.status})`);
        rawData = await resp.json();
        isExampleData = true;
      } else {
        // Try production dataset first
        try {
          const resp = await fetch('./data/north_south_cycleway.json');
          if (resp.ok) {
            rawData = await resp.json();
            isExampleData = false;
          } else {
            throw new Error(`Production data not found (${resp.status})`);
          }
        } catch (prodErr) {
          console.warn('Production dataset not found, falling back to open example dataset...');
          const fallbackResp = await fetch('./data/example.geojson');
          if (!fallbackResp.ok) throw new Error(`Example dataset fallback failed (${fallbackResp.status})`);
          rawData = await fallbackResp.json();
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
        showSuperseded: filters.showSuperseded
      },
      selectedSegmentKey: selectedSegment?.link_id || (selectedSegment ? String(selectedSegment.id) : null),
      showNcn,
      showOpenRoads,
      showStudyArea,
      showPlaceNames
    };
  }

  function syncUrlState() {
    const relativeUrl = writeUrlState(new URL(window.location.href), currentUrlState());
    window.history.replaceState(window.history.state, '', relativeUrl);
    return new URL(relativeUrl, window.location.origin).href;
  }

  async function copyShareLink() {
    if (isNetAssignRoute) {
      await navigator.clipboard.writeText(window.location.href);
      return;
    }
    await navigator.clipboard.writeText(syncUrlState());
  }

  $effect(() => {
    const state = currentUrlState();
    if (!urlStateReady || isNetAssignRoute) return;

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

  // The current network, without superseded alignments; drives the filter dropdown options
  let activeNetworkFeatures = $derived(routeFeatures.filter(f => !isSuperseded(f.properties)));

  // Superseded alignments are only in scope for the alignment-status legend, where they are
  // an opt-in row (hidden until ticked)
  let scopeFeatures = $derived(filters.colorBy === 'status' ? routeFeatures : activeNetworkFeatures);

  // Legend groups switched off, including Superseded while unticked
  let hiddenGroups = $derived(effectiveHiddenGroups(filters));

  // A superseded link can't stay selected once superseded alignments are hidden
  $effect(() => {
    if (selectedSegment && isSuperseded(selectedSegment) && !showsSuperseded(filters)) {
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
      if (filters.status && !isSuperseded(p) && (p.status || 'preferred') !== filters.status) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchName = p.name && p.name.toLowerCase().includes(term);
        const matchId = p.link_id && p.link_id.toLowerCase().includes(term);
        const matchRemarks = p.remarks && p.remarks.toLowerCase().includes(term);
        if (!matchName && !matchId && !matchRemarks) return false;
      }
      return true;
    });
  });

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

  // Store the legend's hidden groups, splitting out the opt-in Superseded row
  function setHiddenGroups(hidden: string[]) {
    filters = {
      ...filters,
      hiddenLegendItems: hidden.filter(label => label !== SUPERSEDED_LABEL),
      showSuperseded: filters.colorBy === 'status' ? !hidden.includes(SUPERSEDED_LABEL) : filters.showSuperseded
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
      showSuperseded: false
    };
  }

  function handleZoomTo(id: number) {
    if (mapViewRef && typeof mapViewRef.zoomToSegment === 'function') {
      mapViewRef.zoomToSegment(id);
    }
  }
</script>

{#if !isAuthenticated}
  <PasswordGate onAuthenticated={() => isAuthenticated = true} />
{/if}

<Header 
  {sidebarOpen} 
  onCopyLink={copyShareLink}
  onToggleSidebar={() => {
    sidebarOpen = !sidebarOpen;
    if (!isNetAssignRoute) {
      setTimeout(() => {
        if (mapViewRef && typeof mapViewRef.fitCorridorBounds === 'function') {
          mapViewRef.fitCorridorBounds();
        }
      }, 300);
    }
  }}
  {isExampleData}
  isNetAssign={isNetAssignRoute}
  {basemap}
  {showPlaceNames}
  onChangeBasemap={(style) => basemap = style}
  onTogglePlaceNames={() => showPlaceNames = !showPlaceNames}
  onSelectPlace={(bbox) => mapViewRef?.zoomToPlace(bbox)}
/>

{#if isNetAssignRoute}
  <NetAssignView
    {sidebarOpen}
    {basemap}
    onChangeBasemap={(style) => (basemap = style)}
  />
{:else}
<main class="main-viewport">
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

  <Sidebar 
    open={sidebarOpen}
    {stats}
    bind:filters={filters}
    legend={{
      items: legendItems,
      hiddenItems: hiddenGroups,
      onToggleItem: handleToggleLegendItem,
      onIsolateItem: handleIsolateLegendItem,
      onShowAll: handleShowAllLegendItems,
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
    onResetFilters={handleResetFilters}
  />

  <MapView 
    bind:this={mapViewRef}
    data={rawData}
    {filters}
    {basemap}
    {sidebarOpen}
    {hasInitialMapView}
    {selectedSegment}
    onSelectSegment={(seg) => selectedSegment = seg}
    {showNcn}
    {showOpenRoads}
    {showStudyArea}
    {showPlaceNames}
  />

  <DetailPanel
    segment={selectedSegment}
    onClose={() => selectedSegment = null}
    onZoomTo={handleZoomTo}
  />
</main>
{/if}

<style>
  .main-viewport {
    flex: 1;
    position: relative;
    width: 100%;
    height: calc(100vh - 56px);
    overflow: hidden;
    background: var(--bg-primary);
  }
</style>
