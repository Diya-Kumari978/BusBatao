"use client";

import { useState } from "react";
import { CITIES, type City } from "@/lib/types";

export function RouteSuggestionForm() {
  const [city, setCity] = useState<City>("Jamshoro");
  const [routeCode, setRouteCode] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/route-suggestions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, routeCode: routeCode || undefined, name, origin, destination, details: details || undefined, stops: stops.split("\n").map((stop) => stop.trim()).filter(Boolean) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save route suggestion.");
      setMessage("Suggestion submitted for review. It is not published or verified.");
      setRouteCode(""); setName(""); setOrigin(""); setDestination(""); setStops(""); setDetails("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit route suggestion.");
    } finally { setBusy(false); }
  }

  return <form className="report-form panel" onSubmit={submit}>
    <div className="form-grid-two"><div className="form-section"><label className="form-label" htmlFor="suggest-city">City</label><select id="suggest-city" value={city} onChange={(event) => setCity(event.target.value as City)}>{CITIES.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="form-section"><label className="form-label" htmlFor="route-code">Route code <span className="muted">(optional)</span></label><input id="route-code" value={routeCode} maxLength={40} onChange={(event) => setRouteCode(event.target.value)} placeholder="For example, if publicly listed" /></div></div>
    <div className="form-section"><label className="form-label" htmlFor="route-name">Route name</label><input id="route-name" required minLength={3} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div>
    <div className="form-grid-two"><div className="form-section"><label className="form-label" htmlFor="origin">Origin</label><input id="origin" required minLength={2} maxLength={120} value={origin} onChange={(event) => setOrigin(event.target.value)} /></div>
      <div className="form-section"><label className="form-label" htmlFor="destination">Destination</label><input id="destination" required minLength={2} maxLength={120} value={destination} onChange={(event) => setDestination(event.target.value)} /></div></div>
    <div className="form-section"><label className="form-label" htmlFor="stops">Stops, one per line <span className="muted">(optional)</span></label><textarea id="stops" rows={4} maxLength={1800} value={stops} onChange={(event) => setStops(event.target.value)} /></div>
    <div className="form-section"><label className="form-label" htmlFor="details">Source or supporting details <span className="muted">(optional)</span></label><textarea id="details" rows={3} maxLength={240} value={details} onChange={(event) => setDetails(event.target.value)} /></div>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
    <p className="form-consent">Suggestions enter a review queue. Submission does not make a route official or verified.</p>
    <button className="button submit-button" disabled={busy}>{busy ? "Submitting…" : "Submit route suggestion"}</button>
  </form>;
}
