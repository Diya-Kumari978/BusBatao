import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const reviewSchema = z.object({ flagId: z.uuid(), reviewStatus: z.enum(["reviewed", "dismissed", "actioned"]) });

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared database is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("report_flags").select("id,report_id,reason,description,created_at,review_status,reports(id,city,report_type,description,observed_at,moderation_status)").eq("review_status", "pending").order("created_at", { ascending: false }).limit(100);
  if (error) {
    console.error("Admin flag queue lookup failed", error);
    return NextResponse.json({ error: "Unable to load the flag queue." }, { status: 500 });
  }
  return NextResponse.json({ flags: data });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid flag review action." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Shared database is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("report_flags").update({ review_status: parsed.data.reviewStatus }).eq("id", parsed.data.flagId).eq("review_status", "pending").select("id,report_id").maybeSingle();
  if (error) {
    console.error("Admin flag review failed", error);
    return NextResponse.json({ error: "Unable to review this flag." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Pending flag not found." }, { status: 404 });
  if (parsed.data.reviewStatus === "actioned") {
    const { error: moderationError } = await supabase.from("reports").update({ moderation_status: "hidden" }).eq("id", data.report_id);
    if (moderationError) {
      console.error("Admin could not hide actioned report", moderationError);
      return NextResponse.json({ error: "The flag was actioned, but its report could not be hidden." }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true });
}
