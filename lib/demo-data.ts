import { LAST_ROUTE_RESEARCHED, OFFICIAL_ROUTE_SOURCE, OFFICIAL_ROUTE_SOURCE_URL } from "./config";
import type { Report, Route, Stop } from "./types";

export const DEMO_STOPS: Stop[] = [
  { id: "demo-campus-gate", name: "University Gate · Demo Stop", city: "Jamshoro", latitude: null, longitude: null, verification_status: "demonstration", is_demo: true },
  { id: "demo-library-junction", name: "Library Junction · Demo Stop", city: "Jamshoro", latitude: null, longitude: null, verification_status: "demonstration", is_demo: true },
  { id: "demo-hostel-road", name: "Hostel Road · Demo Stop", city: "Jamshoro", latitude: null, longitude: null, verification_status: "demonstration", is_demo: true },
  { id: "demo-highway-link", name: "Highway Link · Demo Stop", city: "Jamshoro", latitude: null, longitude: null, verification_status: "demonstration", is_demo: true },
  { id: "demo-hyderabad-center", name: "Central Hyderabad · Demo Stop", city: "Hyderabad", latitude: null, longitude: null, verification_status: "demonstration", is_demo: true },
];

export const OFFICIAL_CANDIDATE_ROUTES: Route[] = [
  {
    id: "hyd-01-candidate", route_code: "HYD-01", name: "Hyder Chowk to Hatri Police Station",
    origin: "Hyder Chowk", destination: "Hatri Police Station", city: "Hyderabad", published_status: "active",
    verification_status: "verified", source_name: `${OFFICIAL_ROUTE_SOURCE} (checked ${LAST_ROUTE_RESEARCHED})`,
    source_url: OFFICIAL_ROUTE_SOURCE_URL, last_verified_at: `${LAST_ROUTE_RESEARCHED}T00:00:00.000Z`,
    description: "Officially listed active route, 15 km. Stops in order: Hyder Chowk, Fatima Jinnah NBP, Civic Center, Giddu Chowk, Qasim Chowk, Central Jail Hyderabad, ISRA Hospital, Hatri Police Station. Fare and timetable not published in the directory.",
    is_demo: false, stop_ids: [],
  },
  {
    id: "hyd-02-candidate", route_code: "HYD-02", name: "Hala Naka to Tando Allahyar",
    origin: "Hala Naka", destination: "Tando Allahyar", city: "Hyderabad", published_status: "active",
    verification_status: "verified", source_name: `${OFFICIAL_ROUTE_SOURCE} (checked ${LAST_ROUTE_RESEARCHED})`,
    source_url: OFFICIAL_ROUTE_SOURCE_URL, last_verified_at: `${LAST_ROUTE_RESEARCHED}T00:00:00.000Z`,
    description: "Officially listed active route, 40 km. Stops in order: Hala Naka, New Sabzi Mandi, Mirrani Goth, Tando Jam Toll, Detta Goth, Goth Misri Solangi, Tando Jam, Khesana Mori, Rashidabad, Tando Allahyar. Fare and timetable not published in the directory.",
    is_demo: false, stop_ids: [],
  },
  {
    id: "hyd-03-candidate", route_code: "HYD-03", name: "Hyder Chowk to Kohsar Colony (inactive)",
    origin: "Hyder Chowk", destination: "Kohsar Colony", city: "Hyderabad", published_status: "inactive",
    verification_status: "verified", source_name: `${OFFICIAL_ROUTE_SOURCE} (checked ${LAST_ROUTE_RESEARCHED})`,
    source_url: OFFICIAL_ROUTE_SOURCE_URL, last_verified_at: `${LAST_ROUTE_RESEARCHED}T00:00:00.000Z`,
    description: "Officially listed inactive route, 14 km. Stops in order: Hyder Chowk, Tandi Sarak, Autobahn Road, Latifabad, Airport Road, Kohsar Colony. Do not rely on current service without confirmation.",
    is_demo: false, stop_ids: [],
  },
];

