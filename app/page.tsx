import { Dashboard } from "@/components/dashboard";
import { OFFICIAL_CANDIDATE_ROUTES } from "@/lib/demo-data";
import { getReports, getRoutes, getStops } from "@/lib/data";
import type { Report, Route, Stop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let stops: Stop[] = [];
  let routes: Route[] = [];
  let reports: Report[] = [];
  let initialError: string | undefined;
  try {
    [stops, routes, reports] = await Promise.all([getStops(), getRoutes(), getReports({ limit: 40 })]);
  } catch (error) {
    console.error("Dashboard data load failed", error);
    routes = OFFICIAL_CANDIDATE_ROUTES;
    initialError = "Shared transport data could not be loaded. Check Supabase URL/key configuration; use fictional demo mode for a local walkthrough.";
  }
  return <div className="page-shell">
    <div className="page-heading"><div><p className="eyebrow">HYDERABAD + JAMSHORO</p><h1>Bus ka haal,<br className="mobile-break" /> pehle se pata.</h1>
      <p className="subtitle">A clearer view of passenger observations and published route information.</p></div>
    </div>
    <Dashboard initialStops={stops} initialRoutes={routes} initialReports={reports} initialError={initialError} />
  </div>;
}
