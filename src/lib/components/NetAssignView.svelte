<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';

  interface Props {
    sidebarOpen: boolean;
    basemap: string;
    onChangeBasemap: (b: string) => void;
  }

  let {
    sidebarOpen = true,
    basemap = 'light',
    onChangeBasemap
  }: Props = $props();

  type ModeType = 'cycling' | 'walking';
  type MetricType =
    | 'greenway'
    | 'baseline'
    | 'delta'
    | 'leisure_tourism'
    | 'commute'
    | 'edu_utility';
  type ScopeType = 'south_london_network' | 'all_network' | 'greenway_only';

  let mode: ModeType = $state('cycling');
  let metric: MetricType = $state('greenway');
  let scope: ScopeType = $state('south_london_network');
  let showTourismPois: boolean = $state(true);
  let showCounters: boolean = $state(false);
  let showModelFitModal: boolean = $state(false);
  let showAmatModal: boolean = $state(false);
  let horizonId: string = $state('yr5');

  const TEMPORAL_HORIZONS = [
    { id: 'm3', label: 'Month 3 (Early)', routeMult: 0.58, shiftMult: 0.14, indMult: 0.19, totalShare: 0.304 },
    { id: 'yr1', label: 'Year 1 (Opening)', routeMult: 0.87, shiftMult: 0.43, indMult: 0.52, totalShare: 0.606 },
    { id: 'yr3', label: 'Year 3 (Ramp-Up)', routeMult: 0.99, shiftMult: 0.84, indMult: 0.91, totalShare: 0.909 },
    { id: 'yr5', label: 'Year 5 (Mature)', routeMult: 1.00, shiftMult: 0.96, indMult: 0.99, totalShare: 0.981 },
    { id: 'yr10', label: 'Year 10 (Equilibrium)', routeMult: 1.00, shiftMult: 1.00, indMult: 1.00, totalShare: 1.000 }
  ];

  const AMAT_PACKAGES = [
    { id: 'P1', name: '1. Greenway Spine Only (Unbridged Barriers)', omega: 0.643, pkmB2: 100261, newTrips: 3151, pvbM: 1059.6, pvcM: 99.9, bcr: 10.61 },
    { id: 'P2', name: '2. Spine + 42 Motorway/A-Road/Rail Bridges', omega: 0.764, pkmB2: 107024, newTrips: 4205, pvbM: 1136.0, pvcM: 113.5, bcr: 10.01 },
    { id: 'P3', name: '3. Spine + Bridges + 20mph/Quiet-Lane Feeders', omega: 0.855, pkmB2: 117524, newTrips: 5842, pvbM: 1254.3, pvcM: 127.1, bcr: 9.87 },
    { id: 'P4', name: '4. Full Synergy: Spine + Feeders + E-Bike Hubs', omega: 0.882, pkmB2: 130377, newTrips: 7845, pvbM: 1397.9, pvcM: 133.9, bcr: 10.44 }
  ];

  function currentHorizon() {
    return TEMPORAL_HORIZONS.find((h) => h.id === horizonId) || TEMPORAL_HORIZONS[4];
  }

  function decomposeLinkDelta(link: Record<string, any>) {
    const delta = Math.max(0, Number(link.cyc_delta || 0));
    const commShare = Number(link.cyc_b || 0) > 0 ? Number(link.cyc_b_commute || 0) / Number(link.cyc_b) : 0.25;
    const leisShare = Number(link.cyc_b || 0) > 0 ? Number(link.cyc_b_leisure_all || 0) / Number(link.cyc_b) : 0.50;
    const utilShare = Math.max(0, 1 - commShare - leisShare);
    const routeFrac = 0.552 * commShare + 0.285 * leisShare + 0.335 * utilShare;
    const shiftFrac = 0.406 * commShare + 0.386 * leisShare + 0.508 * utilShare;
    const indFrac = Math.max(0, 1 - routeFrac - shiftFrac);
    const h = currentHorizon();
    const route = delta * routeFrac * h.routeMult;
    const shift = delta * shiftFrac * h.shiftMult;
    const induced = delta * indFrac * h.indMult;
    const fromCar = (shift + induced) * 0.338;
    return { route, shift, induced, fromCar, totalAtHorizon: route + shift + induced };
  }

  let loading: boolean = $state(true);
  let error: string | null = $state(null);

  let netData: any = $state(null);
  let poiData: any = $state(null);
  let counterData: any = $state(null);

  let selectedLink: Record<string, any> | null = $state(null);
  let selectedCounter: Record<string, any> | null = $state(null);

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let hoverPopup: maplibregl.Popup | null = null;

  const REGION_PRESETS = [
    {
      id: 'south_london',
      label: 'South of London (Avenue Verte, Knole & Mote, Cuckmere)',
      center: [-0.01, 51.11] as [number, number],
      zoom: 9.4,
      defaultScope: 'south_london_network' as ScopeType
    },
    {
      id: 'cuckmere',
      label: 'Sussex Downs, Cuckmere & Newhaven Coast',
      center: [0.13, 50.83] as [number, number],
      zoom: 11.4,
      defaultScope: 'south_london_network' as ScopeType
    },
    {
      id: 'knole',
      label: 'Sevenoaks, Knole Park & Mote Park',
      center: [0.27, 51.25] as [number, number],
      zoom: 11.0,
      defaultScope: 'south_london_network' as ScopeType
    },
    {
      id: 'chilterns',
      label: 'Colne Valley Viaduct & Chilterns',
      center: [-0.63, 51.72] as [number, number],
      zoom: 10.2,
      defaultScope: 'all_network' as ScopeType
    },
    {
      id: 'warwickshire',
      label: 'Warwickshire, Kenilworth & Berkswell',
      center: [-1.54, 52.34] as [number, number],
      zoom: 10.4,
      defaultScope: 'all_network' as ScopeType
    },
    {
      id: 'cheshire',
      label: 'Cheshire & Manchester Approach',
      center: [-2.43, 53.15] as [number, number],
      zoom: 9.8,
      defaultScope: 'all_network' as ScopeType
    }
  ];

  let activePresetId: string = $state('south_london');

  const AUTORESEARCH_EXPERIMENTS = [
    {
      id: 'M1',
      name: 'Commute Only (Raw Uncalibrated)',
      cycR: 0.7845,
      cycR2: 0.3517,
      cycW2x: 44.5,
      cycInfraR: 0.7557,
      cycSouthR: 0.5929,
      walkR: 0.6216,
      walkW2x: 51.4
    },
    {
      id: 'M2',
      name: 'Commute + Utility + School (NTS Base)',
      cycR: 0.8086,
      cycR2: 0.6194,
      cycW2x: 53.7,
      cycInfraR: 0.7819,
      cycSouthR: 0.5974,
      walkR: 0.6743,
      walkW2x: 61.9
    },
    {
      id: 'M3',
      name: 'All-Purpose Standard CSIS Weights',
      cycR: 0.8180,
      cycR2: 0.5250,
      cycW2x: 48.2,
      cycInfraR: 0.8128,
      cycSouthR: 0.6606,
      walkR: 0.7082,
      walkW2x: 52.0
    },
    {
      id: 'M4',
      name: 'All-Purpose + OSM Campsite & Tourism Legs',
      cycR: 0.8178,
      cycR2: 0.5313,
      cycW2x: 48.3,
      cycInfraR: 0.8130,
      cycSouthR: 0.6626,
      walkR: 0.7086,
      walkW2x: 52.0
    },
    {
      id: 'M5',
      name: 'NNLS Purpose-Group Ridge Calibration',
      cycR: 0.8168,
      cycR2: 0.6219,
      cycW2x: 51.5,
      cycInfraR: 0.8128,
      cycSouthR: 0.6634,
      walkR: 0.7089,
      walkW2x: 65.4
    },
    {
      id: 'M6',
      name: 'Adopted: All-Purpose + OSM Tourism + Class/Region Calibrated',
      cycR: 0.8482,
      cycR2: 0.6757,
      cycW2x: 56.2,
      cycInfraR: 0.8283,
      cycSouthR: 0.6799,
      walkR: 0.7334,
      walkW2x: 66.8
    }
  ];

  const SECTION_HIGHLIGHTS = [
    { section: 'Avenue Verte (Core)', km: 132.1, cycA: 355.9, cycB: 399.2, cycLeisureB: 216.0, walkB: 495.1 },
    { section: 'Avenue Verte – Knole & Mote (v2)', km: 41.1, cycA: 8.6, cycB: 54.2, cycLeisureB: 42.5, walkB: 160.3 },
    { section: 'Avenue Verte – Cuckmere & Coast (v2)', km: 19.5, cycA: 20.5, cycB: 42.7, cycLeisureB: 22.9, walkB: 93.0 },
    { section: 'HS2 Alignment (Core)', km: 385.7, cycA: 29.9, cycB: 80.6, cycLeisureB: 43.6, walkB: 308.4 },
    { section: 'HS2 – Colne Valley Viaduct (v2)', km: 9.5, cycA: 11.1, cycB: 81.3, cycLeisureB: 43.3, walkB: 173.4 },
    { section: 'HS2 – Berkswell to A45 (v2)', km: 7.6, cycA: 4.8, cycB: 57.2, cycLeisureB: 27.6, walkB: 185.7 },
    { section: 'HS2 – Lower Boddington to Southam (v2)', km: 13.0, cycA: 0.2, cycB: 33.3, cycLeisureB: 18.8, walkB: 45.2 },
    { section: 'Cheshire & North West', km: 147.8, cycA: 56.0, cycB: 63.1, cycLeisureB: 41.3, walkB: 82.8 }
  ];

  const basemapStyles: Record<string, any> = {
    dark: {
      version: 8,
      sources: {
        'esri-dark-base': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri'
        },
        'esri-dark-labels': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256
        }
      },
      layers: [
        { id: 'base', type: 'raster', source: 'esri-dark-base', minzoom: 0, maxzoom: 18 },
        { id: 'labels', type: 'raster', source: 'esri-dark-labels', minzoom: 0, maxzoom: 18 }
      ]
    },
    light: {
      version: 8,
      sources: {
        'esri-light-base': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri'
        },
        'esri-light-labels': {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256
        }
      },
      layers: [
        { id: 'base', type: 'raster', source: 'esri-light-base', minzoom: 0, maxzoom: 18 },
        { id: 'labels', type: 'raster', source: 'esri-light-labels', minzoom: 0, maxzoom: 18 }
      ]
    },
    osm: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'base', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
    }
  };

  function activePropertyName(m: ModeType, met: MetricType): string {
    if (m === 'cycling') {
      switch (met) {
        case 'greenway': return 'cyc_b';
        case 'baseline': return 'cyc_a';
        case 'delta': return 'cyc_delta';
        case 'leisure_tourism': return 'cyc_b_leisure_all';
        case 'commute': return 'cyc_b_commute';
        case 'edu_utility': return 'cyc_b_utility';
      }
    } else {
      switch (met) {
        case 'greenway': return 'walk_b';
        case 'baseline': return 'walk_a';
        case 'delta': return 'walk_delta';
        case 'leisure_tourism': return 'walk_b_leisure_all';
        case 'commute': return 'walk_b_commute';
        case 'edu_utility': return 'walk_b_utility';
      }
    }
  }

  function colorExpressionFor(m: ModeType, met: MetricType): any {
    const prop = activePropertyName(m, met);
    if (met === 'delta') {
      return [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', prop], 0],
        -50, '#f43f5e',
        -10, '#fb7185',
        -2, '#64748b',
        2, '#94a3b8',
        10, '#38bdf8',
        35, '#22d3ee',
        80, '#10b981',
        200, '#a3e635',
        500, '#facc15'
      ];
    }
    if (met === 'leisure_tourism') {
      return [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', prop], 0],
        0, '#334155',
        10, '#0284c7',
        30, '#06b6d4',
        75, '#10b981',
        150, '#84cc16',
        300, '#facc15',
        600, '#f97316'
      ];
    }
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', prop], 0],
      0, '#334155',
      15, '#1d4ed8',
      50, '#0ea5e9',
      120, '#10b981',
      250, '#84cc16',
      500, '#facc15',
      1000, '#f97316',
      2000, '#ef4444'
    ];
  }

  function widthExpressionFor(m: ModeType, met: MetricType, isGreenwaySpine: boolean): any {
    const prop = activePropertyName(m, met);
    const valExpr: any = met === 'delta'
      ? ['abs', ['coalesce', ['get', prop], 0]]
      : ['coalesce', ['get', prop], 0];

    if (isGreenwaySpine) {
      return [
        'interpolate',
        ['linear'],
        valExpr,
        0, 2.8,
        25, 4.0,
        100, 5.6,
        300, 7.5,
        800, 10.0
      ];
    }
    return [
      'interpolate',
      ['linear'],
      valExpr,
      0, 1.1,
      25, 1.8,
      100, 2.8,
      300, 4.2,
      800, 6.0
    ];
  }

  function filterExpressionFor(sc: ScopeType, isGreenwaySpine: boolean): any {
    if (isGreenwaySpine) {
      if (sc === 'south_london_network') {
        return ['all', ['==', ['get', 'is_greenway'], true], ['==', ['get', 'is_south_london'], true]];
      }
      return ['==', ['get', 'is_greenway'], true];
    } else {
      if (sc === 'greenway_only') {
        return ['==', ['get', 'link_id'], '__none__'];
      }
      if (sc === 'south_london_network') {
        return ['all', ['==', ['get', 'is_greenway'], false], ['==', ['get', 'is_south_london'], true]];
      }
      return ['==', ['get', 'is_greenway'], false];
    }
  }

  function applyLayerStyles() {
    if (!map || !map.getSource('netassign-links')) return;

    const colorExpr = colorExpressionFor(mode, metric);
    const bgWidthExpr = widthExpressionFor(mode, metric, false);
    const gwWidthExpr = widthExpressionFor(mode, metric, true);

    if (map.getLayer('netassign-bg-lines')) {
      map.setFilter('netassign-bg-lines', filterExpressionFor(scope, false));
      map.setPaintProperty('netassign-bg-lines', 'line-color', colorExpr);
      map.setPaintProperty('netassign-bg-lines', 'line-width', bgWidthExpr);
    }

    if (map.getLayer('netassign-gw-casing')) {
      map.setFilter('netassign-gw-casing', filterExpressionFor(scope, true));
    }

    if (map.getLayer('netassign-gw-lines')) {
      map.setFilter('netassign-gw-lines', filterExpressionFor(scope, true));
      map.setPaintProperty('netassign-gw-lines', 'line-color', colorExpr);
      map.setPaintProperty('netassign-gw-lines', 'line-width', gwWidthExpr);
    }

    if (map.getLayer('netassign-tourism-pois')) {
      map.setLayoutProperty('netassign-tourism-pois', 'visibility', showTourismPois ? 'visible' : 'none');
    }

    if (map.getLayer('netassign-counters')) {
      map.setLayoutProperty('netassign-counters', 'visibility', showCounters ? 'visible' : 'none');
      map.setFilter('netassign-counters', ['==', ['get', 'mode'], mode]);
    }
  }

  function addDataLayers() {
    if (!map || !netData) return;

    if (!map.getSource('netassign-links')) {
      map.addSource('netassign-links', {
        type: 'geojson',
        data: netData
      });
    }

    if (!map.getLayer('netassign-bg-lines')) {
      map.addLayer({
        id: 'netassign-bg-lines',
        type: 'line',
        source: 'netassign-links',
        filter: filterExpressionFor(scope, false),
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': colorExpressionFor(mode, metric),
          'line-width': widthExpressionFor(mode, metric, false),
          'line-opacity': 0.68
        }
      });
    }

    if (!map.getLayer('netassign-gw-casing')) {
      map.addLayer({
        id: 'netassign-gw-casing',
        type: 'line',
        source: 'netassign-links',
        filter: filterExpressionFor(scope, true),
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#f8fafc',
          'line-width': 8.5,
          'line-opacity': 0.28
        }
      });
    }

    if (!map.getLayer('netassign-gw-lines')) {
      map.addLayer({
        id: 'netassign-gw-lines',
        type: 'line',
        source: 'netassign-links',
        filter: filterExpressionFor(scope, true),
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': colorExpressionFor(mode, metric),
          'line-width': widthExpressionFor(mode, metric, true),
          'line-opacity': 0.96
        }
      });
    }

    if (poiData && !map.getSource('netassign-pois')) {
      map.addSource('netassign-pois', {
        type: 'geojson',
        data: poiData
      });
      map.addLayer({
        id: 'netassign-tourism-pois',
        type: 'circle',
        source: 'netassign-pois',
        layout: {
          visibility: showTourismPois ? 'visible' : 'none'
        },
        paint: {
          'circle-radius': [
            'match',
            ['get', 'poi_type'],
            ['camp_site', 'caravan_site'],
            5.5,
            4.2
          ],
          'circle-color': [
            'match',
            ['get', 'layer'],
            'stays_ext',
            '#f59e0b',
            '#c084fc'
          ],
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 1.3,
          'circle-opacity': 0.9
        }
      });
    }

    if (counterData && !map.getSource('netassign-counters')) {
      map.addSource('netassign-counters', {
        type: 'geojson',
        data: counterData
      });
      map.addLayer({
        id: 'netassign-counters',
        type: 'circle',
        source: 'netassign-counters',
        filter: ['==', ['get', 'mode'], mode],
        layout: {
          visibility: showCounters ? 'visible' : 'none'
        },
        paint: {
          'circle-radius': 5.5,
          'circle-color': '#38bdf8',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5
        }
      });
    }
    map.resize();
    map.triggerRepaint();
  }

  function selectPreset(presetId: string) {
    const preset = REGION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    activePresetId = preset.id;
    scope = preset.defaultScope;
    applyLayerStyles();
    if (map) {
      map.flyTo({ center: preset.center, zoom: preset.zoom, duration: 1100 });
    }
  }

  $effect(() => {
    mode;
    metric;
    scope;
    showTourismPois;
    showCounters;
    applyLayerStyles();
  });

  onMount(async () => {
    try {
      const [netResp, poiResp, cntResp] = await Promise.all([
        fetch('/data/netassign_south_london.geojson'),
        fetch('/data/netassign_tourism_pois.geojson'),
        fetch('/data/netassign_counters.geojson')
      ]);

      if (!netResp.ok) throw new Error(`Failed to load network flow data (${netResp.status})`);
      netData = await netResp.json();
      if (poiResp.ok) poiData = await poiResp.json();
      if (cntResp.ok) counterData = await cntResp.json();

      loading = false;
    } catch (e: any) {
      error = e.message || 'Unable to load netassign traffic model data';
      loading = false;
      return;
    }

    map = new maplibregl.Map({
      container: mapContainer,
      style: basemapStyles[basemap] || basemapStyles.light,
      center: [-0.01, 51.11],
      zoom: 9.4,
      hash: true
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');

    hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10
    });

    map.on('load', () => {
      addDataLayers();

      const interactiveLayers = ['netassign-gw-lines', 'netassign-bg-lines'];
      for (const lyr of interactiveLayers) {
        map!.on('mousemove', lyr, (e) => {
          if (!e.features || e.features.length === 0) return;
          map!.getCanvas().style.cursor = 'pointer';
          const p = e.features[0].properties;
          const isGw = p.is_greenway === true || p.is_greenway === 'true';
          const cycB = Number(p.cyc_b || 0).toFixed(0);
          const cycA = Number(p.cyc_a || 0).toFixed(0);
          const cycDelta = Number(p.cyc_delta || 0);
          const deltaStr = (cycDelta >= 0 ? '+' : '') + cycDelta.toFixed(0);
          const leisureB = Number(p.cyc_b_leisure_all || 0).toFixed(0);

          hoverPopup!
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: Inter, sans-serif; font-size: 12px; color: #f8fafc; background: rgba(15,23,42,0.96); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.3);">
                <div style="font-weight: 700; color: ${isGw ? '#38bdf8' : '#cbd5e1'}; margin-bottom: 3px;">
                  ${isGw ? '★ Greenway Spine: ' : ''}${p.section || p.road_name}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-bottom: 5px;">
                  ${p.classification || p.road_class} (${Number(p.length_km || 0).toFixed(2)} km)
                </div>
                <div><strong>Cycling (Greenway):</strong> ${cycB}/day <span style="color: ${cycDelta >= 0 ? '#34d399' : '#fb7185'};">(${deltaStr} vs Baseline ${cycA})</span></div>
                <div><strong>Leisure & Tourism Rides:</strong> ${leisureB}/day</div>
                <div><strong>Walking (Greenway):</strong> ${Number(p.walk_b || 0).toFixed(0)}/day</div>
              </div>
            `)
            .addTo(map!);
        });

        map!.on('mouseleave', lyr, () => {
          map!.getCanvas().style.cursor = '';
          hoverPopup?.remove();
        });

        map!.on('click', lyr, (e) => {
          if (!e.features || e.features.length === 0) return;
          selectedCounter = null;
          selectedLink = { ...e.features[0].properties };
        });
      }

      map!.on('mousemove', 'netassign-tourism-pois', (e) => {
        if (!e.features || e.features.length === 0) return;
        map!.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        hoverPopup!
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: Inter, sans-serif; font-size: 12px; color: #f8fafc; background: rgba(15,23,42,0.96); padding: 7px 10px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.4);">
              <div style="font-weight: 700; color: #fbbf24;">${p.name}</div>
              <div style="font-size: 11px; color: #cbd5e1;">OSM ${p.category}: <code>${p.poi_type}</code></div>
            </div>
          `)
          .addTo(map!);
      });

      map!.on('mouseleave', 'netassign-tourism-pois', () => {
        map!.getCanvas().style.cursor = '';
        hoverPopup?.remove();
      });

      map!.on('click', 'netassign-counters', (e) => {
        if (!e.features || e.features.length === 0) return;
        selectedLink = null;
        selectedCounter = { ...e.features[0].properties };
      });
    });
  });

  onDestroy(() => {
    map?.remove();
  });
