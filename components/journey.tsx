"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SummaryCard } from "@/components/summary-card";
import { MovingBus } from "@/components/moving-bus";
import { useLanguage } from "@/components/language-context";
import { translate } from "@/lib/i18n";
import { getLocalRouteCandidates } from "@/lib/route-match";
import { StopMap } from "@/components/stop-map";
import { CROWD_LEVELS, type Report, type Route, type Stop } from "@/lib/types";

const universityOptions = [
  "University of Sindh City Campus", "Mehran University (MUET) Jamshoro", "LUMHS Jamshoro",
  "Isra University Hyderabad", "Indus Medical College", "Government College University Hyderabad",
  "University of Hyderabad", "Iqra University Hyderabad", "SZABIST Hyderabad",
  "Sindh Agriculture University Tandojam", "Nawabshah Medical College",
  "Peoples University of Medical and Health Sciences", "Shaheed Allah Buksh Soomro University",
  "Government College of Technology Hyderabad", "University of Modern Sciences Tando Muhammad Khan",
  "Bhit Shah University", "Cadet College Petaro", "Other campus or college",
].map((name) => name.trim());
const universities = [...new Map(universityOptions.map((name) => [name.toLowerCase().replace(/\b(university|campus|main|city)\b/g, "").replace(/[^a-z0-9]+/g, "").trim(), name])).values()];
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
  const { language } = useLanguage();
  const tr = (text: string) => translate(language, text);
  const [gpsMessage, setGpsMessage] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [savedTrip, setSavedTrip] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [recentTrip, setRecentTrip] = useState<{ from: string; to: string; routeName: string; departureAt: string; crowd: string } | null>(null);
  const [localFeedback, setLocalFeedback] = useState<Array<{ routeId: string; crowd: string; delayMinutes: number; onTime: boolean; rating: number; createdAt: string }>>([]);
  const [browserReports, setBrowserReports] = useState<Report[]>([]);
  const [reportLevel, setReportLevel] = useState<Level>("Moderate");
  const [reporterName, setReporterName] = useState("Chetina");
  const [busNumber, setBusNumber] = useState("");
  const [busLocation, setBusLocation] = useState("");
  const [reporterLocation, setReporterLocation] = useState("");
  const [isOnBus, setIsOnBus] = useState<"yes" | "no" | "skip">("skip");
  const [leftMinutes, setLeftMinutes] = useState(0);
  const [reportAt, setReportAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [reportNote, setReportNote] = useState("");
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [feedbackCrowd, setFeedbackCrowd] = useState<"Empty" | "Moderate" | "Crowded" | "Full">("Moderate");
  const [feedbackDelay, setFeedbackDelay] = useState(0);
  const [feedbackPunctuality, setFeedbackPunctuality] = useState<"yes" | "no" | "late">("yes");
  const [feedbackBusNo, setFeedbackBusNo] = useState("");
  const [feedbackSeat, setFeedbackSeat] = useState("Yes");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setName(localStorage.getItem("busbatao-rider-name") || "");
    setLocation(localStorage.getItem("busbatao-rider-location") || "");
    try { setRecentTrip(JSON.parse(localStorage.getItem("busbatao-trip-history") || "[]")[0] ?? null); } catch { setRecentTrip(null); }
    try { setLocalFeedback(JSON.parse(localStorage.getItem("busbatao-trip-feedback") || "[]")); } catch { setLocalFeedback([]); }
    try { setBrowserReports(JSON.parse(localStorage.getItem("busbatao-crowd-reports") || "[]")); } catch { setBrowserReports([]); }
    const saved = localStorage.getItem("busbatao-saved-route");
    if (saved) {
      try {
        const value = JSON.parse(saved) as { routeId?: string; university?: string; destination?: string; location?: string };
        if (value.routeId) setRouteId(value.routeId);
        if (value.university) setUniversity(value.university);
        if (value.destination) setDestination(value.destination);
        if (value.location) setLocation(value.location);
      } catch { localStorage.removeItem("busbatao-saved-route"); }
    }
  }, [routes]);

  useEffect(() => {
    localStorage.setItem("busbatao-rider-name", name);
    localStorage.setItem("busbatao-rider-location", location);
  }, [location, name]);

  const localCandidates = useMemo(() => getLocalRouteCandidates(location, university), [location, university]);
  const routeReports = useMemo(() => [...reports, ...browserReports].filter((report) => report.route_id === routeId), [browserReports, reports, routeId]);
  const recommendations = useMemo(() => [...routes.filter((route) => (route.city === "Hyderabad" || route.city === "Jamshoro") && route.published_status === "active"), ...localCandidates]
    .map((route) => {
      const evidence = [...reports, ...browserReports].filter((report) => report.route_id === route.id && !report.is_demo);
      const crowdRank: Record<string, number> = { low: 0, moderate: 1, medium: 1, high: 2, full: 3, unknown: 4 };
      const currentHour = new Date().getHours();
      const timeReports = evidence.filter((report) => Date.now() - Date.parse(report.observed_at) <= 3 * 24 * 60 * 60_000 && new Date(report.observed_at).getHours() === currentHour && report.crowd_level !== "unknown");
      const feedback = localFeedback.filter((item) => item.routeId === route.id);
      const timeFeedback = feedback.filter((item) => Date.now() - Date.parse(item.createdAt) <= 3 * 24 * 60 * 60_000 && new Date(item.createdAt).getHours() === currentHour);
      const crowdCounts: Record<string, number> = {};
      for (const item of timeReports) crowdCounts[item.crowd_level] = (crowdCounts[item.crowd_level] ?? 0) + 1;
      for (const item of timeFeedback) { const level = item.crowd.toLowerCase() === "empty" ? "low" : item.crowd.toLowerCase(); crowdCounts[level] = (crowdCounts[level] ?? 0) + 1; }
      const crowd = Object.entries(crowdCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const delayedReports = timeReports.filter((item) => item.service_status === "delayed").length;
      const delays = timeFeedback.filter((item) => item.delayMinutes > 0 || !item.onTime);
      const averageDelay = delays.length ? Math.round(delays.reduce((sum, item) => sum + item.delayMinutes, 0) / delays.length) : 0;
      const sampleCount = timeReports.length + timeFeedback.length;
      const rank = crowd ? crowdRank[crowd] ?? 4 : 5;
      const reason = sampleCount ? `Suggested for you ${route.route_code}: ${crowdCounts[crowd] ?? 0} rider report(s) near this hour most often said ${crowd === "low" ? "Empty" : crowd}.` : "No reports yet â€” be the first to report.";
      const localityBoost = route.id.startsWith("proposed-") ? -4 : 0;
      return { route, evidence, sampleCount, crowd, delayedReports: delayedReports + delays.length, averageDelay, reason, score: rank + ((delayedReports + delays.length) ? 1 : 0) + localityBoost };
    }).sort((a, b) => a.score - b.score), [browserReports, localFeedback, localCandidates, reports, routes]);
  const selectedRoute = routes.find((route) => route.id === routeId) ?? localCandidates.find((route) => route.id === routeId);
  const reportableRoute = selectedRoute && !selectedRoute.is_demo && selectedRoute.verification_status === "verified" ? selectedRoute : undefined;
  const latest = routeReports.slice().sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
  const crowdPrediction = predictCrowdFromSavedReports(routeReports, localFeedback.filter((item) => item.routeId === routeId));
  const delayPrediction = predictDelayFromSavedFeedback(routeReports);

  function next() {
    if (step === 2 && !name.trim() || step === 3 && !university || step === 4 && !destination) return;
    if (step === 5 && !selectedRoute) { setReportStatus("Please select a route before continuing."); return; }
    setStep((value) => Math.min(9, value + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseRoute(route: Route) {
    setRouteId(route.id);
    localStorage.setItem("busbatao-saved-route", JSON.stringify({ routeId: route.id, university, destination, location }));
    setReportStatus("");
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
    setGpsMessage("Getting your locationâ€¦");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      setGpsMessage("Location found on this device. It is not stored as a live location.");
    }, () => setGpsMessage("Location permission was not granted. Type your location instead."), { timeout: 8000 });
  }
  async function saveRoute() {
    if (!selectedRoute) { setReportStatus("Please select a route before saving your trip."); return; }
    const now = new Date();
    const trip = { id: crypto.randomUUID(), name, university, destination, routeId, routeName: selectedRoute.name, from: location || selectedRoute.origin, to: university || destination || selectedRoute.destination, departureAt: departureAt || now.toISOString(), savedAt: now.toISOString(), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 48 * 60 * 60_000).toISOString(), crowd: latest?.crowd_level || "No fresh report yet", delayMinutes: 0, busNumber: latest?.bus_number || "", reportedAt: latest?.observed_at || "", rating: null as number | null, duration: "~45-60 min", fare: "Ask conductor - around Rs 80-150" };
    let history: typeof trip[] = [];
    try { history = JSON.parse(localStorage.getItem("busbatao-trip-history") || "[]").filter((item: { expiresAt?: string; savedAt?: string; departureAt?: string }) => Date.parse(item.expiresAt || new Date(Date.parse(item.savedAt || item.departureAt || "") + 48 * 60 * 60_000).toISOString()) > now.getTime()); } catch { history = []; }
    localStorage.setItem("busbatao-trip-history", JSON.stringify([trip, ...history].slice(0, 20)));
    setRecentTrip(trip);
    localStorage.setItem("busbatao-saved-route", JSON.stringify({ university, destination, routeId }));
    setSavedTrip(true);
    setReportStatus("Trip saved to History on this device.");
    if (selectedRoute.verification_status === "verified" && selectedRoute.published_status === "active") {
      const reporterKey = "busbatao-reporter-id";
      let reporterId = localStorage.getItem(reporterKey);
      if (!reporterId) { reporterId = crypto.randomUUID(); localStorage.setItem(reporterKey, reporterId); }
      try {
        const response = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId: trip.id, city: selectedRoute.city, routeId: selectedRoute.id, reporterId, departureAt: trip.departureAt, crowdLevel: latest?.crowd_level || "unknown", delayMinutes: 0, rating: null }) });
        const result = await response.json();
        setReportStatus(response.ok ? "Trip saved locally and synced to Supabase." : `Trip is saved locally. Supabase sync unavailable: ${result.error || "request failed"}`);
      } catch { setReportStatus("Trip is saved locally. Supabase could not be reached; it will remain in this browser."); }
    } else {
      setReportStatus("Trip saved locally. This proposed route is unverified and was not uploaded to Supabase.");
    }
  }
  async function submitTripFeedback() {
    const old = JSON.parse(localStorage.getItem("busbatao-trip-feedback") || "[]") as Array<typeof localFeedback[number] & { tripId?: string; routeName?: string }>;
    const tripHistory = JSON.parse(localStorage.getItem("busbatao-trip-history") || "[]") as Array<{ id?: string }>;
    const reporterKey = "busbatao-reporter-id";
    let reporterId = localStorage.getItem(reporterKey);
    if (!reporterId) { reporterId = crypto.randomUUID(); localStorage.setItem(reporterKey, reporterId); }
    const feedback = {
      tripId: tripHistory[0]?.id || crypto.randomUUID(), routeId,
      crowd: feedbackCrowd, delayMinutes: feedbackDelay,
      onTime: feedbackPunctuality === "yes", punctuality: feedbackPunctuality,
      busNumber: feedbackBusNo, seat: feedbackSeat, comment: feedbackComment,
      rating: feedbackRating, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 48 * 60 * 60_000).toISOString(),
    };
    const localRecord = { ...feedback, routeId, tripId: feedback.tripId, routeName: selectedRoute?.name || "" };
    localStorage.setItem("busbatao-trip-feedback", JSON.stringify([localRecord, ...old]));
    const updatedHistory = tripHistory.map((trip, index) => index === 0 ? { ...trip, crowd: feedback.crowd, delayMinutes: feedback.delayMinutes, rating: feedback.rating } : trip);
    localStorage.setItem("busbatao-trip-history", JSON.stringify(updatedHistory));
    setLocalFeedback([localRecord, ...old]);
    let shared = false;
    let sharedFailure = false;
    let sharedFailureMessage = "";
    if (selectedRoute?.verification_status === "verified" && selectedRoute.published_status === "active") {
      try {
        const response = await fetch("/api/trip-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...feedback, city: selectedRoute.city, routeId: selectedRoute.id, reporterId, observedAt: feedback.createdAt }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Shared feedback could not be saved.");
        shared = true;
        router.refresh();
      } catch (error) { sharedFailure = true; sharedFailureMessage = error instanceof Error ? error.message : "Supabase request failed."; }
    }
    setSavedTrip(false);
    setReportStatus(shared ? "Thank you! Saved for 48h." : sharedFailure ? `Thank you! Saved for 48h on this device. Shared storage error: ${sharedFailureMessage}` : "Thank you! Saved for 48h on this device.");
    router.push("/feedback");
  }
  async function submitQuickReport(level: Level = reportLevel) {
    setReportBusy(true); setReportStatus("");
    const delayed = level === "Delayed";
    const reporterKey = "busbatao-reporter-id";
    let reporterId = localStorage.getItem(reporterKey);
    if (!reporterId) { reporterId = crypto.randomUUID(); localStorage.setItem(reporterKey, reporterId); }
    try {
      if (!reportableRoute) {
        if (!selectedRoute) throw new Error("Select a route before reporting.");
        const observed = new Date().toISOString();
        const record: Report = { id: crypto.randomUUID(), route_id: selectedRoute.id, city: selectedRoute.city, report_type: delayed ? "bus_delayed" : level === "Full" ? "bus_full" : level === "Empty" ? "bus_seen" : "bus_crowded", service_status: delayed ? "delayed" : level === "Full" ? "full" : level === "Empty" ? "seen" : "crowded", crowd_level: crowdForLevel[level], observed_at: new Date(reportAt).toISOString(), submitted_at: observed, reporter_id: reporterId, reporter_name: reporterName || name || "Passenger", reporter_location: reporterLocation || location, bus_number: busNumber, bus_location: busLocation, is_on_bus: isOnBus === "skip" ? null : isOnBus === "yes", left_minutes_ago: leftMinutes, expires_at: new Date(Date.parse(reportAt) + 48 * 60 * 60_000).toISOString(), source_type: "community", moderation_status: "visible", is_demo: false, storage: "browser" };
        const nextReports = [record, ...browserReports];
        setBrowserReports(nextReports);
        localStorage.setItem("busbatao-crowd-reports", JSON.stringify(nextReports));
        setReportStatus("Saved on this device. This route proposal is not verified, so it was not sent to the shared database.");
        return;
      }
      if (!reportableRoute) throw new Error("This route proposal is not verified, so a shared report cannot be submitted yet.");
      const response = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: reportableRoute.city, routeId: reportableRoute.id,
          reportType: delayed ? "bus_delayed" : level === "Full" ? "bus_full" : level === "Empty" ? "bus_seen" : "bus_crowded",
          serviceStatus: delayed ? "delayed" : level === "Full" ? "full" : level === "Empty" ? "seen" : "crowded",
          crowdLevel: crowdForLevel[level], observedAt: new Date(reportAt).toISOString(), reporterId,
          reporterName: reporterName.trim() || name || "Passenger", reporterLocation: reporterLocation || location,
          busNumber, busLocation, isOnBus, leftMinutesAgo: leftMinutes, description: reportNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report could not be saved.");
      setReportStatus("Thank you! Your report is saved for other riders for 48 hours.");
      router.refresh();
    } catch (error) {
      if (selectedRoute) {
        const observed = new Date().toISOString();
        const record: Report = { id: crypto.randomUUID(), route_id: selectedRoute.id, city: selectedRoute.city, report_type: delayed ? "bus_delayed" : level === "Full" ? "bus_full" : level === "Empty" ? "bus_seen" : "bus_crowded", service_status: delayed ? "delayed" : level === "Full" ? "full" : level === "Empty" ? "seen" : "crowded", crowd_level: crowdForLevel[level], observed_at: new Date(reportAt).toISOString(), submitted_at: observed, reporter_id: reporterId, reporter_name: reporterName || name || "Passenger", reporter_location: reporterLocation || location, bus_number: busNumber, bus_location: busLocation, is_on_bus: isOnBus === "skip" ? null : isOnBus === "yes", left_minutes_ago: leftMinutes, expires_at: new Date(Date.parse(reportAt) + 48 * 60 * 60_000).toISOString(), source_type: "community", moderation_status: "visible", is_demo: false, storage: "browser" };
        const nextReports = [record, ...browserReports]; setBrowserReports(nextReports); localStorage.setItem("busbatao-crowd-reports", JSON.stringify(nextReports));
        const detail = error instanceof Error ? error.message : "Supabase request failed.";
        setReportStatus(`Shared report unavailable; saved locally on this device. ${detail}`);
      } else setReportStatus(error instanceof Error ? error.message : "Report could not be saved. Please try again.");
    }
    finally { setReportBusy(false); }
  }

  const titles = ["", "Your name and location", "Choose your university", "Where are you headed?", "Route suggestions", "Your map", "Crowd and delay", "Quick report", "Save and share", "Ready for your trip"];
  return <div className={`page-shell journey-shell ${language === "Urdu" ? "is-urdu" : ""}`} dir={language === "Urdu" ? "rtl" : "ltr"} onTouchStart={(event) => { const touch = event.touches[0]; swipeStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={swipeEnd}>
    <div className="journey-progress"><span>{language === "Urdu" ? `\u0645\u0631\u062d\u0644\u06c1 ${step} / 9` : `STEP ${step} OF 9`}</span><div><i style={{ width: `${step / 9 * 100}%` }} /><MovingBus className="progress-bus" style={{ left: `clamp(0px, calc(${step / 9 * 100}% - 36px), calc(100% - 46px))` }} /></div></div>
    <p className="eyebrow">HYDERABAD {"\\u2192"} JAMSHORO</p>
    <h1>{step === 2 ? "Know The Crowd Before You Board" : translate(language, titles[step])}</h1>
    {step === 2 && <p className="subtitle home-tagline">Real reports by real passengers. Check before you leave.</p>}
    {step === 2 && <section className="home-highlights"><article className="panel home-highlight last-trip"><span className="eyebrow">{tr("LAST TRIP")}</span>{recentTrip ? <><strong>{recentTrip.from} â†’ {recentTrip.to}</strong><span>{recentTrip.routeName}</span><small>{new Date(recentTrip.departureAt).toLocaleString()} Â· Crowd: {recentTrip.crowd}</small></> : <><strong>{tr("Plan your first trip")}</strong><span>{tr("Saved routes appear here for quick access.")}</span></>}</article><article className="panel home-highlight ai-today"><span className="eyebrow">{tr("SUGGESTED FOR YOU")}</span><strong>{recommendations[0]?.sampleCount ? recommendations[0].reason : tr("No reports yet - be the first to report")}</strong><span>{recommendations[0]?.sampleCount ? `${recommendations[0].evidence.length} passenger report(s) inform this suggestion. Fare and timetable data are not published.` : tr("Suggestions will use passenger reports by route and time.")}</span></article><article className="panel home-highlight popular-routes"><span className="eyebrow">{tr("POPULAR VERIFIED ROUTES")}</span>{routes.filter((route) => route.published_status === "active").map((route) => <button key={route.id} type="button" onClick={() => { setRouteId(route.id); setDestination(route.destination); }}>{route.route_code}: {route.origin} â†’ {route.destination}</button>)}<div className="home-road" aria-label="Bus moving on a road"><MovingBus className="road-bus" /></div></article></section>}
    {step === 2 && <section className="journey-card panel">
      <label className="form-label" htmlFor="rider-name">{language === "Urdu" ? "\u0622\u067e \u06a9\u0627 \u0646\u0627\u0645 \u06a9\u06cc\u0627 \u06c1\u06d2\u061f" : "Hi! What is your name?"}</label><input id="rider-name" className="journey-input" value={name} onChange={(event) => setName(event.target.value)} placeholder={language === "Urdu" ? "\u0627\u067e\u0646\u0627 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba" : "Your name"} autoComplete="given-name" />
      <label className="form-label" htmlFor="rider-location">{language === "Urdu" ? "\u0622\u067e \u0627\u0628\u06be\u06cc \u06a9\u06c1\u0627\u06ba \u06c1\u06cc\u06ba\u061f" : "Where are you now?"}</label><button className="button button-secondary" type="button" onClick={getLocation}>{language === "Urdu" ? "\u0645\u06cc\u0631\u0627 \u0645\u0642\u0627\u0645 \u0627\u0633\u062a\u0639\u0645\u0627\u0644 \u06a9\u0631\u06cc\u06ba" : "Use my location"}</button>
      <input id="rider-location" className="journey-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={language === "Urdu" ? "\u0639\u0644\u0627\u0642\u06c1 \u06cc\u0627 \u0645\u0634\u06c1\u0648\u0631 \u062c\u06af\u06c1 \u0644\u06a9\u06be\u06cc\u06ba" : "Type your area or landmark"} />
      {gpsMessage && <p className="muted" role="status">{tr(gpsMessage)}</p>}
      <p className="small muted">{tr("Your typed location stays on this device. BusBatao does not track a live position.")}</p>
    </section>}
    {step === 3 && <div className="university-grid">{universities.map((item) => <button type="button" key={item} className={`university-card panel ${university === item ? "selected" : ""}`} onClick={() => setUniversity(item)}><span className="university-mark" aria-hidden="true">{item.split(/\s+/).filter((word) => /^[A-Z]/.test(word) && word.length > 2).slice(0, 2).map((word) => word[0]).join("")}</span><strong>{item}</strong></button>)}</div>}
    {step === 4 && <><p className="subtitle">{tr("Choose the destination you want to reach.")}</p><div className="destination-grid">{destinations.map((item) => <button type="button" className={`choice-button ${destination === item ? "selected" : ""}`} aria-pressed={destination === item} key={item} onClick={() => setDestination(item)}>{item}</button>)}</div></>}
    {step === 5 && <section className="journey-card panel recommendation-card"><p className="eyebrow">{tr("SMART SUGGESTION Â· SAVED REPORTS")}</p>
      {recommendations.length ? <>
        <h2>{tr("Best available route")}</h2><p className="muted">{tr("Ranked by crowd reports from this hour. SMTA does not publish fares or travel times in this directory.")}</p>
        <div className="route-methods"><article><strong>{tr("Least crowd")}</strong><span>{recommendations[0].sampleCount ? `${recommendations[0].route.route_code}: ${recommendations[0].crowd || "not enough reports"}` : "No reports yet â€” be the first to report"}</span></article><article><strong>{tr("Fastest")}</strong><span>{tr("Cannot rank: official journey times are not published.")}</span></article><article><strong>{tr("Cheapest")}</strong><span>{tr("Cannot rank: official fares are not published.")}</span></article></div>
        {(showAllRoutes ? recommendations : recommendations.slice(0, 3)).map(({ route, evidence, sampleCount, crowd }) => <button key={route.id} type="button" className={`route-option panel ${routeId === route.id ? "selected" : ""}`} aria-pressed={routeId === route.id} onClick={() => chooseRoute(route)}><strong>{routeId === route.id ? "&#10003; " : ""}{route.name}</strong><span>{route.origin} to {route.destination}</span><small>{sampleCount ? `${evidence.length} saved reports · ${crowd || "Crowd unknown"}` : "No fresh report yet - Be first reporter"} · {route.verification_status === "verified" ? "Operator verified" : "Proposed, not verified"}</small><small>Travel time: ~45-60 min (depends on traffic) · Fare: Ask conductor - around Rs 80-150</small><small>{route.description}</small></button>)}
{recommendations.length > 3 && <button className="button button-secondary" type="button" onClick={() => setShowAllRoutes((value) => !value)}>{showAllRoutes ? "Show top 3 routes" : "See all routes"}</button>}
        {!selectedRoute && <p className="inline-error" role="status">Please select a route before continuing.</p>}
        <p className="small muted">{tr("Proposed neighborhood paths are suggestions only. Confirm service, stops, fare, and time with the operator before travel.")}</p>
        {selectedRoute && <p className="inline-error" role="status">{selectedRoute.verification_status !== "verified" ? "This route is an unverified candidate. It cannot be used to submit a shared passenger report." : "Based on recent passenger reports; details may vary by traffic."}</p>}
      </> : <div className="empty-state"><strong>No route data is available yet.</strong><p>We cannot safely recommend a bus until a route has been added to the shared catalogue.</p></div>}
      <p className="small muted">{destination ? `Destination: ${destination}. ` : "Choose a destination in the previous step. "}Suggested university: {university || "not selected"}.</p>
    </section>}
    {step === 6 && <section className="journey-card panel"><h2>{tr("Map")}</h2><p className="muted">{tr("The map opens automatically. It shows configured stop locations only; no live bus position is available.")}</p>
      {stops.some((stop) => stop.latitude !== null && stop.longitude !== null) || selectedRoute ? <StopMap stops={stops} reports={routeReports} route={selectedRoute} /> : <div className="map-fallback"><MovingBus className="map-bus" /><strong>{location || "Starting location not set"}</strong><span>â†’</span><strong>{destination || university || "Destination not selected"}</strong><p>Map unavailable, showing stops and route text instead.</p></div>}
    </section>}
    {step === 7 && <section className="journey-card panel crowd-hero" key={routeId || "no-route"}>
      {selectedRoute ? <><p className="eyebrow">{tr("LIVE REPORT SUMMARY")}</p><h2>{selectedRoute.name}</h2>{routeReports.length ? <div className={`crowd-status ${latest?.crowd_level === "full" ? "danger" : ""}`}>{latest ? latest.crowd_level === "low" ? "Empty" : latest.crowd_level : "Unknown"}</div> : <div className="prediction-note"><strong>{tr(tr("No fresh report yet - Be first reporter"))}</strong></div>}
        <p>{latest ? `Last passenger report ${timeAgo(latest.observed_at)}.` : "No reports yet â€” be the first to report. Current crowd is unknown."}</p>
        <div className="prediction-note"><strong>Same-hour crowd prediction</strong><span>{crowdPrediction.level ? `At about ${new Date().getHours()}:00, this route is usually ${crowdPrediction.level === "low" ? "Empty" : crowdPrediction.level}. ${crowdPrediction.samples} reports from the past three days support this estimate.` : crowdPrediction.samples ? `${crowdPrediction.samples} report(s) are available for this time. More reports are needed before making a crowd prediction.` : "No reports yet for this time. Be the first to report; a prediction will appear when enough evidence is available."}</span></div>
        {delayPrediction.samples >= 2 && <div className="delay-alert delay-estimate">Passenger feedback near this hour reports an average delay of about {delayPrediction.minutes} minutes ({delayPrediction.samples} trips).</div>}
        {routeReports.filter((report) => report.service_status === "delayed" && Date.now() - Date.parse(report.observed_at) < 60 * 60_000).length >= 3 && <div className="delay-alert" role="alert">This bus may be delayed. Three or more delay reports were saved in the last hour; consider the next route.</div>}
        {latest && <article className="panel live-report-card"><strong>LIVE REPORT</strong><span><b>Route:</b> {selectedRoute.origin} to {selectedRoute.destination}</span><span><b>Crowd:</b> {latest.crowd_level === "low" ? "Empty" : latest.crowd_level}</span>{latest.bus_number && <span><b>Bus:</b> {latest.bus_number}</span>}{latest.bus_location && <span><b>Bus location:</b> {latest.bus_location}</span>}<span><b>Reported by:</b> {latest.reporter_name || "Passenger"}{latest.reporter_location ? ` - ${latest.reporter_location}` : ""}</span><span><b>Reported at:</b> {new Date(latest.observed_at).toLocaleString()} - {timeAgo(latest.observed_at)}</span><span><b>Expires in:</b> {latest.expires_at ? timeRemaining(latest.expires_at) : "48 hours"}</span><span>Buses may be busy; allow extra travel time.</span></article>}\n        <SummaryCard targetType="route" targetId={selectedRoute.id} reports={routeReports} label={selectedRoute.name} autoAnalyze />
        <p className="small muted">Suggestions are based on recent passenger reports. With no evidence, the status stays unknown.</p>
      </> : <div className="empty-state"><strong>Please select a route first.</strong><p>Go back to Route Suggestions and choose a route to see its reports and report crowd conditions.</p></div>}
    </section>}
    {step === 8 && <section className="journey-card panel"><h2>{selectedRoute?.name || "Please select a route first."}</h2><p className="muted">Share a passenger report. Shared reports are available to all riders for 48 hours.</p>
      <form className="report-form" onSubmit={(event) => { event.preventDefault(); void submitQuickReport(); }}>
        <label className="form-label">Are you in the bus right now?<select className="journey-input" value={isOnBus} onChange={(event) => setIsOnBus(event.target.value as "yes" | "no" | "skip")}><option value="yes">Yes, in bus</option><option value="no">No, at stop</option><option value="skip">Skip</option></select></label>
        <fieldset className="report-crowd"><legend>Crowd</legend>{levels.map((level) => <button key={level} type="button" className={`button ${reportLevel === level ? "selected" : "button-secondary"}`} aria-pressed={reportLevel === level} onClick={() => setReportLevel(level)}>{level}</button>)}</fieldset>
        <label className="form-label">Bus No / Plate<input className="journey-input" value={busNumber} onChange={(event) => setBusNumber(event.target.value)} placeholder="e.g. LEA-123" /></label>
        <label className="form-label">Bus location now<input className="journey-input" value={busLocation} onChange={(event) => setBusLocation(event.target.value)} placeholder="e.g. Latifabad Unit 7" /></label>
        <label className="form-label">Your location<input className="journey-input" value={reporterLocation} onChange={(event) => setReporterLocation(event.target.value)} placeholder="Area or stop" /></label>
        <label className="form-label">Left how many minutes ago?<input className="journey-input" type="number" min="0" max="1440" value={leftMinutes} onChange={(event) => setLeftMinutes(Number(event.target.value))} /></label>
        <label className="form-label">Report time<input className="journey-input" type="datetime-local" value={reportAt} onChange={(event) => setReportAt(event.target.value)} /></label>
        <label className="form-label">Your name<input className="journey-input" value={reporterName} onChange={(event) => setReporterName(event.target.value)} maxLength={80} /></label>
        <label className="form-label report-note">Note (optional)<input className="journey-input" value={reportNote} onChange={(event) => setReportNote(event.target.value)} maxLength={240} /></label>
        <button className="button button-yellow report-note" type="submit" disabled={reportBusy || !reportableRoute}>{reportBusy ? "Submittingâ€¦" : "Submit Report"}</button>
      </form>
      {selectedRoute && <div className="selected-route-note">&#10003; Route selected: {selectedRoute.origin} to {selectedRoute.destination} - Saved</div>}
      {reportStatus && <p role="status" className="form-success">{reportStatus}</p>}
      <details className="optional-feedback"><summary>Did BusBatao help you today? (optional)</summary><p className="small muted">Choose one response; it is saved with the route feedback record.</p><div className="journey-actions"><button className="button button-secondary" type="button" onClick={() => void sendFeedback(true)}>ðŸ‘ Yes</button><button className="button button-secondary" type="button" onClick={() => void sendFeedback(false)}>ðŸ‘Ž No</button></div></details>
    </section>}
    {step === 9 && <section className="journey-card panel ready-trip"><MovingBus className="arriving-bus" /><h2>{tr("Ready for your trip")}</h2><p>{university || "University not selected"} â†’ {destination || "Destination not selected"}</p>
      <div className="trip-summary"><p><strong>{tr("From")}</strong><span>{location || selectedRoute?.origin || "Starting point"}</span></p><p><strong>{tr("To")}</strong><span>{university || destination || selectedRoute?.destination || "Destination"}</span></p><p><strong>{tr("Route")}</strong><span>{selectedRoute?.name || "Please select a route"}</span></p><p><strong>{tr("Fare")}</strong><span>Ask conductor - around Rs 80-150</span></p><p><strong>{tr("Time")}</strong><span>{departureAt || "Departure time not set"} · ~45-60 min (depends on traffic)</span></p><p><strong>{tr("Crowd")}</strong><span>{latest?.crowd_level || "No reports yet â€” be the first to report"}</span></p></div>
      <label className="form-label" htmlFor="departure-time">{tr("Departure date and time")}</label><input id="departure-time" className="journey-input" type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} />
      <div className="journey-actions"><button className="button button-yellow" type="button" onClick={saveRoute}>{tr("Save my route")}</button>
        <button className="button button-secondary" type="button" onClick={() => { const message = `BusBatao: ${selectedRoute?.origin || location} to ${selectedRoute?.destination || destination} - Crowd: ${latest?.crowd_level ?? "No fresh report"} - Bus: ${latest?.bus_number || "not reported"} at ${latest?.bus_location || "location not reported"} - Reported by ${latest?.reporter_name || "passenger"} at ${latest ? new Date(latest.observed_at).toLocaleTimeString() : "no recent time"} - Expires in ${latest?.expires_at ? timeRemaining(latest.expires_at) : "48h"}`; void navigator.clipboard.writeText(message).then(() => setCopyStatus(tr("Trip text copied.")), () => setCopyStatus(tr("Copy failed; copy the trip details manually."))); }}>{tr("Copy text")}</button>
      </div>{reportStatus && <p role="status">{reportStatus}</p>}
      {copyStatus && <p role="status">{copyStatus}</p>}
      {savedTrip && <div className="trip-feedback"><h3>How was your trip?</h3><p>Thank you for sharing feedback to help other riders.</p>
        <label>Crowd <select value={feedbackCrowd} onChange={(e) => setFeedbackCrowd(e.target.value as "Empty" | "Moderate" | "Crowded" | "Full")}><option>Empty</option><option>Moderate</option><option>Crowded</option><option>Full</option></select></label>
        <label>Delay (0-120 min) <input type="number" min="0" max="120" value={feedbackDelay} onChange={(e) => setFeedbackDelay(Math.min(120, Number(e.target.value)))} /></label>
        <label>Bus on time? <select value={feedbackPunctuality} onChange={(e) => setFeedbackPunctuality(e.target.value as "yes" | "no" | "late")}><option value="yes">Yes</option><option value="no">No</option><option value="late">Late by entered minutes</option></select></label>
        <label>Bus No / Plate <input value={feedbackBusNo} onChange={(e) => setFeedbackBusNo(e.target.value)} /></label>
        <label>Seat? <select value={feedbackSeat} onChange={(e) => setFeedbackSeat(e.target.value)}><option>Yes</option><option>Standing</option><option>No seat</option></select></label>
        <label>Comment: Kuch aur batana hai? <input maxLength={240} value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} /></label>
        <label>Rating <select value={feedbackRating} onChange={(e) => setFeedbackRating(Number(e.target.value))}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}</select></label>
        <button className="button button-yellow" type="button" onClick={() => void submitTripFeedback()}>Submit feedback</button></div>}
      <p className="small muted">{tr("Trip history and feedback are saved on this device.")}</p>
    </section>}
    <div className="journey-controls">{step > 2 && <button type="button" className="button button-secondary" onClick={back}>{tr("Back")}</button>}
      {step < 9 && <button type="button" className="button" disabled={step === 2 && !name.trim() || step === 3 && !university || step === 4 && !destination || step === 5 && !selectedRoute} onClick={next}>{(step === 2 ? "Get Started" : tr(step === 5 ? "Open map" : step === 6 ? "See crowd status" : "Next"))} <span aria-hidden="true">â†’</span></button>}
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

