export const REPORT_TYPES = [
  "bus_seen",
  "bus_delayed",
  "no_recent_bus",
  "bus_crowded",
  "bus_full",
  "route_disruption",
  "correction",
  "other",
] as const;

export const CROWD_LEVELS = ["low", "moderate", "high", "full", "unknown"] as const;
export const CITIES = ["Hyderabad", "Jamshoro"] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
export type CrowdLevel = (typeof CROWD_LEVELS)[number];
export type City = (typeof CITIES)[number];
export type Freshness = "Recent" | "Aging" | "Stale" | "No recent data";
export type VerificationStatus = "verified" | "unverified" | "demonstration";

export interface Stop {
  id: string;
  name: string;
  city: City;
  latitude: number | null;
  longitude: number | null;
  coordinate_source?: string | null;
  verification_status: VerificationStatus;
  source_url?: string | null;
  is_demo: boolean;
}

export interface Route {
  id: string;
  from?: string;
  to?: string;
  via?: string[];
  university?: string;
  stops?: string[];
  route_code: string;
  name: string;
  origin: string;
  destination: string;
  city: City;
  published_status: "active" | "inactive" | "unknown";
  verification_status: VerificationStatus;
  source_name: string;
  source_url: string | null;
  last_verified_at: string | null;
  description?: string | null;
  is_demo: boolean;
  stop_ids: string[];
}

export interface Report {
  id: string;
  route_id?: string | null;
  stop_id?: string | null;
  city: City;
  report_type: ReportType;
  service_status: "seen" | "delayed" | "not_seen" | "crowded" | "full" | "disrupted" | "unknown";
  crowd_level: CrowdLevel;
  description?: string | null;
  observed_at: string;
  submitted_at: string;
  reporter_id?: string | null;
  reporter_name?: string | null;
  reporter_location?: string | null;
  bus_number?: string | null;
  bus_location?: string | null;
  is_on_bus?: boolean | null;
  left_minutes_ago?: number | null;
  expires_at?: string | null;
  source_type: "community" | "demonstration";
  moderation_status: "visible" | "flagged" | "hidden";
  is_demo: boolean;
  storage?: "database" | "browser";
}

export interface ReportInput {
  city: City;
  routeId?: string;
  stopId?: string;
  reportType: ReportType;
  serviceStatus: Report["service_status"];
  crowdLevel: CrowdLevel;
  description?: string;
  observedAt: string;
  reporterId: string;
}

export interface Confidence {
  level: "Low" | "Moderate" | "High";
  score: number;
  explanation: string;
}

export interface TransportSummary {
  busStatus: "delayed" | "arrived" | "disruption" | "unknown";
  crowdLevel: "low" | "medium" | "high" | "full" | "unknown";
  conflicts: string;
  confidence: { level: "low" | "medium" | "high"; reason: string };
  summary: string;
  advice: string;
  evidence_report_ids: string[];
  generated_at: string;
  generated_by: "AI" | "rules";
}
