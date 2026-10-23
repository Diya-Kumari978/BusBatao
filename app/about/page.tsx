import Link from "next/link";

export default function AboutPage() {
  return <div className="page-shell narrow-shell about-page"><p className="eyebrow">DATA TRANSPARENCY</p><h1>Useful information,<br />honest limits.</h1>
    <p className="subtitle">BusBatao brings together published route information and community observations for Hyderabad and Jamshoro. It helps explain what is known, how old it is, and when evidence conflicts.</p>
    <section className="panel about-panel"><h2>Published route sources</h2>
      <p>The Sindh Mass Transit Authority route directory was checked on 23 October 2026. Its accessible route listing showed Karachi routes (R1–R13), and did not provide Hyderabad routes in the content reviewed.</p>
      <p>HYD-01, HYD-02 and HYD-03 appeared in the supplied project brief, but could not be verified on the current directory page; they are intentionally kept as candidate routes with unknown published status and no stop sequence.</p>
      <a className="text-link" href="https://smta.gos.pk/route-map" target="_blank" rel="noreferrer">Open SMTA route directory ↗</a>
    </section>
    <section className="panel about-panel"><h2>How passenger observations work</h2><ol>
      <li>A commuter selects a configured city and route or stop, then shares an observation and its observed time.</li>
      <li>Submission time is recorded separately. We do not request precise GPS coordinates.</li>
      <li>Recent reports are deduplicated by an anonymous browser identifier for confidence calculations.</li>
      <li>Reports can be flagged for review. A community report does not become verified just because AI analysed it.</li>
    </ol></section>
    <section className="panel about-panel"><h2>Freshness and AI</h2>
      <p>Recent means observed within 15 minutes. Aging means 15–60 minutes. Stale means more than 60 minutes old. These configurable labels describe age, not accuracy.</p>
      <p>BusBatao Intelligence receives actual report evidence server-side, distinguishes contradictions, and must not invent arrival times or official facts. Confidence is calculated in code from report quantity, agreement and freshness. If Gemini is unavailable or not configured, the app labels a rules-based fallback clearly.</p>
    </section>
    <section className="panel about-panel"><h2>Privacy, safety, and limitations</h2>
      <p>Browsing is anonymous. Report submission uses a browser-generated identifier only for duplicate prevention. We do not collect account details, live location, or public reporter identities. Do not include names or sensitive information in descriptions.</p>
      <p>Passenger reports can be inaccurate, duplicated, or outdated. BusBatao does not offer live vehicle GPS, official arrival predictions, verified service availability, or safety ratings. Check the operator or local sources before travelling.</p>
      <p>Fictional records appear only when Demo Mode is explicitly selected; they are isolated from community reports.</p>
    </section>
    <div className="page-actions"><Link className="button button-small" href="/report">Share an observation</Link><Link className="text-link" href="/routes/suggest">Suggest a local route →</Link></div>
  </div>;
}
