"use client";

import { useMemo, useState } from "react";
import { ReportRow } from "@/components/dashboard";
import { CITIES, REPORT_TYPES, type City, type Report, type Route, type Stop } from "@/lib/types";

export function ReportHistory({ reports, routes, stops, demoMode = false }: { reports: Report[]; routes: Route[]; stops: Stop[]; demoMode?: boolean }) {
  const [city, setCity] = useState<City | "All">("All");
  const [routeId, setRouteId] = useState("All");
  const [stopId, setStopId] = useState("All");
  const [reportType, setReportType] = useState("All");
  const filtered = useMemo(() => [...reports].filter((report) =>
    (city === "All" || report.city === city)
    && (routeId === "All" || report.route_id === routeId)
    && (stopId === "All" || report.stop_id === stopId)
    && (reportType === "All" || report.report_type === reportType),
  ).sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at)), [city, reportType, reports, routeId, stopId]);
  const cityRoutes = routes.filter((route) => city === "All" || route.city === city);
  const cityStops = stops.filter((stop) => city === "All" || stop.city === city);
  return <section className="history-page">
    <div className="history-filters panel">
      <label>City<select value={city} onChange={(event) => { setCity(event.target.value as City | "All"); setRouteId("All"); setStopId("All"); }}><option value="All">All areas</option>{CITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Route<select value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="All">All routes</option>{cityRoutes.map((route) => <option key={route.id} value={route.id}>{route.route_code} · {route.name}</option>)}</select></label>
      <label>Stop<select value={stopId} onChange={(event) => setStopId(event.target.value)}><option value="All">All stops</option>{cityStops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></label>
      <label>Observation type<select value={reportType} onChange={(event) => setReportType(event.target.value)}><option value="All">All types</option>{REPORT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
    </div>
    <div className="route-list-heading"><strong>{filtered.length} observation{filtered.length === 1 ? "" : "s"}</strong><span>Newest observation first · {demoMode ? "Fictional demo data only" : "Community-submitted records only"}</span></div>
    {filtered.length ? <div className="report-list panel">{filtered.map((report) => <ReportRow key={report.id} report={report} stop={stops.find((stop) => stop.id === report.stop_id)} />)}</div>
      : <div className="empty-state panel"><strong>No recent reports available.</strong><p>Try another filter, share a new observation, or explore isolated demonstration data.</p></div>}
  </section>;
}
