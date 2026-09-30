// app/api/documents/process/route.ts
// GAP 1 FIX: Full document processing pipeline — extracts text, chunks it, embeds and indexes it.
// Supports PDF (via base64 → Gemini vision), plain text, markdown, and FAQ files.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractDocumentFeatures, generateEmbedding } from "@/lib/gemini";
import { chunkMarkdown, chunkFaq } from "@/lib/chunker";
import { inferCategoryFromUrlOrTitle } from "@/lib/website-processor";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ""
  );
}

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Detect FAQ format: Q: ... A: ... or **Q:** / **A:** patterns
function isFaqFormat(text: string): boolean {
  const lines = text.split("\n");
  let qaCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^(Q:|Question:|Q\s*\d+[\.\):])/i.test(trimmed) ||
      /^\*\*Q[\.\)]?\*\*/.test(trimmed) ||
      /^\d+\.\s*(Q:|Question:)/i.test(trimmed)
    ) {
      qaCount++;
    }
  }
  return qaCount >= 2; // At least 2 Q: markers = FAQ format
}

export async function POST(req: Request) {
  const supabase = getSupabase();

  let docId: string | null = null;

  try {
    const body = await req.json();
    const { documentId, workspaceId, userId } = body;

    if (!documentId || !isUuid(documentId)) {
      return NextResponse.json(
        { error: "Valid documentId UUID is required." },
        { status: 400 }
      );
    }

    // Fetch the document record from DB
    const { data: doc, error: fetchErr } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (fetchErr || !doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    docId = documentId;
    const targetWsId = workspaceId || doc.workspace_id;

    // Mark as processing
    await supabase
      .from("uploaded_documents")
      .update({ status: "processing" })
      .eq("id", docId);

    // --- Step 1: Read file content from Supabase Storage ---
    let fileBase64: string | undefined;
    let fileText: string | undefined;
    const mimeType: string = doc.mime_type || "text/plain";

    const storagePath: string = doc.storage_path;

    if (storagePath.startsWith("http")) {
      // Website URL — not handled here (use /api/website instead)
      return NextResponse.json(
        { error: "Website URLs should be processed via /api/website." },
        { status: 400 }
      );
    }

    // Download file bytes from Supabase Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (dlErr || !fileData) {
      throw new Error(
        `Failed to download file from storage: ${dlErr?.message}`
      );
    }

    if (
      mimeType === "application/pdf" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Convert to base64 for Gemini vision processing
      const buffer = Buffer.from(await fileData.arrayBuffer());
      fileBase64 = buffer.toString("base64");
    } else {
      // Plain text, markdown, FAQ
      fileText = await fileData.text();
    }

    // --- Step 2: Extract features via Gemini ---
    const features = await extractDocumentFeatures(
      { base64: fileBase64, text: fileText, mimeType },
      doc.filename,
      `Document filename: ${doc.filename}`
    );

    if (!features || !features.text || features.text.trim().length < 20) {
      throw new Error(
        "Gemini feature extraction returned insufficient content."
      );
    }

    // --- Step 3: Delete any previously indexed chunks for this doc ---
    await supabase
      .from("knowledge_base")
      .delete()
      .eq("document_id", docId)
      .eq("workspace_id", targetWsId);

    // --- Step 4: Choose chunker (FAQ-aware vs. standard) ---
    const rawText = features.text;
    let chunks: string[];

    if (fileText && isFaqFormat(fileText)) {
      // GAP 6 FIX: FAQ Q&A-pair-aware chunker
      chunks = chunkFaq(rawText);
    } else {
      chunks = chunkMarkdown(rawText);
    }

    if (chunks.length === 0) {
      throw new Error("No chunks generated from document content.");
    }

    const inferredCategory = inferCategoryFromUrlOrTitle(
      "",
      features.title || doc.filename
    );
    const finalCategory =
      features.category && features.category.toLowerCase() !== "general"
        ? features.category
        : inferredCategory || features.category || "General";

    const slugify = (t: string) =>
      t
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const slug = slugify(features.title || doc.filename);

    // --- Step 5: Embed each chunk and insert into knowledge_base ---
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await generateEmbedding(chunkText);

      const { error: insertErr } = await supabase.from("knowledge_base").insert({
        document_id: docId,
        title: features.title || doc.filename,
        slug,
        category: finalCategory,
        content: features.text,
        chunk_id: i,
        chunk_text: chunkText,
        embedding,
        keywords: features.keywords || [],
        metadata: {
          description: features.description || "",
          safety: features.safetyInformation || "",
          attributes: features.attributes || {},
          original_mime_type: mimeType,
          processed_at: new Date().toISOString(),
        },
        source_url: null,
        source_type: mimeType === "application/pdf" ? "pdf" : "text",
        status: "published",
        workspace_id: targetWsId,
      });

      if (insertErr) {
        throw new Error(
          `Failed to insert chunk ${i}: ${insertErr.message}`
        );
      }
    }

    // --- Step 6: Mark document as indexed ---
    await supabase
      .from("uploaded_documents")
      .update({ status: "indexed" })
      .eq("id", docId);

    // Audit log
    try {
      await supabase.rpc("log_audit_event", {
        p_action: "Document Indexed",
        p_workspace_id: targetWsId,
        p_details: {
          document_id: docId,
          filename: doc.filename,
          chunks_created: chunks.length,
          mime_type: mimeType,
        },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      chunksCreated: chunks.length,
      title: features.title,
      category: finalCategory,
    });
  } catch (err: any) {
    console.error("Error in /api/documents/process POST:", err);

    if (docId) {
      const supabase2 = getSupabase();
      await supabase2
        .from("uploaded_documents")
        .update({
          status: "failed",
          error_message: err.message || "Unknown error",
        })
        .eq("id", docId);
    }

    return NextResponse.json(
      { error: err.message || "Document processing failed." },
      { status: 500 }
    );
  }
}
