"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TripFeedback = { tripId?: string; routeName?: string; crowd: string; delayMinutes: number; onTime: boolean; punctuality?: string; busNumber?: string; seat?: string; comment?: string; rating: number; createdAt: string; expiresAt?: string };
export default function FeedbackPage() {
  const [items, setItems] = useState<TripFeedback[]>([]);
  useEffect(() => {
    const refresh = () => { try { const now = Date.now(); const saved = JSON.parse(localStorage.getItem("busbatao-trip-feedback") || "[]") as TripFeedback[]; const fresh = saved.filter((item) => Date.parse(item.expiresAt || new Date(Date.parse(item.createdAt) + 48 * 60 * 60_000).toISOString()) > now); setItems(fresh); localStorage.setItem("busbatao-trip-feedback", JSON.stringify(fresh)); } catch { setItems([]); } };
    refresh(); window.addEventListener("storage", refresh); return () => window.removeEventListener("storage", refresh);
  }, []);
  return <div className="page-shell"><p className="eyebrow">RIDER VOICE</p><h1>Feedback</h1><p className="subtitle">Trip feedback from the last 48 hours.</p><div className="panel history-feedback">{items.length ? <ul>{items.map((item, index) => <li key={`${item.createdAt}-${index}`}><strong>{item.routeName || "Trip route"}</strong> · {new Date(item.createdAt).toLocaleString()}<br />Crowd: {item.crowd} · Delay: {item.delayMinutes} min · Bus on time: {item.punctuality || (item.onTime ? "Yes" : "No")} · Bus: {item.busNumber || "Not provided"} · Seat: {item.seat || "Not provided"} · Rating: {item.rating}/5{item.comment ? <><br />Comment: {item.comment}</> : null}</li>)}</ul> : <><h2>No trip feedback yet</h2><p>Save a trip, then share feedback after travelling.</p><Link href="/" className="button button-yellow">Plan a trip</Link></>}</div></div>;
}