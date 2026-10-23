import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAuthError } from "@/lib/supabase";
import { tripFeedbackInputSchema } from "@/lib/validation";

const submissions = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const parsed = tripFeedbackInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the trip feedback and try again." }, { status: 400 });
  const input = parsed.data;
  const now = Date.now();
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${client}:${input.reporterId}`;
  const recent = (submissions.get(key) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 5) return NextResponse.json({ error: "Please wait before sending more trip feedback." }, { status: 429 });
  submissions.set(key, [...recent, now]);

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared feedback storage is not configured." }, { status: 503 });
  const { data: route, error: routeError } = await supabase.from("routes")
    .select("id,city,is_demo,verification_status").eq("id", input.routeId).maybeSingle();
  if (routeError) {
    console.error("Trip feedback route lookup failed", routeError.message);
    if (isSupabaseAuthError(routeError)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). Feedback remains saved on this device; replace the server key to enable sync." }, { status: 503 });
    return NextResponse.json({ error: "Unable to validate this route. Check the Supabase schema and route seed." }, { status: 500 });
  }
  if (!route || route.is_demo || route.city !== input.city || route.verification_status !== "verified") {
    return NextResponse.json({ error: "Trip feedback requires a verified shared route." }, { status: 400 });
  }

  const crowd = { Empty: "low", Moderate: "moderate", Crowded: "high", Full: "full" }[input.crowd];
  const { data: saved, error: feedbackError } = await supabase.from("trip_feedback").insert({
    trip_id: input.tripId, route_id: route.id, city: route.city, reporter_id: input.reporterId,
    crowd_level: crowd, delay_minutes: input.delayMinutes, on_time: input.onTime, rating: input.rating,
    punctuality: input.punctuality ?? (input.onTime ? "yes" : "no"), bus_number: input.busNumber || null,
    seat: input.seat || null, comment: input.comment || null,
    observed_at: input.observedAt,
  }).select("id").single();
  if (feedbackError) {
    if (feedbackError.code === "23505") return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    console.error("Trip feedback insert failed", feedbackError.message);
    if (isSupabaseAuthError(feedbackError)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). Feedback remains saved on this device; replace the server key to enable sync." }, { status: 503 });
    if (/relation .* does not exist|table .* not found|schema cache/i.test(feedbackError.message)) return NextResponse.json({ error: "Supabase trip_feedback table is missing. Apply supabase/migration.sql; feedback remains saved on this device." }, { status: 503 });
    return NextResponse.json({ error: "Unable to save trip feedback." }, { status: 500 });
  }

  const delayed = input.delayMinutes > 0 || !input.onTime;
  const reportType = delayed ? "bus_delayed" : input.crowd === "Full" ? "bus_full" : input.crowd === "Empty" ? "bus_seen" : "bus_crowded";
  const serviceStatus = delayed ? "delayed" : input.crowd === "Full" ? "full" : input.crowd === "Empty" ? "seen" : "crowded";
  const { error: reportError } = await supabase.from("reports").insert({
    route_id: route.id, city: route.city, report_type: reportType, service_status: serviceStatus,
    crowd_level: crowd, description: `Trip feedback: ${input.delayMinutes} min delay; ${input.onTime ? "on time" : "not on time"}.`,
    observed_at: input.observedAt, reporter_id: input.reporterId, source_type: "community",
    moderation_status: "visible", is_demo: false,
  });
  if (reportError) {
    console.error("Trip feedback prediction report insert failed", reportError.message);
    return NextResponse.json({ success: true, feedbackId: saved.id, predictionUpdated: false }, { status: 201 });
  }
  return NextResponse.json({ success: true, feedbackId: saved.id, predictionUpdated: true }, { status: 201 });
}
