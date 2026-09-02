<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import DetailPanel from './lib/components/DetailPanel.svelte';
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

  // Load GeoJSON data on startup
  onMount(async () => {
    try {
      const response = await fetch('./data/north_south_cycleway.json');
      if (!response.ok) {
        throw new Error(`Failed to load dataset (${response.status})`);
      }
      const json: CyclewayFeatureCollection = await response.json();
      rawData = json;
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
        'Cycleway beside HS2': '#06b6d4',
        'Traffic-free path away from highway': '#10b981',
        '20mph and traffic calmed or protected cycle lane': '#f59e0b',
        'Canal tow path or new path close by canal': '#14b8a6'
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
        'HS2': '#06b6d4',
        'DfT': '#3b82f6',
        'Local Authority': '#10b981',
        'Canals & River Trust': '#14b8a6',
        'Sustrans': '#ec4899',
        'Developer': '#f59e0b'
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
        { label: 'HS2 Construction Alignment', color: '#AFB42B' },
        { label: 'New Greenway Corridor', color: '#0288D1' },
        { label: 'PROW Upgrade', color: '#880E4F' },
        { label: 'Quiet Lane / Traffic Calmed', color: '#097138' }
      );
    } else {
      // Default: Classification
      const colors: Record<string, string> = {
        'HS2 Delivery': '#06b6d4',
        'New Greenway': '#10b981',
        'Upgrade PROW': '#8b5cf6',
        'Quiet Lane': '#f59e0b',
        'Local Road Quietway': '#3b82f6',
        'Existing routes': '#64748b',
        'Town or village centre': '#ec4899',
        'Main Road-Cycle tracks': '#ef4444',
        'Canal Towpath Upgrade': '#14b8a6'
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
</script>

<Header 
  {sidebarOpen} 
  onToggleSidebar={() => sidebarOpen = !sidebarOpen}
  {basemap}
  onChangeBasemap={(style) => basemap = style}
/>

<main class="main-viewport">
  {#if loading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading North-South Cycleway Network...</p>
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
    {legendItems}
    onResetFilters={handleResetFilters}
  />

  <MapView 
    bind:this={mapViewRef}
    data={rawData}
    {filters}
    {basemap}
    {selectedSegment}
    onSelectSegment={(seg) => selectedSegment = seg}
  />

  <DetailPanel 
    segment={selectedSegment}
    onClose={() => selectedSegment = null}
    onZoomTo={handleZoomTo}
  />
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
</style>
