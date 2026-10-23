"use client";

import dynamic from "next/dynamic";
import type { Report, Stop } from "@/lib/types";

const LeafletMap = dynamic(() => import("./stop-map-inner"), {
  ssr: false,
  loading: () => <div className="map-loading panel" role="status">Loading OpenStreetMap…</div>,
});

export function StopMap({ stops, reports }: { stops: Stop[]; reports: Report[] }) {
  return <section className="map-section" aria-label="Map of configured transport stops">
    <LeafletMap stops={stops} reports={reports} />
    <p className="map-attribution">Map data © OpenStreetMap contributors</p>
  </section>;
}
