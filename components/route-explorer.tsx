"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { classifyFreshness, independentRecentReports } from "@/lib/analysis";
import { CITIES, type City, type Report, type Route } from "@/lib/types";
import { verificationLabel } from "./data-ui";

export function RouteExplorer({ routes, reports, demoMode = false }: { routes: Route[]; reports: Report[]; demoMode?: boolean }) {
  const [city, setCity] = useState<City | "All">("All");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => routes.filter((route) =>
    (city === "All" || route.city === city)
    && `${route.route_code} ${route.name} ${route.origin} ${route.destination}`.toLowerCase().includes(query.toLowerCase()),
  ), [city, query, routes]);
  return <section className="route-explorer">
    <div className="route-filters panel">
      <label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Search by route code, stop, or destination</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Route code, stop, or destination" /></label>
      <label className="city-select"><span className="sr-only">Filter routes by city</span><select value={city} onChange={(event) => setCity(event.target.value as City | "All")}><option value="All">All service areas</option>{CITIES.map((value) => <option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="route-list-heading"><strong>{visible.length} route record{visible.length === 1 ? "" : "s"}</strong><span>Published catalogue and clearly marked suggestions</span></div>
    {visible.length ? <div className="route-grid route-grid-explorer">{visible.map((route) => {
      const routeReports = reports.filter((report) => report.route_id === route.id);
      const recent = independentRecentReports(routeReports);
      const latest = recent[0];
      return <Link className="route-card panel" href={`/routes/${route.id}${demoMode ? "?demo=1" : ""}`} key={route.id}>
        <div className="card-topline"><span className="route-code">{route.route_code}</span><span className={`verification-chip verification-${route.verification_status}`}>{verificationLabel(route.verification_status)}</span></div>
        <h3>{route.name}</h3><p className="route-endpoints">{route.origin} <span aria-hidden="true">→</span> {route.destination}</p>
        <div className="route-card-bottom"><span>{route.city} · Published status: {route.published_status}</span>
          <span>{latest ? `${classifyFreshness(latest.observed_at)} · ${new Date(latest.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No recent reports"}</span></div>
        <p className="source-caption">{route.source_name}</p>
      </Link>;
    })}</div> : <div className="empty-state panel"><p>No routes match these filters.</p><Link className="text-link" href="/routes/suggest">Suggest a Jamshoro route →</Link></div>}
    <div className="suggest-banner panel"><div><p className="eyebrow">KNOW A LOCAL ROUTE?</p><h2>Help fill the Jamshoro information gap.</h2><p>Suggestions stay unverified until reviewed; they do not appear as published service.</p></div><Link className="button button-small" href="/routes/suggest">Suggest a route</Link></div>
  </section>;
}
