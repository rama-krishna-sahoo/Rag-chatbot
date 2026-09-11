import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const resolvedParams = await params;
    const docId = resolvedParams.id;
    if (!docId) return NextResponse.json({ error: "Document ID is required" }, { status: 400 });

    const { error } = await supabase
      .from("uploaded_documents")
      .delete()
      .eq("id", docId)
      .eq("workspace_id", workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
