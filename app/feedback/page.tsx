"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PassengerReport = { id: string; city: string; route_id?: string; crowd_level: string; reporter_name?: string; reporter_location?: string; observed_at: string; submitted_at: string; description?: string; expires_at?: string; is_demo?: boolean };
type SiteFeedback = { id: string; reporter_id: string; name: string; rating: number; liked: string[]; improve: string[]; message: string; created_at: string };
const likedOptions = ["Easy to Use", "Bus Live", "Report is Easy", "Route is Clear", "Design is Beautiful"];
const improveOptions = ["More Buses", "More Locations", "Faster Update", "Better Map", "Nothing - All Good"];

export default function FeedbackPage() {
  const [reports, setReports] = useState<PassengerReport[]>([]);
  const [items, setItems] = useState<SiteFeedback[]>([]);
  const [name, setName] = useState("");
  const [reporterId, setReporterId] = useState("");
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [improve, setImprove] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    let id = localStorage.getItem("busbatao-reporter-id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("busbatao-reporter-id", id); }
    setReporterId(id);
    void Promise.all([
      fetch("/api/reports?limit=200", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/site-feedback", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([reportResult, feedbackResult]) => {
      if (!active) return;
      setReports((reportResult.reports || []).filter((report: PassengerReport) => !report.is_demo && report.crowd_level !== "unknown" && (!report.expires_at || Date.parse(report.expires_at) > Date.now())));
      setItems(feedbackResult.feedback || []);
    }).catch(() => { if (active) setStatus("Shared feedback is unavailable right now."); });
    return () => { active = false; };
  }, []);

  function toggle(list: string[], setter: (value: string[]) => void, item: string) { setter(list.includes(item) ? list.filter((value) => value !== item) : [...list, item]); }
  async function submit() {
    if (!name.trim()) { setStatus("Please type your name"); return; }
    if (!rating) { setStatus("Choose a star rating first"); return; }
    setSaving(true); setStatus("");
    try {
      const response = await fetch("/api/site-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporterId, name: name.trim(), rating, liked, improve, message: message.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save feedback.");
      setItems((old) => [result.feedback, ...old.filter((item) => item.reporter_id !== reporterId)]);
      setStatus("Thank you for your feedback");
      setMessage("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save feedback."); }
    finally { setSaving(false); }
  }

  return <div className="page-shell feedback-page"><p className="eyebrow">PASSENGER VOICE</p><h1>Feedback</h1><p className="subtitle">Recent passenger reports and your feedback help improve each ride.</p>
    <section className="panel feedback-reports"><h2>Latest passenger reports</h2>{reports.length ? <div className="report-feed">{reports.slice(0, 10).map((item) => <article className="panel feedback-report-card" key={item.id}><strong>{item.reporter_location || item.city}</strong><span>{crowdText(item.crowd_level)} · {item.description || "Passenger report"}</span><span>Reported by {item.reporter_name || "Passenger"} · {new Date(item.observed_at).toLocaleString()}</span></article>)}</div> : <p>No fresh report yet - Be the first to report</p>}</section>
    <section className="panel feedback-form-premium"><p className="eyebrow">YOUR EXPERIENCE MATTERS</p><h2>How is this website?</h2><div className="star-picker" role="group" aria-label="Rate the website">{[1,2,3,4,5].map((star) => <button key={star} type="button" aria-label={`${star} stars`} aria-pressed={rating === star} className={rating >= star ? "star-filled" : ""} onClick={() => setRating(star)}>★</button>)}</div>{rating > 0 && <p className="rating-caption">{["", "Very Bad", "Bad", "Okay", "Good", "Excellent - Thank you so much"][rating]} <span aria-hidden="true">{rating === 5 ? "😊" : rating < 3 ? "😕" : "🙂"}</span></p>}
      <h3>What did you like?</h3><div className="feedback-choice-grid">{likedOptions.map((option) => <button key={option} type="button" className={liked.includes(option) ? "feedback-chip active" : "feedback-chip"} aria-pressed={liked.includes(option)} onClick={() => toggle(liked, setLiked, option)}>{option}</button>)}</div>
      <h3>What should we improve?</h3><div className="feedback-choice-grid">{improveOptions.map((option) => <button key={option} type="button" className={improve.includes(option) ? "feedback-chip active" : "feedback-chip"} aria-pressed={improve.includes(option)} onClick={() => toggle(improve, setImprove, option)}>{option}</button>)}</div>
      <label>Your Name (required)<input className="journey-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your name" /></label><label>Your Message<textarea className="journey-input feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your experience here..." maxLength={500} /></label><button className="button button-orange feedback-submit" type="button" disabled={saving || !reporterId} onClick={() => void submit()}>{saving ? "SUBMITTING..." : items.some((item) => item.reporter_id === reporterId) ? "UPDATE FEEDBACK" : "SUBMIT FEEDBACK"}</button>{status && <p className="inline-status" role="status">{status}</p>}
    </section>
    <section className="feedback-list"><div className="section-heading"><h2>Passenger feedback</h2></div>{items.length ? items.map((item) => <article className="panel feedback-entry" key={item.id}><div className="feedback-entry-heading"><strong>{item.name}</strong><time>{new Date(item.created_at).toLocaleString()}</time></div><div className="feedback-entry-stars" aria-label={`${item.rating} stars`}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)} <span>{item.rating === 5 ? "Excellent" : item.rating >= 4 ? "Good" : item.rating === 3 ? "Okay" : item.rating === 2 ? "Bad" : "Very Bad"}</span></div>{item.liked.length > 0 && <p><b>Liked:</b> {item.liked.join(", ")}</p>}{item.improve.length > 0 && <p><b>Improve:</b> {item.improve.join(", ")}</p>}{item.message && <p>{item.message}</p>}</article>) : <p className="panel feedback-empty">No feedback yet - Be the first to give feedback</p>}</section>
    <p className="feedback-history-link"><Link href="/history">See passenger history →</Link></p>
  </div>;
}

function crowdText(level: string) { return level === "low" ? "Empty" : level === "moderate" ? "Moderate" : level === "high" ? "Crowded" : "Full"; }
