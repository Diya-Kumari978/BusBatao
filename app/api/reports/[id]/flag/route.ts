import { NextRequest, NextResponse } from "next/server";
import { flagInputSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";

const flagsPerMinute = new Map<string, number[]>();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-zA-Z-]{1,80}$/.test(id)) return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  const parsed = flagInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a reason for flagging this report." }, { status: 400 });
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (flagsPerMinute.get(clientKey) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 5) return NextResponse.json({ error: "Too many flags. Please try again later." }, { status: 429 });
  flagsPerMinute.set(clientKey, [...recent, now]);
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Flagging requires the shared database. No flag was saved." }, { status: 503 });
  const { data: report, error: reportError } = await supabase.from("reports").select("id").eq("id", id).eq("moderation_status", "visible").maybeSingle();
  if (reportError) {
    console.error("Flag target lookup failed", reportError);
    return NextResponse.json({ error: "Unable to check the report before flagging." }, { status: 500 });
  }
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  const { error } = await supabase.from("report_flags").insert({
    report_id: id,
    reason: parsed.data.reason,
    description: parsed.data.description || null,
  });
  if (error) {
    console.error("Report flag insert failed", error);
    return NextResponse.json({ error: "Unable to save the report flag." }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
