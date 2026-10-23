"use client";

import { useCallback, useEffect, useState } from "react";
import { buildRuleSummary } from "@/lib/analysis";
import type { Report, TransportSummary } from "@/lib/types";

export function SummaryCard({
  targetType, targetId, reports, demoMode = false, label, autoAnalyze = false,
}: {
  targetType: "stop" | "route";
  targetId: string;
  reports: Report[];
  demoMode?: boolean;
  label: string;
  autoAnalyze?: boolean;
}) {
  const [summary, setSummary] = useState(() => buildRuleSummary(reports));
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const confidencePercent = summary.confidence.level === "high" ? 85 : summary.confidence.level === "medium" ? 60 : 30;

  const analyze = useCallback(async () => {
    setState("loading");
    setErrorText("");
    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, demoMode }),
      });
      const result = await response.json() as TransportSummary & { service_unavailable?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Analysis could not be generated.");
      setSummary(result);
      if (result.service_unavailable) {
        setState("error");
        setErrorText("Report analysis is unavailable. Showing a rules-based summary.");
      } else {
        setState("ready");
      }
    } catch (error) {
      console.error("Summary analysis request failed", error);
      const fallback = buildRuleSummary(reports);
      setSummary(fallback);
      setState("error");
      setErrorText(error instanceof Error ? `${error.message} Showing a rules-based summary.` : "Analysis failed. Showing a rules-based summary.");
    }
  }, [demoMode, reports, targetId, targetType]);

  useEffect(() => {
    if (autoAnalyze) void analyze();
  }, [analyze, autoAnalyze]);

  return <article className={`summary-card ${demoMode ? "summary-demo" : ""}`}>
    <div className="summary-header"><span className="intelligence-mark" aria-hidden="true">B</span><div><p className="eyebrow">BUSBATAO INTELLIGENCE</p>
      <span className="summary-label">{"Based on recent passenger reports"}</span></div>
    </div>
    <div className="summary-content"><p className="eyebrow">{label.toUpperCase()}</p><h2>{summary.summary}</h2>
      <div className={`status-badge status-${summary.busStatus}`}><span aria-hidden="true">{summary.busStatus === "arrived" ? "â—" : summary.busStatus === "disruption" ? "!" : "?"}</span>
        <div><span>Bus status Â· {label}</span><strong>{summary.busStatus}</strong></div></div>
      <div className="metric-row"><span>Crowd level now</span><strong className={`crowd-badge crowd-${summary.crowdLevel}`}>{summary.crowdLevel}</strong></div>
      <div className="metric-row"><span>Conflicts</span><strong>{summary.conflicts}</strong></div>
      <div className="metric-row"><span>Confidence</span><strong>{summary.confidence.level} Â· {summary.confidence.reason}</strong></div>
      <div className="confidence-meter" role="img" aria-label={`Confidence: ${summary.confidence.level}`}>
        <div className="confidence-track"><span style={{ width: `${confidencePercent}%` }} /></div>
        <span>{summary.confidence.level} confidence</span>
      </div>
      <p className="summary-description">{summary.advice}</p>
      {errorText && <p className="inline-error" role="status">{errorText}</p>}
    </div>
    <div className="summary-actions"><button className="button button-small" type="button" onClick={() => void analyze()} disabled={state === "loading"}>{state === "loading" ? "Analysingâ€¦" : "Analyse recent reports"}</button>
      <span className="summary-label" aria-live="polite">{state === "loading" ? "Checking reportsâ€¦" : "Based on recent passenger reports"}</span>
      <time className="summary-label summary-updated" dateTime={summary.generated_at}>Analysis checked {timeAgo(summary.generated_at)}</time></div>
    <p className="summary-disclaimer">{demoMode ? "These are fictional demonstration records, not passenger reports. " : ""}Reports are unverified observations, not official service information.</p>
  </article>;
}

function timeAgo(timestamp: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}
