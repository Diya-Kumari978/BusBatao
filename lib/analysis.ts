import { FRESHNESS_MINUTES, REPORT_WINDOW_MINUTES } from "./config";
import type { Confidence, Freshness, Report, TransportSummary } from "./types";

export function classifyFreshness(observedAt: string | Date, now = new Date()): Freshness {
  const timestamp = typeof observedAt === "string" ? new Date(observedAt) : observedAt;
  const ageMinutes = Math.max(0, (now.getTime() - timestamp.getTime()) / 60_000);
  if (ageMinutes < FRESHNESS_MINUTES.fresh) return "Recent";
  if (ageMinutes <= FRESHNESS_MINUTES.recent) return "Aging";
  return "Stale";
}

export function independentRecentReports(reports: Report[], now = new Date()): Report[] {
  const cutoff = now.getTime() - REPORT_WINDOW_MINUTES * 60_000;
  const lastAcceptedByReporter = new Map<string, number>();
  return reports
    .filter((report) => report.moderation_status === "visible" && new Date(report.observed_at).getTime() >= cutoff && new Date(report.observed_at).getTime() <= now.getTime())
    .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))
    .filter((report) => {
      if (!report.reporter_id) return true;
      const timestamp = Date.parse(report.observed_at);
      const lastAccepted = lastAcceptedByReporter.get(report.reporter_id);
      if (lastAccepted !== undefined && lastAccepted - timestamp < 10 * 60_000) return false;
      lastAcceptedByReporter.set(report.reporter_id, timestamp);
      return true;
    });
}

export function detectConflicts(reports: Report[]): string[] {
  const conflicts: string[] = [];
  const closeInTime = (left: Report, right: Report) =>
    Math.abs(Date.parse(left.observed_at) - Date.parse(right.observed_at)) <= 20 * 60_000;
  const delayReports = reports.filter((report) => ["bus_delayed", "no_recent_bus"].includes(report.report_type));
  const arrivalReports = reports.filter((report) => report.report_type === "bus_seen");
  if (delayReports.some((delay) => arrivalReports.some((arrival) => closeInTime(delay, arrival)))) {
    conflicts.push("Passenger observations close in time disagree about whether a bus was seen or delayed.");
  }
  const crowdReports = reports.filter((report) => ["low", "moderate", "high", "full"].includes(report.crowd_level));
  if (crowdReports.some((left, index) => crowdReports.slice(index + 1).some((right) =>
    closeInTime(left, right) && Math.abs(crowdRank(left.crowd_level) - crowdRank(right.crowd_level)) >= 2))) {
    conflicts.push("Passenger observations close in time report substantially different crowd levels.");
  }
  return conflicts;
}

function crowdRank(level: Report["crowd_level"]): number {
  return ({ low: 1, moderate: 2, high: 3, full: 4, unknown: 0 })[level];
}

export function calculateConfidence(reports: Report[], now = new Date()): Confidence {
  const usable = independentRecentReports(reports, now);
  if (usable.length === 0) {
    return { level: "Low", score: 5, explanation: "No visible observations in the last hour; evidence is insufficient." };
  }
  const conflicts = detectConflicts(usable).length;
  const newestAge = Math.max(0, (now.getTime() - Date.parse(usable[0].observed_at)) / 60_000);
  const agreementByGroup = new Map<string, Map<string, number>>();
  for (const report of usable) {
    const group = ["bus_seen", "bus_delayed", "no_recent_bus"].includes(report.report_type)
      ? "service-status"
      : ["bus_crowded", "bus_full"].includes(report.report_type)
        ? "crowd-observation"
        : report.report_type;
    const observation = group === "crowd-observation" ? report.crowd_level : report.report_type;
    const counts = agreementByGroup.get(group) ?? new Map<string, number>();
    counts.set(observation, (counts.get(observation) ?? 0) + 1);
    agreementByGroup.set(group, counts);
  }
  const measurableAgreement = [...agreementByGroup.values()]
    .filter((counts) => [...counts.values()].reduce((sum, count) => sum + count, 0) > 1)
    .map((counts) => Math.max(...counts.values()) / [...counts.values()].reduce((sum, count) => sum + count, 0));
  const agreement = measurableAgreement.length
    ? measurableAgreement.reduce((sum, value) => sum + value, 0) / measurableAgreement.length
    : 0.5;
  const recency = Math.max(0, 1 - newestAge / REPORT_WINDOW_MINUTES);
  const quantity = Math.min(1, usable.length / 4);
  const rawScore = Math.max(5, Math.min(95, (quantity * 0.4 + agreement * 0.35 + recency * 0.25) * 100 - conflicts * 12));
  const score = Math.round(conflicts ? Math.min(69, rawScore) : rawScore);
  const level = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
  return {
    level,
    score,
    explanation: `${usable.length} independent observations in the last hour; ${conflicts ? "some reports conflict" : "no close-in-time conflict detected"}; newest observation ${Math.round(newestAge)} min ago.`,
  };
}

