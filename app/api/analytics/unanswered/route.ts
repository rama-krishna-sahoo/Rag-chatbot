// app/api/analytics/unanswered/route.ts
// GAP 7 FIX: Real unanswered questions endpoint for the admin page.
// Returns questions the bot couldn't answer, sorted by most recent.

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      200
    );

    const { data, error } = await supabase
      .from("unanswered_questions")
      .select("id, question_text, similarity_score, session_id, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Table may not exist yet — return empty gracefully
      if (
        error.message.includes("does not exist") ||
        error.code === "42P01"
      ) {
        return NextResponse.json({ questions: [], total: 0, tableMissing: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: data || [], total: data?.length ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Allow admin to delete (dismiss) a resolved unanswered question
export async function DELETE(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
      .from("unanswered_questions")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
