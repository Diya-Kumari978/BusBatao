"use client";

import dynamic from "next/dynamic";
import type { Report, Route, Stop } from "@/lib/types";

const LeafletMap = dynamic(() => import("./stop-map-inner"), {
  ssr: false,
  loading: () => <div className="map-loading panel" role="status">Loading OpenStreetMap…</div>,
});

export function StopMap({ stops, reports, route }: { stops: Stop[]; reports: Report[]; route?: Route }) {
  return <section className="map-section" aria-label="Map of configured transport stops">
    <LeafletMap stops={stops} reports={reports} route={route} />
    {route && <p className="map-route-text"><strong>Route points:</strong> {route.description?.split("Ordered points:")[1]?.split(". This is")[0]?.trim() || `${route.origin} → ${route.destination}`}<br />{route.verification_status !== "verified" && <span>Map path is approximate and the proposed route has not been operator verified.</span>}</p>}
    <p className="map-attribution">Map data © OpenStreetMap contributors</p>
  </section>;
}
