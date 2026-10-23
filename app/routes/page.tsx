import { RouteExplorer } from "@/components/route-explorer";
import { getReports, getRoutes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RoutesPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  const demoMode = params.demo === "1";
  const [routes, reports] = await Promise.all([
    getRoutes(undefined, demoMode),
    getReports({ includeDemo: demoMode, limit: 200 }),
  ]);
  return <div className="page-shell"><p className="eyebrow">PUBLISHED + COMMUNITY CATALOGUE</p><h1>Explore routes</h1>
    <p className="subtitle">Search route codes, places and destinations. Candidate routes remain unverified until a credible source is checked.</p>
    <RouteExplorer routes={routes} reports={reports} demoMode={demoMode} />
  </div>;
}
