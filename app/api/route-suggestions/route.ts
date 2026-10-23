import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { routeSuggestionSchema } from "@/lib/validation";

const recentSuggestions = new Map<string, number>();

export async function POST(request: NextRequest) {
  const parsed = routeSuggestionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the city, route name, origin, destination, and stop list." }, { status: 400 });
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const previous = recentSuggestions.get(clientKey) ?? 0;
  if (now - previous < 60_000) return NextResponse.json({ error: "Please wait one minute before sending another suggestion." }, { status: 429 });
  recentSuggestions.set(clientKey, now);
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Route suggestions require the shared database. No data was saved." }, { status: 503 });
  const { data, error } = await supabase.from("route_suggestions").insert({
    city: parsed.data.city,
    proposed_route_details: {
      route_code: parsed.data.routeCode,
      name: parsed.data.name,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      details: parsed.data.details,
    },
    proposed_stops: parsed.data.stops,
    review_status: "pending",
  }).select("id,review_status,created_at").single();
  if (error) {
    console.error("Route suggestion insert failed", error);
    return NextResponse.json({ error: "Unable to save the route suggestion." }, { status: 500 });
  }
  return NextResponse.json({ suggestion: data }, { status: 201 });
}
