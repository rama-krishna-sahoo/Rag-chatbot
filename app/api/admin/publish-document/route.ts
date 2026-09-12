// app/api/admin/publish-document/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin', 'Reviewer']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { documentId, publishAll } = await req.json();

    if (publishAll) {
      // 1. Get all documents in workspace
      const { data: docs, error: docsFetchErr } = await supabase
        .from("uploaded_documents")
        .select("id")
        .eq("workspace_id", workspaceId);

      if (docsFetchErr) {
        return NextResponse.json({ error: docsFetchErr.message }, { status: 500 });
      }

      const docIds = docs?.map((d) => d.id) || [];

      // 2. Update status of chunks in knowledge_base to 'published'
      if (docIds.length > 0) {
        await supabase
          .from("knowledge_base")
          .update({ status: "published" })
          .in("document_id", docIds);
      }

      await supabase
        .from("knowledge_base")
        .update({ status: "published" })
        .eq("workspace_id", workspaceId);

      // 3. Update status of uploaded_documents
      const { error: docUpdateError } = await supabase
        .from("uploaded_documents")
        .update({ status: "published" })
        .eq("workspace_id", workspaceId);

      if (docUpdateError) {
        return NextResponse.json({ error: docUpdateError.message }, { status: 500 });
      }

      await supabase.rpc("log_audit_event", {
        p_action: "All Documents Published to Production",
        p_workspace_id: workspaceId,
        p_details: { publish_all: true, count: docIds.length }
      });

      return NextResponse.json({ success: true, message: "All documents successfully published to live chatbot production environment." });
    }

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId or publishAll flag" }, { status: 400 });
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
