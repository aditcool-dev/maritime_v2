export interface CandidateVessel {
  rank: number;
  MMSI: string;
  name: string;
  imo: string;
  callsign: string;
  type_label: string;
  length_m: number | string;
  composite_score: number;
  score_proximity: number;
  score_heading: number;
  score_temporal: number;
  score_ais_continuity: number;
  score_proximity_raw?: number;
  origin_confidence?: number;
  matched_age_h: number;
  matched_origin_time_utc: string;
  matched_origin_lat: number;
  matched_origin_lon: number;
  matched_origin_r_unc_m: number;
  dist_at_origin_time_m: number;
  within_origin_uncertainty: boolean;
  dist_nearest_approach_m: number;
  dt_nearest_approach_s: number;
  approach_time_utc: string;
  approach_lat: number;
  approach_lon: number;
  sog_at_approach_kn: number;
  cog_at_approach_deg: number;
  heading_axis_delta_deg: number;
  crossed_slick_polygon: boolean;
  present_within_2km_before_origin: boolean;
  first_arrival_within_2km_utc: string;
  arrival_offset_from_origin_s: number | string;
  position_interpolated_across_gap: boolean;
  ais_gap_len_s: number | string;
  ais_gap_mid_offset_s: number | string;
  n_fixes: number;
  t_first: string;
  t_last: string;
}

export interface BacktrackLocusPoint {
  age_h: number;
  origin_time_utc: string;
  origin_lat: number;
  origin_lon: number;
  origin_x_m: number;
  origin_y_m: number;
  backtrack_distance_m: number;
  drift_toward_deg: number;
  drift_speed_ms: number;
  uncertainty_radius_m: number;
  n_current_samples: number;
  n_wind_samples: number;
}

export interface BacktrackData {
  case_id: string;
  observation_time_utc: string;
  slick_centroid_lat: number;
  slick_centroid_lon: number;
  method: string;
  wind_drift_factor: number;
  uncertainty_model: string;
  locus: BacktrackLocusPoint[];
}

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: Record<string, unknown>;
}

export interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

export interface CaseReport {
  case: {
    case_id: string;
    name: string;
    observation_time_utc: string;
    ais_window_hours: number;
    bbox: {
      lat_min: number;
      lat_max: number;
      lon_min: number;
      lon_max: number;
    };
    metric_epsg: number;
    wind_station: {
      id: string;
      name: string;
      lat: number;
      lon: number;
    };
    current_station: {
      id: string;
      name: string;
      lat: number;
      lon: number;
      bin: number;
      bin_depth_m: number;
    };
  };
  scene: {
    case_id: string;
    observation_time_utc: string;
    centroid_lat: number;
    centroid_lon: number;
    centroid_x_m: number;
    centroid_y_m: number;
    area_km2: number;
    perimeter_km: number;
    bounds_lonlat: [number, number, number, number];
    elongation: {
      axis_azimuth_deg: number;
      aspect_ratio: number;
      method: string;
      n_grid_points: number;
      crosscheck_mrr_azimuth_deg: number;
      crosscheck_mrr_aspect_ratio: number;
    };
    polygon_source: string;
    polygon_is_remote_sensing_observation: boolean;
    provenance: string;
  };
  environment: {
    wind_station: {
      id: string;
      name: string;
      lat: number;
      lon: number;
    };
    current_station: {
      id: string;
      name: string;
      lat: number;
      lon: number;
      bin: number;
      bin_depth_m: number;
    };
    wind: {
      source: string;
      n_samples: number;
      time_first_utc: string;
      time_last_utc: string;
      mean_scalar_speed_ms: number;
      max_scalar_speed_ms: number;
      vector_mean_speed_ms: number;
      vector_mean_toward_deg: number;
    };
    current: {
      source: string;
      n_samples: number;
      time_first_utc: string;
      time_last_utc: string;
      mean_scalar_speed_ms: number;
      max_scalar_speed_ms: number;
      vector_mean_speed_ms: number;
      vector_mean_toward_deg: number;
    };
    limitation: string;
  };
  backtrack: {
    method: string;
    uncertainty_model: string;
    n_candidate_origins: number;
    age_range_h: [number, number];
  };
  scoring: {
    weights: {
      proximity: number;
      heading: number;
      temporal: number;
      ais_continuity: number;
    };
    scales: {
      proximity_efold_m: number;
      temporal_efold_s: number;
      ais_gap_threshold_s: number;
      ais_gap_time_window_s: number;
      ais_gap_range_m: number;
      candidate_cutoff_m: number;
    };
    wind_drift_factor: number;
    n_candidates_scored: number;
  };
  top_candidate: {
    MMSI: number | string;
    name: string;
    type: string;
    composite_score: number;
    sub_scores: {
      proximity: number;
      heading: number;
      temporal: number;
      ais_continuity: number;
    };
    weighted_contributions: {
      proximity: number;
      heading: number;
      temporal: number;
      ais_continuity: number;
    };
    matched_age_h: number;
    matched_origin_time_utc: string;
    dist_at_origin_time_m: number;
  };
  ranking_top10: Array<{
    rank: number;
    MMSI: number | string;
    name: string;
    type_label: string;
    composite_score: number;
    score_proximity: number;
    score_heading: number;
    score_temporal: number;
    score_ais_continuity: number;
    matched_age_h: number;
    dist_at_origin_time_m: number;
    first_arrival_within_2km_utc: string;
  }>;
  ground_truth_evaluation: {
    release: {
      time_utc: string;
      lat: number;
      lon: number;
      note: string;
      release_duration_min: number;
    };
    true_slick_age_h: number;
    backtrack_error_at_true_age_m: number;
    backtrack_best_error_m: number;
    backtrack_best_age_h: number;
    vessels: Record<string, {
      role: string;
      imo: string;
      result: {
        rank: number;
        name: string;
        composite_score: number;
        matched_age_h: number;
        dist_at_origin_time_m: number;
      };
    }>;
  };
  ablation_no_backtrack: {
    top8: Array<{
      rank: number;
      MMSI: number | string;
      name: string;
      composite_score: number;
      score_proximity: number;
    }>;
    ground_truth: Record<string, {
      rank: number;
      name: string;
      composite_score: number;
      matched_age_h: number;
      dist_at_origin_time_m: number;
    }>;
    max_proximity_top8: number;
  };
  sensitivity_no_heading: {
    weights: {
      proximity: number;
      temporal: number;
      ais_continuity: number;
    };
    top6: Array<{
      rank: number;
      MMSI: number | string;
      name: string;
      composite_score: number;
    }>;
    ground_truth_ranks: Record<string, {
      rank: number;
      name: string;
      composite_score: number;
      matched_age_h: number;
      dist_at_origin_time_m: number;
    }>;
    note: string;
  };
  caveats: string[];
}

export interface AgeResolvedItem {
  age_h: number | string;
  origin_time_utc: string;
  n_vessels_scored: number | string;
  top1: string;
  top2: string;
  top3: string;
}

export interface CanonicalCaseData {
  report: CaseReport;
  spill_observation: GeoJSONData;
  backtrack: BacktrackData;
  candidates: CandidateVessel[];
  ablationCandidates: CandidateVessel[];
  ageResolved: AgeResolvedItem[];
  generatedAt: string;
}
