"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { classifyFreshness } from "@/lib/analysis";
import type { Report, Stop } from "@/lib/types";
import { reportTitle } from "./dashboard";
import { timeAgo } from "./dashboard";

export default function StopMapInner({ stops, reports }: { stops: Stop[]; reports: Report[] }) {
  const mappedStops = stops.filter((stop) => stop.latitude !== null && stop.longitude !== null);
  const latestByStop = new Map<string, Report>();
  for (const report of reports) {
    if (!report.stop_id) continue;
    const latest = latestByStop.get(report.stop_id);
    if (!latest || Date.parse(report.observed_at) > Date.parse(latest.observed_at)) latestByStop.set(report.stop_id, report);
  }
  const center: [number, number] = mappedStops.length
    ? [mappedStops[0].latitude!, mappedStops[0].longitude!]
    : [25.4, 68.3];

  return <div className="map-frame">
    {mappedStops.length ? <MapContainer center={center} zoom={10} scrollWheelZoom={false} className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappedStops.map((stop) => {
        const latest = latestByStop.get(stop.id);
        return <CircleMarker key={stop.id} center={[stop.latitude!, stop.longitude!]} radius={8} pathOptions={{ color: "#16A34A", fillColor: "#16A34A", fillOpacity: 0.85 }}>
          <Popup><strong>{stop.name}</strong><br />
            Latest report: {latest ? reportTitle(latest.report_type) : "None"}<br />
            Crowd level: {latest?.crowd_level ?? "unknown"}<br />
            Report age: {latest ? `${classifyFreshness(latest.observed_at)} · ${timeAgo(latest.observed_at)}` : "No report"}
          </Popup>
        </CircleMarker>;
      })}
    </MapContainer> : <div className="map-empty panel">
      <strong>No verified stop coordinates are configured.</strong>
      <p>Only stops with saved coordinates are shown. No live bus positions are displayed.</p>
    </div>}
  </div>;
}
