import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAuthError } from "@/lib/supabase";
import { tripInputSchema } from "@/lib/validation";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ trips: [], storage: "local", reason: "Supabase server key is not configured." }, { status: 200 });
  const { data, error } = await supabase.from("trips").select("trip_id,route_id,city,departure_at,crowd_level,delay_minutes,rating,from_location,to_name,route_name,bus_number,reported_at,expires_at,created_at").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(20);
  if (error) { console.error("Shared history read failed", error.message); return NextResponse.json({ trips: [], storage: "local", error: isSupabaseAuthError(error) ? "Supabase server credentials were rejected." : error.message }, { status: 503 }); }
  return NextResponse.json({ trips: data ?? [], storage: "supabase" });
}

export async function POST(request: NextRequest) {
  const parsed = tripInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check trip details and try again." }, { status: 400 });
  const input = parsed.data;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase server key is not configured." }, { status: 503 });
  const now = Date.now();
  const { error } = await supabase.from("trips").upsert({
    trip_id: input.tripId, route_id: input.routeId, city: input.city, reporter_id: input.reporterId,
    departure_at: input.departureAt, crowd_level: input.crowdLevel, delay_minutes: input.delayMinutes, rating: input.rating,
    from_location: input.from || null, to_name: input.to || null, route_name: input.routeName || null, bus_number: input.busNumber || null, reported_at: input.reportedAt || null,
    expires_at: new Date(now + 48 * 60 * 60_000).toISOString(),
  }, { onConflict: "trip_id" });
  if (error) {
    console.error("Trip save failed", error.message);
    if (isSupabaseAuthError(error)) return NextResponse.json({ error: "Supabase rejected the server key." }, { status: 503 });
    return NextResponse.json({ error: `Shared history save failed: ${error.message}` }, { status: 503 });
  }
  return NextResponse.json({ success: true, storage: "supabase", expiresAt: new Date(now + 48 * 60 * 60_000).toISOString() }, { status: 201 });
}