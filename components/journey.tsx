"use client";

import { useEffect, useMemo, useState } from "react";
import { MovingBus } from "@/components/moving-bus";
import { RouteAnalysis } from "@/components/route-analysis";
import { getLocalRouteCandidates } from "@/lib/route-match";
import type { Report, Route, Stop } from "@/lib/types";

const places = ["Latifabad", "Qasimabad", "Hyderabad City", "Jamshoro"] as const;
const universities = ["University of Modern Sciences, Jamshoro", "University of Sindh, Jamshoro", "Mehran University of Engineering and Technology, Jamshoro", "Liaquat University of Medical and Health Sciences, Jamshoro", "Isra University, Hyderabad", "Government College University, Hyderabad", "University of Hyderabad", "Iqra University, Hyderabad", "SZABIST, Hyderabad", "Indus Medical College, Tando Muhammad Khan", "Sindh Agriculture University, Tando Jam", "Government College of Technology, Hyderabad"] as const;
const crowdChoices = ["Empty", "Moderate", "Crowded", "Full"] as const;
const busChoices = ["Bus is Moving", "Bus is Stuck", "Bus is Delayed"] as const;
const roadChoices = ["Road is Clear", "Road is Traffic", "City is Crowded"] as const;
const areaRouteKey = (area: string) => `passenger-area-${area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
type Crowd = (typeof crowdChoices)[number];

export function Journey({ stops: _stops, routes, reports }: { stops: Stop[]; routes: Route[]; reports: Report[] }) {
  void _stops;
  const [view, setView] = useState<"home" | "report" | "path" | "result">("home");
  const [from, setFrom] = useState<(typeof places)[number] | "">("");
  const [destination, setDestination] = useState("");
  const [userLocation, setUserLocation] = useState<(typeof places)[number] | "">("");
  const [name, setName] = useState("");
  const [crowd, setCrowd] = useState<Crowd | "">("");
  const [busCondition, setBusCondition] = useState("");
  const [roadCondition, setRoadCondition] = useState("");
  const [reportDateTime, setReportDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [reportList, setReportList] = useState<Report[]>(reports.filter((report) => !report.is_demo && isFresh(report)));
  const [routeId, setRouteId] = useState("");
  const [showDestination, setShowDestination] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");

  const activeOrigin = view === "path" || view === "result" ? from : userLocation;
  const activeDestination = destination;
  const liveRouteId = activeOrigin ? areaRouteKey(activeOrigin) : "";
  const routeCandidates = useMemo(() => activeDestination ? getLocalRouteCandidates(activeOrigin || "Latifabad", activeDestination) : [], [activeOrigin, activeDestination]);
  const catalogRoutes = useMemo(() => routes.filter((route) => route.city === "Hyderabad" || route.city === "Jamshoro"), [routes]);
  const candidates = useMemo(() => {
    const combined = [...routeCandidates, ...catalogRoutes];
    const seen = new Set<string>();
    return combined.filter((route) => {
      const key = `${route.origin.toLowerCase()}|${route.destination.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [routeCandidates, catalogRoutes]);
  const route = candidates.find((item) => item.id === routeId) ?? candidates[0];
  const latest = reportList.filter((item) => Boolean(activeOrigin) && item.reporter_location?.toLowerCase() === activeOrigin.toLowerCase() && item.crowd_level !== "unknown" && !item.is_demo && isFresh(item))
    .sort((a, b) => Date.parse(b.updated_at || b.submitted_at) - Date.parse(a.updated_at || a.submitted_at))[0];
  const routeDirection = activeOrigin && activeDestination ? `${activeOrigin} → ${/jamshoro|kotri/i.test(activeOrigin) ? "Jamshoro" : "Hyderabad"} → ${activeDestination}` : activeOrigin ? `${activeOrigin} · Choose a university to see your direction` : "Select a starting area to see your direction";

  useEffect(() => {
    try {
      setReportList((old) => {
        const local = JSON.parse(localStorage.getItem("busbatao-crowd-reports") || "[]") as Report[];
        return [...old, ...local.filter((item) => isFresh(item) && !old.some((existing) => existing.id === item.id))];
      });
    } catch { /* ignore a damaged local cache */ }
  }, []);

  useEffect(() => {
    const title = "BUS BATAO";
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedTitle(title.slice(0, index));
      if (index >= title.length) window.clearInterval(timer);
    }, 170);
    return () => window.clearInterval(timer);
  }, []);

  function selectView(next: typeof view) {
    if (next === "report") {
      setName(""); setUserLocation(""); setCrowd(""); setBusCondition(""); setRoadCondition("");
      setReportDateTime(toLocalDateTimeInput(new Date()));
    }
    if (next === "path") {
      setShowDestination(false);
      setRouteId("");
    }
    setMessage("");
    setView(next);
  }

  async function submitReport(update = false) {
    if (!route || !crowd || (!update && !name.trim()) || !userLocation || (!update && (!busCondition || !roadCondition || !reportDateTime))) {
      setMessage(!name.trim() && !update ? "Please type your name" : "Choose your location, crowd, bus, road, and time details first.");
      return;
    }
    setSaving(true);
    setMessage("");
    const reporterIdKey = "busbatao-reporter-id";
    let reporterId = localStorage.getItem(reporterIdKey);
    if (!reporterId) { reporterId = crypto.randomUUID(); localStorage.setItem(reporterIdKey, reporterId); }
    const observed = new Date(update ? Date.now() : reportDateTime).toISOString();
    const ageMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(observed)) / 60_000));
    const level = crowd === "Empty" ? "low" : crowd === "Moderate" ? "moderate" : crowd === "Crowded" ? "high" : "full";
    const oldDetails = latest?.description?.split(";").map((part) => part.trim()).filter(Boolean) ?? [];
    const descriptor = [busCondition || (update ? oldDetails.find((part) => part.startsWith("Bus is")) : ""), roadCondition || (update ? oldDetails.find((part) => part.startsWith("Road is") || part.startsWith("City is")) : ""), `${ageMinutes} minutes ago`].filter(Boolean).join("; ");
    const payload = {
      city: /jamshoro|kotri/i.test(userLocation) ? "Jamshoro" : "Hyderabad", routeId: liveRouteId || areaRouteKey(userLocation),
      reportType: busCondition === "Bus is Delayed" ? "bus_delayed" : crowd === "Full" ? "bus_full" : "bus_crowded",
      serviceStatus: busCondition === "Bus is Delayed" ? "delayed" : crowd === "Full" ? "full" : "crowded",
      crowdLevel: level, observedAt: observed, reporterId, reporterName: name.trim() || (update ? latest?.reporter_name : "") || "Passenger", reporterLocation: userLocation,
      busNumber: "", busLocation: userLocation, isOnBus: "skip", leftMinutesAgo: ageMinutes,
      description: descriptor.slice(0, 240) || undefined,
    };
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report could not be saved.");
      const saved = result.report as Report;
      setReportList((old) => [saved, ...old.filter((item) => item.id !== saved.id)]);
      localStorage.setItem("busbatao-rider-name", name.trim());
      localStorage.setItem("busbatao-last-report", JSON.stringify(saved));
      setMessage("Thank you, your report is live now");
      window.setTimeout(() => setView("home"), 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report could not be saved.");
    } finally { setSaving(false); }
  }

  return <div className="page-shell journey-shell">
    {view === "home" && <div className="typewriter-brand" aria-label="Bus Batao"><strong>{typedTitle.slice(0, 3)}</strong><strong>{typedTitle.length > 4 ? typedTitle.slice(4) : ""}</strong><span className="typewriter-cursor" aria-hidden="true" />{typedTitle.length === 9 && <MovingBus className="typewriter-bus" />}</div>}
    <div className="home-hero"><div><p className="eyebrow">HYDERABAD → JAMSHORO</p><h1>Know the crowd before you board</h1><p>Real passenger updates for your university ride.</p></div><div className="home-hero-road"><MovingBus className="road-bus" /></div></div>
    {view === "home" && <>
      {message && <p role="status" className="inline-status">{message}</p>}<section className="panel home-live-panel"><div><p className="eyebrow">LATEST QUICK REPORT</p>{latest ? <><h2>{activeOrigin} has {crowdLabel(latest.crowd_level)}</h2><p>{latest.description || "Passenger report"} · {new Date(latest.observed_at).toLocaleString()} · Reported by {latest.reporter_name || "Passenger"} · {latest.reporter_location} · Expires {new Date(latest.expires_at || Date.parse(latest.observed_at) + 48 * 60 * 60_000).toLocaleString()}</p></> : <h2>No fresh report yet - Be the first reporter</h2>}</div>
        <label className="home-location-select">Your Page / Location<select className="journey-input" value={userLocation} onChange={(event) => setUserLocation(event.target.value as typeof userLocation)}><option value="">Choose a location</option>{places.map((place) => <option key={place}>{place}</option>)}</select></label>
      </section>
      <section className="panel home-choice-card"><h2>Where are you heading?</h2><label className="home-name-field">Your name<input className="journey-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name" /></label><p className="direction-preview">{userLocation ? `${userLocation} · ${routeDirection}` : "Choose your location above to view nearby reports and your direction."}</p><div className="home-choice-actions"><button className="button button-orange" type="button" onClick={() => selectView("report")}>REPORT</button><button className="button button-purple" type="button" onClick={() => selectView("path")}>CHOOSE BEST PATH</button></div></section>
      <section className="panel report-promo"><span className="report-icon" aria-hidden="true">◉</span><div><h2>Help other passengers</h2><p>Share a quick crowd update to help students reach their university on time.</p></div><button className="button button-orange" type="button" onClick={() => selectView("report")}>+ Report Crowd Now</button></section>
    </>}
    {view === "report" && <section className={`panel report-form-card crowd-state-${crowd.toLowerCase()}`}>
      <div className="form-top"><button className="button button-secondary" type="button" onClick={() => setView("home")}>← Home</button><MovingBus className="report-bus" /><div><p className="eyebrow">LIVE PASSENGER REPORT</p><h2>Help other passengers</h2></div></div>
      <div className="report-section"><h3>A · Where are you?</h3><div className="search-grid"><label>Your Name (required)<input className="journey-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name" required /></label><label>Your Location<select className="journey-input" value={userLocation} onChange={(event) => setUserLocation(event.target.value as typeof userLocation)}><option value="">Choose your location</option>{places.map((place) => <option key={place}>{place}</option>)}</select></label></div>{userLocation && <div className="direction-card"><p className="eyebrow">REPORT STARTING AREA</p><strong>{userLocation}</strong></div>}</div>
      <div className="report-section"><h3>B · Is it crowded?</h3><div className="choice-pills">{crowdChoices.map((choice) => <button type="button" key={choice} aria-pressed={crowd === choice} className={`choice-pill ${crowd === choice ? "active" : ""} crowd-${choice.toLowerCase()}`} onClick={() => setCrowd(choice)}>{choice}</button>)}</div><BusPreview crowd={crowd} /></div>
      <div className="report-section"><h3>C · Bus condition</h3><div className="choice-pills">{busChoices.map((choice) => <button type="button" key={choice} aria-pressed={busCondition === choice} className={`choice-pill ${busCondition === choice ? "active" : ""}`} onClick={() => setBusCondition(choice)}>{choice}</button>)}</div></div>
      <div className="report-section"><h3>D · Road / city condition</h3><div className="choice-pills">{roadChoices.map((choice) => <button type="button" key={choice} aria-pressed={roadCondition === choice} className={`choice-pill ${roadCondition === choice ? "active" : ""}`} onClick={() => setRoadCondition(choice)}>{choice}</button>)}</div></div>
      <div className="report-section"><h3>E · Report date and time</h3><label className="report-datetime-label">When was this observed?<input className="journey-input" type="datetime-local" max={toLocalDateTimeInput(new Date())} value={reportDateTime} onChange={(event) => setReportDateTime(event.target.value)} /></label></div>
      <button type="button" className="button button-orange submit-report" disabled={saving} onClick={() => void submitReport(Boolean(latest))}>{saving ? "SUBMITTING..." : latest ? "UPDATE REPORT" : "SUBMIT REPORT"}</button>{message && <p role="status" className="inline-status">{message}</p>}
    </section>}
    {view === "path" && <section className="panel path-card"><button className="button button-secondary" type="button" onClick={() => setView("home")}>← Home</button><p className="eyebrow">PLAN YOUR JOURNEY</p><h2>Choose your university destination</h2><label>FROM - Where are you?<select className="journey-input" value={from} onChange={(event) => { setFrom(event.target.value as typeof from); setRouteId(""); setShowDestination(false); }}><option value="">Where are you?</option>{places.map((place) => <option key={place}>{place}</option>)}</select></label>{from && <><label className="destination-select">TO - Choose a university<select className="journey-input" value={destination} onChange={(event) => { setDestination(event.target.value); setRouteId(""); setShowDestination(false); }}><option value="">Choose your destination</option>{universities.map((university) => <option key={university} value={university}>{university}</option>)}</select></label>{destination && <><div className="direction-card"><p className="eyebrow">YOUR ROUTE</p><strong>{routeDirection}</strong></div><div className="map-embed-wrap" onClick={() => setShowDestination(true)}><iframe title="Route map" src="https://www.openstreetmap.org/export/embed.html?bbox=68.22%2C25.25%2C68.44%2C25.48&layer=mapnik" loading="lazy" referrerPolicy="no-referrer" tabIndex={-1} /><MovingBus className="map-moving-bus" /><p className="map-direction-label">{routeDirection}</p></div><button className="button button-orange" type="button" onClick={() => setShowDestination(true)}>SHOW MY DESTINATION</button>{showDestination && <><section className="panel result-card"><p className="eyebrow">YOUR JOURNEY</p><h2>{from} to {destination}</h2><h3>Your route: {routeDirection}</h3>{latest ? <div className="result-facts"><div><strong>Crowd</strong><span>{crowdLabel(latest.crowd_level)}</span></div><div><strong>Bus</strong><span>{latest.description?.split(";").find((part) => part.trim().startsWith("Bus is"))?.trim() || "Condition not included in this update"}; reported at {latest.bus_location || latest.reporter_location || "location not provided"}</span></div><div><strong>Road</strong><span>{latest.description?.split(";").find((part) => part.trim().startsWith("Road is") || part.trim().startsWith("City is"))?.trim() || "Condition not included in this update"}</span></div><div><strong>Reported</strong><span>{new Date(latest.observed_at).toLocaleString()} by {latest.reporter_name || "Passenger"} at {latest.reporter_location || "location not provided"}. Expires {new Date(latest.expires_at || Date.parse(latest.observed_at) + 48 * 60 * 60_000).toLocaleString()}</span></div></div> : <p>No fresh report yet - Be the first reporter.</p>}{latest && <div className="quick-update"><label>Your Location<select className="journey-input" value={userLocation} onChange={(event) => setUserLocation(event.target.value as typeof userLocation)}><option value="">Choose location</option>{places.map((place) => <option key={place}>{place}</option>)}</select></label><div className="choice-pills">{crowdChoices.map((choice) => <button type="button" key={choice} aria-pressed={crowd === choice} className={`choice-pill ${crowd === choice ? "active" : ""}`} onClick={() => setCrowd(choice)}>{choice}</button>)}</div><button className="button button-orange" type="button" disabled={saving || !userLocation || !crowd} onClick={() => void submitReport(true)}>Update Report</button></div>}</section><RouteAnalysis area={from} destination={destination} routeDirection={routeDirection} report={latest} /></>}</>}</>}</section>}
  </div>;
}

