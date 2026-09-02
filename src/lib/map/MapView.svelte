<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import type { 
    CyclewayFeatureCollection, 
    FilterState, 
    CyclewaySegmentProperties 
  } from '../types/cycleway';

  interface Props {
    data: CyclewayFeatureCollection | null;
    filters: FilterState;
    basemap: string;
    selectedSegment: CyclewaySegmentProperties | null;
    onSelectSegment: (segment: CyclewaySegmentProperties | null) => void;
  }

  let {
    data,
    filters,
    basemap,
    selectedSegment,
    onSelectSegment
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let hoveredId: number | null = null;

  const basemapStyles: Record<string, any> = {
    dark: {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    },
    light: {
      version: 8,
      sources: {
        'carto-light': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
      },
      layers: [
        {
          id: 'carto-light-layer',
          type: 'raster',
          source: 'carto-light',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    },
    satellite: {
      version: 8,
      sources: {
        'esri-sat': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }
      },
      layers: [
        {
          id: 'esri-sat-layer',
          type: 'raster',
          source: 'esri-sat',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  };

  function getColorExpression(colorBy: string) {
    if (colorBy === 'kml') {
      return ['coalesce', ['get', 'color'], '#0288D1'];
    }
    
    if (colorBy === 'category') {
      return [
        'match',
        ['get', 'category'],
        'Cycleway beside HS2', '#06b6d4',
        'Traffic-free path away from highway', '#10b981',
        '20mph and traffic calmed or protected cycle lane', '#f59e0b',
        'Canal tow path or new path close by canal', '#14b8a6',
        '#3b82f6'
      ];
    }

    if (colorBy === 'developer') {
      return [
        'match',
        ['get', 'developer'],
        'HS2', '#06b6d4',
        'DfT', '#3b82f6',
        'Local Authority', '#10b981',
        'Canals & River Trust', '#14b8a6',
        'Sustrans', '#ec4899',
        'Developer', '#f59e0b',
        '#94a3b8'
      ];
    }

    // Default: Classification
    return [
      'match',
      ['get', 'classification'],
      'HS2 Delivery', '#06b6d4',
      'New Greenway', '#10b981',
      'Upgrade PROW', '#8b5cf6',
      'Quiet Lane', '#f59e0b',
      'Local Road Quietway', '#3b82f6',
      'Existing routes', '#64748b',
      'Town or village centre', '#ec4899',
      'Main Road-Cycle tracks', '#ef4444',
      'Canal Towpath Upgrade', '#14b8a6',
      'Existing Footway Level Cycle Track', '#6366f1',
      'Proposed Footway Level Cycle Track', '#a855f7',
      'HS2 Legacy', '#0284c7',
      '#94a3b8'
    ];
  }

  function getFilterExpression(f: FilterState) {
    const expressions: any[] = ['all'];

    if (f.developer) {
      expressions.push(['==', ['get', 'developer'], f.developer]);
    }
    if (f.category) {
      expressions.push(['==', ['get', 'category'], f.category]);
    }
    if (f.classification) {
      expressions.push(['==', ['get', 'classification'], f.classification]);
    }
    if (f.section) {
      expressions.push(['==', ['get', 'section'], f.section]);
    }

    return expressions.length > 1 ? expressions : null;
  }

  function setupMapLayers() {
    if (!map || map.getSource('cycleway-data') || !data) return;

    map.addSource('cycleway-data', {
      type: 'geojson',
      data: data,
      generateId: true
    });

    // Glow / Casing Layer
    map.addLayer({
      id: 'cycleway-casing',
      type: 'line',
      source: 'cycleway-data',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#000000',
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          7,
          ['boolean', ['feature-state', 'selected'], false],
          8,
          4
        ],
        'line-opacity': 0.6
      }
    });

    // Main Route Line Layer
    map.addLayer({
      id: 'cycleway-lines',
      type: 'line',
      source: 'cycleway-data',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': getColorExpression(filters.colorBy) as any,
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          5,
          ['boolean', ['feature-state', 'selected'], false],
          6,
          2.5
        ]
      }
    });

    // Points Layer (if any points exist)
    map.addLayer({
      id: 'cycleway-points',
      type: 'circle',
      source: 'cycleway-data',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': getColorExpression(filters.colorBy) as any,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Events
    map.on('mousemove', 'cycleway-lines', (e) => {
      if (!map) return;
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
        }
        hoveredId = e.features[0].id as number;
        map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: true });
      }
    });

    map.on('mouseleave', 'cycleway-lines', () => {
      if (!map) return;
      map.getCanvas().style.cursor = '';
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
        hoveredId = null;
      }
    });

    map.on('click', 'cycleway-lines', (e) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties as CyclewaySegmentProperties;
        onSelectSegment(props);
      }
    });

    // Fit bounds to entire dataset on initial load
    fitCorridorBounds();
  }

  export function fitCorridorBounds() {
    if (!map || !data || data.features.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    
    for (const f of data.features) {
      const geom = f.geometry;
      if (geom.type === 'LineString') {
        for (const c of geom.coordinates) bounds.extend(c as [number, number]);
      } else if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates) {
          for (const c of line) bounds.extend(c as [number, number]);
        }
      } else if (geom.type === 'Point') {
        bounds.extend(geom.coordinates as [number, number]);
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }

  export function zoomToSegment(id: number) {
    if (!map || !data) return;
    const feature = data.features.find(f => f.properties.id === id);
    if (!feature) return;

    const bounds = new maplibregl.LngLatBounds();
    const geom = feature.geometry;
    if (geom.type === 'LineString') {
      for (const c of geom.coordinates) bounds.extend(c as [number, number]);
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates) {
        for (const c of line) bounds.extend(c as [number, number]);
      }
    } else if (geom.type === 'Point') {
      bounds.extend(geom.coordinates as [number, number]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 120, maxZoom: 15, duration: 1200 });
    }
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: basemapStyles[basemap] || basemapStyles.dark,
      center: [-1.5, 52.4],
      zoom: 7,
      pitch: 0
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      setupMapLayers();
    });
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  // Reactive updates for filters and style
  $effect(() => {
    if (map && map.isStyleLoaded() && map.getLayer('cycleway-lines')) {
      const filterExpr = getFilterExpression(filters);
      map.setFilter('cycleway-lines', filterExpr);
      map.setFilter('cycleway-casing', filterExpr);
      if (map.getLayer('cycleway-points')) {
        map.setFilter('cycleway-points', filterExpr);
      }
      
      const colorExpr = getColorExpression(filters.colorBy) as any;
      map.setPaintProperty('cycleway-lines', 'line-color', colorExpr);
      if (map.getLayer('cycleway-points')) {
        map.setPaintProperty('cycleway-points', 'circle-color', colorExpr);
      }
    }
  });

  // Reactive update for basemap
  $effect(() => {
    if (map && basemapStyles[basemap]) {
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const currentPitch = map.getPitch();
      const currentBearing = map.getBearing();

      map.setStyle(basemapStyles[basemap]);
      map.once('style.load', () => {
        setupMapLayers();
        if (map) {
          map.setCenter(currentCenter);
          map.setZoom(currentZoom);
          map.setPitch(currentPitch);
          map.setBearing(currentBearing);
        }
      });
    }
  });
</script>

<div class="map-wrapper" bind:this={mapContainer}></div>

<style>
  .map-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
