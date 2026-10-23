"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Trip = { id: string; name?: string; from: string; to: string; routeId?: string; routeName: string; departureAt: string; savedAt: string; expiresAt?: string; crowd: string; delayMinutes?: number; busNumber?: string; reportedAt?: string; duration: string; fare: string };
export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const refresh = () => { const currentTime = Date.now(); try { const fresh = (JSON.parse(localStorage.getItem("busbatao-trip-history") || "[]") as Trip[]).map((trip) => ({ ...trip, expiresAt: trip.expiresAt || new Date(Date.parse(trip.savedAt || trip.departureAt) + 48 * 60 * 60_000).toISOString() })).filter((trip) => Date.parse(trip.expiresAt!) > currentTime).slice(0, 20); setTrips(fresh); localStorage.setItem("busbatao-trip-history", JSON.stringify(fresh)); } catch { setTrips([]); } setNow(currentTime); };
    refresh(); const interval = window.setInterval(refresh, 60_000); window.addEventListener("storage", refresh); return () => { window.clearInterval(interval); window.removeEventListener("storage", refresh); };
  }, []);
  return <div className="page-shell"><p className="eyebrow">YOUR TRIPS</p><h1>History</h1><p className="subtitle">Your latest 20 trips are kept for 48 hours.</p>
    {!trips.length ? <section className="panel history-empty"><h2>No saved trips yet</h2><p>Save a route after planning your trip and it will appear here.</p><Link className="button button-yellow" href="/">Plan a trip</Link></section> : <div className="trip-list">{trips.map((trip) => { const left = Math.max(0, Math.ceil((Date.parse(trip.expiresAt!) - now) / 3_600_000)); return <article className="panel trip-history-card" key={trip.id}><div className="trip-history-heading"><strong>{trip.from} → {trip.to}</strong><time>{new Date(trip.departureAt || trip.savedAt).toLocaleString()}</time></div><p><strong>Route:</strong> {trip.routeName}</p><div className="trip-summary"><p><strong>Crowd</strong><span>{trip.crowd}</span></p><p><strong>Delay</strong><span>{trip.delayMinutes ?? 0} min</span></p><p><strong>Bus No</strong><span>{trip.busNumber || "Not reported"}</span></p><p><strong>Reported at</strong><span>{trip.reportedAt ? new Date(trip.reportedAt).toLocaleString() : "No report"}</span></p></div><p className="small muted">Expires in {left}h</p></article>; })}</div>}
  </div>;
}