export const DEMO_ROUTES: Route[] = [
  {
    id: "demo-campus-loop", route_code: "DEMO-01", name: "Campus Loop (Demo)",
    origin: "University Gate · Demo Stop", destination: "Hostel Road · Demo Stop", city: "Jamshoro",
    published_status: "unknown", verification_status: "demonstration", source_name: "BusBatao fictional demo data",
    source_url: null, last_verified_at: null, description: "Fictional route used only to demonstrate the app.",
    is_demo: true, stop_ids: ["demo-campus-gate", "demo-library-junction", "demo-hostel-road"],
  },
  {
    id: "demo-campus-connector", route_code: "DEMO-02", name: "Campus Connector (Demo)",
    origin: "University Gate · Demo Stop", destination: "Highway Link · Demo Stop", city: "Jamshoro",
    published_status: "unknown", verification_status: "demonstration", source_name: "BusBatao fictional demo data",
    source_url: null, last_verified_at: null, description: "Fictional route used only to demonstrate the app.",
    is_demo: true, stop_ids: ["demo-campus-gate", "demo-highway-link"],
  },
  {
    id: "demo-city-connector", route_code: "DEMO-03", name: "City Connector (Demo)",
    origin: "Highway Link · Demo Stop", destination: "Central Hyderabad · Demo Stop", city: "Hyderabad",
    published_status: "unknown", verification_status: "demonstration", source_name: "BusBatao fictional demo data",
    source_url: null, last_verified_at: null, description: "Fictional route used only to demonstrate the app.",
    is_demo: true, stop_ids: ["demo-highway-link", "demo-hyderabad-center"],
  },
];

const observedMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const demoUuid = (id: string) => `00000000-0000-4000-8000-${id.replace(/\D/g, "").padStart(12, "0")}`;
const demoReport = (
  id: string, stopId: string, routeId: string | undefined, city: Report["city"],
  reportType: Report["report_type"], serviceStatus: Report["service_status"], crowdLevel: Report["crowd_level"],
  minutesAgo: number, description: string,
): Report => ({
  id: demoUuid(id), stop_id: stopId, route_id: routeId, city, report_type: reportType,
  service_status: serviceStatus, crowd_level: crowdLevel,
  description: `Demo report: ${description}`, observed_at: observedMinutesAgo(minutesAgo),
  submitted_at: observedMinutesAgo(Math.max(0, minutesAgo - 2)), reporter_id: `demo-reporter-${id}`,
  source_type: "demonstration", moderation_status: "visible", is_demo: true,
});

export const DEMO_REPORTS: Report[] = [
  demoReport("demo-01", "demo-campus-gate", "demo-campus-loop", "Jamshoro", "bus_delayed", "delayed", "moderate", 4, "service has not been seen yet."),
  demoReport("demo-02", "demo-campus-gate", "demo-campus-loop", "Jamshoro", "bus_seen", "seen", "high", 7, "a bus was seen at the stop."),
  demoReport("demo-03", "demo-campus-gate", "demo-campus-loop", "Jamshoro", "bus_crowded", "crowded", "high", 12, "crowding was high."),
  demoReport("demo-04", "demo-campus-gate", "demo-campus-loop", "Jamshoro", "bus_delayed", "delayed", "moderate", 24, "service appeared delayed."),
  demoReport("demo-05", "demo-library-junction", "demo-campus-loop", "Jamshoro", "bus_seen", "seen", "low", 6, "a bus was observed."),
  demoReport("demo-06", "demo-library-junction", "demo-campus-loop", "Jamshoro", "bus_crowded", "crowded", "moderate", 18, "crowding was moderate."),
  demoReport("demo-07", "demo-hostel-road", "demo-campus-loop", "Jamshoro", "bus_full", "full", "full", 36, "one bus was reported full."),
  demoReport("demo-08", "demo-hostel-road", "demo-campus-loop", "Jamshoro", "route_disruption", "disrupted", "unknown", 80, "a possible route disruption was reported."),
  demoReport("demo-09", "demo-highway-link", "demo-city-connector", "Jamshoro", "bus_crowded", "crowded", "high", 9, "a crowded service was reported."),
  demoReport("demo-10", "demo-highway-link", "demo-city-connector", "Jamshoro", "bus_crowded", "crowded", "moderate", 48, "crowding was described as moderate."),
  demoReport("demo-11", "demo-hyderabad-center", "demo-city-connector", "Hyderabad", "no_recent_bus", "not_seen", "unknown", 115, "no recent arrival had been observed at that time."),
  demoReport("demo-12", "demo-hyderabad-center", "demo-city-connector", "Hyderabad", "route_disruption", "disrupted", "unknown", 155, "a possible disruption was reported."),
];
