import { DEMO_REPORTS, DEMO_ROUTES, DEMO_STOPS, OFFICIAL_CANDIDATE_ROUTES } from "./demo-data";
import { getSupabaseAdmin } from "./supabase";
import type { Report, Route, Stop } from "./types";

export async function getStops(city?: string, includeDemo = false): Promise<Stop[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return includeDemo ? DEMO_STOPS.filter((stop) => !city || stop.city === city) : [];
  let query = supabase.from("stops").select("id,name,city,latitude,longitude,coordinate_source,verification_status,source_url,is_demo")
    .eq("is_demo", includeDemo).order("city").order("name");
  if (city) query = query.eq("city", city);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load stops: ${error.message}`);
  const records = (data ?? []) as Stop[];
  return includeDemo && records.length === 0 ? DEMO_STOPS.filter((stop) => !city || stop.city === city) : records;
}

export async function getRoutes(city?: string, includeDemo = false): Promise<Route[]> {
  const supabase = getSupabaseAdmin();
  let dbRoutes: Route[] = [];
  if (supabase) {
    let query = supabase.from("routes")
      .select("id,route_code,name,origin,destination,city,published_status,verification_status,source_name,source_url,last_verified_at,description,is_demo")
      .eq("is_demo", includeDemo).order("city").order("route_code");
    if (city) query = query.eq("city", city);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load routes: ${error.message}`);
    const ids = (data ?? []).map((route) => route.id);
    let routeStops: Array<{ route_id: string; stop_id: string; stop_order: number }> = [];
    if (ids.length) {
      const { data: stops, error: stopsError } = await supabase.from("route_stops").select("route_id,stop_id,stop_order").in("route_id", ids).order("stop_order");
      if (stopsError) throw new Error(`Unable to load route stops: ${stopsError.message}`);
      routeStops = stops ?? [];
    }
    dbRoutes = (data ?? []).map((route) => ({
      ...(route as Omit<Route, "stop_ids">),
      stop_ids: routeStops.filter((stop) => stop.route_id === route.id).map((stop) => stop.stop_id),
    }));
  }
  if (includeDemo) {
    return dbRoutes.length ? dbRoutes : DEMO_ROUTES.filter((route) => !city || route.city === city);
  }
  const candidateRoutes = OFFICIAL_CANDIDATE_ROUTES.filter((route) => !city || route.city === city);
  return [...dbRoutes, ...candidateRoutes.filter((candidate) => !dbRoutes.some((route) => route.id === candidate.id))];
}

export async function getReports(filters: { stopId?: string; routeId?: string; city?: string; limit?: number; includeDemo?: boolean; includeReporterId?: boolean } = {}): Promise<Report[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return filters.includeDemo
    ? DEMO_REPORTS.filter((report) =>
      (!filters.stopId || report.stop_id === filters.stopId)
      && (!filters.routeId || report.route_id === filters.routeId)
      && (!filters.city || report.city === filters.city),
    ).map((report) => filters.includeReporterId ? report : { ...report, reporter_id: undefined })
    : [];
  let records: Report[];
  if (filters.includeReporterId) {
    let query = supabase.from("reports")
      .select("id,stop_id,route_id,city,report_type,service_status,crowd_level,description,observed_at,submitted_at,source_type,moderation_status,is_demo,reporter_id")
      .eq("moderation_status", "visible").eq("is_demo", filters.includeDemo ?? false)
      .order("observed_at", { ascending: false }).limit(filters.limit ?? 200);
    if (filters.stopId) query = query.eq("stop_id", filters.stopId);
    if (filters.routeId) query = query.eq("route_id", filters.routeId);
    if (filters.city) query = query.eq("city", filters.city);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load reports: ${error.message}`);
    records = (data ?? []) as Report[];
  } else {
    let query = supabase.from("reports")
      .select("id,stop_id,route_id,city,report_type,service_status,crowd_level,description,observed_at,submitted_at,source_type,moderation_status,is_demo")
      .eq("moderation_status", "visible").eq("is_demo", filters.includeDemo ?? false)
      .order("observed_at", { ascending: false }).limit(filters.limit ?? 200);
    if (filters.stopId) query = query.eq("stop_id", filters.stopId);
    if (filters.routeId) query = query.eq("route_id", filters.routeId);
    if (filters.city) query = query.eq("city", filters.city);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load reports: ${error.message}`);
    records = (data ?? []) as Report[];
  }
  if (filters.includeDemo && records.length === 0) {
    return (await import("./demo-data")).DEMO_REPORTS.filter((report) =>
      (!filters.stopId || report.stop_id === filters.stopId)
      && (!filters.routeId || report.route_id === filters.routeId)
      && (!filters.city || report.city === filters.city),
    ).map((report) => filters.includeReporterId ? report : { ...report, reporter_id: undefined });
  }
  return records;
}
