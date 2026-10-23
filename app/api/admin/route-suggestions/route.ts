import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const reviewSchema = z.object({ suggestionId: z.uuid(), decision: z.enum(["approved", "rejected"]) });

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared database is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("route_suggestions").select("id,city,proposed_route_details,proposed_stops,review_status,created_at").eq("review_status", "pending").order("created_at", { ascending: false }).limit(100);
  if (error) {
    console.error("Admin route suggestion lookup failed", error);
    return NextResponse.json({ error: "Unable to load route suggestions." }, { status: 500 });
  }
  return NextResponse.json({ suggestions: data });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid route suggestion review action." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared database is not configured." }, { status: 503 });
  const { data: suggestion, error: lookupError } = await supabase.from("route_suggestions").select("id,city,proposed_route_details,proposed_stops").eq("id", parsed.data.suggestionId).eq("review_status", "pending").maybeSingle();
  if (lookupError) {
    console.error("Route suggestion review lookup failed", lookupError);
    return NextResponse.json({ error: "Unable to load this suggestion." }, { status: 500 });
  }
  if (!suggestion) return NextResponse.json({ error: "Pending suggestion not found." }, { status: 404 });
  const { error: updateError } = await supabase.from("route_suggestions").update({ review_status: parsed.data.decision }).eq("id", suggestion.id);
  if (updateError) {
    console.error("Route suggestion review update failed", updateError);
    return NextResponse.json({ error: "Unable to review this suggestion." }, { status: 500 });
  }
  if (parsed.data.decision === "approved") {
    const details = suggestion.proposed_route_details as Record<string, string | undefined>;
    const routeCode = details.route_code || `COMM-${suggestion.id.slice(0, 6).toUpperCase()}`;
    const { error: insertError } = await supabase.from("routes").insert({
      id: `community-${suggestion.id}`,
      route_code: routeCode,
      name: details.name,
      origin: details.origin,
      destination: details.destination,
      city: suggestion.city,
      published_status: "unknown",
      verification_status: "unverified",
      source_name: "Community suggestion reviewed; not verified against an official route source",
      description: details.details || null,
      is_demo: false,
    });
    if (insertError) {
      console.error("Approved suggestion could not be added to the unverified catalogue", insertError);
      return NextResponse.json({ error: "Suggestion was reviewed, but its route could not be added to the catalogue." }, { status: 500 });
    }
    const stops = (suggestion.proposed_stops as unknown[]).filter((stop): stop is string => typeof stop === "string");
    if (stops.length) {
      const stopRows = stops.map((stop, index) => ({
        id: `suggested-${suggestion.id}-${index + 1}`,
        name: stop,
        city: suggestion.city,
        verification_status: "unverified",
        is_demo: false,
      }));
      const { error: stopError } = await supabase.from("stops").insert(stopRows);
      if (stopError) {
        console.error("Approved suggestion stops could not be added to the unverified catalogue", stopError);
        return NextResponse.json({ error: "Route was added, but its stops could not be saved." }, { status: 500 });
      }
      const routeStops = stopRows.map((stop, index) => ({
        route_id: `community-${suggestion.id}`,
        stop_id: stop.id,
        stop_order: index,
        source_name: "Unverified community suggestion",
        verification_status: "unverified",
      }));
      const { error: sequenceError } = await supabase.from("route_stops").insert(routeStops);
      if (sequenceError) {
        console.error("Approved suggestion stop sequence could not be saved", sequenceError);
        return NextResponse.json({ error: "Route was added, but its stop sequence could not be saved." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ success: true });
}
