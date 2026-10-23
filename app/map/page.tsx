import Link from "next/link";
import { StopMap } from "@/components/stop-map";
import { getReports, getStops } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const demoMode = (await searchParams).demo === "1";
  const [stops, reports] = await Promise.all([
    getStops(undefined, demoMode),
    getReports({ includeDemo: demoMode, limit: 200 }),
  ]);
  return <div className="page-shell">
    <p className="eyebrow">OPENSTREETMAP</p><h1>Stop map</h1>
    <p className="subtitle">Configured stops with saved coordinates. The map shows reported stop observations only, never live bus positions.</p>
    <div className="page-actions"><Link className="text-link" href={demoMode ? "/map" : "/map?demo=1"}>{demoMode ? "View community map →" : "Explore isolated demo map →"}</Link></div>
    <StopMap stops={stops} reports={reports} />
    {!stops.some((stop) => stop.latitude !== null && stop.longitude !== null) && <p className="small muted">No stop markers can be shown until verified stop coordinates are saved in Supabase.</p>}
  </div>;
}
