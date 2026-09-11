import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const resolvedParams = await params;
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("id", resolvedParams.id)
      .eq("workspace_id", workspaceId)
      .eq("action", "Chat Conversation")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || { error: "Conversation entry not found" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const resolvedParams = await params;
    const { error } = await supabase
      .from("audit_logs")
      .delete()
      .eq("id", resolvedParams.id)
      .eq("workspace_id", workspaceId)
      .eq("action", "Chat Conversation");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Conversation deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
