// app/api/admin/process-document/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { extractDocumentFeatures, generateEmbedding } from "@/lib/gemini";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import mammoth from "mammoth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  let docId: string | null = null;
  let filename = "Unknown";
  let activeWorkspaceId = "00000000-0000-0000-0000-000000000000";
  
  try {
    // 1. Verify admin permissions and resolve workspace ID
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    activeWorkspaceId = workspaceId;

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }
    
    docId = documentId;

    // Check if Deno Edge Functions are enabled to process this asynchronously (non-blocking)
    if (process.env.SUPABASE_EDGE_FUNCTIONS_ENABLED === "true") {
      try {
        // Trigger Deno Edge Function in the background
        supabase.functions.invoke("process-document", {
          body: { documentId }
        }).catch(err => {
          console.error("Asynchronous Edge Function invocation failed:", err);
        });

        await supabase.rpc("log_audit_event", {
          p_action: "Edge Function Ingestion Triggered",
          p_workspace_id: activeWorkspaceId,
          p_details: { document_id: documentId }
        });

        return NextResponse.json({
          success: true,
          message: "Ingestion started in background via Supabase Edge Function."
        });
      } catch (edgeErr: any) {
        console.warn("Edge function invocation exception, falling back to Next.js inline processing:", edgeErr);
      }
    }

    // 2. Fetch document details checking workspace isolation
    const { data: document, error: docError } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("id", documentId)
      .eq("workspace_id", activeWorkspaceId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    filename = document.filename;
    const { storage_path, mime_type } = document;

    // 3. Update status to 'processing'
    await supabase
      .from("uploaded_documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId)
      .eq("workspace_id", activeWorkspaceId);

    await supabase.rpc("log_audit_event", {
      p_action: "Process Document Started",
      p_workspace_id: activeWorkspaceId,
      p_details: { document_id: documentId, filename }
    });

    // 4. Download file from Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message || "Empty file blob"}`);
    }

    // 5. Extract text content & metadata
    let features: any = null;

    if (mime_type === "application/pdf" || mime_type.startsWith("image/")) {
      // Multimodal processing (PDF or Image) - Send base64 inline data
      const arrayBuffer = await fileBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      
      features = await extractDocumentFeatures(
        { base64, mimeType: mime_type },
        filename
      );
    } else if (
      mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // DOCX processing - parse via mammoth, then send extracted text to Gemini
      const arrayBuffer = await fileBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const docxResult = await mammoth.extractRawText({ buffer });
      const text = docxResult.value;

      features = await extractDocumentFeatures(
        { text, mimeType: "text/plain" },
        filename
      );
    } else {
      // Text, Markdown, CSV, JSON processing - read text content and send to Gemini
      const text = Buffer.from(await fileBlob.arrayBuffer()).toString("utf-8");
      
      features = await extractDocumentFeatures(
        { text, mimeType: mime_type },
        filename
      );
    }

    if (!features) {
      throw new Error("Gemini feature extraction returned empty results.");
    }

    // 6. Perform semantic chunking via LangChain
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 80,
    });
    const chunks = await splitter.splitText(features.text);
    if (chunks.length === 0) {
      throw new Error("No text chunks generated from the document.");
    }

    // 7. Delete any existing chunks for this document (re-indexing protection)
    await supabase
      .from("knowledge_base")
      .delete()
      .eq("document_id", documentId)
      .eq("workspace_id", activeWorkspaceId);

    // 8. Generate embeddings and insert chunks as drafts
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await generateEmbedding(chunkText);
      const slug = slugify(features.title || filename);

      const metadata = {
        description: features.description || "",
        safety: features.safetyInformation || "",
        attributes: features.attributes || {},
        original_mime_type: mime_type,
        processed_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from("knowledge_base")
        .insert({
          document_id: documentId,
          title: features.title || filename,
          slug,
          category: features.category || "general",
          content: features.text, // full extracted markdown
          chunk_id: i,
          chunk_text: chunkText,
          embedding,
          keywords: features.keywords || [],
          metadata,
          source_url: storage_path,
          source_type: "file",
          status: "draft",
          workspace_id: activeWorkspaceId
        });

      if (insertError) {
        throw new Error(`Failed to insert chunk index ${i}: ${insertError.message}`);
      }
    }

    // 9. Update status to draft
    await supabase
      .from("uploaded_documents")
      .update({ status: "draft" })
      .eq("id", documentId)
      .eq("workspace_id", activeWorkspaceId);

    await supabase.rpc("log_audit_event", {
      p_action: "Process Document Completed",
      p_workspace_id: activeWorkspaceId,
      p_details: { document_id: documentId, filename, chunks_created: chunks.length }
    });

    return NextResponse.json({
      success: true,
      message: `Document processed successfully. Created ${chunks.length} chunks.`,
      chunksCount: chunks.length
    });
  } catch (err: any) {
    console.error("Error in /api/admin/process-document:", err);
    
    // Attempt to update document status to failed
    if (docId) {
      try {
        const supabase = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']).then(r => r.supabase);
        await supabase
          .from("uploaded_documents")
          .update({ status: "failed", error_message: err.message || "Unknown error" })
          .eq("id", docId)
          .eq("workspace_id", activeWorkspaceId);

        await supabase.rpc("log_audit_event", {
          p_action: "Process Document Failed",
          p_workspace_id: activeWorkspaceId,
          p_details: { document_id: docId, filename, error: err.message }
        });
      } catch (dbErr) {
        console.error("Failed to write error state to DB:", dbErr);
      }
    }

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
