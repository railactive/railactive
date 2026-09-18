export interface CyclewaySegmentProperties {
  id: number;
  name: string;
  link_id?: string;
  section?: string;
  category?: string;
  classification?: string;
  developer?: string;
  setting?: string;
  length_km?: number;
  color?: string;
  remarks?: string;
  layer_type?: string;
}

export interface CyclewayFeature {
  type: 'Feature';
  properties: CyclewaySegmentProperties;
  geometry: {
    type: 'LineString' | 'MultiLineString' | 'Point';
    coordinates: any;
  };
}

export interface CyclewayFeatureCollection {
  type: 'FeatureCollection';
  features: CyclewayFeature[];
}

export interface FilterState {
  developer: string;
  category: string;
  classification: string;
  section: string;
  searchTerm: string;
  colorBy: 'category' | 'classification' | 'developer' | 'kml';
  hiddenLegendItems: string[];
}

export interface CyclewayStats {
  totalKm: number;
  totalSegments: number;
  hs2Km: number;
  greenwayKm: number;
  categoryCounts: Record<string, { count: number; km: number }>;
  developerCounts: Record<string, { count: number; km: number }>;
  classificationCounts: Record<string, { count: number; km: number }>;
}

export interface NcnProperties {
  FID?: number;
  Desc_?: string;
  Greenway?: string;
  RouteType?: string;
  RouteNo?: number | string;
  LinkNo?: number;
  RouteCat?: string;
  OpenStatus?: string;
  Surface?: string;
  Quality?: string;
  Lighting?: string;
  RoadClass?: string;
  Shape__Length?: number;
  GlobalID?: string;
  SegmentID?: number;
}

