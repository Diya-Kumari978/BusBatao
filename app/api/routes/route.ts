import { NextRequest, NextResponse } from "next/server";
import { getRoutes, getStops } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get("city") ?? undefined;
    const demo = request.nextUrl.searchParams.get("demo") === "1";
    const [routes, stops] = await Promise.all([getRoutes(city, demo), getStops(city, demo)]);
    return NextResponse.json({ routes, stops, source: demo ? "demonstration" : "catalogue" });
  } catch (error) {
    console.error("Route catalogue lookup failed", error);
    return NextResponse.json({ error: "Unable to load the route catalogue." }, { status: 500 });
  }
}
