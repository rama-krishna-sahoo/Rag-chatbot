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

    // 1. Get document details
    const { data: document, error: docError } = await supabase
      .from("uploaded_documents")
      .select("id, filename, workspace_id")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 2. Update status of all chunks in knowledge_base to 'published'
    const { error: updateError } = await supabase
      .from("knowledge_base")
      .update({ status: "published" })
      .eq("document_id", documentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update status in uploaded_documents as well
    const { error: docUpdateError } = await supabase
      .from("uploaded_documents")
      .update({ status: "published" })
      .eq("id", documentId);

    if (docUpdateError) {
      return NextResponse.json({ error: docUpdateError.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "Document Published to Production",
      p_workspace_id: workspaceId || document.workspace_id,
      p_details: { document_id: documentId, filename: document.filename }
    });

    return NextResponse.json({ success: true, message: "Document successfully published to live chatbot production environment." });
  } catch (err: any) {
    console.error("Error in /api/admin/publish-document:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
