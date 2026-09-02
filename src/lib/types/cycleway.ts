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
