<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import * as pmtiles from 'pmtiles';
  import type { 
    CyclewayFeatureCollection, 
    FilterState, 
    CyclewaySegmentProperties,
    NcnProperties,
    OpenRoadsProperties
  } from '../types/cycleway';
  import {
    classificationSynonyms,
    colorExpression,
    effectiveHiddenGroups,
    formatStatusLabel,
    hiddenGroupExpressions,
    INTERVENTION_COLOR,
    INTERVENTION_LEGACY_COLOR,
    INTERVENTION_LEGACY_OPACITY,
    INTERVENTION_LEGACY_THRESHOLD_M,
    isLegacyIntervention,
    isPending,
    isSuperseded,
    normalizeClassification,
    PENDING_COLOR,
    REFERENCE_COLORS,
    showsPending,
    showsSuperseded,
    statusFilterExpressions
  } from '../palette';
  import { mapButtonsHtml } from '../components/MapButtons.svelte';
  import { isMobileViewport } from '../urlState';

  const NCN_SOURCE_ID = 'ncn-data';
  const NCN_LINE_LAYER_ID = 'ncn-lines';
  const NCN_ON_ROAD_LAYER_ID = 'ncn-on-road';
  const NCN_LAYER_IDS = [NCN_LINE_LAYER_ID, NCN_ON_ROAD_LAYER_ID];
  const NCN_INTERACTIVE_LAYER_IDS = [NCN_LINE_LAYER_ID, NCN_ON_ROAD_LAYER_ID];

  const OPENROADS_SOURCE_ID = 'openroads-data';
  const OPENROADS_CASING_LAYER_ID = 'openroads-casing';
  const OPENROADS_LOCAL_LAYER_ID = 'openroads-local';
  const OPENROADS_HAULAGE_LAYER_ID = 'openroads-possible-haulage';
  const OPENROADS_MINOR_LAYER_ID = 'openroads-minor';
  const OPENROADS_MAJOR_LAYER_ID = 'openroads-major';
  const OPENROADS_LAYER_IDS = [
    OPENROADS_CASING_LAYER_ID,
    OPENROADS_LOCAL_LAYER_ID,
    OPENROADS_HAULAGE_LAYER_ID,
    OPENROADS_MINOR_LAYER_ID,
    OPENROADS_MAJOR_LAYER_ID
  ];
  const OPENROADS_INTERACTIVE_LAYER_IDS = [
    OPENROADS_LOCAL_LAYER_ID,
    OPENROADS_HAULAGE_LAYER_ID,
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
    onSelectSegment: (segment: CyclewaySegmentProperties | null, center?: [number, number] | null) => void;
    showHs2Railway?: boolean;
    showInterventions?: boolean;
    showActivePoints?: boolean;
    showSupersededPoints?: boolean;
    showPendingPoints?: boolean;
    showNcn?: boolean;
    ncnPmtilesUrl?: string;
    showOpenRoads: boolean;
    openRoadsPmtilesUrl?: string;
    showStudyArea?: boolean;
    studyAreaGeojsonUrl?: string;
    showPlaceNames?: boolean;
    printMode?: 'legend' | 'clean' | null;
  }

  let {
    data,
    filters,
    basemap,
    sidebarOpen,
    hasInitialMapView,
    selectedSegment,
    onSelectSegment,
    showHs2Railway = true,
    showInterventions = false,
    showActivePoints = true,
    showSupersededPoints = false,
    showPendingPoints = false,
    showNcn = false,
    ncnPmtilesUrl = './data/ncn.pmtiles',
    showOpenRoads,
    openRoadsPmtilesUrl = './data/openroads.pmtiles',
    showStudyArea = false,
    studyAreaGeojsonUrl = './data/study_area.geojson?v=0.4.3',
    showPlaceNames = true,
    printMode = null
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let hoveredId: number | null = null;
  let hoverPopup: maplibregl.Popup | null = null;
  let clickPopup: maplibregl.Popup | null = null;
  let shouldFitInitialBounds = true;

  // Geolocation feedback (approach from csis-dashboard)
  let geoMessage: string | null = $state(null);
  let geoMessageTimeout: ReturnType<typeof setTimeout> | undefined;

  function showGeoMessage(message: string) {
    geoMessage = message;
    if (geoMessageTimeout) clearTimeout(geoMessageTimeout);
    geoMessageTimeout = setTimeout(() => (geoMessage = null), 8000);
  }

  function handleGeolocateError(e: GeolocationPositionError) {
    if (e.code === 1) showGeoMessage('Location access denied. Allow location for this site in your browser settings, then try again.');
    else if (e.code === 3) showGeoMessage('Locating timed out. Please try again.');
    else showGeoMessage('Your location could not be determined.');
  }

  // Split label-free base cartography + top-level place-name overlay (keyless, zero watermarks)
  const basemapStyles: Record<string, any> = {
    light: {
      version: 8,
      sources: {
        'basemap-base': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 16,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        },
        'basemap-labels': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 16
        }
      },
      layers: [
        { id: 'basemap-base-layer', type: 'raster', source: 'basemap-base', minzoom: 0, maxzoom: 22 }
      ]
    },
    dark: {
      version: 8,
      sources: {
        'basemap-base': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 16,
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        },
        'basemap-labels': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 16
        }
      },
      layers: [
        { id: 'basemap-base-layer', type: 'raster', source: 'basemap-base', minzoom: 0, maxzoom: 22 }
      ]
    },
    satellite: {
      version: 8,
      sources: {
        'basemap-base': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        },
        'basemap-labels': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256
        }
      },
      layers: [
        { id: 'basemap-base-layer', type: 'raster', source: 'basemap-base', minzoom: 0, maxzoom: 19 }
      ]
    },
    opencyclemap: {
      version: 8,
      sources: {
        'basemap-base': {
          type: 'raster',
          tiles: ['https://tile.thunderforest.com/cycle/{z}/{x}/{y}@2x.png?apikey=e26a96d14f5e41d78dd4842ac12f458c'],
          tileSize: 256,
          attribution: 'Maps &copy; <a href="https://www.thunderforest.com" target="_blank" rel="noopener noreferrer">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> &middot; <a href="https://www.opencyclemap.org/docs/" target="_blank" rel="noopener noreferrer">see legend</a>'
        }
      },
      layers: [
        { id: 'basemap-bg', type: 'background', paint: { 'background-color': '#f4f4f4' } },
        { id: 'basemap-base-layer', type: 'raster', source: 'basemap-base', minzoom: 0, maxzoom: 22, paint: { 'raster-opacity': 0.72 } }
      ]
    },
    osm: {
      version: 8,
      sources: {
        'basemap-base': {
          type: 'raster',
          tiles: ['https://tile.thunderforest.com/outdoors/{z}/{x}/{y}@2x.png?apikey=e26a96d14f5e41d78dd4842ac12f458c'],
          tileSize: 256,
          attribution: 'Maps &copy; <a href="https://www.thunderforest.com" target="_blank" rel="noopener noreferrer">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> &middot; <a href="https://www.opencyclemap.org/docs/" target="_blank" rel="noopener noreferrer">see legend</a>'
        }
      },
      layers: [
        { id: 'basemap-bg', type: 'background', paint: { 'background-color': '#f4f4f4' } },
        { id: 'basemap-base-layer', type: 'raster', source: 'basemap-base', minzoom: 0, maxzoom: 22, paint: { 'raster-opacity': 0.78 } }
      ]
    }
  };

  function searchFilterExpression(searchTerm: string): any | null {
    const term = searchTerm ? searchTerm.trim().toLowerCase() : '';
    if (!term) return null;
    return [
      'any',
      ['>=', ['index-of', term, ['downcase', ['to-string', ['coalesce', ['get', 'name'], '']]]], 0],
      ['>=', ['index-of', term, ['downcase', ['to-string', ['coalesce', ['get', 'link_id'], '']]]], 0],
      ['>=', ['index-of', term, ['downcase', ['to-string', ['coalesce', ['get', 'remarks'], '']]]], 0]
    ];
  }

  function getActiveFilterExpression(f: FilterState): any {
    const expressions: any[] = [
      'all',
      ['!=', ['coalesce', ['get', 'layer_type'], ''], 'hs2_railway'],
      ['!=', ['coalesce', ['get', 'layer_type'], ''], 'intervention'],
      ...statusFilterExpressions(f)
    ];

    if (f.developer) {
      expressions.push(['==', ['coalesce', ['get', 'developer'], ''], f.developer]);
    }
    if (f.category) {
      expressions.push(['==', ['coalesce', ['get', 'category'], ''], f.category]);
    }
    if (f.classification) {
      const cls = classificationSynonyms(f.classification);
      expressions.push(['in', ['coalesce', ['get', 'classification'], ''], ['literal', cls]]);
    }
    if (f.section) {
      expressions.push(['==', ['coalesce', ['get', 'section'], ''], f.section]);
    }
    const searchExpr = searchFilterExpression(f.searchTerm);
    if (searchExpr) {
      expressions.push(searchExpr);
    }

    // Interactive legend: exclude unchecked colour groups
    expressions.push(...hiddenGroupExpressions(f.colorBy, effectiveHiddenGroups(f)));

    return expressions;
  }

  const pendingPointExpr: any = [
    'any',
    ['==', ['coalesce', ['get', 'folder'], ''], 'Pending'],
    ['==', ['coalesce', ['get', 'status'], ''], 'pending']
  ];

  const legacyPointExpr: any = [
    'all',
    ['!', pendingPointExpr],
    [
      'any',
      ['==', ['coalesce', ['get', 'folder'], ''], 'Superseded'],
      ['==', ['coalesce', ['get', 'status'], ''], 'superseded'],
      ['==', ['coalesce', ['get', 'category'], ''], 'Old active travel route alignment'],
      ['==', ['coalesce', ['get', 'classification'], ''], 'Old active travel route alignment'],
      ['>', ['coalesce', ['get', 'dist_to_route_m'], 0], INTERVENTION_LEGACY_THRESHOLD_M]
    ]
  ];

  const activePointExpr: any = [
    'all',
    ['!', pendingPointExpr],
    ['!', legacyPointExpr]
  ];

  function getPointFilterExpression(
    f: FilterState,
    ptsActive: boolean,
    ptsSuperseded: boolean,
    ptsPending: boolean
  ): any {
    const allowActive = ptsActive;
    const allowSuperseded = ptsSuperseded || showsSuperseded(f);
    const allowPending = ptsPending || showsPending(f);

    const clauses: any[] = [];
    if (allowActive) clauses.push(activePointExpr);
    if (allowSuperseded) clauses.push(legacyPointExpr);
    if (allowPending) clauses.push(pendingPointExpr);

    if (clauses.length === 0) {
      return ['==', 1, 0];
    }

    const expr: any[] = [
      'all',
      ['==', ['geometry-type'], 'Point'],
      clauses.length === 1 ? clauses[0] : ['any', ...clauses]
    ];
    const searchExpr = searchFilterExpression(f.searchTerm);
    if (searchExpr) {
      expr.push(searchExpr);
    }
    return expr;
  }

  let styleReady = false;
  let loadedDataRef: CyclewayFeatureCollection | null = null;

  function ensureLayers() {
    if (!map || !data || !styleReady) return;
    setupMapLayers();
  }

  function isTouchOnlyDevice(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
  }

  function handleCyclewayMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0 || isTouchOnlyDevice()) return;
    map.getCanvas().style.cursor = 'pointer';

    const feat = e.features[0];
    const properties = feat.properties as CyclewaySegmentProperties;

    if (hoveredId !== null && hoveredId !== feat.id) {
      map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: false });
    }
    hoveredId = feat.id as number;
    map.setFeatureState({ source: 'cycleway-data', id: hoveredId }, { hover: true });

    const superseded = isSuperseded(properties);
    const length = properties.length_km ? `${Number(properties.length_km).toFixed(2)} km` : '';
    const classification = superseded
      ? 'Old active travel route alignment'
      : normalizeClassification(properties.classification) || properties.category || 'Active Route';
    const html = `
      <div class="tooltip-content">
        <div class="tooltip-title">${properties.name || `Link ${properties.link_id || properties.id}`}</div>
        <div class="tooltip-meta">
          <span class="badge-sec">${properties.section || 'Corridor'}</span>
          ${properties.status ? `<span class="badge-sec badge-${properties.status.toLowerCase()}">${formatStatusLabel(properties.status)}</span>` : ''}
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
      onSelectSegment(
        e.features[0].properties as CyclewaySegmentProperties,
        [e.lngLat.lng, e.lngLat.lat]
      );
    }
  }

  function handleRailwayMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0 || isTouchOnlyDevice()) return;
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

  function handlePointMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0 || isTouchOnlyDevice()) return;
    map.getCanvas().style.cursor = 'pointer';

    const feat = e.features[0];
    const properties = feat.properties as CyclewaySegmentProperties;

    const pending = isPending(properties);
    const superseded = isSuperseded(properties);
    const legacy = !pending && isLegacyIntervention(properties);
    const distM = typeof properties.dist_to_route_m === 'number' ? properties.dist_to_route_m : null;
    const distText = distM !== null
      ? (distM >= 1000 ? `${(distM / 1000).toFixed(1)} km from route` : `${distM} m from route`)
      : '';

    const title = properties.name || 'Junction Treatment';
    const folder = properties.folder ? properties.folder.replace(' - Interventions', '') : 'Intervention';
    const classification = pending
      ? 'Pending northern extension intervention'
      : superseded
        ? 'Old active travel route alignment'
        : legacy
          ? `Legacy intervention (> ${INTERVENTION_LEGACY_THRESHOLD_M} m from active route)`
          : (properties.classification || 'Intervention Point');
    const remarks = properties.remarks ? `<div class="tooltip-remarks">${escapeHtml(properties.remarks)}</div>` : '';

    const html = `
      <div class="tooltip-content point-tooltip">
        <div class="tooltip-title">${escapeHtml(title)}</div>
        <div class="tooltip-meta">
          <span class="badge-sec ${legacy ? 'badge-superseded' : ''}">${escapeHtml(legacy && !superseded ? 'Legacy' : folder)}</span>
          ${properties.status && !legacy ? `<span class="badge-sec badge-${properties.status.toLowerCase()}">${formatStatusLabel(properties.status)}</span>` : ''}
          <span class="tooltip-len">${distText || `ID: ${properties.id}`}</span>
        </div>
        <div class="tooltip-cat">${escapeHtml(classification)}</div>
        ${remarks}
      </div>
    `;
    hoverPopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  }

  function handlePointMouseLeave() {
    if (!map) return;
    map.getCanvas().style.cursor = '';
    hoverPopup?.remove();
  }

  function handlePointClick(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0) return;
    const feat = e.features[0];
    const properties = feat.properties as CyclewaySegmentProperties;

    if (clickPopup) {
      clickPopup.remove();
      clickPopup = null;
    }

    const pending = isPending(properties);
    const superseded = isSuperseded(properties);
    const legacy = !pending && isLegacyIntervention(properties);
    const distM = typeof properties.dist_to_route_m === 'number' ? properties.dist_to_route_m : null;
    const distLabel = distM !== null
      ? (distM >= 1000 ? `${(distM / 1000).toFixed(2)} km` : `${distM} m`)
      : null;

    const title = popupValue(properties.name, 'Junction Treatment');
    const folder = popupValue(properties.folder ? properties.folder.replace(' - Interventions', '') : '', 'Intervention');
    const classification = pending
      ? 'Pending northern extension intervention'
      : superseded
        ? 'Old active travel route alignment'
        : legacy
          ? `Legacy (> ${INTERVENTION_LEGACY_THRESHOLD_M} m from route)`
          : popupValue(properties.classification, 'Active Route Treatment');

    const html = `
      <div class="map-popup-card">
        <div class="map-popup-header">
          <div class="map-badge-group">
            <span class="map-badge ${superseded || legacy ? 'warning' : 'civic'}">
              ${pending ? 'Pending' : superseded ? 'Old Alignment' : legacy ? 'Legacy Point' : 'Intervention'}
            </span>
            <span class="map-badge">${folder}</span>
          </div>
        </div>
        <h4 class="map-popup-title">${title}</h4>
        <div class="map-popup-table">
          <div class="map-cell"><span class="k">Point ID:</span><span class="v font-mono">${properties.id}</span></div>
          <div class="map-cell"><span class="k">Type:</span><span class="v">${title}</span></div>
          <div class="map-cell"><span class="k">Status:</span><span class="v">${classification}</span></div>
          ${distLabel ? `<div class="map-cell"><span class="k">Distance to route:</span><span class="v font-mono">${distLabel}</span></div>` : ''}
          <div class="map-cell full"><span class="k">Corridor Section:</span><span class="v">${folder}</span></div>
          ${properties.remarks ? `<div class="map-cell full"><span class="k">Remarks:</span><span class="v">${escapeHtml(properties.remarks)}</span></div>` : ''}
        </div>
        ${mapButtonsHtml(e.lngLat.lng, e.lngLat.lat)}
      </div>
    `;

    clickPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: 'min(320px, calc(100vw - 24px))',
      className: 'point-click-popup'
    })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);

    onSelectSegment(properties, [e.lngLat.lng, e.lngLat.lat]);
  }

  function handleNcnMouseMove(e: maplibregl.MapLayerMouseEvent) {
    if (!map || !e.features || e.features.length === 0 || isTouchOnlyDevice()) return;
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
      <div class="map-popup-card">
        <div class="map-popup-header">
          <div class="map-badge-group">
            <span class="map-badge civic">${routeType} ${routeNum}</span>
            <span class="map-badge ${isTrafficFree ? 'success' : 'danger'}">${isTrafficFree ? 'Traffic-Free' : 'On-Road'}</span>
            ${isGreenway ? '<span class="map-badge success">Greenway</span>' : ''}
          </div>
        </div>
        <h4 class="map-popup-title">${routeCategory}</h4>
        <div class="map-popup-table">
          <div class="map-cell"><span class="k">Traffic:</span><span class="v">${desc}</span></div>
          <div class="map-cell"><span class="k">Surface:</span><span class="v">${popupValue(props.Surface, 'Unspecified')}</span></div>
          <div class="map-cell"><span class="k">Quality:</span><span class="v">${popupValue(props.Quality, 'Standard')}</span></div>
          <div class="map-cell"><span class="k">Lighting:</span><span class="v">${popupValue(props.Lighting, 'Not lit')}</span></div>
          ${props.RoadClass ? `<div class="map-cell"><span class="k">Road Class:</span><span class="v">${popupValue(props.RoadClass, '')}</span></div>` : ''}
          <div class="map-cell"><span class="k">Open Status:</span><span class="v">${popupValue(props.OpenStatus, 'Open')}</span></div>
          <div class="map-cell"><span class="k">Segment ID:</span><span class="v font-mono">${popupValue(props.SegmentID, 'N/A')}</span></div>
          <div class="map-cell full"><span class="k">Global ID:</span><span class="v font-mono text-xs">${popupValue(props.GlobalID, 'N/A')}</span></div>
        </div>
        ${mapButtonsHtml(e.lngLat.lng, e.lngLat.lat)}
      </div>
    `;

    clickPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: 'min(320px, calc(100vw - 24px))',
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
          'line-color': REFERENCE_COLORS.ncnOffRoad,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.2,
            8, 2.0,
            12, 3.5,
            16, 5.0
          ],
          'line-opacity': 0.9
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
          'line-color': REFERENCE_COLORS.ncnOnRoad,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.2,
            8, 2.0,
            12, 3.5,
            16, 5.0
          ],
          'line-opacity': 0.5
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
    if (!map || !e.features || e.features.length === 0 || isTouchOnlyDevice()) return;
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
    const haulageBasis = props.possible_haulage_basis
      ? `<div class="map-cell full"><span class="k">Haulage evidence:</span><span class="v">${popupValue(props.possible_haulage_basis, '')}</span></div>`
      : '';
    const formOfWay = popupValue(props.form_of_way, 'Single Carriageway');
    const lengthStr = props.length ? `${Math.round(Number(props.length))} m` : 'N/A';

    const html = `
      <div class="map-popup-card">
        <div class="map-popup-header">
          <div class="map-badge-group">
            <span class="map-badge civic">${roadNum || roadClass}</span>
            <span class="map-badge">${roadFunc}</span>
          </div>
        </div>
        <h4 class="map-popup-title">${name}</h4>
        <div class="map-popup-table">
          <div class="map-cell"><span class="k">Classification:</span><span class="v">${roadClass}</span></div>
          <div class="map-cell"><span class="k">Function:</span><span class="v">${roadFunc}</span></div>
          <div class="map-cell"><span class="k">Form of Way:</span><span class="v">${formOfWay}</span></div>
          <div class="map-cell"><span class="k">Link Length:</span><span class="v">${lengthStr}</span></div>
          ${haulageBasis}
          ${props.id ? `<div class="map-cell full"><span class="k">Link ID:</span><span class="v font-mono text-xs">${popupValue(props.id, '')}</span></div>` : ''}
        </div>
        ${mapButtonsHtml(e.lngLat.lng, e.lngLat.lat)}
      </div>
    `;

    clickPopup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: 'min(320px, calc(100vw - 24px))',
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

      const beforeId = map.getLayer(NCN_LINE_LAYER_ID)
        ? NCN_LINE_LAYER_ID
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
          'line-color': REFERENCE_COLORS.roadCasing,
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
          'line-color': REFERENCE_COLORS.roadLocal,
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
        id: OPENROADS_HAULAGE_LAYER_ID,
        type: 'line',
        source: OPENROADS_SOURCE_ID,
        'source-layer': 'openroads',
        filter: ['==', ['coalesce', ['get', 'road_function'], ''], 'Local Access Possible HS2 Haulage'],
        minzoom: 8,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
          'visibility': showOpenRoads ? 'visible' : 'none'
        },
        paint: {
          'line-color': REFERENCE_COLORS.roadHaulage,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 2.0,
            11, 3.5,
            14, 6.0
          ],
          'line-dasharray': [2, 1.5],
          'line-opacity': 1
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
          'line-color': REFERENCE_COLORS.roadMinor,
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
          'line-color': REFERENCE_COLORS.roadMajor,
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
      if (loadedDataRef !== data) {
        loadedDataRef = data;
        existingSource.setData(data as any);
        fitInitialBounds();
      }
      return;
    }

    loadedDataRef = data;

    try {
      const pathVersion = data.version || data.metadata?.version || 'v0.4.0';
      map.addSource('cycleway-data', {
        type: 'geojson',
        data: data as any,
        generateId: true,
        attribution: `North-South Greenway file version ${pathVersion}`
      });

      // ==========================================
      // STUDY AREA BOUNDARY LAYER (10km Corridor Buffer)
      // ==========================================
      if (!map.getSource('study-area-data')) {
        map.addSource('study-area-data', {
          type: 'geojson',
          data: studyAreaGeojsonUrl
        });

        map.addLayer({
          id: 'study-area-fill',
          type: 'fill',
          source: 'study-area-data',
          layout: {
            'visibility': showStudyArea ? 'visible' : 'none'
          },
          paint: {
            'fill-color': REFERENCE_COLORS.studyArea,
            'fill-opacity': 0.08
          }
        });

        map.addLayer({
          id: 'study-area-line',
          type: 'line',
          source: 'study-area-data',
          layout: {
            'visibility': showStudyArea ? 'visible' : 'none'
          },
          paint: {
            'line-color': REFERENCE_COLORS.studyAreaOutline,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, 1.2,
              10, 2.0,
              14, 3.2
            ],
            'line-dasharray': [4, 3],
            'line-opacity': 0.75
          }
        });
      }

      // ==========================================
      // A. MAIN HS2 RAILWAY TRACK LINE (Solid / Dashed Black Track)
      // ==========================================
      map.addLayer({
        id: 'hs2-rail-casing',
        type: 'line',
        source: 'cycleway-data',
        filter: ['all', ['==', ['coalesce', ['get', 'layer_type'], ''], 'hs2_railway'], ['!=', ['coalesce', ['get', 'status'], ''], 'pending']],
        layout: {
          'line-cap': 'butt',
          'line-join': 'miter',
          'visibility': showHs2Railway ? 'visible' : 'none'
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
        filter: ['all', ['==', ['coalesce', ['get', 'layer_type'], ''], 'hs2_railway'], ['!=', ['coalesce', ['get', 'status'], ''], 'pending']],
        layout: {
          'line-cap': 'butt',
          'line-join': 'miter',
          'visibility': showHs2Railway ? 'visible' : 'none'
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
          'line-color': basemap === 'dark' ? '#0f172a' : '#ffffff',
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
          'line-color': colorExpression(filters.colorBy),
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
        filter: getPointFilterExpression(filters, showActivePoints, showSupersededPoints, showPendingPoints),
        layout: {
          visibility: showInterventions ? 'visible' : 'none',
          'circle-sort-key': ['case', legacyPointExpr, 0, pendingPointExpr, 1, 2]
        },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 7, 16, 11],
          'circle-color': [
            'case',
            pendingPointExpr,
            PENDING_COLOR,
            legacyPointExpr,
            INTERVENTION_LEGACY_COLOR,
            INTERVENTION_COLOR
          ],
          'circle-opacity': ['case', legacyPointExpr, INTERVENTION_LEGACY_OPACITY, 1.0],
          'circle-stroke-width': ['case', legacyPointExpr, 1.5, 2],
          'circle-stroke-color': basemap === 'dark' ? '#0f172a' : '#ffffff',
          'circle-stroke-opacity': ['case', legacyPointExpr, INTERVENTION_LEGACY_OPACITY, 1.0]
        }
      });

      // 4. Top-level Place Names Overlay Layer (sits above route lines, toggled via showPlaceNames)
      if (map.getSource('basemap-labels') && !map.getLayer('basemap-labels-layer')) {
        map.addLayer({
          id: 'basemap-labels-layer',
          type: 'raster',
          source: 'basemap-labels',
          minzoom: 0,
          maxzoom: 20,
          layout: {
            visibility: showPlaceNames ? 'visible' : 'none'
          }
        });
      }

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

      // Interaction Events on Points / Interventions
      map.off('mousemove', 'cycleway-points', handlePointMouseMove);
      map.on('mousemove', 'cycleway-points', handlePointMouseMove);
      map.off('mouseleave', 'cycleway-points', handlePointMouseLeave);
      map.on('mouseleave', 'cycleway-points', handlePointMouseLeave);
      map.off('click', 'cycleway-points', handlePointClick);
      map.on('click', 'cycleway-points', handlePointClick);

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

      map.resize();
      fitInitialBounds();
      map.triggerRepaint();
    } catch (err) {
      console.error('Error in setupMapLayers:', err);
    }
  }

  export function fitCorridorBounds() {
    if (!map || !data || !data.features || data.features.length === 0) return;
    map.resize();
    const bounds = new maplibregl.LngLatBounds();
    
    for (const f of data.features) {
      if (isSuperseded(f.properties) || isPending(f.properties)) continue;
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
      const isMobile = isMobileViewport();
      map.fitBounds(bounds, {
        padding: isMobile
          ? { left: 24, right: 24, top: 24, bottom: 36 }
          : {
              left: (sidebarOpen && !printMode) ? 360 : (printMode === 'legend' ? 300 : 40),
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
    if (!shouldFitInitialBounds) {
      map?.easeTo({ zoom: map.getZoom() + 0.001, duration: 800 });
      return;
    }
    shouldFitInitialBounds = false;
    fitCorridorBounds();
  }

  export function zoomToSegment(id: number) {
    zoomToFeatures([id]);
  }

  export function zoomToFeatures(ids: number[]) {
    if (!map || !data || ids.length === 0) return;
    map.resize();
    const idSet = new Set(ids);
    const features = data.features.filter(f => idSet.has(f.properties.id));
    if (features.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const feature of features) {
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
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: zoomPadding(), maxZoom: 15, duration: 1200 });
    }
  }

  /** Zoom to a searched place's bounding box: [west, south, east, north]. */
  export function zoomToPlace(bbox: [number, number, number, number]) {
    if (!map) return;
    map.resize();
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: zoomPadding(), maxZoom: 14, duration: 1200 });
  }

  export function exportMapCanvasPng(filename = 'railactive-map.png'): string | null {
    if (!map) return null;
    map.triggerRepaint();
    const dataUrl = map.getCanvas().toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
    return dataUrl;
  }

  function zoomPadding() {
    if (isMobileViewport()) {
      return {
        left: 32,
        right: 32,
        top: 32,
        bottom: selectedSegment ? 220 : 48
      };
    }
    return { left: (sidebarOpen && !printMode) ? 380 : 80, right: 80, top: 80, bottom: 80 };
  }

  onMount(() => {
    shouldFitInitialBounds = !hasInitialMapView;
    map = new maplibregl.Map({
      container: mapContainer,
      style: basemapStyles[basemap] || basemapStyles.light,
      center: [-1.4, 52.3],
      zoom: 7.8,
      pitch: 0,
      hash: 'map',
      preserveDrawingBuffer: true
    });

    (window as any)._map = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      fitBoundsOptions: { maxZoom: 15 }
    });
    geolocate.on('error', handleGeolocateError);
    map.addControl(geolocate, 'top-right');
    // Geolocation only works in secure contexts (HTTPS or localhost), e.g. not via a LAN IP over HTTP
    if (!window.isSecureContext) {
      showGeoMessage('Location requires a secure connection. Open this page over HTTPS (or via localhost) to use the locate button.');
    }
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      styleReady = true;
      ensureLayers();
    });

    map.on('style.load', () => {
      styleReady = true;
      loadedDataRef = null;
      setupMapLayers();
    });
  });

  onDestroy(() => {
    if (geoMessageTimeout) clearTimeout(geoMessageTimeout);
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

  // Watch Study Area visibility reactively
  $effect(() => {
    const studyVisible = showStudyArea ? 'visible' : 'none';
    if (!map || !styleReady) return;
    if (map.getLayer('study-area-fill')) {
      map.setLayoutProperty('study-area-fill', 'visibility', studyVisible);
    }
    if (map.getLayer('study-area-line')) {
      map.setLayoutProperty('study-area-line', 'visibility', studyVisible);
    }
  });

  // Watch HS2 Railway alignment visibility reactively
  $effect(() => {
    const hs2Visible = showHs2Railway ? 'visible' : 'none';
    if (!map) return;
    if (map.getLayer('hs2-rail-casing')) {
      map.setLayoutProperty('hs2-rail-casing', 'visibility', hs2Visible);
    }
    if (map.getLayer('hs2-rail-ties')) {
      map.setLayoutProperty('hs2-rail-ties', 'visibility', hs2Visible);
    }
    if (!showHs2Railway) {
      hoverPopup?.remove();
    }
    map.triggerRepaint();
  });

  // Watch Junction / intervention points visibility reactively
  $effect(() => {
    const ptsVisible = showInterventions ? 'visible' : 'none';
    if (!map) return;
    if (map.getLayer('cycleway-points')) {
      map.setLayoutProperty('cycleway-points', 'visibility', ptsVisible);
    }
    if (!showInterventions) {
      hoverPopup?.remove();
      clickPopup?.remove();
      clickPopup = null;
    }
    map.triggerRepaint();
  });

  // Watch Place Names visibility reactively
  $effect(() => {
    const labelsVisible = showPlaceNames ? 'visible' : 'none';
    if (!map || !styleReady) return;
    if (map.getLayer('basemap-labels-layer')) {
      map.setLayoutProperty('basemap-labels-layer', 'visibility', labelsVisible);
    }
  });

  // Watch data updates reactively (untrack setupMapLayers so filter/UI reads inside it do not re-trigger this effect)
  $effect(() => {
    const currentData = data;
    if (map && currentData) {
      untrack(() => ensureLayers());
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
    const _status = filters.status;
    const _search = filters.searchTerm;
    const _colorBy = filters.colorBy;
    const _superseded = filters.showSuperseded;
    const _pending = filters.showPending;
    const _ptsActive = showActivePoints;
    const _ptsSuperseded = showSupersededPoints;
    const _ptsPending = showPendingPoints;

    if (map && map.getLayer('cycleway-lines')) {
      const filterExpr = getActiveFilterExpression(filters);
      map.setFilter('cycleway-lines', filterExpr);
      map.setFilter('cycleway-casing', filterExpr);
      
      if (map.getLayer('cycleway-points')) {
        map.setFilter('cycleway-points', getPointFilterExpression(filters, _ptsActive, _ptsSuperseded, _ptsPending));
      }
      
      const colorExpr = colorExpression(filters.colorBy);
      map.setPaintProperty('cycleway-lines', 'line-color', colorExpr);
      map.triggerRepaint();
    }
  });

  // Reactive update for basemap (skip redundant setStyle on initial mount)
  let appliedBasemap = '';
  $effect(() => {
    if (!map || !basemapStyles[basemap]) return;
    if (!appliedBasemap) {
      appliedBasemap = basemap;
      return;
    }
    if (appliedBasemap === basemap) return;
    appliedBasemap = basemap;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const currentPitch = map.getPitch();
    const currentBearing = map.getBearing();

    styleReady = false;
    map.setStyle(basemapStyles[basemap], { diff: false });
    map.once('style.load', () => {
      styleReady = true;
      if (map) {
        map.setCenter(currentCenter);
        map.setZoom(currentZoom);
        map.setPitch(currentPitch);
        map.setBearing(currentBearing);
      }
    });
  });

  // Resize MapLibre canvas when toggling print mode (header height changes)
  $effect(() => {
    const _mode = printMode;
    if (!map) return;
    requestAnimationFrame(() => {
      map?.resize();
    });
  });
</script>

<div
  class="map-wrapper"
  class:sidebar-open={sidebarOpen && !printMode}
  class:print-mode={Boolean(printMode)}
  bind:this={mapContainer}
></div>

{#if geoMessage && !printMode}
  <div class="geo-message" role="status">{geoMessage}</div>
{/if}

<style>
  .geo-message {
    position: absolute;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    max-width: min(420px, 90%);
    padding: 8px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-panel);
    color: var(--text-primary);
    font-size: 12px;
  }

  .map-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .map-wrapper :global(.maplibregl-ctrl-bottom-left) {
    bottom: 14px;
    left: 14px;
    transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .map-wrapper.sidebar-open :global(.maplibregl-ctrl-bottom-left) {
    left: 350px;
  }

  @media (max-width: 767px) {
    .map-wrapper :global(.maplibregl-ctrl-bottom-left) {
      bottom: 10px;
      left: 10px;
    }

    .map-wrapper.sidebar-open :global(.maplibregl-ctrl-bottom-left) {
      left: 10px;
    }

    .map-wrapper :global(.maplibregl-ctrl-attrib) {
      font-size: 10px;
      line-height: 1.25;
      background: rgba(255, 255, 255, 0.85);
    }
  }

  .map-wrapper.print-mode :global(.maplibregl-ctrl-top-right) {
    display: none !important;
  }

  .map-wrapper.print-mode :global(.maplibregl-ctrl-bottom-left) {
    left: 14px !important;
  }

  @media print {
    .map-wrapper :global(.maplibregl-ctrl-top-right) {
      display: none !important;
    }

    .map-wrapper :global(.maplibregl-ctrl-bottom-left) {
      left: 14px !important;
    }
  }

  :global(.hover-tooltip-popup .maplibregl-popup-content) {
    background: #ffffff !important;
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-sm) !important;
    padding: 8px 10px !important;
    box-shadow: var(--shadow-md) !important;
    pointer-events: none;
  }

  :global(.hover-tooltip-popup .maplibregl-popup-tip) {
    border-top-color: #ffffff !important;
  }

  :global(.tooltip-content) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: 'Inter', sans-serif;
  }

  :global(.tooltip-title) {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }

  :global(.tooltip-meta) {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
  }

  :global(.badge-sec) {
    background: #eff6ff;
    color: var(--accent-civic);
    border: 1px solid #bfdbfe;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 600;
  }

  :global(.tooltip-len) {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-secondary);
  }

  :global(.tooltip-cat) {
    font-size: 10px;
    color: var(--text-muted);
  }

  :global(.tooltip-remarks) {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
    font-style: italic;
  }

  :global(.badge-preferred) {
    background: #eff6ff !important;
    color: #1d4ed8 !important;
    border-color: #bfdbfe !important;
  }

  :global(.badge-alternative) {
    background: #fffbeb !important;
    color: #b45309 !important;
  }

  :global(.badge-superseded) {
    background: #f1f5f9 !important;
    color: #64748b !important;
  }

  :global(.badge-pending) {
    background: #faf5ff !important;
    color: #9333ea !important;
  }

  :global(.badge-trafficfree) {
    background: #ecfdf5 !important;
    color: #059669 !important;
  }

  :global(.badge-onroad) {
    background: #fef2f2 !important;
    color: #b91c1c !important;
  }

</style>
