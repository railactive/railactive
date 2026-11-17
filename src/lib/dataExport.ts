import type { ColorBy } from './palette';
import {
  formatStatusLabel,
  groupFor,
  INTERVENTION_COLOR,
  INTERVENTION_LEGACY_COLOR,
  isLegacyIntervention,
  isPending,
  isSuperseded,
  normalizeClassification,
  PENDING_COLOR
} from './palette';
import type { CyclewayFeature, CyclewaySegmentProperties } from './types/cycleway';

export interface ExportOptions {
  includeDevFields?: boolean;
  colorBy?: ColorBy;
  filenameBase?: string;
}

function normalizedStatus(props: CyclewaySegmentProperties): string {
  if (isPending(props)) return 'Pending';
  if (isSuperseded(props)) return 'Superseded';
  const raw = props.status || 'preferred';
  const formatted = formatStatusLabel(raw);
  return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : 'Preferred';
}

function cleanText(value?: string): string {
  if (!value) return '';
  return value
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .trim();
}

export function sanitizeRouteProperties(
  props: CyclewaySegmentProperties,
  includeDevFields = false
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    link_id: props.link_id || String(props.id),
    name: cleanText(props.name),
    section: cleanText(props.section),
    status: normalizedStatus(props),
    delivery_category: normalizeClassification(props.classification) || groupFor('classification', props).label,
    infrastructure_type: cleanText(props.category) || groupFor('category', props).label,
    developer: groupFor('developer', props).label,
    setting: cleanText(props.setting) || 'Rural',
    length_km: typeof props.length_km === 'number' ? Number(props.length_km.toFixed(3)) : null,
    corridor_section: cleanText(props.folder),
    remarks: cleanText(props.remarks)
  };

  if (includeDevFields) {
    base.raw_classification = cleanText(props.classification);
    base.raw_category = cleanText(props.category);
    base.osm_infrastructure = cleanText(props.osm_infrastructure);
    base.osm_highway = cleanText(props.osm_highway);
    base.osm_surface = cleanText(props.osm_surface);
  }

  return base;
}

export function sanitizePointProperties(
  props: CyclewaySegmentProperties,
  includeDevFields = false
): Record<string, unknown> {
  const statusLabel = isPending(props)
    ? 'Pending'
    : isLegacyIntervention(props)
      ? 'Superseded / legacy'
      : 'Active route';

  const base: Record<string, unknown> = {
    point_id: props.link_id || String(props.id),
    name: cleanText(props.name) || 'Point intervention',
    status: statusLabel,
    infrastructure_type: cleanText(props.category || props.classification) || 'Active Route Treatment',
    corridor_section: cleanText(props.folder ? props.folder.replace(' - Interventions', '') : ''),
    dist_to_route_m: typeof props.dist_to_route_m === 'number' ? props.dist_to_route_m : null,
    remarks: cleanText(props.remarks)
  };

  if (includeDevFields) {
    base.section = cleanText(props.section);
    base.developer = cleanText(props.developer);
    base.location_precision = cleanText(props.location_precision);
    base.geocoded_from_id = Boolean(props.geocoded_from_id);
  }

  return base;
}

