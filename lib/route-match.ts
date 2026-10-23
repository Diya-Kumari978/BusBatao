import type { Route } from "@/lib/types";

const corridors = [
  ["Nadeem Nagar", "Qasimabad", "Market Tower"], ["Latifabad Unit 1", "Latifabad Unit 2", "Autobahn Road"],
  ["Latifabad Unit 3", "Latifabad Unit 4", "Autobahn Road"], ["Latifabad Unit 5", "Latifabad Unit 6", "Autobahn Road"],
  ["Latifabad Unit 7", "Latifabad Unit 8", "Autobahn Road"], ["Latifabad Unit 9", "Latifabad Unit 10", "Autobahn Road"],
  ["Latifabad Unit 11", "Latifabad Unit 12", "Autobahn Road"], ["Wadhu Wah", "Jamshoro Phatak", "Indus Highway"],
  ["Saddar", "Hyder Chowk", "Station Road"], ["Hyder Chowk", "Market Tower", "Station Road"],
  ["Hala Naka", "New Sabzi Mandi", "Tando Jam"], ["Citizen Colony", "Naseem Nagar", "Qasimabad"],
  ["Kohsar", "Gulistan-e-Sajjad", "Jamshoro Phatak"], ["Kotri", "Jamshoro Phatak", "Indus Highway"],
  ["Qasimabad", "Wadhu Wah", "Jamshoro Phatak"], ["Thandi Sarak", "Autobahn Road", "Latifabad Unit 7"],
  ["Saddar", "Hala Naka", "Tando Jam"], ["Station Road", "Hyder Chowk", "Jamshoro Phatak"],
  ["Jamshoro Phatak", "Indus Highway", "University Road"], ["Wadhu Wah", "Jamshoro Phatak", "University Road"],
] as const;

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function getLocalRouteCandidates(from: string, destination: string): Route[] {
  if (!from.trim() || !destination.trim()) return [];
  const typed = normalize(from);
  const targetStop = destination.trim();
  const score = (text: string) => {
    const candidate = normalize(text);
    if (!candidate || !typed) return 0;
    if (candidate === typed) return 10;
    if (candidate.includes(typed) || typed.includes(candidate)) return 7;
    return typed.split(" ").filter((word) => word.length > 2 && candidate.includes(word)).length;
  };
  const ordered = corridors.map((stops, index) => ({ stops, index, match: Math.max(score(stops[0]), score(stops[1]), score(stops[2])) }))
    .sort((a, b) => b.match - a.match || a.index - b.index);
  const best = ordered.slice(0, 20);
  return best.map(({ stops }, index) => {
    const via = [...new Set([from.trim(), ...stops.filter((stop) => score(stop) < 7), targetStop])];
    const viaPoint = stops.find((stop) => score(stop) < 7) ?? stops[1];
    const routeCode = `route-${index + 1}`;
    const city: Route["city"] = /jamshoro|kotri|wadhu wah/i.test(from) ? "Jamshoro" : "Hyderabad";
    return {
      id: `proposed-${normalize(from).replace(/\s/g, "-")}-${index + 1}`, route_code: routeCode,
      from: from.trim(), to: targetStop, via: via.slice(1, -1), university: targetStop, stops: via,
      name: `${from.trim()} via ${viaPoint} to ${targetStop}`, origin: from.trim(), destination: targetStop, city,
      published_status: "unknown", verification_status: "unverified", source_name: "Passenger route proposal; not verified by the transit operator",
      source_url: null, last_verified_at: null,
      description: `Proposed path only; confirm with the operator before travelling. Ordered points: ${via.join(" → ")}. This is not a verified service, timetable, or fare.`,
      is_demo: false, stop_ids: [],
    };
  });
}
