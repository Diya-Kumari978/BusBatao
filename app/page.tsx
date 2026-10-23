import { Journey } from "@/components/journey";
import { OFFICIAL_CANDIDATE_ROUTES } from "@/lib/demo-data";
import { getReports, getRoutes, getStops } from "@/lib/data";
import type { Report, Route, Stop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  const demoMode = params.demo === "1";
  let stops: Stop[] = [];
  let routes: Route[] = [];
  let reports: Report[] = [];
  let initialError: string | undefined;
  try {
    [stops, routes, reports] = await Promise.all([
      getStops(undefined, demoMode),
      getRoutes(undefined, demoMode),
      getReports({ limit: 200, includeDemo: demoMode }),
    ]);
  } catch (error) {
    console.error("Dashboard data load failed", error);
    if (!demoMode) routes = OFFICIAL_CANDIDATE_ROUTES;
    initialError = demoMode
      ? "Fictional demo data could not be loaded."
      : "Shared transport data could not be loaded. Check Supabase URL/key configuration; use fictional demo mode for a local walkthrough.";
  }
  return <div className="page-shell">
      {initialError && <p className="inline-error" role="alert">{initialError}</p>}
      <Journey stops={stops} routes={routes} reports={reports} />
  </div>;
}
