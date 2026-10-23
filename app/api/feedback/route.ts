import { NextRequest, NextResponse } from "next/server";
import { feedbackInputSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";

const requestsByClient = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const parsed = feedbackInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Feedback must include a valid stop or route and a yes/no response." }, { status: 400 });

  const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (requestsByClient.get(clientId) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 10) return NextResponse.json({ error: "Too many feedback submissions. Please try again later." }, { status: 429 });
  requestsByClient.set(clientId, [...recent, now]);

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Feedback requires the shared database. No response was saved." }, { status: 503 });
  const { error } = await supabase.from("feedback").insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    helpful: parsed.data.helpful,
  });
  if (error) {
    console.error("Feedback insert failed", error.message);
    return NextResponse.json({ error: "Unable to save your feedback." }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
