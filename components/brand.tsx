import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="BusBatao home">
    <svg className="brand-mark" viewBox="0 0 64 64" role="img" aria-label="BusBatao smiling bus logo">
      <path className="chat-bubble" d="M38 5h18a6 6 0 0 1 6 6v8l-6-3H38a5 5 0 0 1-5-5v-1a5 5 0 0 1 5-5Z" fill="#FACC15"/>
      <path d="M7 23a8 8 0 0 1 8-8h34a8 8 0 0 1 8 8v25H7V23Z" fill="#16A34A"/>
      <path d="M14 22h16v13H14zm20 0h16v13H34z" fill="#FFFFFF"/>
      <path d="M16 41c3 4 7 4 10 0m10 0c3 4 7 4 10 0" fill="none" stroke="#111111" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="22" cy="39" r="2" fill="#FACC15"/><circle cx="42" cy="39" r="2" fill="#FACC15"/>
      <path d="M13 49v4m38-4v4" stroke="#111111" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="19" cy="54" r="5" fill="#111111"/><circle cx="45" cy="54" r="5" fill="#111111"/>
    </svg>
    <span className="brand-name"><strong>Bus</strong><strong className="brand-accent">Batao</strong><small>Know The Crowd Before You Board</small></span>
  </Link>;
}
