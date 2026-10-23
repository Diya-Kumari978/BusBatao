"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page-shell error-page"><p className="eyebrow">TEMPORARY SERVICE ISSUE</p><h1>Some data could not load.</h1>
    <p className="subtitle">Check your connection and Supabase configuration. BusBatao does not replace missing transport information with fictional reports.</p>
    <button className="button" type="button" onClick={() => reset()}>Try again</button>
  </div>;
}
