import { extractDocumentFeatures, generateEmbedding } from "@/lib/gemini";
import { chunkMarkdown } from "@/lib/chunker";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function cleanHtml(html: string): string {
  let cleaned = html
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, '')
    .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
    .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return cleaned;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractLogoUrl(html: string, baseUrl: string): string {
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  if (iconMatch && iconMatch[1]) {
    try { return new URL(iconMatch[1], baseUrl).toString(); } catch { /* ignore */ }
  }
  
  const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
  if (appleIconMatch && appleIconMatch[1]) {
    try { return new URL(appleIconMatch[1], baseUrl).toString(); } catch { /* ignore */ }
  }

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImageMatch && ogImageMatch[1]) {
    try { return new URL(ogImageMatch[1], baseUrl).toString(); } catch { /* ignore */ }
  }

  try {
    const domain = new URL(baseUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return "💼";
  }
}

export async function processUrlForWorkspace(
  url: string,
  workspaceId: string,
  userId: string | null,
  supabase: any,
  htmlContent?: string
) {
  let docId: string | null = null;

  try {
    const domain = new URL(url).hostname;
    
    let html = htmlContent;
    if (!html) {
      console.log(`Fetching website data from: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website. HTTP status: ${response.status}`);
      }
      html = await response.text();
    }

    const cleanedText = cleanHtml(html);

    if (cleanedText.length < 50) {
      throw new Error("Extracted text from the website is too short or empty.");
    }

    const { data: document, error: docError } = await supabase
      .from("uploaded_documents")
      .insert({
        filename: `Website: ${domain}`,
        storage_path: url,
        file_size: cleanedText.length,
        mime_type: "text/html",
        status: "processing",
        workspace_id: workspaceId,
        uploaded_by: (userId && isUuid(userId)) ? userId : null
      })
      .select()
      .single();

    if (docError || !document) {
      throw new Error(`Failed to create document record: ${docError?.message}`);
    }

    docId = document.id;

    await supabase.rpc("log_audit_event", {
      p_action: "Website Ingestion Started",
      p_workspace_id: workspaceId,
      p_details: { document_id: docId, url }
    });

    const features = await extractDocumentFeatures(
      { text: cleanedText.substring(0, 30000), mimeType: "text/plain" },
      `Website: ${domain}`
    );

    if (!features) {
      throw new Error("Gemini feature extraction returned empty results.");
    }

    const chunks = chunkMarkdown(features.text);
    if (chunks.length === 0) {
      throw new Error("No text chunks generated from the website content.");
    }

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
          content: features.text,
          chunk_id: i,
          chunk_text: chunkText,
          embedding,
          keywords: features.keywords || [],
          metadata,
          source_url: url,
          source_type: "website",
          status: "published", // auto-publish for now since approval UI is not implemented
          workspace_id: workspaceId
        });

      if (insertError) {
        throw new Error(`Failed to insert chunk index ${i}: ${insertError.message}`);
      }
    }

    await supabase
      .from("uploaded_documents")
      .update({ status: "completed" })
      .eq("id", docId);

    await supabase.rpc("log_audit_event", {
      p_action: "Website Ingestion Completed",
      p_workspace_id: workspaceId,
      p_details: { document_id: docId, url, chunks_created: chunks.length }
    });

    return { success: true, chunksCount: chunks.length };

  } catch (err: any) {
    console.error("Error in processUrlForWorkspace:", err);

    if (docId) {
      try {
        await supabase
          .from("uploaded_documents")
          .update({ status: "failed", error_message: err.message || "Unknown error" })
          .eq("id", docId);

        await supabase.rpc("log_audit_event", {
          p_action: "Website Ingestion Failed",
          p_workspace_id: workspaceId,
          p_details: { document_id: docId, url, error: err.message }
        });
      } catch (dbErr) {
        console.error("Failed to write failed state to DB:", dbErr);
      }
    }

    throw err;
  }
}
