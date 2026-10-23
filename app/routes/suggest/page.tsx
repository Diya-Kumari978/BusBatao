import Link from "next/link";
import { RouteSuggestionForm } from "@/components/route-suggestion-form";

export default function SuggestRoutePage() {
  return <div className="page-shell narrow-shell"><Link className="back-link" href="/routes">← Back to routes</Link>
    <p className="eyebrow top-spacer">COMMUNITY CONTRIBUTION</p><h1>Suggest a route</h1>
    <p className="subtitle">Help document local transport information. Suggestions stay clearly unverified until reviewed against a credible source.</p>
    <RouteSuggestionForm />
  </div>;
}
