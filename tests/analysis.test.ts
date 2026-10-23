import assert from "node:assert/strict";
import test from "node:test";
import { buildRuleSummary, calculateConfidence, classifyFreshness, detectConflicts } from "../lib/analysis";
import { DEMO_REPORTS, DEMO_ROUTES, DEMO_STOPS } from "../lib/demo-data";
import type { Report } from "../lib/types";

const now = new Date("2026-10-23T12:00:00.000Z");
function report(type: Report["report_type"], minutes: number, reporter = `${type}-${minutes}`, crowd: Report["crowd_level"] = "unknown"): Report {
  const observedAt = new Date(now.getTime() - minutes * 60_000).toISOString();
  return {
    id: `${type}-${minutes}`, stop_id: "test-stop", city: "Jamshoro", report_type: type,
    service_status: type === "bus_seen" ? "seen" : type === "bus_delayed" ? "delayed" : "unknown",
    crowd_level: crowd, observed_at: observedAt, submitted_at: observedAt, reporter_id: reporter,
    source_type: "community", moderation_status: "visible", is_demo: false,
  };
}

test("classifies Recent, Aging, and Stale based on observation time", () => {
  assert.equal(classifyFreshness(new Date(now.getTime() - 14 * 60_000), now), "Recent");
  assert.equal(classifyFreshness(new Date(now.getTime() - 15 * 60_000), now), "Aging");
  assert.equal(classifyFreshness(new Date(now.getTime() - 60 * 60_000), now), "Aging");
  assert.equal(classifyFreshness(new Date(now.getTime() - 61 * 60_000), now), "Stale");
});

test("rules summary uses visible reports from the last hour and unknown when none exist", () => {
  assert.equal(buildRuleSummary([], now).summary, "No recent reports. Status unknown.");
  assert.equal(buildRuleSummary([report("bus_delayed", 20)], now).busStatus, "delayed");
  assert.equal(buildRuleSummary([report("bus_delayed", 5)], now).busStatus, "delayed");
  assert.equal(buildRuleSummary([report("bus_delayed", 60)], now).busStatus, "delayed");
  assert.equal(buildRuleSummary([report("bus_delayed", 61)], now).summary, "No recent reports. Status unknown.");
});

test("detects close-in-time contradictory bus and crowd observations", () => {
  assert.equal(detectConflicts([report("bus_seen", 2), report("bus_delayed", 8)]).length, 1);
  assert.equal(detectConflicts([report("bus_crowded", 2, "a", "high"), report("bus_crowded", 8, "b", "low")]).length, 1);
  assert.equal(detectConflicts([report("bus_seen", 2), report("bus_delayed", 40)]).length, 0);
});

test("confidence reflects quantity, recency, and disagreement", () => {
  assert.equal(calculateConfidence([], now).level, "Low");
  const aligned = calculateConfidence([report("bus_delayed", 1), report("bus_delayed", 3), report("bus_delayed", 5)], now);
  const conflicting = calculateConfidence([report("bus_delayed", 1), report("bus_seen", 3), report("bus_seen", 5)], now);
  assert.ok(aligned.score > conflicting.score);
  assert.notEqual(conflicting.level, "High");
  assert.ok(aligned.score <= 95);
  assert.match(aligned.explanation, /3 independent observations/);
});

test("repeat reports inside ten minutes count once, including across clock boundaries", () => {
  const older = report("bus_delayed", 11, "same");
  const newer = report("bus_delayed", 2, "same");
  const confidence = calculateConfidence([older, newer], now);
  assert.match(confidence.explanation, /1 independent observation/);
});

test("demo dataset stays separately labelled and meets its demo coverage", () => {
  assert.ok(DEMO_STOPS.length >= 5);
  assert.ok(DEMO_ROUTES.length >= 3);
  assert.ok(DEMO_REPORTS.length >= 12);
  assert.ok(DEMO_REPORTS.every((item) => item.source_type === "demonstration" && item.is_demo));
});
