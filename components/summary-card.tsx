import type { Report } from "@/lib/types";

type Props = {
  targetType: "route" | "stop";
  targetId: string;
  reports: Report[];
  demoMode?: boolean;
  label: string;
  autoAnalyze?: boolean;
};

// Kept as a no-op for older route pages; the analysis panel was removed from the product UI.
export function SummaryCard(props: Props) {
  void props;
  return null;
}
