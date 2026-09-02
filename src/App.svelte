<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import DetailPanel from './lib/components/DetailPanel.svelte';
  import Legend from './lib/components/Legend.svelte';
  import BasemapControl from './lib/components/BasemapControl.svelte';
  import PasswordGate from './lib/components/PasswordGate.svelte';
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
  let isAuthenticated: boolean = $state(true); // default true for seamless local dev, checks session on mount

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
    colorBy: 'classification',
    hiddenLegendItems: []
  });

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

  // Separate active travel routes from the underlying railway line
  let activeNetworkFeatures = $derived.by(() => {
    if (!rawData) return [];
    return rawData.features.filter(f => f.properties.layer_type !== 'hs2_railway' && f.properties.layer_type !== 'intervention');
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
        cls.add(c === 'HS2 Delivery' ? 'HS2 Haulage' : c);
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

  // Filtered dataset for active travel statistics
  let filteredFeatures = $derived.by(() => {
    return activeNetworkFeatures.filter(f => {
      const p = f.properties;
      if (filters.developer && p.developer !== filters.developer) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.classification) {
        const pCls = p.classification === 'HS2 Delivery' ? 'HS2 Haulage' : p.classification;
        if (pCls !== filters.classification) return false;
      }
      if (filters.section && p.section !== filters.section) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchName = p.name && p.name.toLowerCase().includes(term);
        const matchId = p.link_id && p.link_id.toLowerCase().includes(term);
        const matchRemarks = p.remarks && p.remarks.toLowerCase().includes(term);
        if (!matchName && !matchId && !matchRemarks) return false;
      }
      if (filters.hiddenLegendItems && filters.hiddenLegendItems.length > 0) {
        if (filters.colorBy === 'category') {
          if (filters.hiddenLegendItems.includes(p.category || 'Uncategorized')) return false;
        } else if (filters.colorBy === 'developer') {
          if (filters.hiddenLegendItems.includes(p.developer || 'Local Authority')) return false;
        } else {
          const pCls = p.classification === 'HS2 Delivery' ? 'HS2 Haulage' : (p.classification || 'Existing routes');
          if (filters.hiddenLegendItems.includes(pCls)) return false;
        }
      }
      return true;
    });
  });

  // Calculate live statistics for active travel routes
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

      if (p.classification === 'HS2 Delivery' || p.classification === 'HS2 Haulage' || p.classification === 'HS2 Legacy' || p.developer === 'HS2' || p.category === 'Cycleway beside HS2') {
        hs2Km += km;
      }
      if (p.classification === 'New Greenway' || p.category === 'Traffic-free path away from highway') {
        greenwayKm += km;
      }

      const cat = p.category || 'Uncategorized';
      if (!categoryCounts[cat]) categoryCounts[cat] = { count: 0, km: 0 };
      categoryCounts[cat].count += 1;
      categoryCounts[cat].km += km;

      const dev = p.developer || 'Local Authority';
      if (!developerCounts[dev]) developerCounts[dev] = { count: 0, km: 0 };
      developerCounts[dev].count += 1;
      developerCounts[dev].km += km;

      let cls = p.classification || 'Existing routes';
      if (cls === 'HS2 Delivery') cls = 'HS2 Haulage';
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

  // Legend items based on active colorBy with full classification set
  let legendItems = $derived.by(() => {
    const items: { label: string; color: string; km?: number }[] = [];

    if (filters.colorBy === 'category') {
      const colors: Record<string, string> = {
        'Cycleway beside HS2': '#f97316', // HS2 Haulage - Orange
        'Traffic-free path away from highway': '#10b981', // Greenway - Emerald
        '20mph and traffic calmed or protected cycle lane': '#3b82f6', // Quietways - Royal Blue
        'Canal tow path or new path close by canal': '#06b6d4' // Canal - Teal Blue
      };
      for (const [cat, color] of Object.entries(colors)) {
        let catKm = 0;
        for (const f of activeNetworkFeatures) {
          if (f.properties.category === cat) catKm += f.properties.length_km || 0;
        }
        if (catKm > 0) {
          items.push({ label: cat, color, km: catKm });
        }
      }
    } else if (filters.colorBy === 'developer') {
      const colors: Record<string, string> = {
        'HS2': '#f97316',
        'DfT': '#1d4ed8',
        'Local Authority': '#10b981',
        'Canals & River Trust': '#06b6d4',
        'Sustrans': '#818cf8',
        'Developer': '#38bdf8'
      };
      for (const [dev, color] of Object.entries(colors)) {
        let devKm = 0;
        for (const f of activeNetworkFeatures) {
          if (f.properties.developer === dev) devKm += f.properties.length_km || 0;
        }
        if (devKm > 0) {
          items.push({ label: dev, color, km: devKm });
        }
      }
    } else {
      // Default: Classification (HS2 Haulage = Orange, Greenways = Green, Existing/Upgrades = Shades of Blue)
      const colors: Record<string, string> = {
        'HS2 Haulage': '#f97316',
        'New Greenway': '#10b981',
        'Upgrade PROW': '#38bdf8',
        'Local Road Quietway': '#3b82f6',
        'Quiet Lane': '#1d4ed8',
        'Existing routes': '#64748b',
        'Town or village centre': '#818cf8',
        'Main Road-Cycle tracks': '#4338ca',
        'Canal Towpath Upgrade': '#06b6d4',
        'HS2 Legacy': '#ea580c'
      };
      for (const [cls, color] of Object.entries(colors)) {
        let clsKm = 0;
        for (const f of activeNetworkFeatures) {
          const c = f.properties.classification === 'HS2 Delivery' ? 'HS2 Haulage' : (f.properties.classification || 'Existing routes');
          if (c === cls) clsKm += f.properties.length_km || 0;
        }
        if (clsKm > 0) {
          items.push({ label: cls, color, km: clsKm });
        }
      }
    }
    return items;
  });

  // Toggle individual legend item visibility (Add / Remove layer)
  function handleToggleLegendItem(label: string) {
    const isHidden = filters.hiddenLegendItems.includes(label);
    const updated = isHidden
      ? filters.hiddenLegendItems.filter(l => l !== label)
      : [...filters.hiddenLegendItems, label];
    filters = { ...filters, hiddenLegendItems: updated };
  }

  // Isolate a single legend item layer
  function handleIsolateLegendItem(label: string) {
    const allLabels = legendItems.map(i => i.label);
    const isAlreadyIsolated = filters.hiddenLegendItems.length === allLabels.length - 1 && !filters.hiddenLegendItems.includes(label);
    const updated = isAlreadyIsolated ? [] : allLabels.filter(l => l !== label);
    filters = { ...filters, hiddenLegendItems: updated };
  }

  function handleShowAllLegendItems() {
    filters = { ...filters, hiddenLegendItems: [] };
  }

  function handleResetFilters() {
    filters = {
      developer: '',
      category: '',
      classification: '',
      section: '',
      searchTerm: '',
      colorBy: 'classification',
      hiddenLegendItems: []
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
  onToggleSidebar={() => {
    sidebarOpen = !sidebarOpen;
    setTimeout(() => {
      if (mapViewRef && typeof mapViewRef.fitCorridorBounds === 'function') {
        mapViewRef.fitCorridorBounds();
      }
    }, 300);
  }}
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
      hiddenItems={filters.hiddenLegendItems}
      onToggleItem={handleToggleLegendItem}
      onIsolateItem={handleIsolateLegendItem}
      onShowAll={handleShowAllLegendItems}
    />
  {/if}

  <DetailPanel 
    segment={selectedSegment}
    onClose={() => selectedSegment = null}
    onZoomTo={handleZoomTo}
  />

  <!-- Bottom-Left Basemap Switcher mirroring Counterflow Dashboard -->
  <BasemapControl 
    {basemap}
    {sidebarOpen}
    onChangeBasemap={(style) => basemap = style}
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
