import { ReportForm } from "@/components/report-form";
import { getRoutes, getStops } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const [stops, routes] = await Promise.all([getStops(), getRoutes()]);
  return <div className="page-shell narrow-shell">
    <p className="eyebrow">COMMUNITY CONTRIBUTION</p><h1>Share an observation</h1>
    <p className="subtitle">Tell commuters what you observed. Your observation time and submission time are stored separately.</p>
    <ReportForm stops={stops} routes={routes} />
    <p className="form-disclaimer">No account or location access required. Reports are unverified and do not represent official transit announcements.</p>
  </div>;
}
