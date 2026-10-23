import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const schema = z.object({
  reporterId: z.string().trim().min(8).max(100),
  name: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(5),
  liked: z.array(z.string().trim().min(1).max(40)).max(8),
  improve: z.array(z.string().trim().min(1).max(40)).max(8),
  message: z.string().trim().max(500),
});

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ feedback: [], storage: "unavailable" }, { status: 503 });
  const { data, error } = await supabase.from("site_feedback").select("id,reporter_id,name,rating,liked,improve,message,created_at").order("created_at", { ascending: false }).limit(100);
  if (error) { console.error("Website feedback read failed", error.message); return NextResponse.json({ feedback: [], storage: "unavailable", error: error.message }, { status: 503 }); }
  return NextResponse.json({ feedback: data ?? [], storage: "supabase" });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type your name and choose a star rating." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared feedback storage is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("site_feedback").upsert({ ...parsed.data, created_at: new Date().toISOString() }, { onConflict: "reporter_id" }).select("id,reporter_id,name,rating,liked,improve,message,created_at").single();
  if (error) { console.error("Website feedback save failed", error.message); return NextResponse.json({ error: "Could not save feedback. Check that the latest Supabase migration is applied." }, { status: 503 }); }
  return NextResponse.json({ feedback: data, storage: "supabase" }, { status: 201 });
}
