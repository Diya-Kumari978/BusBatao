import type { Route } from "@/lib/types";

export function CrowdBar({ level }: { level: string | null | undefined }) {
  const active = level === "low" ? 1 : level === "moderate" ? 2 : level === "high" ? 3 : level === "full" ? 4 : 0;
  return <div className="crowd-line"><div className={`crowd-bar crowd-${level ?? "unknown"}`} aria-label={`Crowd level: ${level ?? "unknown"}`}>{[1, 2, 3, 4].map((index) => <i key={index} className={active >= index ? "active" : ""} />)}</div><span>{level && level !== "unknown" ? `${level[0].toUpperCase()}${level.slice(1)} · reported` : "Crowd not reported"}</span></div>;
}

export function verificationLabel(status: Route["verification_status"]) {
  return status === "verified" ? "Verified source" : status === "unverified" ? "Unverified" : "Demo data";
}
