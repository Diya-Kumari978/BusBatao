import assert from "node:assert/strict";
import test from "node:test";
import { feedbackInputSchema, reportInputSchema, summaryInputSchema } from "../lib/validation";

test("report input requires city and at least one route or stop", () => {
  const base = {
    city: "Hyderabad",
    routeId: "hyd-01-candidate",
    reportType: "bus_seen",
    serviceStatus: "seen",
    crowdLevel: "unknown",
    observedAt: "2026-10-23T10:00:00.000Z",
    reporterId: "anonymous-device-identifier",
  };
  assert.equal(reportInputSchema.safeParse(base).success, true);
  assert.equal(reportInputSchema.safeParse({ ...base, routeId: undefined }).success, false);
});

test("report input enforces description length and supported values", () => {
  const base = {
    city: "Jamshoro", stopId: "campus-stop", reportType: "bus_delayed", serviceStatus: "delayed",
    crowdLevel: "moderate", observedAt: "2026-10-23T10:00:00.000Z", reporterId: "anonymous-device-identifier",
  };
  assert.equal(reportInputSchema.safeParse({ ...base, description: "x".repeat(241) }).success, false);
  assert.equal(reportInputSchema.safeParse({ ...base, reportType: "fabricated_arrival" }).success, false);
  assert.equal(reportInputSchema.safeParse({ ...base, city: "Karachi" }).success, false);
});

test("analysis target requires a supported target type and identifier", () => {
  assert.equal(summaryInputSchema.safeParse({ targetType: "route", targetId: "route-01", demoMode: true }).success, true);
  assert.equal(summaryInputSchema.safeParse({ targetType: "bus", targetId: "" }).success, false);
});

test("feedback accepts only a valid target and yes/no response", () => {
  assert.equal(feedbackInputSchema.safeParse({ targetType: "stop", targetId: "stop-01", helpful: true }).success, true);
  assert.equal(feedbackInputSchema.safeParse({ targetType: "bus", targetId: "", helpful: "yes" }).success, false);
});
