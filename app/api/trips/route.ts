import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAuthError } from "@/lib/supabase";
import { tripInputSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const parsed = tripInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check trip details and try again." }, { status: 400 });
  const input = parsed.data;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });
  const { data: route, error: lookupError } = await supabase.from("routes")
    .select("id,city,is_demo,verification_status,published_status").eq("id", input.routeId).maybeSingle();
  if (lookupError) {
    console.error("Trip route lookup failed", lookupError.message);
    if (isSupabaseAuthError(lookupError)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). The trip is safe in local History; replace the server key to enable sync." }, { status: 503 });
    return NextResponse.json({ error: "Supabase could not validate the selected route. Check that the migration and route seed are applied." }, { status: 500 });
  }
  if (!route || route.city !== input.city || route.is_demo || route.verification_status !== "verified" || route.published_status !== "active") {
    return NextResponse.json({ error: "Only active verified routes can be saved to shared Supabase history. Your local trip is saved." }, { status: 400 });
  }
  const { error } = await supabase.from("trips").upsert({
    trip_id: input.tripId, route_id: route.id, city: route.city, reporter_id: input.reporterId,
    departure_at: input.departureAt, crowd_level: input.crowdLevel, delay_minutes: input.delayMinutes,
    rating: input.rating,
  }, { onConflict: "trip_id" });
  if (error) {
    console.error("Trip save failed", error.message);
    if (isSupabaseAuthError(error)) return NextResponse.json({ error: "Supabase rejected SUPABASE_SERVICE_ROLE_KEY (HTTP 401). The trip is safe in local History; replace the server key to enable sync." }, { status: 503 });
    if (/relation .* does not exist|table .* not found|schema cache/i.test(error.message)) return NextResponse.json({ error: "Supabase trips table is missing. Apply supabase/migration.sql; the trip is safe in local History." }, { status: 503 });
    return NextResponse.json({ error: `Supabase trip save failed: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true, storage: "supabase" }, { status: 201 });
}
