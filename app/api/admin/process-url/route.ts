// app/api/admin/process-url/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { extractDocumentFeatures, generateEmbedding } from "@/lib/gemini";
import { chunkMarkdown } from "@/lib/chunker";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function cleanHtml(html: string): string {
  // Strip script, style, head, and nav tags to clean up the content
  let cleaned = html
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, '')
    .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
    .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
    // Replace html tags with spaces/newlines
    .replace(/<[^>]+>/g, '\n')
    // Normalize newlines
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
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

export async function POST(req: Request) {
  let docId: string | null = null;
  let targetUrl = "";
  let activeWorkspaceId = "00000000-0000-0000-0000-000000000000";

  try {
    const { authorized, supabase, user, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    activeWorkspaceId = workspaceId;

    const { url } = await req.json();
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    targetUrl = url;

    // 1. Fetch website HTML
    console.log(`Fetching website data from: ${url}`);
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
      throw new Error("Extracted text from the website is too short or empty.");
    }

    // 2. Create document record in uploaded_documents
    const domain = new URL(url).hostname;
    const { data: document, error: docError } = await supabase
      .from("uploaded_documents")
      .insert({
        filename: `Website: ${domain}`,
        storage_path: url,
        file_size: cleanedText.length,
        mime_type: "text/html",
        status: "processing",
        workspace_id: activeWorkspaceId,
        uploaded_by: (user?.id && isUuid(user.id)) ? user.id : null
      })
      .select()
      .single();

    if (docError || !document) {
      throw new Error(`Failed to create document record: ${docError?.message}`);
    }

    docId = document.id;

    await supabase.rpc("log_audit_event", {
      p_action: "Website Ingestion Started",
      p_workspace_id: activeWorkspaceId,
      p_details: { document_id: docId, url }
    });

    // 3. Extract features & metadata using Gemini
    const features = await extractDocumentFeatures(
      { text: cleanedText.substring(0, 30000), mimeType: "text/plain" }, // Limit context to 30k chars
      `Website: ${domain}`
    );

    if (!features) {
      throw new Error("Gemini feature extraction returned empty results.");
    }

    // 4. Perform semantic chunking
    const chunks = chunkMarkdown(features.text);
    if (chunks.length === 0) {
      throw new Error("No text chunks generated from the website content.");
    }

    // 5. Generate embeddings and insert chunks as drafts
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
          document_id: docId,
          title: features.title || `Website: ${domain}`,
          slug,
          category: features.category || "general",
          content: features.text, // full extracted markdown
          chunk_id: i,
          chunk_text: chunkText,
          embedding,
          keywords: features.keywords || [],
          metadata,
          source_url: url,
          source_type: "website",
          status: "draft",
          workspace_id: activeWorkspaceId
        });

      if (insertError) {
        throw new Error(`Failed to insert chunk index ${i}: ${insertError.message}`);
      }
    }

    // 6. Update status to completed
    await supabase
      .from("uploaded_documents")
      .update({ status: "completed" })
      .eq("id", docId);

    await supabase.rpc("log_audit_event", {
      p_action: "Website Ingestion Completed",
      p_workspace_id: activeWorkspaceId,
      p_details: { document_id: docId, url, chunks_created: chunks.length }
    });

    return NextResponse.json({
      success: true,
      message: `Website processed successfully. Created ${chunks.length} chunks.`,
      chunksCount: chunks.length
    });

  } catch (err: any) {
    console.error("Error in /api/admin/process-url:", err);

    if (docId) {
      try {
        const supabase = await verifyAdminAccess().then(r => r.supabase);
        await supabase
          .from("uploaded_documents")
          .update({ status: "failed", error_message: err.message || "Unknown error" })
          .eq("id", docId);

        await supabase.rpc("log_audit_event", {
          p_action: "Website Ingestion Failed",
          p_workspace_id: activeWorkspaceId,
          p_details: { document_id: docId, url: targetUrl, error: err.message }
        });
      } catch (dbErr) {
        console.error("Failed to write failed state to DB:", dbErr);
      }
    }

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
