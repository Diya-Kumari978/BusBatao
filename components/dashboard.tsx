"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { classifyFreshness } from "@/lib/analysis";
import { CITIES, type City, type Report, type Route, type Stop } from "@/lib/types";
import { CrowdBar, verificationLabel } from "./data-ui";
import { SummaryCard } from "./summary-card";

export { CrowdBar, verificationLabel };
interface DemoData { stops: Stop[]; routes: Route[]; reports: Report[] }

export function Dashboard({ initialStops, initialRoutes, initialReports, initialError }: { initialStops: Stop[]; initialRoutes: Route[]; initialReports: Report[]; initialError?: string }) {
  const [demoMode, setDemoMode] = useState(false);
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [city, setCity] = useState<City | "All">("All");
  const [search, setSearch] = useState("");
  const [demoError, setDemoError] = useState("");

  async function loadDemo() {
    setDemoError("");
    try {
      const response = await fetch("/api/demo");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load demo data.");
      setDemoData(result);
      setDemoMode(true);
      setDemoError(result.warning || "");
      localStorage.setItem("busbatao-demo-enabled", "true");
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : "Could not load demo data.");
    }
  }

  function resetDemo() {
    setDemoMode(false);
    setDemoData(null);
    localStorage.removeItem("busbatao-demo-enabled");
  }

  useEffect(() => {
    if (localStorage.getItem("busbatao-demo-enabled") === "true") void loadDemo();
    // The page snapshot is refreshed by Next after a server-backed report succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stops = demoMode ? demoData?.stops ?? [] : initialStops;
  const routes = demoMode ? demoData?.routes ?? [] : initialRoutes;
  const reports = useMemo(() => demoMode ? demoData?.reports ?? [] : initialReports, [demoMode, demoData, initialReports]);
  const visibleStops = stops.filter((stop) => (city === "All" || stop.city === city) && `${stop.name} ${stop.city}`.toLowerCase().includes(search.toLowerCase()));
  const summaryStop = visibleStops[0];

  return <>
    <section className="controls-row">
      <label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Search stops</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stops" /></label>
      <label className="city-select"><span className="sr-only">Filter by city</span><select value={city} onChange={(event) => setCity(event.target.value as City | "All")}><option value="All">All service areas</option>{CITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
    </section>
    <div className="demo-toolbar">
      <div><span className={`source-chip ${demoMode ? "source-demo" : "source-community"}`}><i />{demoMode ? "Demo mode · fictional data" : "Live community data"}</span>
        <span className="demo-explainer">{demoMode ? "Sample records are isolated from community reports." : "No demo activity is mixed into real reports."}</span></div>
      <button className="text-button" type="button" onClick={demoMode ? resetDemo : loadDemo}>{demoMode ? "Exit demo mode" : "Explore demo data"}</button>
    </div>
    {(demoError || initialError) && <p className="inline-error" role="alert">{demoError || initialError}</p>}
    <div className="legend-row"><span><i className="legend-dot official" />Published catalogue</span><span><i className="legend-dot community" />Passenger observation</span><span><i className="legend-dot demo" />Fictional demo</span></div>

    <div className="dashboard-grid">
      <section className="summary-slot">
        {summaryStop ? <SummaryCard targetType="stop" targetId={summaryStop.id} reports={reports.filter((report) => report.stop_id === summaryStop.id)} demoMode={demoMode} label={summaryStop.name} /> : <div className="panel onboarding-card">
          <p className="eyebrow">BUSBATAO INTELLIGENCE</p><h2>Start with the information we can verify.</h2>
          <p className="muted">No configured stops or passenger observations are available yet. Explore isolated fictional data or contribute a verified route source.</p>
          <button className="button" type="button" onClick={loadDemo}>Explore demo data</button>
        </div>}
      </section>
      <aside className="side-panel panel">
        <div className="panel-title-row"><div><p className="eyebrow">DATA CHECK</p><h2>What we know</h2></div><span className="source-chip source-official"><i />Catalogue</span></div>
        <p className="muted small">SMTA’s route directory was checked on 23 Oct 2026. The current listing showed Karachi routes; no Hyderabad listing was verified during this check.</p>
        <div className="metric-row"><span>Configured stops</span><strong>{stops.length.toString().padStart(2, "0")}</strong></div>
        <div className="metric-row"><span>Candidate routes</span><strong>{routes.length.toString().padStart(2, "0")}</strong></div>
        <Link className="text-link" href="/about">Data sources & limitations →</Link>
      </aside>
    </div>

    <section className="section-block">
      <div className="section-heading"><div><p className="eyebrow">STOP STATUS</p><h2>Stops</h2></div></div>
      {visibleStops.length ? <div className="stop-grid">{visibleStops.map((stop) => {
        const stopReports = reports.filter((report) => report.stop_id === stop.id);
        const latest = [...stopReports].sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
        const freshness = latest ? classifyFreshness(latest.observed_at) : "No recent data";
        return <Link className="stop-card panel" href={`/stop/${encodeURIComponent(stop.id)}${demoMode ? "?demo=1" : ""}`} key={stop.id}>
          <div className="card-topline"><span className="location-label">{stop.city}</span><span className={`freshness-chip freshness-${freshness.toLowerCase().replaceAll(" ", "-")}`}>{freshness}</span></div>
          <h3>{stop.name}</h3><p className="latest-description">{latest ? reportTitle(latest.report_type) : "No recent reports available."}</p>
          <CrowdBar level={latest?.crowd_level} />
          {stop.is_demo && <span className="demo-note">Fictional demo stop</span>}
        </Link>;
      })}</div> : <p className="empty-state panel">No configured stops. Explore fictional demo data or check back after the route catalogue is configured.</p>}
    </section>

  </>;
}

export function ReportRow({ report, stop }: { report: Report; stop?: Stop }) {
  const [status, setStatus] = useState("");
  async function flag() {
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(report.id)}/flag`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "inaccurate" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit flag.");
      setStatus("Flag submitted for review.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not submit flag.");
    }
  }
  return <article className="report-row"><span className="timeline-dot" /><div className="report-copy">
    <div className="report-row-heading"><strong>{reportTitle(report.report_type)}</strong><time className="time-ago" dateTime={report.observed_at}>{timeAgo(report.observed_at)}</time></div>
    <p>{report.description || `Passenger observation for ${stop?.name ?? "a stop"}.`}</p>
    <div className="report-meta"><span>{stop?.name ?? report.city}</span>
      <span className={`source-chip ${report.source_type === "demonstration" || report.is_demo ? "source-demo" : "source-community"}`}><i />{report.source_type === "demonstration" || report.is_demo ? "Demo data" : "Passenger observation"}</span>
      <span className={`freshness-chip freshness-${classifyFreshness(report.observed_at).toLowerCase().replaceAll(" ", "-")}`}>{classifyFreshness(report.observed_at)}</span>
      {report.source_type === "community" && !report.is_demo && <button className="flag-button" type="button" onClick={flag}>Flag as inaccurate</button>}
      {status && <span role="status">{status}</span>}
    </div>
    {report.submitted_at !== report.observed_at && <p className="submitted-time">Observed {new Date(report.observed_at).toLocaleString()} · Submitted {new Date(report.submitted_at).toLocaleString()}</p>}
  </div></article>;
}

export function reportTitle(type: Report["report_type"]) {
  return ({
    bus_seen: "Bus seen at stop", bus_delayed: "Bus delay reported", no_recent_bus: "No recent arrival observed",
    bus_crowded: "Crowding reported", bus_full: "Bus full / unable to board", route_disruption: "Possible disruption reported",
    correction: "Route or stop correction suggested", other: "Transport update reported",
  })[type];
}

export function timeAgo(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
