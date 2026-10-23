import Link from "next/link";
import { notFound } from "next/navigation";
import { CrowdBar, ReportRow } from "@/components/dashboard";
import { SummaryCard } from "@/components/summary-card";
import { FeedbackForm } from "@/components/feedback-form";
import { StopMap } from "@/components/stop-map";
import { classifyFreshness } from "@/lib/analysis";
import { getReports, getRoutes, getStops } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StopPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ demo?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const demoMode = query.demo === "1";
  const [stops, routes, reports] = await Promise.all([
    getStops(undefined, demoMode), getRoutes(undefined, demoMode),
    getReports({ stopId: id, includeDemo: demoMode, limit: 100 }),
  ]);
  const stop = stops.find((item) => item.id === id);
  if (!stop) notFound();
  const stopRoutes = routes.filter((route) => route.stop_ids.includes(id));
  const sorted = [...reports].sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));
  const latestRecent = sorted.find((report) => classifyFreshness(report.observed_at) !== "Stale");
  return <div className="page-shell">
    <Link className="back-link" href={demoMode ? "/?demo=1" : "/"}>← Back to dashboard</Link>
    <div className="stop-detail-heading"><div><p className="eyebrow">{stop.city.toUpperCase()} · STOP DETAILS</p><h1>{stop.name}</h1>
      <p className="subtitle">{stopRoutes.length ? `Route: ${stopRoutes.map((route) => `${route.route_code} · ${route.name}`).join(", ")}` : "Route: unknown"}</p></div>
      <span className={`freshness-chip freshness-${latestRecent ? classifyFreshness(latestRecent.observed_at).toLowerCase().replaceAll(" ", "-") : "no-recent-data"}`}>{latestRecent ? classifyFreshness(latestRecent.observed_at) : "No recent data"}</span>
    </div>
    <div className="detail-grid"><section>
      <SummaryCard key={`${demoMode}:${stop.id}`} targetType="stop" targetId={stop.id} reports={sorted} demoMode={demoMode} label={`${stop.name} · ${stopRoutes.map((route) => route.route_code).join(", ") || "Route unknown"}`} autoAnalyze />
      {!demoMode && <FeedbackForm targetType="stop" targetId={stop.id} />}
      <div className="section-block"><div className="section-heading"><div><p className="eyebrow">OBSERVATION HISTORY</p><h2>Reports for this stop</h2></div><Link className="text-link" href="/report">Submit an observation →</Link></div>
        <div className="report-list panel">{sorted.length ? sorted.map((report) => <ReportRow key={report.id} report={report} stop={stop} />) : <p className="empty-state">No recent reports available.</p>}</div>
      </div>
      <div className="section-block"><div className="section-heading"><div><p className="eyebrow">STOP LOCATION</p><h2>Map</h2></div></div><StopMap stops={[stop]} reports={sorted} /></div>
      <div className="section-block"><div className="section-heading"><div><p className="eyebrow">ROUTES SERVING THIS STOP</p><h2>Route details</h2></div></div>
        {stopRoutes.length ? <div className="route-list-small">{stopRoutes.map((route) => <Link href={`/routes/${route.id}${demoMode ? "?demo=1" : ""}`} className="route-card panel" key={route.id}>
          <strong>{route.route_code} · {route.name}</strong><span>{route.verification_status} · {route.published_status}</span></Link>)}</div>
          : <p className="empty-state panel">No route is linked to this stop.</p>}
      </div>
    </section>
    <aside className="detail-aside panel"><p className="eyebrow">STOP SNAPSHOT</p><h2>Latest observations</h2><CrowdBar level={latestRecent?.crowd_level} />
      <div className="metric-row"><span>Visible reports</span><strong>{sorted.length}</strong></div>
      <div className="metric-row"><span>Latest observation</span><strong>{latestRecent ? new Date(latestRecent.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></div>
      <div className="metric-row"><span>Coordinates</span><strong>{stop.latitude != null && stop.longitude != null ? `${stop.latitude}, ${stop.longitude}` : "Not available"}</strong></div>
      <p className="small muted">Freshness describes observation age, not accuracy. This app does not use live GPS.</p>
      <Link className="button button-full" href={`/report?stop=${stop.id}`}>Report at this stop</Link>
    </aside></div>
  </div>;
}
