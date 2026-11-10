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
  folder?: string;
  status?: string;
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
  version?: string;
  generated_at?: string;
  metadata?: {
    version?: string;
    generated_at?: string;
    release_url?: string;
  };
  features: CyclewayFeature[];
}

export interface FilterState {
  developer: string;
  category: string;
  classification: string;
  section: string;
  status: string;
  searchTerm: string;
  colorBy: 'category' | 'classification' | 'infrastructure_type_detailed' | 'detailed_classification' | 'developer' | 'status' | 'kml';
  hiddenLegendItems: string[];
  /** Show superseded alignments (only offered when colouring by status). */
  showSuperseded: boolean;
  /** Show pending alignments north of Crewe (only offered when colouring by status). */
  showPending: boolean;
}

export interface CyclewayStats {
  totalKm: number;
  totalSegments: number;
  /** Km per colour group of the active colour scheme, in legend order. */
  composition: { label: string; color: string; km: number }[];
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
  GlobalID?: string;
  SegmentID?: number;
}

export interface OpenRoadsProperties {
  id?: string;
  road_classification?: string;
  road_function?: string;
  possible_haulage_basis?: string;
  form_of_way?: string;
  road_classification_number?: string;
  name_1?: string;
  length?: number;
}
