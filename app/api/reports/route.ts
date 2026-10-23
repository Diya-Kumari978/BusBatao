import { NextRequest, NextResponse } from "next/server";
import { MAX_REPORTS_PER_MINUTE } from "@/lib/config";
import { getReports } from "@/lib/data";
import { getSupabaseAdmin, isSupabaseAuthError } from "@/lib/supabase";
import { reportInputSchema } from "@/lib/validation";

const submissions = new Map<string, number[]>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const demo = searchParams.get("demo") === "1";
    const reports = await getReports({
      stopId: searchParams.get("stopId") ?? undefined,
      routeId: searchParams.get("routeId") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      limit: Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100)),
      includeDemo: demo,
    });
    return NextResponse.json({ reports, source: demo ? "demonstration" : "community" });
  } catch (error) {
    console.error("Report listing failed", error);
    return NextResponse.json({ error: "Unable to load reports." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const parsed = reportInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report. Select a city and a stop or route, and check the observation details." }, { status: 400 });
  const input = parsed.data;
  const observedAt = Date.parse(input.observedAt);
  if (!Number.isFinite(observedAt) || observedAt > Date.now() + 5 * 60_000) {
    return NextResponse.json({ error: "Observation time cannot be in the future." }, { status: 400 });
  }
  const now = Date.now();
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateKey = `${clientIp}:${input.reporterId}`;
  const recentRequests = (submissions.get(rateKey) ?? []).filter((time) => now - time < 60_000);
  if (recentRequests.length >= MAX_REPORTS_PER_MINUTE) return NextResponse.json({ error: "Too many submissions. Please wait a minute before trying again." }, { status: 429 });
  submissions.set(rateKey, [...recentRequests, now]);

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared database is not configured. Your report was not saved." }, { status: 503 });
  const persistentRateCutoff = new Date(now - 60_000).toISOString();
  const { count: recentReporterSubmissions, error: rateLimitError } = await supabase.from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", input.reporterId)
    .eq("is_demo", false)
    .gte("submitted_at", persistentRateCutoff);
  if (rateLimitError) {
    console.error("Report rate limit lookup failed", rateLimitError);
    if (isSupabaseAuthError(rateLimitError)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). Your report can still be stored locally; replace the server key to enable shared reports." }, { status: 503 });
    return NextResponse.json({ error: "Unable to verify submission limits. Please try again." }, { status: 500 });
  }
  if ((recentReporterSubmissions ?? 0) >= MAX_REPORTS_PER_MINUTE) {
    return NextResponse.json({ error: "Too many submissions. Please wait a minute before trying again." }, { status: 429 });
  }
  const [stopLookup, routeLookup] = await Promise.all([
    input.stopId ? supabase.from("stops").select("id,city,is_demo").eq("id", input.stopId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    input.routeId ? supabase.from("routes").select("id,city,is_demo,published_status,verification_status").eq("id", input.routeId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (stopLookup.error || routeLookup.error) {
    console.error("Report target lookup failed", stopLookup.error ?? routeLookup.error);
    if (isSupabaseAuthError(stopLookup.error ?? routeLookup.error)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). Your report can still be stored locally; replace the server key to enable shared reports." }, { status: 503 });
    return NextResponse.json({ error: "Unable to validate the selected stop or route." }, { status: 500 });
  }
  if (input.stopId && (!stopLookup.data || stopLookup.data.is_demo)) return NextResponse.json({ error: "That stop is unavailable for community reports." }, { status: 400 });
  if (input.routeId && routeLookup.data?.is_demo) return NextResponse.json({ error: "Demonstration routes cannot accept passenger reports." }, { status: 400 });
  if ((stopLookup.data && stopLookup.data.city !== input.city) || (routeLookup.data && routeLookup.data.city !== input.city)) {
    return NextResponse.json({ error: "The selected stop or route does not match the chosen city." }, { status: 400 });
  }
  if (input.stopId && input.routeId) {
    const { data: routeStop, error: routeStopError } = await supabase.from("route_stops").select("id")
      .eq("route_id", input.routeId).eq("stop_id", input.stopId).maybeSingle();
    if (routeStopError) {
      console.error("Report route/stop relationship check failed", routeStopError);
      return NextResponse.json({ error: "Unable to verify this stop on the selected route." }, { status: 500 });
    }
    if (!routeStop) return NextResponse.json({ error: "The selected stop is not listed on this route." }, { status: 400 });
  }
  const observedIso = new Date(observedAt).toISOString();
  const expiresIso = new Date(now + 48 * 60 * 60_000).toISOString();
  const reportValues = {
    stop_id: input.stopId ?? null,
    route_id: input.routeId ?? null,
    city: input.city,
    report_type: input.reportType,
    service_status: input.serviceStatus,
    crowd_level: input.crowdLevel,
    description: input.description || null,
    observed_at: observedIso,
    reporter_id: input.reporterId,
    reporter_name: input.reporterName,
    reporter_location: input.reporterLocation || null,
    bus_number: input.busNumber || null,
    bus_location: input.busLocation || null,
    is_on_bus: input.isOnBus === "skip" ? null : input.isOnBus === "yes",
    left_minutes_ago: input.leftMinutesAgo ?? null,
    expires_at: expiresIso,
    updated_at: new Date(now).toISOString(),
    source_type: "community",
    moderation_status: "visible",
    is_demo: false,
  };
  let activeQuery = supabase.from("reports").select("id").eq("is_demo", false).eq("moderation_status", "visible").gt("expires_at", new Date(now).toISOString()).order("submitted_at", { ascending: false }).limit(1);
  activeQuery = input.stopId ? activeQuery.eq("stop_id", input.stopId) : activeQuery.eq("route_id", input.routeId!);
  const { data: active } = await activeQuery.maybeSingle();
  const result = active
    ? await supabase.from("reports").update(reportValues).eq("id", active.id).select("id,stop_id,route_id,city,report_type,service_status,crowd_level,description,observed_at,submitted_at,reporter_id,reporter_name,reporter_location,bus_number,bus_location,is_on_bus,left_minutes_ago,expires_at,updated_at,source_type,moderation_status,is_demo").single()
    : await supabase.from("reports").insert(reportValues).select("id,stop_id,route_id,city,report_type,service_status,crowd_level,description,observed_at,submitted_at,reporter_id,reporter_name,reporter_location,bus_number,bus_location,is_on_bus,left_minutes_ago,expires_at,updated_at,source_type,moderation_status,is_demo").single();
  const { data, error } = result;
  if (error) {
    console.error("Report insert failed", error);
    if (isSupabaseAuthError(error)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). Your report can still be stored locally; replace the server key to enable shared reports." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ report: data, storage: "database", action: active ? "updated" : "created" }, { status: active ? 200 : 201 });
}
