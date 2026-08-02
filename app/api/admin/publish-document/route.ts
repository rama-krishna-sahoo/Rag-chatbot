// app/api/admin/publish-document/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin', 'Reviewer']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    // 1. Get filename and verify workspace ownership
    const { data: document, error: docError } = await supabase
      .from("uploaded_documents")
      .select("filename")
      .eq("id", documentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    // 2. Update status of all chunks in knowledge_base to 'published' under workspace isolation
    const { error: updateError } = await supabase
      .from("knowledge_base")
      .update({ status: "published" })
      .eq("document_id", documentId)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "Document Published",
      p_workspace_id: workspaceId,
      p_details: { document_id: documentId, filename: document.filename }
    });

    return NextResponse.json({ success: true, message: "Document published successfully to the chatbot." });
  } catch (err: any) {
    console.error("Error in /api/admin/publish-document:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
