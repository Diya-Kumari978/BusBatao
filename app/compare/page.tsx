import { RouteComparison } from "@/components/route-comparison";
import { getReports, getRoutes, getStops } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  const demoMode = params.demo === "1";
  const [stops, routes, reports] = await Promise.all([
    getStops(undefined, demoMode), getRoutes(undefined, demoMode),
    getReports({ includeDemo: demoMode, limit: 200 }),
  ]);
  return <div className="page-shell"><p className="eyebrow">EVIDENCE ONLY · NO ARRIVAL ESTIMATES</p><h1>Compare routes</h1>
    <p className="subtitle">Compare the information available without treating an empty report feed as evidence of service or crowding.</p>
    <RouteComparison stops={stops} routes={routes} reports={reports} demoMode={demoMode} />
  </div>;
}
