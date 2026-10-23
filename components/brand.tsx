import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="BusBatao home">
    <svg className="brand-mark" viewBox="0 0 38 38" aria-hidden="true">
      <path d="M8 10.5h18a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-8l-6 4v-4h-4a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M10 17h14M10 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="25" cy="23" r="2" fill="currentColor"/>
    </svg>
    <span className="brand-name"><strong>Bus</strong><strong className="brand-accent">Batao</strong><small>Bus ka haal, pehle se pata.</small></span>
  </Link>;
}
