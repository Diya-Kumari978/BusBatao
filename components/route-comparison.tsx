"use client";

import { useMemo, useState } from "react";
import { buildRuleSummary, classifyFreshness, independentRecentReports } from "@/lib/analysis";
import type { Report, Route, Stop } from "@/lib/types";
import { CrowdBar, verificationLabel } from "./data-ui";

export function RouteComparison({ stops, routes, reports, demoMode = false }: { stops: Stop[]; routes: Route[]; reports: Report[]; demoMode?: boolean }) {
  const [selected, setSelected] = useState<string[]>(routes.slice(0, 2).map((route) => route.id));
  const toggle = (id: string) => setSelected((current) =>
    current.includes(id) ? current.filter((routeId) => routeId !== id) : current.length < 3 ? [...current, id] : current,
  );
  const comparisons = useMemo(() => selected.flatMap((routeId) => {
    const route = routes.find((item) => item.id === routeId);
    if (!route) return [];
    const routeReports = reports.filter((report) => report.route_id === routeId);
    const recent = independentRecentReports(routeReports);
    const latest = [...routeReports].sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
    return [{ route, routeReports, recent, latest, summary: buildRuleSummary(routeReports) }];
  }), [reports, routes, selected]);
  const enoughEvidence = comparisons.length >= 2 && comparisons.every(({ recent }) => recent.length >= 2);

  return <section className="compare-page">
    <div className="compare-picker panel"><p className="form-label">Choose two or three routes to compare</p><div className="choice-row">
      {routes.map((route) => <button type="button" key={route.id} className={`choice-button ${selected.includes(route.id) ? "selected" : ""}`} aria-pressed={selected.includes(route.id)} onClick={() => toggle(route.id)}>{route.route_code} · {route.name}</button>)}
    </div><p className="small muted">Compare available reports and published metadata only. No journey times or arrival estimates are generated.</p></div>
    {!enoughEvidence && <p className="compare-warning" role="status">Not enough recent information to compare these routes reliably.</p>}
    {comparisons.length ? <div className="compare-grid">{comparisons.map(({ route, routeReports, recent, latest, summary }) => {
      const routeStops = route.stop_ids.map((id) => stops.find((stop) => stop.id === id)).filter((stop): stop is Stop => Boolean(stop));
      return <article className="compare-card panel" key={route.id}>
        <div className="card-topline"><span className="route-code">{route.route_code}</span><span className={`verification-chip verification-${route.verification_status}`}>{verificationLabel(route.verification_status)}</span></div>
        <h2>{route.name}</h2><p className="muted">{route.origin} <span aria-hidden="true">→</span> {route.destination}</p>
        <dl className="comparison-rows">
          <div><dt>Published status</dt><dd>{route.published_status} · {route.verification_status}</dd></div>
          <div><dt>Stops available</dt><dd>{routeStops.length ? routeStops.map((stop) => stop.name).join(" → ") : "No verified stop sequence available."}</dd></div>
          <div><dt>Latest observation</dt><dd>{latest ? `${reportTitle(latest)} · ${new Date(latest.observed_at).toLocaleString()} (${classifyFreshness(latest.observed_at)})` : "No recent reports available."}</dd></div>
          <div><dt>Recent reports</dt><dd>{recent.length} independent observation{recent.length === 1 ? "" : "s"}</dd></div>
          <div><dt>Crowd observation</dt><dd><CrowdBar level={latest?.crowd_level} /></dd></div>
          <div><dt>Disruptions</dt><dd>{recent.some((report) => report.report_type === "route_disruption") ? "Possible disruption reported by passengers" : "None reported in available recent observations"}</dd></div>
          <div><dt>Confidence</dt><dd>{summary.confidence.level} · {summary.confidence.reason}</dd></div>
          <div><dt>Data source</dt><dd>{demoMode ? "Fictional demonstration records" : route.source_name}</dd></div>
        </dl>
        {route.source_url && <a className="text-link" href={route.source_url} target="_blank" rel="noreferrer">Open source record ↗</a>}
        {routeReports.some((report) => report.is_demo) && <p className="small demo-note">Demo data · not real passenger activity</p>}
      </article>;
    })}</div> : <p className="empty-state panel">Select routes above to compare available information.</p>}
    {enoughEvidence && <p className="comparison-caveat">At least two independent recent reports exist for each selected route. This describes the evidence only; it does not guarantee service conditions or recommend a route.</p>}
    <p className="comparison-caveat">A route with no observations is not evidence that service is absent or less crowded. Reports are not official announcements.</p>
  </section>;
}

function reportTitle(report: Report) {
  return report.report_type.replaceAll("_", " ");
}