function reportDescription(report: Report): string {
  const titles: Record<Report["report_type"], string> = {
    bus_seen: "A passenger saw a bus at the stop.",
    bus_delayed: "A passenger reported a delay.",
    no_recent_bus: "A passenger had not recently seen a bus at the time of observation.",
    bus_crowded: "A passenger reported crowding.",
    bus_full: "A passenger reported being unable to board a full bus.",
    route_disruption: "A passenger reported a possible route disruption.",
    correction: "A passenger suggested a correction to transport information.",
    other: "A passenger submitted another transport observation.",
  };
  return titles[report.report_type];
}

export function buildRuleSummary(reports: Report[], now = new Date()): TransportSummary {
  const recent = independentRecentReports(reports, now);
  const conflicts = detectConflicts(recent);
  const latest = recent[0];
  const ruleConfidence = calculateConfidence(recent, now);
  const latestServiceReport = recent.find((report) => ["bus_delayed", "bus_seen", "route_disruption"].includes(report.report_type));
  const crowd = recent.find((report) => report.crowd_level !== "unknown")?.crowd_level;
  return {
    busStatus: latestServiceReport?.report_type === "bus_delayed" ? "delayed"
      : latestServiceReport?.report_type === "bus_seen" ? "arrived"
        : latestServiceReport?.report_type === "route_disruption" ? "disruption" : "unknown",
    crowdLevel: crowd === "moderate" ? "medium" : crowd ?? "unknown",
    conflicts: conflicts.length ? conflicts.join(" ") : "No conflicts detected in recent reports.",
    confidence: {
      level: ruleConfidence.level === "High" ? "high" : ruleConfidence.level === "Moderate" ? "medium" : "low",
      reason: ruleConfidence.explanation,
    },
    summary: latest ? `${reportDescription(latest)}${conflicts.length ? " Reports disagree." : ""}` : "No recent reports. Status unknown.",
    advice: recent.length ? "Check the report times and share a new observation if conditions change." : "Check locally or wait for a new passenger report.",
    evidence_report_ids: recent.map((report) => report.id),
    generated_at: now.toISOString(),
    generated_by: "rules",
  };
}

export function toPromptEvidence(reports: Report[], flaggedReportIds = new Set<string>(), now = new Date()): Array<{
  id: string;
  city: string;
  observed_at: string;
  submitted_at: string;
  report_type: string;
  service_status: string;
  crowd_level: string;
  description: string | null;
  source_type: string;
  age_label: Freshness;
  flagged: boolean;
}> {
  return reports
    .filter((report) => report.moderation_status === "visible" || report.moderation_status === "flagged")
    .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))
    .slice(0, 100)
    .map((report) => ({
    id: report.id,
    city: report.city,
    observed_at: report.observed_at,
    submitted_at: report.submitted_at,
    report_type: report.report_type,
    service_status: report.service_status,
    crowd_level: report.crowd_level,
    description: report.description ?? null,
    source_type: report.source_type,
    age_label: classifyFreshness(report.observed_at, now),
    flagged: flaggedReportIds.has(report.id) || report.moderation_status === "flagged",
  }));
}