function triggerBlobDownload(content: BlobPart, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportGeoJson(
  routes: CyclewayFeature[],
  points: CyclewayFeature[],
  options: ExportOptions = {}
): void {
  const { includeDevFields = false, filenameBase = 'north-south-greenway' } = options;

  const features = [
    ...routes.map(f => ({
      type: 'Feature' as const,
      properties: {
        feature_type: 'route',
        ...sanitizeRouteProperties(f.properties, includeDevFields)
      },
      geometry: f.geometry
    })),
    ...points.map(f => ({
      type: 'Feature' as const,
      properties: {
        feature_type: 'point_intervention',
        ...sanitizePointProperties(f.properties, includeDevFields)
      },
      geometry: f.geometry
    }))
  ];

  const collection = {
    type: 'FeatureCollection',
    name: 'North-South Greenway',
    generated_at: new Date().toISOString(),
    features
  };

  triggerBlobDownload(
    JSON.stringify(collection, null, 2),
    'application/geo+json;charset=utf-8',
    `${filenameBase}.geojson`
  );
}

function endpointCoords(feature: CyclewayFeature): {
  startLon: number | null;
  startLat: number | null;
  endLon: number | null;
  endLat: number | null;
} {
  const g = feature.geometry;
  if (g.type === 'Point' && Array.isArray(g.coordinates)) {
    return {
      startLon: Number(Number(g.coordinates[0]).toFixed(6)),
      startLat: Number(Number(g.coordinates[1]).toFixed(6)),
      endLon: null,
      endLat: null
    };
  }
  if (g.type === 'LineString' && Array.isArray(g.coordinates) && g.coordinates.length > 0) {
    const first = g.coordinates[0];
    const last = g.coordinates[g.coordinates.length - 1];
    return {
      startLon: Number(Number(first[0]).toFixed(6)),
      startLat: Number(Number(first[1]).toFixed(6)),
      endLon: Number(Number(last[0]).toFixed(6)),
      endLat: Number(Number(last[1]).toFixed(6))
    };
  }
  if (g.type === 'MultiLineString' && Array.isArray(g.coordinates) && g.coordinates.length > 0) {
    const firstLine = g.coordinates[0];
    const lastLine = g.coordinates[g.coordinates.length - 1];
    const first = firstLine?.[0];
    const last = lastLine?.[lastLine.length - 1];
    return {
      startLon: first ? Number(Number(first[0]).toFixed(6)) : null,
      startLat: first ? Number(Number(first[1]).toFixed(6)) : null,
      endLon: last ? Number(Number(last[0]).toFixed(6)) : null,
      endLat: last ? Number(Number(last[1]).toFixed(6)) : null
    };
  }
  return { startLon: null, startLat: null, endLon: null, endLat: null };
}

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCsv(
  routes: CyclewayFeature[],
  points: CyclewayFeature[],
  options: ExportOptions = {}
): void {
  const { includeDevFields = false, filenameBase = 'north-south-greenway' } = options;

  const baseCols = [
    'feature_type',
    'id',
    'name',
    'section',
    'status',
    'delivery_category',
    'infrastructure_type',
    'developer',
    'setting',
    'length_km',
    'corridor_section',
    'dist_to_route_m',
    'start_lon',
    'start_lat',
    'end_lon',
    'end_lat',
    'remarks'
  ];

  const devCols = includeDevFields
    ? ['osm_infrastructure', 'osm_highway', 'osm_surface', 'location_precision', 'geocoded_from_id']
    : [];

  const cols = [...baseCols, ...devCols];
  const lines: string[] = [cols.join(',')];

  for (const f of routes) {
    const p = sanitizeRouteProperties(f.properties, includeDevFields);
    const ends = endpointCoords(f);
    const row: Record<string, unknown> = {
      feature_type: 'route',
      id: p.link_id,
      name: p.name,
      section: p.section,
      status: p.status,
      delivery_category: p.delivery_category,
      infrastructure_type: p.infrastructure_type,
      developer: p.developer,
      setting: p.setting,
      length_km: p.length_km,
      corridor_section: p.corridor_section,
      dist_to_route_m: '',
      start_lon: ends.startLon,
      start_lat: ends.startLat,
      end_lon: ends.endLon,
      end_lat: ends.endLat,
      remarks: p.remarks,
      osm_infrastructure: p.osm_infrastructure,
      osm_highway: p.osm_highway,
      osm_surface: p.osm_surface,
      location_precision: '',
      geocoded_from_id: ''
    };
    lines.push(cols.map(c => csvCell(row[c])).join(','));
  }

  for (const f of points) {
    const p = sanitizePointProperties(f.properties, includeDevFields);
    const ends = endpointCoords(f);
    const row: Record<string, unknown> = {
      feature_type: 'point_intervention',
      id: p.point_id,
      name: p.name,
      section: p.section ?? '',
      status: p.status,
      delivery_category: '',
      infrastructure_type: p.infrastructure_type,
      developer: p.developer ?? '',
      setting: '',
      length_km: '',
      corridor_section: p.corridor_section,
      dist_to_route_m: p.dist_to_route_m,
      start_lon: ends.startLon,
      start_lat: ends.startLat,
      end_lon: '',
      end_lat: '',
      remarks: p.remarks,
      osm_infrastructure: '',
      osm_highway: '',
      osm_surface: '',
      location_precision: p.location_precision ?? '',
      geocoded_from_id: p.geocoded_from_id ?? ''
    };
    lines.push(cols.map(c => csvCell(row[c])).join(','));
  }

  // Prepend UTF-8 BOM so Microsoft Excel on Windows renders symbols/accents properly
  triggerBlobDownload(`\uFEFF${lines.join('\r\n')}`, 'text/csv;charset=utf-8', `${filenameBase}.csv`);
}

function escapeXml(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert #RRGGBB CSS hex into KML's aabbggrr 8-digit hex string. */
function hexToKmlColor(hex: string, alpha = 'ff'): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return `${alpha}745547`;
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `${alpha}${b}${g}${r}`.toLowerCase();
}

function kmlExtendedData(props: Record<string, unknown>): string {
  const entries = Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<Data name="${escapeXml(k)}"><value>${escapeXml(v)}</value></Data>`)
    .join('');
  return entries ? `<ExtendedData>${entries}</ExtendedData>` : '';
}

function kmlGeometry(feature: CyclewayFeature): string {
  const g = feature.geometry;
  if (g.type === 'Point' && Array.isArray(g.coordinates)) {
    return `<Point><coordinates>${g.coordinates[0]},${g.coordinates[1]},0</coordinates></Point>`;
  }
  if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
    const coords = g.coordinates.map((c: number[]) => `${c[0]},${c[1]},0`).join(' ');
    return `<LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString>`;
  }
  if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
    const parts = g.coordinates
      .map((line: number[][]) => {
        const coords = line.map(c => `${c[0]},${c[1]},0`).join(' ');
        return `<LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString>`;
      })
      .join('');
    return `<MultiGeometry>${parts}</MultiGeometry>`;
  }
  return '';
}

export function exportKml(
  routes: CyclewayFeature[],
  points: CyclewayFeature[],
  options: ExportOptions = {}
): void {
  const {
    includeDevFields = false,
    colorBy = 'classification',
    filenameBase = 'north-south-greenway'
  } = options;

  const styleColors = new Map<string, string>();
  const styleIdForHex = (hex: string) => {
    const id = `line-${hex.replace('#', '').toLowerCase()}`;
    styleColors.set(id, hex);
    return id;
  };

  const routePlacemarks = routes.map(f => {
    const p = sanitizeRouteProperties(f.properties, includeDevFields);
    const hex = colorBy === 'kml' && f.properties.color
      ? f.properties.color
      : groupFor(colorBy, f.properties).color;
    const sid = styleIdForHex(hex);
    const title = String(p.name || p.link_id || 'Route segment');
    return `<Placemark><name>${escapeXml(title)}</name><styleUrl>#${sid}</styleUrl>${kmlExtendedData(p)}${kmlGeometry(f)}</Placemark>`;
  });

  const pointPlacemarks = points.map(f => {
    const p = sanitizePointProperties(f.properties, includeDevFields);
    const ptHex = isPending(f.properties)
      ? PENDING_COLOR
      : isLegacyIntervention(f.properties)
        ? INTERVENTION_LEGACY_COLOR
        : INTERVENTION_COLOR;
    const ptStyleId = `pt-${ptHex.replace('#', '').toLowerCase()}`;
    styleColors.set(ptStyleId, ptHex);
    const title = String(p.name || p.point_id || 'Point intervention');
    return `<Placemark><name>${escapeXml(title)}</name><styleUrl>#${ptStyleId}</styleUrl>${kmlExtendedData(p)}${kmlGeometry(f)}</Placemark>`;
  });

  const styleDefs = Array.from(styleColors.entries())
    .map(([id, hex]) => {
      if (id.startsWith('pt-')) {
        return `<Style id="${id}"><IconStyle><color>${hexToKmlColor(hex)}</color><scale>0.9</scale></IconStyle></Style>`;
      }
      return `<Style id="${id}"><LineStyle><color>${hexToKmlColor(hex)}</color><width>4</width></LineStyle></Style>`;
    })
    .join('');

  const kml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '<Document>',
    '<name>North-South Greenway</name>',
    styleDefs,
    `<Folder><name>Routes (${routes.length})</name>${routePlacemarks.join('')}</Folder>`,
    points.length > 0
      ? `<Folder><name>Point interventions (${points.length})</name>${pointPlacemarks.join('')}</Folder>`
      : '',
    '</Document>',
    '</kml>'
  ].join('\n');

  triggerBlobDownload(
    kml,
    'application/vnd.google-earth.kml+xml;charset=utf-8',
    `${filenameBase}.kml`
  );
}

export function downloadCleanGeoPackage(): void {
  const a = document.createElement('a');
  a.href = './data/north_south_greenway_clean.gpkg';
  a.download = 'north-south-greenway.gpkg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
