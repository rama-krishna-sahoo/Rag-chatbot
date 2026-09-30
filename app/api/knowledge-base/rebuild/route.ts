// app/api/knowledge-base/rebuild/route.ts
// Triggers re-processing of all pending/failed documents in the workspace.

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Find all documents that are not yet indexed
    const { data: docs, error } = await supabase
      .from("uploaded_documents")
      .select("id, filename, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending", "failed", "draft"]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!docs || docs.length === 0) {
      return NextResponse.json({ success: true, message: "No documents need reprocessing.", triggered: 0 });
    }

    // Fan out async calls to the process route for each doc
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";
    const baseUrl = new URL(origin).origin;

    const results = await Promise.allSettled(
      docs.map((doc: any) =>
        fetch(`${baseUrl}/api/documents/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id, workspaceId }),
        }).then((r) => r.json())
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      message: `Rebuild triggered for ${docs.length} documents. ${succeeded} succeeded, ${failed} failed.`,
      triggered: docs.length,
      succeeded,
      failed,
      workspaceId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

