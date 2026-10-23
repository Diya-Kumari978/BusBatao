import Link from "next/link";
import { ReportHistory } from "@/components/report-history";
import { getReports, getRoutes, getStops } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  const demoMode = params.demo === "1";
  const [reports, routes, stops] = await Promise.all([
    getReports({ includeDemo: demoMode, limit: 200 }),
    getRoutes(undefined, demoMode),
    getStops(undefined, demoMode),
  ]);
  return <div className="page-shell"><p className="eyebrow">{demoMode ? "FICTIONAL EXAMPLES" : "SUPABASE COMMUNITY REPORTS"}</p><h1>Updates</h1>
    <p className="subtitle">All available reports, newest observation first. Freshness reflects observation age, not accuracy.</p>
    <div className="page-actions"><Link className="button button-small" href="/report">Submit an observation</Link><Link className="text-link" href={demoMode ? "/updates" : "/updates?demo=1"}>{demoMode ? "View community updates →" : "Explore isolated demo updates →"}</Link></div>
    <ReportHistory reports={reports} routes={routes} stops={stops} demoMode={demoMode} />
  </div>;
}
