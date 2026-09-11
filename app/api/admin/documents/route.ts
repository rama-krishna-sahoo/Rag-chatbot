// app/api/admin/documents/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// GET: List all uploaded documents for the active workspace
export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/admin/documents:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Register a newly uploaded document associated with the active workspace
export async function POST(req: Request) {
  try {
    const { authorized, supabase, user, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { filename, storagePath, fileSize, mimeType } = await req.json();

    if (!filename || !storagePath) {
      return NextResponse.json({ error: "Missing filename or storagePath" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("uploaded_documents")
      .insert({
        filename,
        storage_path: storagePath,
        file_size: fileSize || 0,
        mime_type: mimeType || "text/plain",
        status: "pending",
        workspace_id: workspaceId,
        uploaded_by: (user?.id && isUuid(user.id)) ? user.id : null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "Document Uploaded",
      p_workspace_id: workspaceId,
      p_details: { document_id: data.id, filename }
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in POST /api/admin/documents:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete a document and its chunks under workspace isolation
export async function DELETE(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    // 1. Get storage path and confirm workspace ownership before deleting
    const { data: document, error: fetchError } = await supabase
      .from("uploaded_documents")
      .select("storage_path, filename")
      .eq("id", documentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    // 2. Delete file from storage bucket
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([document.storage_path]);

    if (storageError) {
      console.warn("Storage deletion warning:", storageError.message);
    }

    // 3. Delete document record (cascade deletes chunks in knowledge_base)
    const { error: dbError } = await supabase
      .from("uploaded_documents")
      .delete()
      .eq("id", documentId)
      .eq("workspace_id", workspaceId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "Document Deleted",
      p_workspace_id: workspaceId,
      p_details: { document_id: documentId, filename: document.filename }
    });

    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (err: any) {
    console.error("Error in DELETE /api/admin/documents:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
