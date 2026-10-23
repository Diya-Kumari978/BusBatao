import { z } from "zod";
import { MAX_DESCRIPTION_LENGTH } from "./config";
import { CITIES, CROWD_LEVELS, REPORT_TYPES } from "./types";

const safeDescription = z.string().trim().max(MAX_DESCRIPTION_LENGTH)
  // eslint-disable-next-line no-control-regex -- Reject unsafe control characters in user text.
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), "Description contains unsupported control characters.")
  .optional();

export const reportInputSchema = z.object({
  city: z.enum(CITIES),
  stopId: z.string().min(1).max(80).optional(),
  routeId: z.string().min(1).max(80).optional(),
  reportType: z.enum(REPORT_TYPES),
  serviceStatus: z.enum(["seen", "delayed", "not_seen", "crowded", "full", "disrupted", "unknown"]),
  crowdLevel: z.enum(CROWD_LEVELS),
  description: safeDescription,
  observedAt: z.iso.datetime({ offset: true }),
  reporterId: z.string().min(8).max(100),
}).refine((value) => value.stopId || value.routeId, "Select a stop or route.");

export const summaryInputSchema = z.object({
  targetType: z.enum(["stop", "route"]),
  targetId: z.string().min(1).max(80),
  demoMode: z.boolean().default(false),
});

export const feedbackInputSchema = z.object({
  targetType: z.enum(["stop", "route"]),
  targetId: z.string().min(1).max(80),
  helpful: z.boolean(),
});

export const flagInputSchema = z.object({
  reason: z.enum(["inaccurate", "inappropriate", "spam", "other"]),
  description: safeDescription,
});

export const routeSuggestionSchema = z.object({
  city: z.enum(CITIES),
  routeCode: z.string().trim().max(40).optional(),
  name: z.string().trim().min(3).max(120),
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  details: safeDescription,
  stops: z.array(z.string().trim().min(2).max(120)).max(30).default([]),
});
