import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { DEMO_REPORTS, DEMO_ROUTES, DEMO_STOPS } from "../lib/demo-data";

loadEnvConfig(process.cwd());

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the demo seed.");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const stops = await supabase.from("stops").upsert(DEMO_STOPS, { onConflict: "id" });
  if (stops.error) throw new Error(`Failed to seed demo stops: ${stops.error.message}`);
  const routes = await supabase.from("routes").upsert(DEMO_ROUTES, { onConflict: "id" });
  if (routes.error) throw new Error(`Failed to seed demo routes: ${routes.error.message}`);
  const routeStops = DEMO_ROUTES.flatMap((route) => route.stop_ids.map((stopId, index) => ({
    route_id: route.id,
    stop_id: stopId,
    stop_order: index,
    source_name: "BusBatao fictional demo data",
    verification_status: "demonstration",
  })));
  const sequences = await supabase.from("route_stops").upsert(routeStops, { onConflict: "route_id,stop_order" });
  if (sequences.error) throw new Error(`Failed to seed demo route stops: ${sequences.error.message}`);
  const reports = await supabase.from("reports").upsert(DEMO_REPORTS, { onConflict: "id" });
  if (reports.error) throw new Error(`Failed to seed demo reports: ${reports.error.message}`);
  console.log("BusBatao isolated demo stops, routes and reports have been seeded.");
}

async function main() {
  try { await seed(); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
void main();