function toLocalDateTimeInput(date: Date) { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }
function isFresh(report: Report) { return Date.parse(report.expires_at || new Date(Date.parse(report.observed_at) + 48 * 60 * 60_000).toISOString()) > Date.now(); }
function crowdLabel(level: Report["crowd_level"]) { return level === "low" ? "Empty" : level === "moderate" ? "Moderate" : level === "high" ? "Crowded" : level === "full" ? "Full" : "No crowd details"; }
function BusPreview({ crowd }: { crowd: Crowd | "" }) {
  const passengerCount = crowd === "Empty" ? 0 : crowd === "Moderate" ? 3 : crowd === "Crowded" ? 6 : crowd === "Full" ? 9 : 0;
  return <div className={`bus-seat-preview seats-${crowd.toLowerCase()}`} aria-live="polite"><svg className="crowd-bus-art" viewBox="0 0 220 90" role="img" aria-label={crowd ? `Bus preview, ${crowd}` : "Bus preview"}><rect x="13" y="10" width="190" height="57" rx="13" /><rect className="bus-window" x="24" y="20" width="165" height="29" rx="5" />{Array.from({ length: 9 }, (_, index) => <g key={index} className={index < passengerCount ? "passenger visible" : "passenger"} transform={`translate(${32 + index * 18},0)`}><circle cx="0" cy="29" r="4"/><path d="M-5 43 Q0 34 5 43Z" /></g>)}<rect x="20" y="53" width="176" height="6" rx="3"/><circle cx="58" cy="72" r="12"/><circle cx="162" cy="72" r="12"/><circle className="wheel-center" cx="58" cy="72" r="4"/><circle className="wheel-center" cx="162" cy="72" r="4"/></svg><span>{crowd ? `${crowd} bus preview` : "Choose crowd level to preview"}</span></div>;
}
