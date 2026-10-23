import type { CSSProperties } from "react";

export function MovingBus({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <svg className={`moving-bus ${className}`} style={style} viewBox="0 0 96 54" role="img" aria-label="Bus">
    <g className="bus-smoke" fill="#94a3b8"><circle cx="12" cy="39" r="4" /><circle cx="7" cy="31" r="3" /><circle cx="3" cy="24" r="2" /></g>
    <rect x="17" y="7" width="72" height="36" rx="9" fill="#16a34a" />
    <path d="M24 13h17v13H24zm22 0h17v13H46zm22 0h13v13H68z" fill="#fefce8" />
    <rect x="23" y="30" width="57" height="5" rx="2.5" fill="#facc15" />
    <g className="bus-wheel"><circle cx="34" cy="43" r="7" fill="#1f2937" /><circle cx="34" cy="43" r="2.5" fill="#e2e8f0" /><path d="M34 37v12m-6-6h12" stroke="#f8fafc" strokeWidth="1.2" /></g>
    <g className="bus-wheel"><circle cx="74" cy="43" r="7" fill="#1f2937" /><circle cx="74" cy="43" r="2.5" fill="#e2e8f0" /><path d="M74 37v12m-6-6h12" stroke="#f8fafc" strokeWidth="1.2" /></g>
  </svg>;
}
