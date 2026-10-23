export default function Loading() {
  return <div className="page-shell loading-shell" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading BusBatao</span>
    <div className="bus-loader" role="status"><span className="loader-bus" aria-hidden="true">🚌</span><strong>Getting your route ready…</strong></div>
    <div className="skeleton-block skeleton-heading" />
    <div className="skeleton-grid"><div className="panel skeleton-block skeleton-card" /><div className="panel skeleton-block skeleton-card" /></div>
  </div>;
}
