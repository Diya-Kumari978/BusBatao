import { redirect } from "next/navigation";

export default async function LegacyStopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const demoQuery = query.demo === "1" ? "?demo=1" : "";
  redirect(`/stop/${encodeURIComponent(id)}${demoQuery}`);
}
