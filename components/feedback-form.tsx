"use client";

import { useState } from "react";

export function FeedbackForm({ targetType, targetId }: { targetType: "stop" | "route"; targetId: string }) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(helpful: boolean) {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, helpful }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save feedback.");
      setStatus("Thanks for your feedback.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save feedback.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="feedback-panel panel" aria-labelledby="feedback-heading">
    <div><p className="eyebrow">HELP IMPROVE THIS SUMMARY</p><h2 id="feedback-heading">Was this helpful?</h2></div>
    <div className="feedback-actions">
      <button type="button" className="button button-small" onClick={() => void submit(true)} disabled={saving}>Yes</button>
      <button type="button" className="button button-small button-secondary" onClick={() => void submit(false)} disabled={saving}>No</button>
    </div>
    {status && <p role="status" className="small muted">{status}</p>}
  </section>;
}
