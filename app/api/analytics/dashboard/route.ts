import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Fetch metrics using RPC
    const { data: metrics, error } = await supabase.rpc("get_admin_metrics", {
      filter_workspace_id: workspaceId
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(metrics || {
      total_documents: 0,
      total_chunks: 0,
      active_syncs: 0,
      conversations_today: 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
