"use client";

import { useEffect, useState } from "react";
import type { Report, TransportSummary } from "@/lib/types";

export function RouteAnalysis({ area, destination, routeDirection, report }: { area: string; destination: string; routeDirection: string; report: Report | undefined }) {
  const [analysis, setAnalysis] = useState<(TransportSummary & { service_unavailable?: boolean }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const routeId = report?.route_id || (destination === "University of Modern Sciences, Jamshoro" ? "modern-sciences-jamshoro-corridor" : `university-corridor-${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`);

  useEffect(() => {
    let active = true;
    setAnalysis(null);
    setError("");
    if (!report) return () => { active = false; };
    setLoading(true);
    void fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "route", targetId: routeId, demoMode: false }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analysis could not be loaded.");
      if (active) setAnalysis(result as TransportSummary & { service_unavailable?: boolean });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Analysis could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [report?.id, report?.updated_at, report?.observed_at, routeId]);

  const details = [...new Set(report?.description?.split(";").map((part) => part.trim()).filter((part) => part && !/^\d+ minutes ago$/i.test(part)) ?? [])];
  const crowd = report ? report.crowd_level === "low" ? "Empty" : report.crowd_level === "moderate" ? "Moderate" : report.crowd_level === "high" ? "Crowded" : "Full" : "";
  const advice = !report ? "No fresh report yet - Be the first reporter" : /stuck|delayed|traffic|crowded|full/i.test(`${crowd} ${details.join(" ")}`) ? "Consider waiting for the next passenger update." : "The latest report looks clear. You can go now.";

  return <section className="panel route-analysis-card" aria-live="polite">
    <p className="eyebrow">ON THIS ROUTE</p>
    <h3>Latest passenger report</h3>
    {!report ? <p>No fresh report yet - Be the first reporter</p> : <>
      <p className="analysis-route-line"><strong>Destination:</strong> {destination}<br /><strong>Route:</strong> {routeDirection}</p>
      <div className="analysis-details">
        <p><strong>Starting area</strong><span>{area}</span></p>
        <p><strong>Crowd</strong><span>{crowd}</span></p>
        <p><strong>Bus</strong><span>{details.find((part) => part.startsWith("Bus is")) || "Condition not included in this update"}; reported at {report.bus_location || report.reporter_location || "location not provided"}</span></p>
        <p><strong>Road</strong><span>{details.find((part) => part.startsWith("Road is") || part.startsWith("City is")) || "Condition not included in this update"}</span></p>
        <p><strong>Reported</strong><span>{new Date(report.observed_at).toLocaleString()}</span></p>
        <p><strong>Passenger</strong><span>{report.reporter_name || "Passenger"}{report.reporter_location ? ` · ${report.reporter_location}` : ""}</span></p>
      </div>
      {loading && <p className="analysis-status">Reviewing the latest passenger report…</p>}
      {analysis?.summary && <p className="analysis-result">{analysis.summary}</p>}
      {analysis?.advice && <p className="analysis-status">{analysis.advice}</p>}
      {error && <p className="analysis-status">{advice}</p>}
      {!loading && !error && !analysis && <p className="analysis-status">{advice}</p>}
      {analysis?.service_unavailable && <p className="analysis-status">Showing a report based route summary. Configure the analysis service for generated analysis.</p>}
    </>}
  </section>;
}
