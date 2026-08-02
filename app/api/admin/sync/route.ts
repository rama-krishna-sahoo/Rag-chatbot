// app/api/admin/sync/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { extractDocumentFeatures, generateEmbedding } from "@/lib/gemini";
import { chunkMarkdown } from "@/lib/chunker";

function cleanHtml(html: string): string {
  // Strip script, style, head, and nav tags to clean up the content
  let cleaned = html
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
    .replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, "")
    .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, "")
    .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  
  return cleaned;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper to check if a document is due for a sync
function isSyncDue(lastSyncedAtStr: string | null, createdAtStr: string, frequency: string): boolean {
  const referenceTime = new Date(lastSyncedAtStr || createdAtStr).getTime();
  const currentTime = Date.now();
  const diffHours = (currentTime - referenceTime) / (1000 * 60 * 60);

  if (frequency === "daily") {
    return diffHours >= 24;
  } else if (frequency === "monthly") {
    return diffHours >= 24 * 30;
  } else {
    // default to weekly
    return diffHours >= 24 * 7;
  }
}

// PUT: Update synchronization settings for a document under workspace isolation
export async function PUT(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(["Super Admin", "Knowledge Admin"]);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { documentId, syncEnabled, syncFrequency } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("uploaded_documents")
      .update({
        sync_enabled: syncEnabled,
        sync_frequency: syncFrequency,
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "Website Sync Settings Updated",
      p_workspace_id: workspaceId,
      p_details: { document_id: documentId, sync_enabled: syncEnabled, sync_frequency: syncFrequency }
    });

    return NextResponse.json({ success: true, document: data });
  } catch (err: any) {
    console.error("Error in PUT /api/admin/sync:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Run synchronization
export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(["Super Admin", "Knowledge Admin"]);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    // Mode A: Sync a single document immediately (manual trigger)
    if (id) {
      const { data: document, error: docError } = await supabase
        .from("uploaded_documents")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .single();

      if (docError || !document) {
        return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
      }

      if (document.mime_type !== "text/html") {
        return NextResponse.json({ error: "Only website reference materials can be synchronized." }, { status: 400 });
      }

      await syncDocument(supabase, document, workspaceId);
      
      return NextResponse.json({
        success: true,
        message: `Successfully synchronized website: ${document.storage_path}`
      });
    }

    // Mode B: Batch sync all due documents
    const { data: documents, error: docsError } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("mime_type", "text/html")
      .eq("sync_enabled", true)
      .eq("workspace_id", workspaceId);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    const syncedList: string[] = [];
    
    for (const doc of documents) {
      if (isSyncDue(doc.last_synced_at, doc.created_at, doc.sync_frequency || "weekly")) {
        try {
          await syncDocument(supabase, doc, workspaceId);
          syncedList.push(doc.storage_path);
        } catch (syncErr: any) {
          console.error(`Failed to auto-sync document ${doc.id} (${doc.storage_path}):`, syncErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedList.length,
      synced: syncedList
    });

  } catch (err: any) {
    console.error("Error in POST /api/admin/sync:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

async function syncDocument(supabase: any, document: any, workspaceId: string) {
  const url = document.storage_path;
  const domain = new URL(url).hostname;

  // 1. Mark as processing
  await supabase
    .from("uploaded_documents")
    .update({ status: "processing", error_message: null })
    .eq("id", document.id)
    .eq("workspace_id", workspaceId);

  await supabase.rpc("log_audit_event", {
    p_action: "Website Sync Started",
    p_workspace_id: workspaceId,
    p_details: { document_id: document.id, url }
  });

  try {
    // 2. Fetch HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website. HTTP status: ${response.status}`);
    }

    const html = await response.text();
    const cleanedText = cleanHtml(html);

    if (cleanedText.length < 50) {
      throw new Error("Extracted content is too short or empty.");
    }

    // 3. Extract features & metadata
    const features = await extractDocumentFeatures(
      { text: cleanedText.substring(0, 30000), mimeType: "text/plain" },
      `Website: ${domain}`
    );

    if (!features) {
      throw new Error("Gemini feature extraction returned empty results.");
    }

    const chunks = chunkMarkdown(features.text);
    if (chunks.length === 0) {
      throw new Error("No text chunks generated from the website.");
    }

    // 4. Delete old chunks under workspace isolation
    await supabase
      .from("knowledge_base")
      .delete()
      .eq("document_id", document.id)
      .eq("workspace_id", workspaceId);

    // 5. Insert new chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await generateEmbedding(chunkText);
      const slug = slugify(features.title || `Website: ${domain}`);

      const metadata = {
        description: features.description || "",
        safety: features.safetyInformation || "",
        attributes: features.attributes || {},
        original_mime_type: "text/html",
        processed_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from("knowledge_base")
        .insert({
          document_id: document.id,
          title: features.title || `Website: ${domain}`,
          slug,
          category: features.category || "general",
          content: features.text,
          chunk_id: i,
          chunk_text: chunkText,
          embedding,
          keywords: features.keywords || [],
          metadata,
          source_url: url,
          source_type: "website",
          status: "published", // Auto-publish synced data
          workspace_id: workspaceId
        });

      if (insertError) {
        throw new Error(`Failed to insert chunk index ${i}: ${insertError.message}`);
      }
    }

    // 6. Complete status and update last_synced_at
    await supabase
      .from("uploaded_documents")
      .update({
        status: "completed",
        file_size: cleanedText.length,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", document.id)
      .eq("workspace_id", workspaceId);

    await supabase.rpc("log_audit_event", {
      p_action: "Website Sync Completed",
      p_workspace_id: workspaceId,
      p_details: { document_id: document.id, url, chunks_created: chunks.length }
    });

  } catch (err: any) {
    await supabase
      .from("uploaded_documents")
      .update({
        status: "failed",
        error_message: err.message || "Sync failed"
      })
      .eq("id", document.id)
      .eq("workspace_id", workspaceId);

    await supabase.rpc("log_audit_event", {
      p_action: "Website Sync Failed",
      p_workspace_id: workspaceId,
      p_details: { document_id: document.id, url, error: err.message }
    });

    throw err;
  }
}
