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
        setErrorText("AI is unavailable or not configured. This is a clearly labelled rules-based summary, not an AI response.");
      } else {
        setState("ready");
      }
    } catch (error) {
      setSummary(buildRuleSummary(reports));
      setState("error");
      setErrorText(error instanceof Error ? `${error.message} Showing a rules-based summary.` : "Analysis failed. Showing a rules-based summary.");
    }
  }, [demoMode, reports, targetId, targetType]);

  useEffect(() => {
    if (autoAnalyze) void analyze();
  }, [analyze, autoAnalyze]);

  return <article className={`summary-card ${demoMode ? "summary-demo" : ""}`}>
    <div className="summary-header"><span className="intelligence-mark" aria-hidden="true">B</span><div><p className="eyebrow">BUSBATAO INTELLIGENCE</p>
      <span className="summary-label">{summary.generated_by === "AI" ? "AI summary (Gemini)" : "Rules-based fallback"}</span></div>
    </div>
    <div className="summary-content"><p className="eyebrow">{label.toUpperCase()}</p><h2>{summary.summary}</h2>
      <div className="metric-row"><span>Bus status</span><strong>{summary.busStatus} · {label}</strong></div>
      <div className="metric-row"><span>Crowd level now</span><strong>{summary.crowdLevel}</strong></div>
      <div className="metric-row"><span>Conflicts</span><strong>{summary.conflicts}</strong></div>
      <div className="metric-row"><span>Confidence</span><strong>{summary.confidence.level} · {summary.confidence.reason}</strong></div>
      <p className="summary-description">{summary.advice}</p>
      {errorText && <p className="inline-error" role="status">{errorText}</p>}
    </div>
    <div className="summary-actions"><button className="button button-small" type="button" onClick={analyze} disabled={state === "loading"}>{state === "loading" ? "Analysing…" : "Analyse recent reports"}</button>
      <span className="summary-label">{summary.generated_by === "AI" ? "AI response" : "Not AI-generated"}</span></div>
    <p className="summary-disclaimer">{demoMode ? "These are fictional demonstration records, not passenger reports. " : ""}Reports are unverified observations, not official service information.</p>
  </article>;
}