</script>

<div class="netassign-layout">
  {#if loading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading Phase 4 All-Purpose Traffic Model (`/netassign`)...</p>
    </div>
  {:else if error}
    <div class="error-overlay">
      <h3>Traffic Model Data Error</h3>
      <p>{error}</p>
    </div>
  {/if}

  <aside class="netassign-sidebar" class:collapsed={!sidebarOpen}>
    <div class="sidebar-scroll">
      <div class="panel-header">
        <div class="badge-row">
          <span class="badge-pill cyan">CSIS / NetAssign Phase 4</span>
          <span class="badge-pill emerald">152 Routing Legs</span>
        </div>
        <h2>All-Purpose Active Travel Demand & Induced Flow Model</h2>
        <p class="panel-subtitle">
          Comparing <strong>Scenario A (Baseline Network)</strong> vs. <strong>Scenario B (North–South Greenway High-LoS)</strong> across Commute, School, Utility, Leisure Loop Rides, and <strong>OSM Campsite & Heritage Tourism</strong> trips.
        </p>
      </div>

      <!-- Region Jump Presets -->
      <div class="control-group">
        <label class="group-label" for="region-preset-select">Focus Corridor / Region</label>
        <select
          id="region-preset-select"
          class="select-input"
          value={activePresetId}
          onchange={(e) => selectPreset((e.target as HTMLSelectElement).value)}
        >
          {#each REGION_PRESETS as preset}
            <option value={preset.id}>{preset.label}</option>
          {/each}
        </select>
      </div>

      <!-- Mode Toggle -->
      <div class="control-group">
        <span class="group-label">Travel Mode</span>
        <div class="segmented-row">
          <button
            class="seg-btn"
            class:active={mode === 'cycling'}
            onclick={() => (mode = 'cycling')}
          >
            Cycling (66 Legs)
          </button>
          <button
            class="seg-btn"
            class:active={mode === 'walking'}
            onclick={() => (mode = 'walking')}
          >
            Walking (86 Legs)
          </button>
        </div>
      </div>

      <!-- Metric Selector -->
      <div class="control-group">
        <label class="group-label" for="metric-select">Flow Scenario / Purpose Layer</label>
        <select
          id="metric-select"
          class="select-input"
          bind:value={metric}
        >
          <option value="greenway">Scenario B: Greenway High-LoS (All Purposes)</option>
          <option value="delta">Induced + Diverted Change (Scenario B − Scenario A)</option>
          <option value="leisure_tourism">Leisure Loop Rides & OSM Campsite/Tourism Flows</option>
          <option value="commute">Commuting Flows (Census 2021 OD)</option>
          <option value="edu_utility">Education, Shopping, Escort & Rail Station Access</option>
          <option value="baseline">Scenario A: Baseline Network (No Greenway)</option>
        </select>
      </div>

      <!-- Scope Selector -->
      <div class="control-group">
        <label class="group-label" for="scope-select">Network Display Scope</label>
        <select
          id="scope-select"
          class="select-input"
          bind:value={scope}
        >
          <option value="south_london_network">South of London Network + Greenway Spine</option>
          <option value="all_network">Full Corridor Spine + South of London Network</option>
          <option value="greenway_only">North–South Greenway Spine Only (805.6 km)</option>
        </select>
      </div>

      <!-- Temporal Ramp-Up Horizon (mshift Bass Diffusion) -->
      <div class="control-group">
        <div class="row-between">
          <span class="group-label">Uptake Horizon (mshift 3-Way Ramp-Up)</span>
          <button class="link-btn" onclick={() => (showAmatModal = true)}>
            AMAT BCR: 10.39
          </button>
        </div>
        <div class="segmented-row">
          {#each TEMPORAL_HORIZONS as h}
            <button
              class="seg-btn"
              class:active={horizonId === h.id}
              onclick={() => (horizonId = h.id)}
              title={h.label}
            >
              {h.id === 'm3' ? '3m' : h.id.replace('yr', 'Yr ')}
            </button>
          {/each}
        </div>
      </div>

      <!-- Overlays -->
      <div class="control-group">
        <span class="group-label">Trip Generators & Validation Overlays</span>
        <label class="check-row">
          <input type="checkbox" bind:checked={showTourismPois} />
          <span class="dot amber"></span>
          <span>OSM Campsites, Caravan Sites & Tourism Attractors (884)</span>
        </label>
        <label class="check-row">
          <input type="checkbox" bind:checked={showCounters} />
          <span class="dot sky"></span>
          <span>Observed Calibration Counter Sites (8,658 corridor-wide)</span>
        </label>
      </div>

      <!-- Colour Legend -->
      <div class="control-group">
        <span class="group-label">
          {metric === 'delta'
            ? 'Daily Flow Change (Scenario B − Scenario A, trips/day)'
            : 'Estimated Daily Flow (trips/day, annualised average)'}
        </span>
        {#if metric === 'delta'}
          <div class="legend-scale">
            <span class="swatch" style="background:#f43f5e">-50+</span>
            <span class="swatch" style="background:#64748b">0</span>
            <span class="swatch" style="background:#38bdf8">+10</span>
            <span class="swatch" style="background:#10b981">+80</span>
            <span class="swatch" style="background:#a3e635">+200</span>
            <span class="swatch" style="background:#facc15">+500</span>
          </div>
        {:else}
          <div class="legend-scale">
            <span class="swatch" style="background:#334155">&lt;10</span>
            <span class="swatch" style="background:#0ea5e9">50</span>
            <span class="swatch" style="background:#10b981">120</span>
            <span class="swatch" style="background:#84cc16">250</span>
            <span class="swatch" style="background:#facc15">500</span>
            <span class="swatch" style="background:#ef4444">1,500+</span>
          </div>
        {/if}
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-title">Greenway Spine Cycling</span>
          <div class="kpi-val">86.7 → 132.3 <small>/day</small></div>
          <span class="kpi-delta pos">+52.5% (+36,701 pkm/day)</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-title">Greenway Spine Walking</span>
          <div class="kpi-val">240.6 → 288.3 <small>/day</small></div>
          <span class="kpi-delta pos">+19.8% (+38,461 pkm/day)</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-title">Avenue Verte: Knole & Mote</span>
          <div class="kpi-val">8.6 → 54.2 <small>cyc/day</small></div>
          <span class="kpi-delta pos">+530% (42.5/day leisure+camp)</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-title">Cuckmere & Coast Path</span>
          <div class="kpi-val">20.5 → 42.7 <small>cyc/day</small></div>
          <span class="kpi-delta pos">+108% (22.9/day leisure+camp)</span>
        </div>
      </div>

      <!-- Section Summary Table -->
      <div class="control-group">
        <div class="row-between">
          <span class="group-label">Corridor Section Demand Summary (Cycling/day)</span>
          <button class="link-btn" onclick={() => (showModelFitModal = true)}>
            Auto-Research Fit (r = 0.85)
          </button>
        </div>
        <div class="mini-table-wrap">
          <table class="mini-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Base</th>
                <th>Grnwy</th>
                <th>Leis/Camp</th>
              </tr>
            </thead>
            <tbody>
              {#each SECTION_HIGHLIGHTS as row}
                <tr>
                  <td>{row.section}</td>
                  <td>{row.cycA.toFixed(1)}</td>
                  <td class="bold-cyan">{row.cycB.toFixed(1)}</td>
                  <td class="bold-emerald">{row.cycLeisureB.toFixed(1)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </aside>

  <div class="map-stage">
    <div bind:this={mapContainer} class="map-canvas"></div>

    {#if selectedLink}
      <div class="inspector-card">
        <div class="inspector-header">
          <div>
            <span class="inspector-badge" class:gw={selectedLink.is_greenway}>
              {selectedLink.is_greenway ? 'Greenway Spine Link' : 'Parallel Background Network'}
            </span>
            <h3>{selectedLink.section || selectedLink.road_name}</h3>
            <p class="inspector-sub">
              {selectedLink.classification} • {Number(selectedLink.length_km || 0).toFixed(2)} km • ID: <code>{selectedLink.gw_id || selectedLink.link_id}</code>
            </p>
          </div>
          <button class="close-btn" onclick={() => (selectedLink = null)} aria-label="Close inspector">×</button>
        </div>

        <div class="scenario-compare">
          <div class="scen-box">
            <span class="scen-label">Scenario A (Baseline)</span>
            <strong>{Number(selectedLink.cyc_a || 0).toFixed(1)} cyc/day</strong>
            <small>{Number(selectedLink.walk_a || 0).toFixed(1)} walk/day</small>
          </div>
          <div class="scen-box highlight">
            <span class="scen-label">Scenario B (Greenway High-LoS)</span>
            <strong>{Number(selectedLink.cyc_b || 0).toFixed(1)} cyc/day</strong>
            <small>{Number(selectedLink.walk_b || 0).toFixed(1)} walk/day</small>
          </div>
          <div class="scen-box">
            <span class="scen-label">Net Change (B − A)</span>
            <strong class:pos={Number(selectedLink.cyc_delta) >= 0} class:neg={Number(selectedLink.cyc_delta) < 0}>
              {(Number(selectedLink.cyc_delta) >= 0 ? '+' : '') + Number(selectedLink.cyc_delta || 0).toFixed(1)} cyc/day
            </strong>
            <small>
              {(Number(selectedLink.walk_delta) >= 0 ? '+' : '') + Number(selectedLink.walk_delta || 0).toFixed(1)} walk/day
            </small>
          </div>
        </div>

        <div class="purpose-breakdown">
          <h4>Scenario B Cycling Breakdown by Trip Purpose</h4>
          <div class="purpose-rows">
            <div class="p-row">
              <span>Commuting (Census OD)</span>
              <strong>{Number(selectedLink.cyc_b_commute || 0).toFixed(1)} /day</strong>
            </div>
            <div class="p-row">
              <span>Primary, Secondary & Higher Education</span>
              <strong>{Number(selectedLink.cyc_b_edu || 0).toFixed(1)} /day</strong>
            </div>
            <div class="p-row">
              <span>Shopping, Escort, Personal & Rail Station Access</span>
              <strong>{Number(selectedLink.cyc_b_utility || 0).toFixed(1)} /day</strong>
            </div>
            <div class="p-row">
              <span>Recreational & Trail Loop Rides</span>
              <strong class="emerald">{Number(selectedLink.cyc_b_leisure || 0).toFixed(1)} /day</strong>
            </div>
            <div class="p-row">
              <span>OSM Campsites, Tourist Stays & Heritage Attractors</span>
              <strong class="amber">{Number(selectedLink.cyc_b_tourism || 0).toFixed(1)} /day</strong>
            </div>
          </div>
        </div>

        {#if Number(selectedLink.cyc_delta || 0) > 0}
          {@const dec = decomposeLinkDelta(selectedLink)}
          <div class="purpose-breakdown" style="margin-top: 10px;">
            <h4>3-Way Demand Decomposition ({currentHorizon().label})</h4>
            <div class="purpose-rows">
              <div class="p-row">
                <span>1. Route Reassignment (Ambience 0.5× Only)</span>
                <strong>+{dec.route.toFixed(1)} /day</strong>
              </div>
              <div class="p-row">
                <span>2. Mode Shift (Car, Bus, Rail & Walk)</span>
                <strong class="emerald">+{dec.shift.toFixed(1)} /day</strong>
              </div>
              <div class="p-row">
                <span>3. Newly Induced Trips (Latent & Leisure)</span>
                <strong class="amber">+{dec.induced.toFixed(1)} /day</strong>
              </div>
              <div class="p-row">
                <span>Car-Driver Trips Removed (Decongestion)</span>
                <strong>−{dec.fromCar.toFixed(1)} car/day</strong>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if selectedCounter}
      <div class="inspector-card">
        <div class="inspector-header">
          <div>
            <span class="inspector-badge gw">Validation Counter Site ({selectedCounter.mode})</span>
            <h3>{selectedCounter.site_id} ({selectedCounter.source})</h3>
            <p class="inspector-sub">{selectedCounter.road_name || 'Matched Corridor Counter'}</p>
          </div>
          <button class="close-btn" onclick={() => (selectedCounter = null)} aria-label="Close counter inspector">×</button>
        </div>
        <div class="scenario-compare">
          <div class="scen-box">
            <span class="scen-label">Observed AADT</span>
            <strong>{Number(selectedCounter.observed_daily || 0).toFixed(1)} /day</strong>
          </div>
          <div class="scen-box highlight">
            <span class="scen-label">Modelled (Baseline M6)</span>
            <strong>{Number(selectedCounter.modelled_baseline || 0).toFixed(1)} /day</strong>
          </div>
          <div class="scen-box">
            <span class="scen-label">Modelled (Greenway B)</span>
            <strong>{Number(selectedCounter.modelled_greenway || 0).toFixed(1)} /day</strong>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if showModelFitModal}
    <div class="modal-backdrop" role="presentation" onclick={() => (showModelFitModal = false)}>
      <div class="modal-box" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (showModelFitModal = false)}>
        <div class="inspector-header">
          <div>
            <span class="badge-pill cyan">Overnight Auto-Research Calibration Loop</span>
            <h3>Counter Validation Across 8,658 Sites (7,219 Cycling, 1,439 Walking)</h3>
          </div>
          <button class="close-btn" onclick={() => (showModelFitModal = false)}>×</button>
        </div>
        <p class="modal-desc">
          Adding non-commute utility, school, recreational trail loop rides, and <strong>OSM campsite/tourism legs</strong> (`M1 → M6`) increased cycling log10 correlation from <strong>0.7845</strong> (Commute-Only) to <strong>0.8482</strong> ($R^2 = 0.6757$, 56.2% within 2× of observed counts; off-road cycleway $r = 0.8283$) and walking correlation from <strong>0.6216</strong> to <strong>0.7334</strong> (66.8% within 2×).
        </p>
        <table class="mini-table modal-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Model Specification</th>
              <th>Cyc log10 r</th>
              <th>Cyc log10 R²</th>
              <th>Cyc Within 2×</th>
              <th>Off-Road r</th>
              <th>South Lon r</th>
              <th>Walk log10 r</th>
            </tr>
          </thead>
          <tbody>
            {#each AUTORESEARCH_EXPERIMENTS as exp}
              <tr class:highlight-row={exp.id === 'M6'}>
                <td><strong>{exp.id}</strong></td>
                <td>{exp.name}</td>
                <td>{exp.cycR.toFixed(4)}</td>
                <td>{exp.cycR2.toFixed(4)}</td>
                <td>{exp.cycW2x.toFixed(1)}%</td>
                <td>{exp.cycInfraR.toFixed(4)}</td>
                <td>{exp.cycSouthR.toFixed(4)}</td>
                <td>{exp.walkR.toFixed(4)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if showAmatModal}
    <div class="modal-backdrop" role="presentation" onclick={() => (showAmatModal = false)}>
      <div class="modal-box" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (showAmatModal = false)}>
        <div class="inspector-header">
          <div>
            <span class="badge-pill emerald">mshift × AMAT TAG A5.1 Economic Appraisal</span>
            <h3>3-Way Demand Decomposition & Bayesian Benefit–Cost Appraisal (2025 GBP, 30-Yr)</h3>
          </div>
          <button class="close-btn" onclick={() => (showAmatModal = false)}>×</button>
        </div>
        <p class="modal-desc">
          Using <code>mshift</code> 3-way decomposition across the 805.6 km Greenway spine (+37,156 cyc-pkm/day = <strong>35.1% Route Diversion</strong> + <strong>41.4% Mode Shift</strong> + <strong>23.5% Induced Demand</strong>), pure route reassignment receives 0.5× Rule-of-a-Half Journey Ambience only, preventing a <strong>+28.9% (£72.1m)</strong> health & mortality overestimate. Bayesian 90% credible interval (N = 4,000 draws): <strong>PVB = £1,179.5m [£1,030.2m, £1,379.5m]</strong>, <strong>PVC = £113.5m</strong>, <strong>BCR = 10.39 [9.07, 12.15]</strong> (100% P(BCR &gt; 4.0)).
        </p>
        <table class="mini-table modal-table">
          <thead>
            <tr>
              <th>Pkg</th>
              <th>Network Package Specification</th>
              <th>Multiplier Ω</th>
              <th>Spine pkm/day</th>
              <th>New Trips/day</th>
              <th>PVB (£m)</th>
              <th>PVC (£m)</th>
              <th>BCR</th>
            </tr>
          </thead>
          <tbody>
            {#each AMAT_PACKAGES as pkg}
              <tr class:highlight-row={pkg.id === 'P2' || pkg.id === 'P4'}>
                <td><strong>{pkg.id}</strong></td>
                <td>{pkg.name}</td>
                <td>{pkg.omega.toFixed(3)}</td>
                <td>{pkg.pkmB2.toLocaleString()}</td>
                <td>+{pkg.newTrips.toLocaleString()}</td>
                <td>£{pkg.pvbM.toFixed(1)}m</td>
                <td>£{pkg.pvcM.toFixed(1)}m</td>
                <td><strong>{pkg.bcr.toFixed(2)}</strong></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .netassign-layout {
    display: flex;
    width: 100%;
    height: calc(100vh - 56px);
    position: relative;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .netassign-sidebar {
    width: 390px;
    min-width: 390px;
    height: 100%;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    box-shadow: 2px 0 12px rgba(15, 23, 42, 0.04);
    z-index: 20;
    display: flex;
    flex-direction: column;
    transition: margin-left 0.25s ease;
  }

  .netassign-sidebar.collapsed {
    margin-left: -390px;
  }

  .sidebar-scroll {
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .panel-header h2 {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 6px 0 4px;
    line-height: 1.3;
  }

  .panel-subtitle {
    font-size: 11.5px;
    color: var(--text-secondary);
    line-height: 1.45;
    margin: 0;
  }

  .badge-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge-pill {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 999px;
    letter-spacing: 0.04em;
  }

  .badge-pill.cyan {
    background: #eff6ff;
    color: var(--accent-civic);
    border: 1px solid #bfdbfe;
  }

  .badge-pill.emerald {
    background: #ecfdf5;
    color: var(--accent-emerald);
    border: 1px solid #a7f3d0;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .select-input {
    width: 100%;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 7px 10px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .select-input:focus {
    border-color: var(--accent-civic);
  }

  .segmented-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .seg-btn {
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .seg-btn:hover {
    background: var(--bg-secondary);
  }

  .seg-btn.active {
    background: #eff6ff;
    color: var(--accent-civic);
    border-color: var(--accent-civic);
  }

  .check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot.amber { background: var(--accent-amber); }
  .dot.sky { background: var(--accent-civic); }

  .legend-scale {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
  }

  .swatch {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    padding: 3px 2px;
    border-radius: 4px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .kpi-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kpi-title {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .kpi-val {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .kpi-delta.pos {
    font-size: 10.5px;
    color: var(--accent-emerald);
    font-weight: 600;
  }

  .row-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent-civic);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
  }

  .link-btn:hover {
    color: var(--accent-civic-hover);
  }

  .mini-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .mini-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    color: var(--text-primary);
  }

  .mini-table th,
  .mini-table td {
    padding: 5px 7px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .mini-table th {
    background: var(--bg-secondary);
    color: var(--text-muted);
    font-weight: 600;
  }

  .bold-cyan {
    font-weight: 700;
    color: var(--accent-civic);
  }

  .bold-emerald {
    font-weight: 700;
    color: var(--accent-emerald);
  }

  .map-stage {
    flex: 1;
    position: relative;
    height: 100%;
  }

  .map-canvas {
    width: 100%;
    height: 100%;
  }

  .inspector-card {
    position: absolute;
    bottom: 24px;
    right: 24px;
    width: 380px;
    max-width: calc(100vw - 48px);
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    z-index: 25;
    box-shadow: var(--shadow-panel);
  }

  .inspector-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }

  .inspector-header h3 {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 4px 0 2px;
  }

  .inspector-sub {
    font-size: 11px;
    color: var(--text-secondary);
    margin: 0;
  }

  .inspector-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .inspector-badge.gw {
    background: #eff6ff;
    color: var(--accent-civic);
    border: 1px solid #bfdbfe;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .scenario-compare {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 12px;
  }

  .scen-box {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 7px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .scen-box.highlight {
    border-color: #bfdbfe;
    background: #eff6ff;
  }

  .scen-label {
    font-size: 10px;
    color: var(--text-muted);
  }

  .scen-box strong {
    font-size: 13px;
    color: var(--text-primary);
  }

  .scen-box strong.pos {
    color: var(--accent-emerald);
  }

  .scen-box strong.neg {
    color: var(--accent-rose);
  }

  .scen-box small {
    font-size: 10.5px;
    color: var(--text-secondary);
  }

  .purpose-breakdown {
    margin-top: 12px;
    border-top: 1px solid var(--border-color);
    padding-top: 10px;
  }

  .purpose-breakdown h4 {
    font-size: 11px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 6px;
  }

  .purpose-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11.5px;
  }

  .p-row {
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
  }

  .p-row strong.emerald {
    color: var(--accent-emerald);
  }

  .p-row strong.amber {
    color: var(--accent-amber);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(8px);
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-box {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px;
    max-width: 820px;
    width: 100%;
    box-shadow: var(--shadow-panel);
    color: var(--text-primary);
  }

  .modal-desc {
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 10px 0 14px;
  }

  .modal-table {
    font-size: 12px;
  }

  .highlight-row {
    background: #ecfdf5;
    font-weight: 600;
  }
</style>
