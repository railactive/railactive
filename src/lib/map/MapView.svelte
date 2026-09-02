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
    sidebarOpen: boolean;
    selectedSegment: CyclewaySegmentProperties | null;
    onSelectSegment: (segment: CyclewaySegmentProperties | null) => void;
  }

  let {
    data,
    filters,
    basemap,
    sidebarOpen,
    selectedSegment,
    onSelectSegment
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let hoveredId: number | null = null;
  let hoverPopup: maplibregl.Popup | null = null;

  // High-performance raster basemap styles (clean, keyless, zero watermarks)
  const basemapStyles: Record<string, any> = {
    dark: {
      version: 8,
      sources: {
        'esri-dark-base': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        },
        'esri-dark-labels': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'esri-dark-base-layer',
          type: 'raster',
          source: 'esri-dark-base',
          minzoom: 0,
          maxzoom: 18
        },
        {
          id: 'esri-dark-labels-layer',
          type: 'raster',
          source: 'esri-dark-labels',
          minzoom: 0,
          maxzoom: 18
        }
      ]
    },
    light: {
      version: 8,
      sources: {
        'esri-light-base': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        },
        'esri-light-labels': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'esri-light-base-layer',
          type: 'raster',
          source: 'esri-light-base',
          minzoom: 0,
          maxzoom: 18
        },
        {
          id: 'esri-light-labels-layer',
          type: 'raster',
          source: 'esri-light-labels',
          minzoom: 0,
          maxzoom: 18
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
    },
    osm: {
      version: 8,
      sources: {
        'osm-base': {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      },
      layers: [
        {
          id: 'osm-base-layer',
          type: 'raster',
          source: 'osm-base',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  };

  function getColorExpression(colorBy: string): any {
    if (colorBy === 'kml') {
      return ['coalesce', ['get', 'color'], '#3b82f6'];
    }
    
    if (colorBy === 'category') {
      return [
        'match',
        ['coalesce', ['get', 'category'], ''],
        'Cycleway beside HS2', '#f97316', // HS2 Haulage - Coral Orange
        'Traffic-free path away from highway', '#10b981', // Greenways - Emerald Green
        '20mph and traffic calmed or protected cycle lane', '#3b82f6', // Quietways - Royal Blue
        'Canal tow path or new path close by canal', '#06b6d4', // Canal - Teal Blue
        '#3b82f6' // Corridor Blue
      ];
    }

    if (colorBy === 'developer') {
      return [
        'match',
        ['coalesce', ['get', 'developer'], ''],
        'HS2', '#f97316', // HS2 Haulage - Coral Orange
        'DfT', '#1d4ed8', // DfT - Deep Blue
        'Local Authority', '#10b981', // LA Greenways - Emerald
        'Canals & River Trust', '#06b6d4', // CRT - Teal Blue
        'Sustrans', '#818cf8', // Sustrans - Indigo
        'Developer', '#38bdf8', // Developer - Sky Blue
        '#3b82f6'
      ];
    }

    // Default: Classification (HS2 Haulage = Orange, Greenways = Green, Existing/Upgrades = Shades of Blue)
    return [
      'match',
      ['coalesce', ['get', 'classification'], ''],
      'HS2 Haulage', '#f97316', // Vibrant Coral Orange
      'HS2 Delivery', '#f97316', // Legacy label mapped to Orange
      'HS2 Legacy', '#ea580c', // Darker Orange
      'New Greenway', '#10b981', // Vibrant Emerald Green
      'Upgrade PROW', '#38bdf8', // Light Sky Blue
      'Local Road Quietway', '#3b82f6', // Bright Royal Blue
      'Quiet Lane', '#1d4ed8', // Deep Cobalt Blue
      'Existing routes', '#64748b', // Muted Slate Blue
      'Town or village centre', '#818cf8', // Soft Indigo Blue
      'Main Road-Cycle tracks', '#4338ca', // Dark Royal Blue
      'Canal Towpath Upgrade', '#06b6d4', // Teal Cyan Blue
      'Existing Footway Level Cycle Track', '#6366f1', // Indigo Blue
      'Proposed Footway Level Cycle Track', '#a855f7', // Violet Blue
      '#3b82f6' // Default active route: Blue
    ];
  }

  function getActiveFilterExpression(f: FilterState): any {
    const expressions: any[] = [
      'all',
      ['!=', ['coalesce', ['get', 'layer_type'], ''], 'hs2_railway'],
      ['!=', ['coalesce', ['get', 'layer_type'], ''], 'intervention']
    ];

    if (f.developer) {
      expressions.push(['==', ['coalesce', ['get', 'developer'], ''], f.developer]);
    }
    if (f.category) {
      expressions.push(['==', ['coalesce', ['get', 'category'], ''], f.category]);
    }
    if (f.classification) {
      const cls = f.classification === 'HS2 Haulage' ? ['HS2 Haulage', 'HS2 Delivery'] : [f.classification];
      expressions.push(['in', ['coalesce', ['get', 'classification'], ''], ['literal', cls]]);
    }
    if (f.section) {
      expressions.push(['==', ['coalesce', ['get', 'section'], ''], f.section]);
    }

    // Interactive Legend Layer Visibility Toggle (Exclude unchecked layers)
    if (f.hiddenLegendItems && f.hiddenLegendItems.length > 0) {
      for (const item of f.hiddenLegendItems) {
        if (f.colorBy === 'category') {
          expressions.push(['!=', ['coalesce', ['get', 'category'], ''], item]);
        } else if (f.colorBy === 'developer') {
          expressions.push(['!=', ['coalesce', ['get', 'developer'], ''], item]);
        } else {
          // classification
          expressions.push(['!=', ['coalesce', ['get', 'classification'], ''], item]);
          if (item === 'HS2 Haulage') {
            expressions.push(['!=', ['coalesce', ['get', 'classification'], ''], 'HS2 Delivery']);
          }
        }
      }
    }

    return expressions;
  }

  function ensureLayers() {
    if (!map || !data) return;
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => ensureLayers());
      return;
    }
    setupMapLayers();
  }

  function setupMapLayers() {
    if (!map || !data) return;

    const existingSource = map.getSource('cycleway-data') as maplibregl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(data as any);
      fitCorridorBounds();
      return;
    }

    try {
      map.addSource('cycleway-data', {
        type: 'geojson',
        data: data as any,
        generateId: true
      });

      // ==========================================
      // A. MAIN HS2 RAILWAY TRACK LINE (Solid / Dashed Black Track)
      // ==========================================
      map.addLayer({
        id: 'hs2-rail-casing',
        type: 'line',
        source: 'cycleway-data',
        filter: ['==', ['coalesce', ['get', 'layer_type'], ''], 'hs2_railway'],
        layout: {
          'line-cap': 'butt',
          'line-join': 'miter'
        },
        paint: {
          'line-color': '#000000',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 3.0,
            8, 4.5,
            12, 6.0,
            16, 9.0
          ],
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'hs2-rail-ties',
        type: 'line',
        source: 'cycleway-data',
        filter: ['==', ['coalesce', ['get', 'layer_type'], ''], 'hs2_railway'],
        layout: {
          'line-cap': 'butt',
          'line-join': 'miter'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.5,
            8, 2.2,
            12, 3.5,
            16, 5.5
          ],
          'line-dasharray': [2, 2],
          'line-opacity': 0.9
        }
      });

      // ==========================================
      // B. ACTIVE TRAVEL NETWORK (Walking, Wheeling, Cycling)
      // ==========================================
      // 1. High-Contrast Outer Casing Layer
      map.addLayer({
        id: 'cycleway-casing',
        type: 'line',
        source: 'cycleway-data',
        filter: getActiveFilterExpression(filters),
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#020617',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 5.5,
            8, 7.5,
            12, 10.5,
            16, 15.0
          ],
          'line-opacity': 0.95
        }
      });

      // 2. High-Contrast Main Active Route Line Layer
      map.addLayer({
        id: 'cycleway-lines',
        type: 'line',
        source: 'cycleway-data',
        filter: getActiveFilterExpression(filters),
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': getColorExpression(filters.colorBy),
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 3.5,
            8, 5.0,
            12, 7.5,
            16, 12.0
          ],
          'line-opacity': 1.0
        }
      });

      // 3. Points / Interventions Layer
      map.addLayer({
        id: 'cycleway-points',
        type: 'circle',
        source: 'cycleway-data',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 7, 16, 11],
          'circle-color': getColorExpression(filters.colorBy),
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Hover Popup Initialization
      if (!hoverPopup) {
        hoverPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: 'hover-tooltip-popup'
        });
      }

      // Interaction Events on Active Routes
      map.off('mousemove', 'cycleway-lines');
      map.on('mousemove', 'cycleway-lines', (e) => {
        if (!map || !e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';

        const feat = e.features[0];
        const p = feat.properties as CyclewaySegmentProperties;

        if (hoveredId !== null && hoveredId !== feat.id) {
          map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
        }
        hoveredId = feat.id as number;
        map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: true });

        // Show Hover Tooltip
        const lenStr = p.length_km ? `${Number(p.length_km).toFixed(2)} km` : '';
        const displayCls = p.classification === 'HS2 Delivery' ? 'HS2 Haulage' : (p.classification || p.category || 'Active Route');
        const html = `
          <div class="tooltip-content">
            <div class="tooltip-title">${p.name || `Link ${p.link_id || p.id}`}</div>
            <div class="tooltip-meta">
              <span class="badge-sec">${p.section || 'Corridor'}</span>
              <span class="tooltip-len">${lenStr}</span>
            </div>
            <div class="tooltip-cat">${displayCls}</div>
          </div>
        `;
        hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      map.off('mouseleave', 'cycleway-lines');
      map.on('mouseleave', 'cycleway-lines', () => {
        if (!map) return;
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        hoverPopup?.remove();
      });

      map.off('click', 'cycleway-lines', (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties as CyclewaySegmentProperties;
          onSelectSegment(props);
        }
      });

      // Hover on Railway Track
      map.off('mousemove', 'hs2-rail-casing');
      map.on('mousemove', 'hs2-rail-casing', (e) => {
        if (!map || !e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0];
        const p = feat.properties as any;
        const html = `
          <div class="tooltip-content">
            <div class="tooltip-title">HS2 High Speed Rail Line</div>
            <div class="tooltip-meta">
              <span class="badge-sec">Railway Track</span>
              <span class="tooltip-len">${p.structure || 'Alignment'}</span>
            </div>
            <div class="tooltip-cat">${p.phase || 'Phase 1'}</div>
          </div>
        `;
        hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      map.off('mouseleave', 'hs2-rail-casing');
      map.on('mouseleave', 'hs2-rail-casing', () => {
        if (!map) return;
        map.getCanvas().style.cursor = '';
        hoverPopup?.remove();
      });

      fitCorridorBounds();
    } catch (err) {
      console.error('Error in setupMapLayers:', err);
    }
  }

  export function fitCorridorBounds() {
    if (!map || !data || !data.features || data.features.length === 0) return;
    map.resize();
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
      map.fitBounds(bounds, {
        padding: {
          left: sidebarOpen ? 360 : 40,
          right: 40,
          top: 40,
          bottom: 40
        },
        maxZoom: 12,
        duration: 800
      });
    }
  }

  export function zoomToSegment(id: number) {
    if (!map || !data) return;
    map.resize();
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
      map.fitBounds(bounds, {
        padding: {
          left: sidebarOpen ? 380 : 80,
          right: 80,
          top: 80,
          bottom: 80
        },
        maxZoom: 15,
        duration: 1200
      });
    }
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: basemapStyles[basemap] || basemapStyles.dark,
      center: [-1.4, 52.3],
      zoom: 7.8,
      pitch: 0
    });

    (window as any)._map = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      ensureLayers();
    });

    map.on('style.load', () => {
      ensureLayers();
    });
  });

  onDestroy(() => {
    if (hoverPopup) hoverPopup.remove();
    if (map) map.remove();
  });

  // Watch data updates reactively
  $effect(() => {
    if (map && data) {
      ensureLayers();
    }
  });

  // Reactive updates for filters and style
  $effect(() => {
    // Explicitly track filter dependencies so Svelte 5 runs the effect on any filter change
    const _hidden = filters.hiddenLegendItems ? filters.hiddenLegendItems.join(',') : '';
    const _dev = filters.developer;
    const _cat = filters.category;
    const _cls = filters.classification;
    const _sec = filters.section;
    const _colorBy = filters.colorBy;

    if (map && map.isStyleLoaded() && map.getLayer('cycleway-lines')) {
      const filterExpr = getActiveFilterExpression(filters);
      map.setFilter('cycleway-lines', filterExpr);
      map.setFilter('cycleway-casing', filterExpr);
      
      if (map.getLayer('cycleway-points')) {
        map.setFilter('cycleway-points', ['all', ['==', '$type', 'Point'], filterExpr]);
      }
      
      const colorExpr = getColorExpression(filters.colorBy);
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
        ensureLayers();
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

  :global(.hover-tooltip-popup .maplibregl-popup-content) {
    background: rgba(15, 23, 42, 0.95) !important;
    backdrop-filter: blur(8px) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: 8px !important;
    padding: 8px 10px !important;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4) !important;
    pointer-events: none;
  }

  :global(.hover-tooltip-popup .maplibregl-popup-tip) {
    border-top-color: rgba(15, 23, 42, 0.95) !important;
  }

  :global(.tooltip-content) {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: 'Inter', sans-serif;
  }

  :global(.tooltip-title) {
    font-size: 12px;
    font-weight: 600;
    color: #f8fafc;
  }

  :global(.tooltip-meta) {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
  }

  :global(.badge-sec) {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 600;
  }

  :global(.tooltip-len) {
    font-family: 'JetBrains Mono', monospace;
    color: #94a3b8;
  }

  :global(.tooltip-cat) {
    font-size: 10px;
    color: #cbd5e1;
  }
</style>
