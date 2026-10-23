export const APP_NAME = "BusBatao";

export const FRESHNESS_MINUTES = {
  fresh: 15,
  recent: 60,
} as const;

export const REPORT_WINDOW_MINUTES = 60;
export const DUPLICATE_WINDOW_MINUTES = 10;
export const MAX_DESCRIPTION_LENGTH = 240;
export const MAX_REPORTS_PER_MINUTE = 8;
export const MAX_AI_REQUESTS_PER_MINUTE = 5;
export const OFFICIAL_ROUTE_SOURCE = "Sindh Mass Transit Authority route directory";
export const OFFICIAL_ROUTE_SOURCE_URL = "https://smta.gos.pk/route-map";
export const LAST_ROUTE_RESEARCHED = "2026-10-23";
