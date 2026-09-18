<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import * as pmtiles from 'pmtiles';
  import type { 
    CyclewayFeatureCollection, 
    FilterState, 
    CyclewaySegmentProperties,
    NcnProperties,
    OpenRoadsProperties
  } from '../types/cycleway';

  const NCN_SOURCE_ID = 'ncn-data';
  const NCN_CASING_LAYER_ID = 'ncn-casing';
  const NCN_LINE_LAYER_ID = 'ncn-lines';
  const NCN_ON_ROAD_LAYER_ID = 'ncn-on-road';
  const NCN_LAYER_IDS = [NCN_CASING_LAYER_ID, NCN_LINE_LAYER_ID, NCN_ON_ROAD_LAYER_ID];
  const NCN_INTERACTIVE_LAYER_IDS = [NCN_LINE_LAYER_ID, NCN_ON_ROAD_LAYER_ID];

  const OPENROADS_SOURCE_ID = 'openroads-data';
  const OPENROADS_CASING_LAYER_ID = 'openroads-casing';
  const OPENROADS_LOCAL_LAYER_ID = 'openroads-local';
  const OPENROADS_MINOR_LAYER_ID = 'openroads-minor';
  const OPENROADS_MAJOR_LAYER_ID = 'openroads-major';
  const OPENROADS_LAYER_IDS = [
    OPENROADS_CASING_LAYER_ID,
    OPENROADS_LOCAL_LAYER_ID,
    OPENROADS_MINOR_LAYER_ID,
    OPENROADS_MAJOR_LAYER_ID
  ];
  const OPENROADS_INTERACTIVE_LAYER_IDS = [
    OPENROADS_LOCAL_LAYER_ID,
    OPENROADS_MINOR_LAYER_ID,
    OPENROADS_MAJOR_LAYER_ID
  ];
  const OPENROADS_LOCAL_FUNCTIONS = [
    'Local Road',
    'Minor Road',
    'Restricted Local Access Road',
    'Secondary Access Road',
    'Local Access Road'
  ];
  const pmtilesProtocol = new pmtiles.Protocol();
  const maplibreWithPmtiles = maplibregl as typeof maplibregl & {
    railactivePmtilesRegistered?: boolean;
  };
  if (!maplibreWithPmtiles.railactivePmtilesRegistered) {
    maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
    maplibreWithPmtiles.railactivePmtilesRegistered = true;
  }

  interface Props {
    data: CyclewayFeatureCollection | null;
    filters: FilterState;
    basemap: string;
    sidebarOpen: boolean;
    hasInitialMapView: boolean;
    selectedSegment: CyclewaySegmentProperties | null;
    onSelectSegment: (segment: CyclewaySegmentProperties | null) => void;
    showNcn?: boolean;
    ncnPmtilesUrl?: string;
    showOpenRoads: boolean;
    openRoadsPmtilesUrl?: string;
  }

  let {
    data,
    filters,
    basemap,
    sidebarOpen,
    hasInitialMapView,
    selectedSegment,
    onSelectSegment,
    showNcn = false,
    ncnPmtilesUrl = './data/ncn.pmtiles',
    showOpenRoads,
    openRoadsPmtilesUrl = './data/openroads.pmtiles'
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let hoveredId: number | null = null;
  let hoverPopup: maplibregl.Popup | null = null;
  let clickPopup: maplibregl.Popup | null = null;
  let shouldFitInitialBounds = true;

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
      map.once('style.load', setupMapLayers);
      return;
    }
    setupMapLayers();
  }

  function handleCyclewayMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    map.getCanvas().style.cursor = 'pointer';

    const feat = e.features[0];
    const properties = feat.properties as CyclewaySegmentProperties;

    if (hoveredId !== null && hoveredId !== feat.id) {
      map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
    }
    hoveredId = feat.id as number;
    map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: true });

    const length = properties.length_km ? `${Number(properties.length_km).toFixed(2)} km` : '';
    const classification = properties.classification === 'HS2 Delivery'
      ? 'HS2 Haulage'
      : properties.classification || properties.category || 'Active Route';
    const html = `
      <div class="tooltip-content">
        <div class="tooltip-title">${properties.name || `Link ${properties.link_id || properties.id}`}</div>
        <div class="tooltip-meta">
          <span class="badge-sec">${properties.section || 'Corridor'}</span>
          <span class="tooltip-len">${length}</span>
        </div>
        <div class="tooltip-cat">${classification}</div>
      </div>
    `;
    hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  }

  function handleCyclewayMouseLeave() {
    if (!map) return;
    map.getCanvas().style.cursor = '';
    if (hoveredId !== null) {
      map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
      hoveredId = null;
    }
    hoverPopup?.remove();
  }

  function handleCyclewayClick(e: maplibregl.MapLayerMouseEvent) {
    if (e.features && e.features.length > 0) {
      onSelectSegment(e.features[0].properties as CyclewaySegmentProperties);
    }
  }

  function handleRailwayMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    map.getCanvas().style.cursor = 'pointer';
    const properties = e.features[0].properties as Record<string, string>;
    const html = `
      <div class="tooltip-content">
        <div class="tooltip-title">HS2 High Speed Rail Line</div>
        <div class="tooltip-meta">
          <span class="badge-sec">Railway Track</span>
          <span class="tooltip-len">${properties.structure || 'Alignment'}</span>
        </div>
        <div class="tooltip-cat">${properties.phase || 'Phase 1'}</div>
      </div>
    `;
    hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  }

  function handleRailwayMouseLeave() {
    if (!map) return;
    map.getCanvas().style.cursor = '';
    hoverPopup?.remove();
  }

  function escapeHtml(value: unknown): string {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function popupValue(value: unknown, fallback: string): string {
    return escapeHtml(value === undefined || value === null || value === '' ? fallback : value);
  }

  function handleNcnMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    map.getCanvas().style.cursor = 'pointer';
    const props = e.features[0].properties as NcnProperties;
    const routeNum = props.RouteNo === undefined ? '' : `Route ${popupValue(props.RouteNo, '')}`;
    const routeType = popupValue(props.RouteType, 'NCN');
    const isTrafficFree = props.Desc_ === 'TrafficFree';
    const desc = isTrafficFree ? 'Traffic-Free' : popupValue(props.Desc_, 'Route');
    const cat = props.RouteCat && props.RouteCat !== 'N/A'
      ? popupValue(props.RouteCat, '')
      : 'National Cycle Network';
    const surface = popupValue(props.Surface, '');
    const greenway = props.Greenway === 'Yes' ? ' • Greenway' : '';

    const html = `
      <div class="tooltip-content ncn-tooltip">
        <div class="tooltip-title">${routeType} ${routeNum}</div>
        <div class="tooltip-meta">
          <span class="badge-sec ${isTrafficFree ? 'badge-trafficfree' : 'badge-onroad'}">${desc}</span>
          <span class="tooltip-len">${cat}</span>
        </div>
        <div class="tooltip-cat">${surface}${greenway}</div>
      </div>
    `;
    hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  }

  function handleNcnMouseLeave() {
    if (!map) return;
    map.getCanvas().style.cursor = '';
    hoverPopup?.remove();
  }

  function handleNcnClick(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    const props = e.features[0].properties as NcnProperties;

    if (clickPopup) {
      clickPopup.remove();
      clickPopup = null;
    }

    const routeNum = props.RouteNo === undefined ? '' : `Route ${popupValue(props.RouteNo, '')}`;
    const routeType = popupValue(props.RouteType, 'NCN');
    const isTrafficFree = props.Desc_ === 'TrafficFree';
    const isGreenway = props.Greenway === 'Yes';
    const desc = isTrafficFree
      ? 'Traffic-Free Path'
      : props.Desc_ === 'OnRoad'
        ? 'On-Road Cycling'
        : popupValue(props.Desc_, 'N/A');
    const routeCategory = props.RouteCat && props.RouteCat !== 'N/A'
      ? popupValue(props.RouteCat, '')
      : 'National Cycle Network';

    const html = `
      <div class="ncn-popup-card">
        <div class="ncn-popup-header">
          <div class="ncn-badge-group">
            <span class="ncn-badge ncn-type">${routeType} ${routeNum}</span>
            <span class="ncn-badge ${isTrafficFree ? 'ncn-trafficfree' : 'ncn-onroad'}">${isTrafficFree ? 'Traffic-Free' : 'On-Road'}</span>
            ${isGreenway ? '<span class="ncn-badge ncn-greenway">Greenway</span>' : ''}
          </div>
        </div>
        <h4 class="ncn-popup-title">${routeCategory}</h4>
        <div class="ncn-popup-table">
          <div class="ncn-cell"><span class="k">Traffic:</span><span class="v">${desc}</span></div>
          <div class="ncn-cell"><span class="k">Surface:</span><span class="v">${popupValue(props.Surface, 'Unspecified')}</span></div>
          <div class="ncn-cell"><span class="k">Quality:</span><span class="v">${popupValue(props.Quality, 'Standard')}</span></div>
          <div class="ncn-cell"><span class="k">Lighting:</span><span class="v">${popupValue(props.Lighting, 'Not lit')}</span></div>
          ${props.RoadClass ? `<div class="ncn-cell"><span class="k">Road Class:</span><span class="v">${popupValue(props.RoadClass, '')}</span></div>` : ''}
          <div class="ncn-cell"><span class="k">Open Status:</span><span class="v">${popupValue(props.OpenStatus, 'Open')}</span></div>
          <div class="ncn-cell"><span class="k">Segment ID:</span><span class="v font-mono">${popupValue(props.SegmentID, 'N/A')}</span></div>
          <div class="ncn-cell full"><span class="k">Global ID:</span><span class="v font-mono text-xs">${popupValue(props.GlobalID, 'N/A')}</span></div>
        </div>
      </div>
    `;

    clickPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '320px',
      className: 'ncn-click-popup'
    })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  }

  function setNcnVisibility() {
    if (!map) return;
    const visibility = showNcn ? 'visible' : 'none';
    for (const layerId of NCN_LAYER_IDS) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
    }
    if (!showNcn) {
      hoverPopup?.remove();
      clickPopup?.remove();
      clickPopup = null;
      map.getCanvas().style.cursor = '';
    }
  }

  function loadNcnSourceAndLayers() {
    if (!map) return;
    if (map.getSource(NCN_SOURCE_ID)) {
      setNcnVisibility();
      return;
    }

    try {
      const resolvedUrl = new URL(ncnPmtilesUrl, window.location.href).href;
      map.addSource(NCN_SOURCE_ID, {
        type: 'vector',
        url: `pmtiles://${resolvedUrl}`
      });

      const beforeId = map.getLayer('hs2-rail-casing') ? 'hs2-rail-casing' : (map.getLayer('cycleway-casing') ? 'cycleway-casing' : undefined);

      map.addLayer({
        id: NCN_CASING_LAYER_ID,
        type: 'line',
        source: NCN_SOURCE_ID,
        'source-layer': 'ncn',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showNcn ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#4c0519',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 2.0,
            8, 3.5,
            12, 5.5,
            16, 8.5
          ],
          'line-opacity': 0.8
        }
      }, beforeId);

      map.addLayer({
        id: NCN_LINE_LAYER_ID,
        type: 'line',
        source: NCN_SOURCE_ID,
        'source-layer': 'ncn',
        filter: ['==', ['coalesce', ['get', 'Desc_'], ''], 'TrafficFree'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showNcn ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#10b981',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.2,
            8, 2.0,
            12, 3.5,
            16, 5.0
          ],
          'line-opacity': 0.95
        }
      }, beforeId);

      map.addLayer({
        id: NCN_ON_ROAD_LAYER_ID,
        type: 'line',
        source: NCN_SOURCE_ID,
        'source-layer': 'ncn',
        filter: ['!=', ['coalesce', ['get', 'Desc_'], ''], 'TrafficFree'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showNcn ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#fb7185',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.2,
            8, 2.0,
            12, 3.5,
            16, 5.0
          ],
          'line-dasharray': [3, 2],
          'line-opacity': 0.95
        }
      }, beforeId);

      for (const layerId of NCN_INTERACTIVE_LAYER_IDS) {
        map.off('mousemove', layerId, handleNcnMouseMove);
        map.on('mousemove', layerId, handleNcnMouseMove);
        map.off('mouseleave', layerId, handleNcnMouseLeave);
        map.on('mouseleave', layerId, handleNcnMouseLeave);
        map.off('click', layerId, handleNcnClick);
        map.on('click', layerId, handleNcnClick);
      }
    } catch (err) {
      console.warn('Unable to load NCN layer:', err);
    }
  }

  function handleOpenRoadsMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    map.getCanvas().style.cursor = 'pointer';
    const props = e.features[0].properties as OpenRoadsProperties;
    const name = props.name_1 || props.road_classification_number || 'Unnamed Road';
    const roadNum = props.road_classification_number ? escapeHtml(props.road_classification_number) : '';
    const roadGroup = popupValue(props.road_classification, 'Road');
    const roadFunc = popupValue(props.road_function, 'Local');
    const formOfWay = popupValue(props.form_of_way, 'Single Carriageway');
    const lengthStr = props.length ? `${Math.round(Number(props.length))} m` : '';

    const html = `
      <div class="tooltip-content">
        <div class="tooltip-title">${escapeHtml(name)}</div>
        <div class="tooltip-meta">
          <span class="badge-sec badge-openroads">${roadNum || roadGroup}</span>
          ${lengthStr ? `<span class="tooltip-len">${lengthStr}</span>` : ''}
        </div>
        <div class="tooltip-cat">${roadFunc} &bull; ${formOfWay}</div>
      </div>
    `;
    hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  }

  function handleOpenRoadsMouseLeave() {
    if (!map) return;
    map.getCanvas().style.cursor = '';
    hoverPopup?.remove();
  }

  function handleOpenRoadsClick(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    const props = e.features[0].properties as OpenRoadsProperties;

    if (clickPopup) {
      clickPopup.remove();
      clickPopup = null;
    }

    const name = props.name_1 ? escapeHtml(props.name_1) : 'Unnamed Road';
    const roadNum = props.road_classification_number ? escapeHtml(props.road_classification_number) : '';
    const roadClass = popupValue(props.road_classification, 'Unclassified');
    const roadFunc = popupValue(props.road_function, 'Local Road');
    const formOfWay = popupValue(props.form_of_way, 'Single Carriageway');
    const lengthStr = props.length ? `${Math.round(Number(props.length))} m` : 'N/A';

    const html = `
      <div class="openroads-popup-card">
        <div class="openroads-popup-header">
          <div class="openroads-badge-group">
            <span class="openroads-badge openroads-type">${roadNum || roadClass}</span>
            <span class="openroads-badge openroads-func">${roadFunc}</span>
          </div>
        </div>
        <h4 class="openroads-popup-title">${name}</h4>
        <div class="openroads-popup-table">
          <div class="openroads-cell"><span class="k">Classification:</span><span class="v">${roadClass}</span></div>
          <div class="openroads-cell"><span class="k">Function:</span><span class="v">${roadFunc}</span></div>
          <div class="openroads-cell"><span class="k">Form of Way:</span><span class="v">${formOfWay}</span></div>
          <div class="openroads-cell"><span class="k">Link Length:</span><span class="v">${lengthStr}</span></div>
          ${props.id ? `<div class="openroads-cell full"><span class="k">Link ID:</span><span class="v font-mono text-xs">${popupValue(props.id, '')}</span></div>` : ''}
        </div>
      </div>
    `;

    clickPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '320px',
      className: 'openroads-click-popup'
    })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  }

  function setOpenRoadsVisibility() {
    if (!map) return;
    const visibility = showOpenRoads ? 'visible' : 'none';
    for (const layerId of OPENROADS_LAYER_IDS) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
    }
    if (!showOpenRoads) {
      hoverPopup?.remove();
      clickPopup?.remove();
      clickPopup = null;
      map.getCanvas().style.cursor = '';
    }
  }

  function loadOpenRoadsSourceAndLayers() {
    if (!map) return;
    if (map.getSource(OPENROADS_SOURCE_ID)) {
      setOpenRoadsVisibility();
      return;
    }

    try {
      const resolvedUrl = new URL(openRoadsPmtilesUrl, window.location.href).href;
      map.addSource(OPENROADS_SOURCE_ID, {
        type: 'vector',
        url: `pmtiles://${resolvedUrl}`,
        attribution: 'Contains Ordnance Survey data &copy; Crown copyright and database right 2026. Licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/" target="_blank" rel="noreferrer">Open Government Licence</a>.'
      });

      const beforeId = map.getLayer(NCN_CASING_LAYER_ID)
        ? NCN_CASING_LAYER_ID
        : (map.getLayer('hs2-rail-casing')
          ? 'hs2-rail-casing'
          : (map.getLayer('cycleway-casing') ? 'cycleway-casing' : undefined));

      map.addLayer({
        id: OPENROADS_CASING_LAYER_ID,
        type: 'line',
        source: OPENROADS_SOURCE_ID,
        'source-layer': 'openroads',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showOpenRoads ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#0f172a',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1.2,
            10, 2.5,
            14, 5.0
          ],
          'line-opacity': 0.6
        }
      }, beforeId);

      map.addLayer({
        id: OPENROADS_LOCAL_LAYER_ID,
        type: 'line',
        source: OPENROADS_SOURCE_ID,
        'source-layer': 'openroads',
        filter: ['in', ['coalesce', ['get', 'road_function'], ''], ['literal', OPENROADS_LOCAL_FUNCTIONS]],
        minzoom: 9,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showOpenRoads ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#94a3b8',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0.8,
            11, 1.4,
            14, 2.8
          ],
          'line-opacity': 0.8
        }
      }, beforeId);

      map.addLayer({
        id: OPENROADS_MINOR_LAYER_ID,
        type: 'line',
        source: OPENROADS_SOURCE_ID,
        'source-layer': 'openroads',
        filter: ['==', ['coalesce', ['get', 'road_function'], ''], 'B Road'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showOpenRoads ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#60a5fa',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1.0,
            10, 2.0,
            14, 3.8
          ],
          'line-opacity': 0.9
        }
      }, beforeId);

      map.addLayer({
        id: OPENROADS_MAJOR_LAYER_ID,
        type: 'line',
        source: OPENROADS_SOURCE_ID,
        'source-layer': 'openroads',
        filter: ['in', ['coalesce', ['get', 'road_function'], ''], ['literal', ['Motorway', 'A Road']]],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showOpenRoads ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1.5,
            10, 3.0,
            14, 5.5
          ],
          'line-opacity': 0.95
        }
      }, beforeId);

      for (const layerId of OPENROADS_INTERACTIVE_LAYER_IDS) {
        map.off('mousemove', layerId, handleOpenRoadsMouseMove);
        map.on('mousemove', layerId, handleOpenRoadsMouseMove);
        map.off('mouseleave', layerId, handleOpenRoadsMouseLeave);
        map.on('mouseleave', layerId, handleOpenRoadsMouseLeave);
        map.off('click', layerId, handleOpenRoadsClick);
        map.on('click', layerId, handleOpenRoadsClick);
      }
    } catch (err) {
      console.warn('Unable to load OpenRoads layer:', err);
    }
  }

  function setupMapLayers() {
    if (!map || !data) return;

    const existingSource = map.getSource('cycleway-data') as maplibregl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(data as any);
      fitInitialBounds();
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
      map.off('mousemove', 'cycleway-lines', handleCyclewayMouseMove);
      map.on('mousemove', 'cycleway-lines', handleCyclewayMouseMove);
      map.off('mouseleave', 'cycleway-lines', handleCyclewayMouseLeave);
      map.on('mouseleave', 'cycleway-lines', handleCyclewayMouseLeave);
      map.off('click', 'cycleway-lines', handleCyclewayClick);
      map.on('click', 'cycleway-lines', handleCyclewayClick);

      // Hover on Railway Track
      map.off('mousemove', 'hs2-rail-casing', handleRailwayMouseMove);
      map.on('mousemove', 'hs2-rail-casing', handleRailwayMouseMove);
      map.off('mouseleave', 'hs2-rail-casing', handleRailwayMouseLeave);
      map.on('mouseleave', 'hs2-rail-casing', handleRailwayMouseLeave);

      if (showNcn) {
        loadNcnSourceAndLayers();
      }

      if (showOpenRoads) {
        loadOpenRoadsSourceAndLayers();
      }

      fitInitialBounds();
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

  function fitInitialBounds() {
    if (!shouldFitInitialBounds) return;
    shouldFitInitialBounds = false;
    fitCorridorBounds();
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
    shouldFitInitialBounds = !hasInitialMapView;
    map = new maplibregl.Map({
      container: mapContainer,
      style: basemapStyles[basemap] || basemapStyles.dark,
      center: [-1.4, 52.3],
      zoom: 7.8,
      pitch: 0,
      hash: 'map'
    });

    (window as any)._map = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      ensureLayers();
    });

    map.on('style.load', setupMapLayers);
  });

  onDestroy(() => {
    if (hoverPopup) hoverPopup.remove();
    if (clickPopup) clickPopup.remove();
    if (map) map.remove();
  });

  // Watch NCN visibility reactively
  $effect(() => {
    const ncnVisible = showNcn;
    if (!map) return;
    setNcnVisibility();
    if (ncnVisible && map.isStyleLoaded() && !map.getSource(NCN_SOURCE_ID)) {
      loadNcnSourceAndLayers();
    }
  });

  // Watch OpenRoads visibility reactively
  $effect(() => {
    const roadsVisible = showOpenRoads;
    if (!map) return;
    setOpenRoadsVisibility();
    if (roadsVisible && map.isStyleLoaded() && !map.getSource(OPENROADS_SOURCE_ID)) {
      loadOpenRoadsSourceAndLayers();
    }
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

      map.setStyle(basemapStyles[basemap], { diff: false });
      map.once('style.load', () => {
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

  :global(.badge-trafficfree) {
    background: rgba(16, 185, 129, 0.25) !important;
    color: #6ee7b7 !important;
  }

  :global(.badge-onroad) {
    background: rgba(251, 113, 133, 0.2) !important;
    color: #fecdd3 !important;
  }

  :global(.ncn-popup-card) {
    font-family: 'Inter', sans-serif;
    color: #f8fafc;
    min-width: 220px;
  }

  :global(.ncn-popup-header) {
    margin-bottom: 6px;
  }

  :global(.ncn-badge-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  :global(.ncn-badge) {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 4px;
  }

  :global(.ncn-type) {
    background: #e11d48;
    color: #ffffff;
  }

  :global(.ncn-trafficfree) {
    background: rgba(16, 185, 129, 0.25);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  :global(.ncn-onroad) {
    background: rgba(245, 158, 11, 0.25);
    color: #fcd34d;
    border: 1px solid rgba(245, 158, 11, 0.4);
  }

  :global(.ncn-greenway) {
    background: rgba(59, 130, 246, 0.25);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.4);
  }

  :global(.ncn-popup-title) {
    margin: 4px 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
  }

  :global(.ncn-popup-table) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 6px;
  }

  :global(.ncn-cell) {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  :global(.ncn-cell.full) {
    flex-direction: column;
    gap: 1px;
  }

  :global(.ncn-cell .k) {
    color: #94a3b8;
  }

  :global(.ncn-cell .v) {
    color: #e2e8f0;
    text-align: right;
  }

  :global(.ncn-cell.full .v) {
    text-align: left;
    word-break: break-all;
  }

  :global(.ncn-click-popup .maplibregl-popup-content) {
    padding: 12px 14px !important;
    background: rgba(15, 23, 42, 0.96) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(225, 29, 72, 0.45) !important;
    border-radius: 10px !important;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6) !important;
  }

  :global(.badge-openroads) {
    background: rgba(59, 130, 246, 0.25) !important;
    color: #93c5fd !important;
  }

  :global(.openroads-popup-card) {
    font-family: 'Inter', sans-serif;
    color: #f8fafc;
    min-width: 220px;
  }

  :global(.openroads-popup-header) {
    margin-bottom: 6px;
  }

  :global(.openroads-badge-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  :global(.openroads-badge) {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 4px;
  }

  :global(.openroads-type) {
    background: #2563eb;
    color: #ffffff;
  }

  :global(.openroads-func) {
    background: rgba(59, 130, 246, 0.25);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.4);
  }

  :global(.openroads-popup-title) {
    margin: 4px 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
  }

  :global(.openroads-popup-table) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 6px;
  }

  :global(.openroads-cell) {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  :global(.openroads-cell.full) {
    flex-direction: column;
    gap: 1px;
  }

  :global(.openroads-cell .k) {
    color: #94a3b8;
  }

  :global(.openroads-cell .v) {
    color: #e2e8f0;
    text-align: right;
  }

  :global(.openroads-cell.full .v) {
    text-align: left;
    word-break: break-all;
  }

  :global(.openroads-click-popup .maplibregl-popup-content) {
    padding: 12px 14px !important;
    background: rgba(15, 23, 42, 0.96) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(59, 130, 246, 0.45) !important;
    border-radius: 10px !important;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6) !important;
  }
</style>
