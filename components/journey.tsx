"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SummaryCard } from "@/components/summary-card";
import { StopMap } from "@/components/stop-map";
import { CROWD_LEVELS, type Report, type Route, type Stop } from "@/lib/types";

const universities = [
  "University of Sindh Jamshoro", "Mehran University MUET Jamshoro", "LUMHS Jamshoro",
  "Isra University Hyderabad", "Indus Medical College Tando Allahyar Road",
  "Government College University Hyderabad", "University of Hyderabad", "Iqra University Hyderabad", "SZABIST Hyderabad",
];
const destinations = ["Hyder Chowk", "Saddar", "Hala Naka", "Qasimabad", "Latifabad", "Kotri", "Jamshoro Phatak"];
const levels = ["Empty", "Moderate", "Crowded", "Full", "Delayed"] as const;
type Level = (typeof levels)[number];
const crowdForLevel: Record<Level, (typeof CROWD_LEVELS)[number]> = { Empty: "low", Moderate: "moderate", Crowded: "high", Full: "full", Delayed: "unknown" };

export function Journey({ stops, routes, reports }: { stops: Stop[]; routes: Route[]; reports: Report[] }) {
  const router = useRouter();
  const [step, setStep] = useState(2);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [university, setUniversity] = useState("");
  const [destination, setDestination] = useState("");
  const [routeId, setRouteId] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [language, setLanguage] = useState<"English" | "Urdu">("English");
  const [gpsMessage, setGpsMessage] = useState("");
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("busbatao-rider-name") || "");
    setLocation(localStorage.getItem("busbatao-rider-location") || "");
    const saved = localStorage.getItem("busbatao-saved-route");
    if (saved) {
      try {
        const value = JSON.parse(saved) as { routeId?: string; university?: string; destination?: string };
        if (value.routeId) setRouteId(value.routeId);
        if (value.university) setUniversity(value.university);
        if (value.destination) setDestination(value.destination);
        if (value.routeId && routes.some((route) => route.id === value.routeId)) setStep(7);
      } catch { localStorage.removeItem("busbatao-saved-route"); }
    }
  }, [routes]);

  useEffect(() => {
    localStorage.setItem("busbatao-rider-name", name);
    localStorage.setItem("busbatao-rider-location", location);
  }, [location, name]);

  const selectedRoute = routes.find((route) => route.id === routeId);
  const routeReports = useMemo(() => reports.filter((report) => report.route_id === routeId), [reports, routeId]);
  const recommendations = useMemo(() => routes.filter((route) => route.city === "Hyderabad" || route.city === "Jamshoro")
    .map((route) => {
      const evidence = reports.filter((report) => report.route_id === route.id && !report.is_demo);
      const crowdRank: Record<string, number> = { low: 0, moderate: 1, medium: 1, high: 2, full: 3, unknown: 4 };
      const recent = evidence.slice().sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
      return { route, evidence, score: (recent ? crowdRank[recent.crowd_level] ?? 4 : 5) + (recent?.service_status === "delayed" ? 2 : 0) };
    }).sort((a, b) => a.score - b.score), [reports, routes]);
  const reportableRoute = selectedRoute && !selectedRoute.is_demo && selectedRoute.verification_status === "verified" ? selectedRoute : undefined;
  const latest = routeReports.slice().sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
  const crowdPrediction = predictCrowdFromSavedReports(routeReports);

  function next() {
    if (step === 2 && !name.trim() || step === 3 && !university || step === 4 && !destination) return;
    setStep((value) => Math.min(9, value + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setStep((value) => Math.max(2, value - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function swipeEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 75 || Math.abs(dy) > 90) return;
    if (dx < 0) next(); else back();
  }
  function getLocation() {
    if (!navigator.geolocation) { setGpsMessage("Location is unavailable in this browser. Type your location instead."); return; }
    setGpsMessage("Getting your location…");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      setGpsMessage("Location found on this device. It is not stored as a live location.");
    }, () => setGpsMessage("Location permission was not granted. Type your location instead."), { timeout: 8000 });
  }
  function saveRoute() {
    localStorage.setItem("busbatao-saved-route", JSON.stringify({ university, destination, routeId }));
    setReportStatus("Your route is saved on this device.");
  }
  async function submitQuickReport(level: Level) {
    setReportBusy(true); setReportStatus("");
    try {
      if (!reportableRoute) throw new Error("A verified shared route is needed before a report can be saved. Your selection has not been submitted.");
      const reporterKey = "busbatao-reporter-id";
      let reporterId = localStorage.getItem(reporterKey);
      if (!reporterId) { reporterId = crypto.randomUUID(); localStorage.setItem(reporterKey, reporterId); }
      const delayed = level === "Delayed";
      const response = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: reportableRoute.city, routeId: reportableRoute.id,
          reportType: delayed ? "bus_delayed" : level === "Full" ? "bus_full" : "bus_crowded",
          serviceStatus: delayed ? "delayed" : level === "Full" ? "full" : "crowded",
          crowdLevel: crowdForLevel[level], observedAt: new Date().toISOString(), reporterId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report could not be saved.");
      setReportStatus(`Thank you${name ? `, ${name}` : ""}! Your report was saved for other riders.`);
      router.refresh();
    } catch (error) { setReportStatus(error instanceof Error ? error.message : "Report could not be saved. Please try again."); }
    finally { setReportBusy(false); }
  }

  const titles = ["", "Your name and location", "Choose your university", "Where are you headed?", "Route suggestions", "Your map", "Crowd and delay", "Quick report", "Save and share", "Ready for your trip"];
  return <div className="page-shell journey-shell" key={step} onTouchStart={(event) => { const touch = event.touches[0]; swipeStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={swipeEnd}>
    <div className="journey-progress"><span>STEP {step} OF 9</span><div><i style={{ width: `${step / 9 * 100}%` }} /></div></div>
    <p className="eyebrow">HYDERABAD + JAMSHORO</p>
    <h1>{step === 2 && name ? `Hi ${name}!` : titles[step]}</h1>
    {step === 2 && <section className="journey-card panel">
      <label className="form-label" htmlFor="rider-name">Hi! What is your name?</label><input id="rider-name" className="journey-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="given-name" />
      <label className="form-label" htmlFor="rider-location">Where are you now?</label><button className="button button-secondary" type="button" onClick={getLocation}>Use my location</button>
      <input id="rider-location" className="journey-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Type your area or landmark" />
      {gpsMessage && <p className="muted" role="status">{gpsMessage}</p>}
      <p className="small muted">Your typed location stays on this device. BusBatao does not track a live position.</p>
    </section>}
    {step === 3 && <div className="university-grid">{universities.map((item, index) => <button type="button" key={item} className={`university-card panel ${university === item ? "selected" : ""}`} onClick={() => setUniversity(item)}><span className="university-mark" aria-hidden="true">{["SU", "MU", "LU", "IU", "IM", "GC", "UH", "IQ", "SZ"][index]}</span><strong>{item}</strong></button>)}</div>}
    {step === 4 && <><p className="subtitle">Choose the destination you want to reach.</p><div className="destination-grid">{destinations.map((item) => <button type="button" className={`choice-button ${destination === item ? "selected" : ""}`} aria-pressed={destination === item} key={item} onClick={() => setDestination(item)}>{item}</button>)}</div></>}
    {step === 5 && <section className="journey-card panel recommendation-card"><p className="eyebrow">SMART SUGGESTION · SAVED REPORTS</p>
      {recommendations.length ? <>
        <h2>Best available route</h2><p className="muted">Ranked from saved passenger reports. Fare and travel time are not listed in the verified catalogue.</p>
        {recommendations[0].evidence.length > 0 ? <button type="button" className={`route-option route-best panel ${routeId === recommendations[0].route.id ? "selected" : ""}`} onClick={() => setRouteId(recommendations[0].route.id)}><span className="route-ribbon">Best crowd report</span><strong>{recommendations[0].route.name}</strong><span>{recommendations[0].route.origin} → {recommendations[0].route.destination}</span><small>Most recent crowd report: {recommendations[0].evidence[0].crowd_level} · {recommendations[0].route.verification_status}</small></button> : <p className="empty-state">No saved reports to rank these routes yet. Choose a route to view its status.</p>}
        {recommendations.slice(1).map(({ route, evidence }) => <button key={route.id} type="button" className={`route-option panel ${routeId === route.id ? "selected" : ""}`} onClick={() => setRouteId(route.id)}><strong>{route.name}</strong><span>{route.origin} → {route.destination}</span><small>{evidence.length ? `${evidence.length} saved report${evidence.length === 1 ? "" : "s"}` : "No passenger reports yet"} · {route.verification_status}</small></button>)}
        {selectedRoute && <p className="inline-error" role="status">{selectedRoute.verification_status !== "verified" ? "This route is an unverified candidate. It cannot be used to submit a shared passenger report." : "Route selected. Fare and travel time have not been published."}</p>}
      </> : <div className="empty-state"><strong>No route data is available yet.</strong><p>We cannot safely recommend a bus until a route has been added to the shared catalogue.</p></div>}
      <p className="small muted">{destination ? `Destination: ${destination}. ` : "Choose a destination in the previous step. "}Suggested university: {university || "not selected"}.</p>
    </section>}
    {step === 6 && <section className="journey-card panel"><h2>Map</h2><p className="muted">The map opens automatically. It shows configured stop locations only; no live bus position is available.</p>
      {stops.some((stop) => stop.latitude !== null && stop.longitude !== null) ? <StopMap stops={stops} reports={reports} /> : <div className="map-fallback"><span className="map-bus" aria-hidden="true">🚌</span><strong>{location || "Starting location not set"}</strong><span>→</span><strong>{destination || university || "Destination not selected"}</strong><p>No verified coordinates are available for this route. Route text and crowd information remain available.</p></div>}
    </section>}
    {step === 7 && <section className="journey-card panel crowd-hero" key={routeId || "no-route"}>
      {selectedRoute ? <><p className="eyebrow">LIVE REPORT SUMMARY</p><h2>{selectedRoute.name}</h2><div className={`crowd-status ${latest?.crowd_level === "full" ? "danger" : ""}`}>{latest ? latest.crowd_level === "low" ? "Empty" : latest.crowd_level : "Unknown"}</div>
        <p>{latest ? `Last passenger report ${timeAgo(latest.observed_at)}.` : "No recent passenger reports. Crowd level is unknown."}</p>
        <div className="prediction-note"><strong>Historical crowd estimate</strong><span>{crowdPrediction.level ? `${crowdPrediction.level} · ${crowdPrediction.samples} saved reports from the same hour in the last three days.` : "Not enough saved history for an estimate. Current crowd is unknown."}</span></div>
        {routeReports.filter((report) => report.service_status === "delayed" && Date.now() - Date.parse(report.observed_at) < 60 * 60_000).length >= 3 && <div className="delay-alert" role="alert">This bus may be delayed. Three or more delay reports were saved in the last hour; consider the next route.</div>}
        <SummaryCard targetType="route" targetId={selectedRoute.id} reports={routeReports} label={selectedRoute.name} autoAnalyze />
        <p className="small muted">AI output is shown only when the configured service responds. With no evidence, the prediction stays unknown.</p>
      </> : <div className="empty-state"><strong>Crowd level: Unknown</strong><p>Select a route first. There are no route reports to calculate a prediction from.</p></div>}
    </section>}
    {step === 8 && <section className="journey-card panel"><h2>You are in the bus? Help others</h2><p className="muted">One tap reports the current observation to the shared database.</p><div className="quick-report-row">{levels.map((level) => <button key={level} type="button" className={`button ${level === "Full" ? "button-danger" : level === "Empty" ? "button-yellow" : ""}`} disabled={reportBusy} onClick={() => void submitQuickReport(level)}>{level}</button>)}</div>
      {reportStatus && <p role="status" className="form-success">{reportStatus}</p>}
      <details className="optional-feedback"><summary>Did BusBatao help you today? (optional)</summary><div className="journey-actions"><button className="button button-secondary" type="button" onClick={() => void sendFeedback(true)}>👍 Yes</button><button className="button button-secondary" type="button" onClick={() => void sendFeedback(false)}>👎 No</button></div><label className="form-label" htmlFor="journey-feedback">Any problem? (optional)</label><input id="journey-feedback" className="journey-input" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Tell us briefly" /><button className="button button-secondary" type="button" onClick={() => void sendFeedback(true)}>Send</button></details>
    </section>}
    {step === 9 && <section className="journey-card panel"><h2>Your trip</h2><p>{university || "University not selected"} · {destination || "Destination not selected"}</p>
      <div className="journey-actions"><button className="button button-yellow" type="button" onClick={saveRoute}>Save my route</button>
        <button className="button" type="button" onClick={() => { const message = `BusBatao: ${selectedRoute?.name ?? "Bus route"} — latest crowd: ${latest?.crowd_level ?? "unknown"}. Check passenger reports before you go.`; window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }}>Share on WhatsApp</button>
        <button className="button button-secondary" type="button" onClick={() => setLanguage((value) => { const nextLanguage = value === "English" ? "Urdu" : "English"; document.documentElement.lang = nextLanguage === "English" ? "en" : "ur"; localStorage.setItem("busbatao-language", nextLanguage); return nextLanguage; })}>{"\u0627\u0631\u062f\u0648"} / English · {language}</button>
      </div>{reportStatus && <p role="status">{reportStatus}</p>}
      <p className="small muted">Saved on this device. Shared reports remain subject to the database configuration.</p>
    </section>}
    <div className="journey-controls">{step > 2 && <button type="button" className="button button-secondary" onClick={back}>Back</button>}
      {step < 9 && <button type="button" className="button" disabled={step === 2 && !name.trim() || step === 3 && !university || step === 4 && !destination} onClick={next}>{step === 5 ? "Open map" : step === 6 ? "See crowd status" : "Next"} <span aria-hidden="true">→</span></button>}
    </div>
  </div>;

  async function sendFeedback(helpful: boolean) {
    if (!reportableRoute) { setReportStatus("A verified shared route is needed to save feedback."); return; }
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: "route", targetId: reportableRoute.id, helpful }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Feedback could not be saved.");
      setReportStatus("Thank you. Your feedback was saved.");
    } catch (error) { setReportStatus(error instanceof Error ? error.message : "Feedback could not be saved."); }
  }
}

function timeAgo(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  return minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hr ago`;
}

// AI Prediction Engine: use the modal crowd level from persisted reports at this hour over the past three days.
// It stays unknown until at least three matching observations exist; it never fabricates a live bus position.
function predictCrowdFromSavedReports(reports: Report[]) {
  const now = new Date();
  const sameHour = reports.filter((report) => {
    const date = new Date(report.observed_at);
    return now.getTime() - date.getTime() <= 3 * 24 * 60 * 60_000
      && date.getHours() === now.getHours()
      && report.crowd_level !== "unknown";
  });
  if (sameHour.length < 3) return { level: "", samples: sameHour.length };
  const counts = new Map<string, number>();
  for (const report of sameHour) counts.set(report.crowd_level, (counts.get(report.crowd_level) ?? 0) + 1);
  const level = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  return { level, samples: sameHour.length };
}
