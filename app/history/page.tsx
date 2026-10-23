"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Report = { id: string; route_id?: string; city: string; crowd_level: string; service_status?: string; reporter_id?: string; reporter_name?: string; reporter_location?: string; observed_at: string; submitted_at: string; description?: string; expires_at?: string; is_demo?: boolean };
type Feedback = { id: string; name: string; rating: number; created_at: string; message?: string };
const filters = ["All", "Today", "My Reports", "Crowded", "Empty"] as const;

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [search, setSearch] = useState("");
  const [myId, setMyId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    const id = localStorage.getItem("busbatao-reporter-id") || "";
    setMyId(id);
    void Promise.all([
      fetch("/api/reports?limit=200", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/site-feedback", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([reportResult, feedbackResult]) => {
      if (!active) return;
      setReports((reportResult.reports || []).filter((report: Report) => !report.is_demo && report.crowd_level !== "unknown" && (!report.expires_at || Date.parse(report.expires_at) > Date.now())));
      setFeedback(feedbackResult.feedback || []);
      if (reportResult.storage === "local" || feedbackResult.storage === "unavailable") setStatus("Shared history is unavailable. Apply the current Supabase migration to sync all devices.");
    }).catch(() => { if (active) setStatus("Shared history is unavailable right now."); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => reports.filter((report) => {
    const time = Date.parse(report.observed_at);
    const matchesFilter = filter === "All" || (filter === "Today" && new Date(time).toDateString() === new Date().toDateString()) || (filter === "My Reports" && Boolean(myId) && report.reporter_id === myId) || (filter === "Crowded" && ["high", "full"].includes(report.crowd_level)) || (filter === "Empty" && report.crowd_level === "low");
    const query = search.trim().toLowerCase();
    return matchesFilter && (!query || `${report.reporter_location || ""} ${report.reporter_name || ""} ${report.city}`.toLowerCase().includes(query));
  }).sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at)), [filter, myId, reports, search]);

  return <div className="page-shell history-page"><p className="eyebrow">PASSENGER TIMELINE</p><h1>History</h1><p className="subtitle">Fresh community reports and passenger feedback, newest first.</p>
    <section className="history-tools"><div className="history-filter-row">{filters.map((item) => <button key={item} type="button" className={filter === item ? "history-filter active" : "history-filter"} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><input className="journey-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by location or name..." /></section>
    {status && <p role="status" className="inline-status">{status}</p>}
    {!visible.length ? <section className="panel history-empty"><h2>No history yet - Your reports will show here</h2><p>Shared passenger reports appear here as they arrive.</p><Link className="button button-orange" href="/">Go Home</Link></section> : <div className="history-timeline">{visible.map((report) => { const feedbackItem = feedback.find((item) => item.name === report.reporter_name && Math.abs(Date.parse(item.created_at) - Date.parse(report.observed_at)) < 86_400_000); const crowd = report.crowd_level === "low" ? "Empty" : report.crowd_level === "moderate" ? "Moderate" : report.crowd_level === "high" ? "Crowded" : "Full"; const detail = report.description?.split(";") || []; return <article className="panel history-timeline-card" key={report.id}><i className="timeline-dot" aria-hidden="true" /><div className="timeline-head"><strong>{report.reporter_location || report.city}</strong><time>{new Date(report.observed_at).toLocaleString()}</time></div><p className="timeline-route">{report.reporter_location || report.city} → Hyderabad → University</p><div className="timeline-badges"><span className={`history-crowd ${crowd.toLowerCase()}`}>{crowd}</span>{detail[0] && <span>{detail[0]}</span>}{detail[1] && <span>{detail[1]}</span>}{detail[2] && <span>{detail[2]}</span>}</div><p>Reported by <strong>{report.reporter_name || "Passenger"}</strong></p>{feedbackItem && <p className="history-rating">Feedback: {"★".repeat(feedbackItem.rating)} {feedbackItem.rating === 5 ? "Excellent" : "Passenger rating"}</p>}</article>; })}</div>}
    <p className="history-feedback-link"><Link href="/feedback">See all feedback →</Link></p>
  </div>;
}
