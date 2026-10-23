import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportRow } from "@/components/dashboard";
import { SummaryCard } from "@/components/summary-card";
import { FeedbackForm } from "@/components/feedback-form";
import { StopMap } from "@/components/stop-map";
import { getReports, getRoutes, getStops } from "@/lib/data";
import type { Report } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RouteDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ demo?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const demoMode = query.demo === "1";
  const [routes, stops, reports] = await Promise.all([
    getRoutes(undefined, demoMode), getStops(undefined, demoMode),
    getReports({ routeId: id, includeDemo: demoMode, limit: 100 }),
  ]);
  const route = routes.find((item) => item.id === id);
  if (!route) notFound();
  const routeStops = route.stop_ids.map((stopId) => stops.find((stop) => stop.id === stopId)).filter((stop) => Boolean(stop));
  const sortedReports = [...reports].sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));
  const label = `${route.route_code} · ${route.name}`;
  return <div className="page-shell">
    <Link className="back-link" href="/routes">← Back to routes</Link>
    <div className="stop-detail-heading"><div><p className="eyebrow">{route.city.toUpperCase()} · ROUTE DETAILS</p><h1>{route.route_code}: {route.name}</h1>
      <p className="subtitle">{route.origin} <span aria-hidden="true">→</span> {route.destination}</p></div>
      <span className={`verification-chip verification-${route.verification_status}`}>{route.verification_status === "verified" ? "Verified source" : route.verification_status === "demonstration" ? "Demo data" : "Unverified route"}</span>
    </div>
    <div className="detail-grid"><section>
      <SummaryCard key={`${demoMode}:${route.id}`} targetType="route" targetId={route.id} reports={sortedReports as Report[]} demoMode={demoMode} label={label} autoAnalyze />
      {!demoMode && <FeedbackForm targetType="route" targetId={route.id} />}
      <section className="section-block"><div className="section-heading"><div><p className="eyebrow">PASSENGER OBSERVATIONS</p><h2>Recent reports</h2></div><Link className="text-link" href="/report">Share an observation →</Link></div>
        <div className="report-list panel">{sortedReports.length ? sortedReports.map((report) => <ReportRow key={report.id} report={report} />) : <p className="empty-state">No recent reports available.</p>}</div>
      </section>
      <div className="section-block"><div className="section-heading"><div><p className="eyebrow">ROUTE STOPS</p><h2>Map</h2></div></div><StopMap stops={routeStops.filter((stop): stop is NonNullable<typeof stop> => Boolean(stop))} reports={sortedReports} /></div>
      <article className="panel source-panel"><p className="eyebrow">PUBLISHED ROUTE INFORMATION</p>
        <div className="metric-row"><span>Published status</span><strong>{route.published_status}</strong></div>
        <div className="metric-row"><span>Verification status</span><strong>{route.verification_status}</strong></div>
        <div className="metric-row"><span>Source checked</span><strong>{route.last_verified_at ? new Date(route.last_verified_at).toLocaleDateString() : "No verified date"}</strong></div>
        <p className="small muted">{route.description || "No further published route details are available."}</p>
        {route.source_url && <a className="text-link" href={route.source_url} target="_blank" rel="noreferrer">{route.source_name} ↗</a>}
      </article>
      <section className="section-block"><div className="section-heading"><div><p className="eyebrow">AVAILABLE ROUTE SEQUENCE</p><h2>Stops</h2></div></div>
        {routeStops.length ? <ol className="stop-sequence panel">{routeStops.map((stop, index) => <li key={stop!.id}><span>{String(index + 1).padStart(2, "0")}</span><Link href={`/stops/${stop!.id}${demoMode ? "?demo=1" : ""}`}>{stop!.name}</Link><small>{stop!.city} · {stop!.verification_status}</small></li>)}</ol>
          : <p className="empty-state panel">No verified stop sequence is available for this route.</p>}
      </section>
    </section>
    <aside>
      {route.is_demo && <p className="demo-note">This is a fictional route example. It is not a verified transport service.</p>}
    </aside></div>
  </div>;
}
