import { Journey } from "@/components/journey";
import { getReports, getRoutes, getStops } from "@/lib/data";
import type { Report, Route, Stop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let stops: Stop[] = [];
  let routes: Route[] = [];
  let reports: Report[] = [];
  let initialError: string | undefined;
  try {
    [stops, routes, reports] = await Promise.all([
      getStops(),
      getRoutes(),
      getReports({ limit: 200 }),
    ]);
  } catch (error) {
    console.error("Dashboard data load failed", error);
    initialError = "Shared transport data could not be loaded. Check Supabase URL/key configuration.";
  }
  return <div className="page-shell">
      {initialError && <p className="inline-error" role="alert">{initialError}</p>}
      <Journey stops={stops} routes={routes} reports={reports} />
  </div>;
}
