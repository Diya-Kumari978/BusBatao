import { NextResponse } from "next/server";
import { DEMO_REPORTS, DEMO_ROUTES, DEMO_STOPS } from "@/lib/demo-data";
import { getReports, getRoutes, getStops } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/supabase";

export async function GET() {
  try {
    const [stops, routes, reports] = await Promise.all([
      getStops(undefined, true),
      getRoutes(undefined, true),
      getReports({ includeDemo: true, limit: 200 }),
    ]);
    return NextResponse.json({ stops, routes, reports, source: "demonstration", storage: hasDatabaseConfig() ? "database-seed-or-static" : "static-demo" });
  } catch (error) {
    console.error("Demo data loading failed", error);
    return NextResponse.json({
      stops: DEMO_STOPS,
      routes: DEMO_ROUTES,
      reports: DEMO_REPORTS.map((report) => ({ ...report, reporter_id: undefined })),
      source: "demonstration",
      storage: "static-demo",
      warning: "The shared database could not be reached. Showing isolated, fictional demo records only.",
    });
  }
}
