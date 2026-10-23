import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function resetDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before resetting demo data.");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const demoReports = await supabase.from("reports").delete().eq("is_demo", true);
  if (demoReports.error) throw new Error(`Failed to remove demo reports: ${demoReports.error.message}`);
  const demoAnalyses = await supabase.from("ai_analyses").delete().eq("is_demo", true);
  if (demoAnalyses.error) throw new Error(`Failed to remove demo analyses: ${demoAnalyses.error.message}`);
  const { data: demoRoutes, error: routeLookupError } = await supabase.from("routes").select("id").eq("is_demo", true);
  if (routeLookupError) throw new Error(`Failed to list demo routes: ${routeLookupError.message}`);
  const routeIds = (demoRoutes ?? []).map((route) => route.id);
  if (routeIds.length) {
    const routeStops = await supabase.from("route_stops").delete().in("route_id", routeIds);
    if (routeStops.error) throw new Error(`Failed to remove demo route sequences: ${routeStops.error.message}`);
    const routes = await supabase.from("routes").delete().in("id", routeIds);
    if (routes.error) throw new Error(`Failed to remove demo routes: ${routes.error.message}`);
  }
  const stops = await supabase.from("stops").delete().eq("is_demo", true);
  if (stops.error) throw new Error(`Failed to remove demo stops: ${stops.error.message}`);
  console.log("Removed only BusBatao demo data. Community reports were not changed.");
}

async function main() {
  try { await resetDemo(); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
void main();