function timeRemaining(timestamp: string) { const minutes = Math.max(0, Math.floor((Date.parse(timestamp) - Date.now()) / 60000)); return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }

function timeAgo(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  return minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hr ago`;
}

// Crowd estimate: use the modal crowd level from persisted reports at this hour over the past three days.
// It stays unknown until at least three matching observations exist; it never fabricates a live bus position.
function predictCrowdFromSavedReports(reports: Report[], feedback: Array<{ crowd: string; createdAt: string }>) {
  const now = new Date();
  const sameHourReports = reports.filter((report) => {
    const date = new Date(report.observed_at);
    return now.getTime() - date.getTime() <= 3 * 24 * 60 * 60_000
      && date.getHours() === now.getHours()
      && report.crowd_level !== "unknown";
  });
  const sameHourFeedback = feedback.filter((item) => {
    const date = new Date(item.createdAt);
    return now.getTime() - date.getTime() <= 3 * 24 * 60 * 60_000 && date.getHours() === now.getHours();
  }).map((item) => ({ crowd_level: item.crowd.toLowerCase() === "empty" ? "low" : item.crowd.toLowerCase() }));
  const sameHour = [...sameHourReports.map((report) => ({ crowd_level: report.crowd_level })), ...sameHourFeedback];
  if (sameHour.length < 3) return { level: "", samples: sameHour.length };
  const counts = new Map<string, number>();
  for (const report of sameHour) counts.set(report.crowd_level, (counts.get(report.crowd_level) ?? 0) + 1);
  const level = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  return { level, samples: sameHour.length };
}

function predictDelayFromSavedFeedback(reports: Report[]) {
  const now = new Date();
  const values = reports.filter((report) => {
    const date = new Date(report.observed_at);
    return report.service_status === "delayed" && report.description?.startsWith("Trip feedback:")
      && now.getTime() - date.getTime() <= 3 * 24 * 60 * 60_000 && date.getHours() === now.getHours();
  }).map((report) => Number(report.description?.match(/(\d+) min delay/)?.[1] ?? 0));
  return { samples: values.length, minutes: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0 };
}
