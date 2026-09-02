<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import DetailPanel from './lib/components/DetailPanel.svelte';
  import Legend from './lib/components/Legend.svelte';
  import MapView from './lib/map/MapView.svelte';
  import type { 
    CyclewayFeatureCollection, 
    FilterState, 
    CyclewayStats, 
    CyclewaySegmentProperties 
  } from './lib/types/cycleway';

  let rawData: CyclewayFeatureCollection | null = $state(null);
  let loading: boolean = $state(true);
  let error: string | null = $state(null);
  let isExampleData: boolean = $state(false);

  let sidebarOpen: boolean = $state(true);
  let basemap: string = $state('dark');
  let selectedSegment: CyclewaySegmentProperties | null = $state(null);

  let mapViewRef: any = $state(null);

  let filters: FilterState = $state({
    developer: '',
    category: '',
    classification: '',
    section: '',
    searchTerm: '',
    colorBy: 'classification'
  });

  // Load dataset with graceful fallback to example.geojson
  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
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
      loading = false;
    } catch (err: any) {
      error = err.message || 'Error loading cycleway dataset';
      loading = false;
    }
  });

  // Extract unique filter lists
  let availableDevelopers = $derived.by(() => {
    if (!rawData) return [];
    const devs = new Set<string>();
    for (const f of rawData.features) {
      if (f.properties.developer) devs.add(f.properties.developer);
    }
    return Array.from(devs).sort();
  });

  let availableCategories = $derived.by(() => {
    if (!rawData) return [];
    const cats = new Set<string>();
    for (const f of rawData.features) {
      if (f.properties.category) cats.add(f.properties.category);
    }
    return Array.from(cats).sort();
  });

  let availableClassifications = $derived.by(() => {
    if (!rawData) return [];
    const cls = new Set<string>();
    for (const f of rawData.features) {
      if (f.properties.classification) cls.add(f.properties.classification);
    }
    return Array.from(cls).sort();
  });

  let availableSections = $derived.by(() => {
    if (!rawData) return [];
    const secs = new Set<string>();
    for (const f of rawData.features) {
      if (f.properties.section) secs.add(f.properties.section);
    }
    return Array.from(secs).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  });

  // Filtered dataset for statistics
  let filteredFeatures = $derived.by(() => {
    if (!rawData) return [];
    return rawData.features.filter(f => {
      const p = f.properties;
      if (filters.developer && p.developer !== filters.developer) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.classification && p.classification !== filters.classification) return false;
      if (filters.section && p.section !== filters.section) return false;
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

  // Calculate live statistics
  let stats: CyclewayStats = $derived.by(() => {
    let totalKm = 0;
    let hs2Km = 0;
    let greenwayKm = 0;
    const categoryCounts: Record<string, { count: number; km: number }> = {};
    const developerCounts: Record<string, { count: number; km: number }> = {};
    const classificationCounts: Record<string, { count: number; km: number }> = {};

    for (const f of filteredFeatures) {
      const p = f.properties;
      const km = p.length_km || 0;
      totalKm += km;

      if (p.classification === 'HS2 Delivery' || p.developer === 'HS2') {
        hs2Km += km;
      }
      if (p.classification === 'New Greenway' || p.category === 'Traffic-free path away from highway') {
        greenwayKm += km;
      }

      const cat = p.category || 'Uncategorized';
      if (!categoryCounts[cat]) categoryCounts[cat] = { count: 0, km: 0 };
      categoryCounts[cat].count += 1;
      categoryCounts[cat].km += km;

      const dev = p.developer || 'Unassigned';
      if (!developerCounts[dev]) developerCounts[dev] = { count: 0, km: 0 };
      developerCounts[dev].count += 1;
      developerCounts[dev].km += km;

      const cls = p.classification || 'Unclassified';
      if (!classificationCounts[cls]) classificationCounts[cls] = { count: 0, km: 0 };
      classificationCounts[cls].count += 1;
      classificationCounts[cls].km += km;
    }

    return {
      totalKm,
      totalSegments: filteredFeatures.length,
      hs2Km,
      greenwayKm,
      categoryCounts,
      developerCounts,
      classificationCounts
    };
  });

  // Legend items based on active colorBy
  let legendItems = $derived.by(() => {
    const items: { label: string; color: string; km?: number }[] = [];

    if (filters.colorBy === 'category') {
      const colors: Record<string, string> = {
        'Cycleway beside HS2': '#00e5ff',
        'Traffic-free path away from highway': '#00e676',
        '20mph and traffic calmed or protected cycle lane': '#ffab00',
        'Canal tow path or new path close by canal': '#1de9b6'
      };
      for (const [cat, color] of Object.entries(colors)) {
        items.push({
          label: cat,
          color,
          km: stats.categoryCounts[cat]?.km || 0
        });
      }
    } else if (filters.colorBy === 'developer') {
      const colors: Record<string, string> = {
        'HS2': '#00e5ff',
        'DfT': '#2979ff',
        'Local Authority': '#00e676',
        'Canals & River Trust': '#1de9b6',
        'Sustrans': '#ff4081',
        'Developer': '#ffab00'
      };
      for (const [dev, color] of Object.entries(colors)) {
        items.push({
          label: dev,
          color,
          km: stats.developerCounts[dev]?.km || 0
        });
      }
    } else if (filters.colorBy === 'kml') {
      items.push(
        { label: 'HS2 Construction Alignment', color: '#00e5ff' },
        { label: 'New Greenway Corridor', color: '#00e676' },
        { label: 'PROW Upgrade', color: '#d500f9' },
        { label: 'Quiet Lane / Traffic Calmed', color: '#ffab00' }
      );
    } else {
      // Default: Classification (High-contrast neon palette)
      const colors: Record<string, string> = {
        'HS2 Delivery': '#00e5ff',
        'New Greenway': '#00e676',
        'Upgrade PROW': '#d500f9',
        'Quiet Lane': '#ffab00',
        'Local Road Quietway': '#2979ff',
        'Existing routes': '#94a3b8',
        'Town or village centre': '#ff4081',
        'Main Road-Cycle tracks': '#ff1744',
        'Canal Towpath Upgrade': '#1de9b6'
      };
      for (const [cls, color] of Object.entries(colors)) {
        items.push({
          label: cls,
          color,
          km: stats.classificationCounts[cls]?.km || 0
        });
      }
    }
    return items;
  });

  // Current active value for interactive legend highlight
  let activeLegendFilterValue = $derived.by(() => {
    if (filters.colorBy === 'category') return filters.category;
    if (filters.colorBy === 'developer') return filters.developer;
    if (filters.colorBy === 'classification') return filters.classification;
    return '';
  });

  function handleToggleLegendItem(label: string) {
    if (filters.colorBy === 'category') {
      filters.category = filters.category === label ? '' : label;
    } else if (filters.colorBy === 'developer') {
      filters.developer = filters.developer === label ? '' : label;
    } else if (filters.colorBy === 'classification') {
      filters.classification = filters.classification === label ? '' : label;
    }
  }

  function handleResetFilters() {
    filters = {
      developer: '',
      category: '',
      classification: '',
      section: '',
      searchTerm: '',
      colorBy: 'classification'
    };
  }

  function handleZoomTo(id: number) {
    if (mapViewRef && typeof mapViewRef.zoomToSegment === 'function') {
      mapViewRef.zoomToSegment(id);
    }
  }

  function handleExportGeoJSON() {
    if (!filteredFeatures || filteredFeatures.length === 0) return;
    const exportCollection: CyclewayFeatureCollection = {
      type: 'FeatureCollection',
      features: filteredFeatures
    };
    const blob = new Blob([JSON.stringify(exportCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railactive_corridor_${filters.colorBy}_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<Header 
  {sidebarOpen} 
  onToggleSidebar={() => {
    sidebarOpen = !sidebarOpen;
    setTimeout(() => {
      if (mapViewRef && typeof mapViewRef.fitCorridorBounds === 'function') {
        mapViewRef.fitCorridorBounds();
      }
    }, 300);
  }}
  {basemap}
  onChangeBasemap={(style) => basemap = style}
  {isExampleData}
/>

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
    {selectedSegment}
    onSelectSegment={(seg) => selectedSegment = seg}
  />

  {#if !selectedSegment}
    <Legend 
      title={filters.colorBy}
      items={legendItems}
      activeFilterValue={activeLegendFilterValue}
      onToggleItem={handleToggleLegendItem}
    />
  {/if}

  <DetailPanel 
    segment={selectedSegment}
    onClose={() => selectedSegment = null}
    onZoomTo={handleZoomTo}
  />

  <!-- Floating Export Control -->
  <button 
    class="floating-export-btn"
    class:sidebar-open={sidebarOpen}
    onclick={handleExportGeoJSON}
    title="Export currently filtered route segments as GeoJSON"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    Export GeoJSON ({filteredFeatures.length})
  </button>
</main>

<style>
  .main-viewport {
    flex: 1;
    position: relative;
    width: 100%;
    height: calc(100vh - 56px);
    overflow: hidden;
  }

  .loading-overlay, .error-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid var(--border-color);
    padding: 24px 32px;
    border-radius: var(--radius-md);
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    box-shadow: var(--shadow-lg);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--accent-cyan);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .floating-export-btn {
    position: absolute;
    bottom: 24px;
    left: 360px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(8px);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    z-index: 20;
    box-shadow: var(--shadow-panel);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .floating-export-btn:not(.sidebar-open) {
    left: 24px;
  }

  .floating-export-btn:hover {
    background: rgba(30, 41, 59, 0.95);
    border-color: var(--accent-blue);
  }
</style>
