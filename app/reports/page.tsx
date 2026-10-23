import { redirect } from "next/navigation";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  redirect(params.demo === "1" ? "/updates?demo=1" : "/updates");
}
