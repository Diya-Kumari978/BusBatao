"use client";

import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import { classifyFreshness } from "@/lib/analysis";
import type { Report, Route, Stop } from "@/lib/types";
import { reportTitle } from "./dashboard";
import { timeAgo } from "./dashboard";

const points: Record<string, [number, number]> = {
  "nadeem nagar": [25.399, 68.361], "qasimabad": [25.399, 68.357], "market tower": [25.391, 68.373],
  "latifabad unit 1": [25.403, 68.361], "latifabad unit 2": [25.405, 68.364], "latifabad unit 3": [25.407, 68.367],
  "latifabad unit 4": [25.409, 68.37], "latifabad unit 5": [25.411, 68.373], "latifabad unit 6": [25.413, 68.376],
  "latifabad unit 7": [25.415, 68.379], "latifabad unit 8": [25.417, 68.382], "latifabad unit 9": [25.419, 68.385],
  "latifabad unit 10": [25.421, 68.388], "latifabad unit 11": [25.423, 68.391], "latifabad unit 12": [25.425, 68.394],
  "autobahn road": [25.414, 68.38], "wadhu wah": [25.425, 68.275], "jamshoro phatak": [25.428, 68.28],
  "muet gate": [25.434, 68.257], "mehran university (muet)": [25.434, 68.257], "university of sindh gate": [25.431, 68.26],
  "university of sindh city campus": [25.392, 68.371], "lumhs gate": [25.429, 68.263], "lumhs": [25.429, 68.263],
  "isra university": [25.39, 68.32], "saddar": [25.392, 68.373], "hyder chowk": [25.392, 68.371],
  "station road": [25.393, 68.378], "hala naka": [25.405, 68.42], "tando jam": [25.43, 68.533], "kotri": [25.365, 68.305],
  "thandi sarak": [25.393, 68.374], "citizen colony": [25.402, 68.352], "naseem nagar": [25.407, 68.346],
  "kohsar": [25.377, 68.335], "gulistan e sajjad": [25.424, 68.315],
  "fatima jinnah nbp": [25.393, 68.372], "civic center": [25.397, 68.367], "giddu chowk": [25.385, 68.363],
  "qasim chowk": [25.405, 68.377], "central jail hyderabad": [25.414, 68.369], "isra hospital": [25.397, 68.329],
  "hatri police station": [25.438, 68.45], "new sabzi mandi": [25.408, 68.424], "mirrani goth": [25.418, 68.456],
  "tando jam toll": [25.433, 68.523], "detta goth": [25.431, 68.54], "goth misri solangi": [25.43, 68.55],
  "khesana mori": [25.435, 68.572], "rashidabad": [25.442, 68.595], "tando allahyar": [25.465, 68.716],
  "airport road": [25.32, 68.366],
};

export default function StopMapInner({ stops, reports, route }: { stops: Stop[]; reports: Report[]; route?: Route }) {
  const mappedStops = stops.filter((stop) => stop.latitude !== null && stop.longitude !== null);
  const latestByStop = new Map<string, Report>();
  for (const report of reports) {
    if (!report.stop_id) continue;
    const latest = latestByStop.get(report.stop_id);
    if (!latest || Date.parse(report.observed_at) > Date.parse(latest.observed_at)) latestByStop.set(report.stop_id, report);
  }
  const routeNames = route?.description?.match(/(?:Ordered points|Points|Stops in order):\s*([^.]*)/)?.[1]?.split(/→|,/).map((name) => name.trim()) ?? (route ? [route.origin, route.destination] : []);
  const routePoints = routeNames.map((name) => points[name.toLowerCase()]).filter((point): point is [number, number] => Boolean(point));
  const center: [number, number] = routePoints[0] ?? (mappedStops.length ? [mappedStops[0].latitude!, mappedStops[0].longitude!] : [25.4, 68.3]);

  return <div className="map-frame">
    {mappedStops.length || routePoints.length ? <MapContainer key={route?.id || "configured-stops"} center={center} bounds={routePoints.length > 1 ? routePoints : undefined} zoom={routePoints.length ? 10 : 10} scrollWheelZoom={false} className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: "#16A34A", weight: 6, opacity: 0.9 }} />}
      {routePoints.map((point, index) => <CircleMarker key={`route-point-${route?.id}-${index}`} center={point} radius={index === 0 || index === routePoints.length - 1 ? 10 : 6} pathOptions={{ color: index === 0 ? "#15803D" : index === routePoints.length - 1 ? "#D97706" : "#16A34A", fillColor: "#FFFFFF", fillOpacity: 1, weight: 4 }}><Popup>{routeNames[index] || "Route stop"}{index === 0 ? " · Start" : index === routePoints.length - 1 ? " · End / university" : ""}</Popup></CircleMarker>)}
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
      <p>Map unavailable, showing stops. No live bus positions are displayed.</p><ul>{routeNames.length ? routeNames.map((name, index) => <li key={`${name}-${index}`}>{name}</li>) : stops.map((stop) => <li key={stop.id}>{stop.name}</li>)}</ul>
    </div>}
  </div>;
}
