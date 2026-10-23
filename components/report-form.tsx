"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES, CROWD_LEVELS, REPORT_TYPES, type City, type Report, type Route, type Stop } from "@/lib/types";

const reportLabels: Record<(typeof REPORT_TYPES)[number], string> = {
  bus_seen: "Bus seen",
  bus_delayed: "Bus delayed",
  no_recent_bus: "No recent arrival observed",
  bus_crowded: "Bus is crowded",
  bus_full: "Full / unable to board",
  route_disruption: "Possible disruption",
  correction: "Suggest information correction",
  other: "Other transport update",
};
const statusForReport: Record<(typeof REPORT_TYPES)[number], Report["service_status"]> = {
  bus_seen: "seen", bus_delayed: "delayed", no_recent_bus: "not_seen", bus_crowded: "crowded",
  bus_full: "full", route_disruption: "disrupted", correction: "unknown", other: "unknown",
};
const crowdLabels: Record<(typeof CROWD_LEVELS)[number], string> = {
  low: "Low", moderate: "Moderate", high: "High", full: "Full / unable to board", unknown: "Unknown",
};

export function ReportForm({ stops, routes }: { stops: Stop[]; routes: Route[] }) {
  const router = useRouter();
  const [city, setCity] = useState<City>("Hyderabad");
  const [stopId, setStopId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number] | "">("");
  const [crowdLevel, setCrowdLevel] = useState<(typeof CROWD_LEVELS)[number]>("unknown");
  const [description, setDescription] = useState("");
  const [observedAt, setObservedAt] = useState(() => toDateTimeLocal(new Date()));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cityStops = stops.filter((stop) => stop.city === city);
  const cityRoutes = routes.filter((route) => route.city === city);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!reportType) { setError("Choose what you observed before submitting."); return; }
    if (!stopId && !routeId) { setError("Select a stop or a route."); return; }
    if (description.trim().length > 240) { setError("Keep the description to 240 characters or fewer."); return; }
    setBusy(true);
    const reporterId = getReporterId();
    const input = {
      city, stopId: stopId || undefined, routeId: routeId || undefined, reportType,
      serviceStatus: statusForReport[reportType], crowdLevel, description: description.trim() || undefined,
      observedAt: new Date(observedAt).toISOString(), reporterId,
    };
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json();
      if (response.ok && result.report) {
        const destination = routeId
          ? `/routes/${encodeURIComponent(routeId)}`
          : `/stop/${encodeURIComponent(stopId)}`;
        router.push(destination);
        router.refresh();
        return;
      } else {
        throw new Error(result.error || "Your report could not be saved. Please try again.");
      }
      setReportType("");
      setDescription("");
      setCrowdLevel("unknown");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Report could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="report-form panel" onSubmit={submit}>
    <div className="form-grid-two">
      <div className="form-section"><label className="form-label" htmlFor="city">City / service area</label>
        <select id="city" value={city} onChange={(event) => { setCity(event.target.value as City); setStopId(""); setRouteId(""); }} required>
          {CITIES.map((item) => <option key={item}>{item}</option>)}
        </select></div>
      <div className="form-section"><label className="form-label" htmlFor="route">Route <span className="muted">(optional)</span></label>
        <select id="route" value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">No route selected</option>
          {cityRoutes.map((route) => <option key={route.id} value={route.id}>{route.route_code} · {route.name} ({route.verification_status})</option>)}</select></div>
    </div>
    <div className="form-section"><label className="form-label" htmlFor="stop">Stop <span className="muted">(optional, select route or stop)</span></label>
      <select id="stop" value={stopId} onChange={(event) => setStopId(event.target.value)}><option value="">No stop selected</option>
        {cityStops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select>
      {!cityStops.length && <p className="field-hint">No verified stops are configured for {city}. A route-only observation is still possible.</p>}
    </div>
    <fieldset className="form-section"><legend className="form-label">What did you observe?</legend><div className="choice-grid">
      {REPORT_TYPES.map((type) => <button type="button" key={type} className={`choice-button ${reportType === type ? "selected" : ""}`} aria-pressed={reportType === type} onClick={() => setReportType(type)}>{reportLabels[type]}</button>)}
    </div></fieldset>
    <fieldset className="form-section"><legend className="form-label">Crowd level</legend><div className="choice-grid crowd-choice-grid">
      {CROWD_LEVELS.map((level) => <button type="button" key={level} className={`choice-button ${crowdLevel === level ? "selected" : ""}`} aria-pressed={crowdLevel === level} onClick={() => setCrowdLevel(level)}>{crowdLabels[level]}</button>)}
    </div></fieldset>
    <div className="form-grid-two">
      <div className="form-section"><label className="form-label" htmlFor="observed">When did you observe this?</label>
        <input id="observed" type="datetime-local" value={observedAt} max={toDateTimeLocal(new Date())} onChange={(event) => setObservedAt(event.target.value)} required />
        <p className="field-hint">Observation time is separate from server submission time.</p></div>
      <div className="form-section"><label className="form-label" htmlFor="description">Details <span className="muted">(optional · 240 characters max)</span></label>
        <textarea id="description" maxLength={240} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Brief details. Do not include personal information." />
        <span className="character-count">{description.length}/240</span></div>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status" className="form-success">{message}</p>}
    <p className="form-consent">Your report is a passenger observation, not an official announcement. Anonymous browser ID is used only to limit repeat submissions.</p>
    <button className="button submit-button" type="submit" disabled={busy}>{busy ? "Saving observation…" : "Submit observation"} <span aria-hidden="true">→</span></button>
  </form>;
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getReporterId() {
  const key = "busbatao-reporter-id";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}
