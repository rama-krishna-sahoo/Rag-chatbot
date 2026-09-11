// supabase/functions/process-document/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Word-count based splitter mirroring LangChain chunkSize=500, overlap=80
function splitTextRecursive(text: string, chunkSize = 500, chunkOverlap = 80): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  if (words.length <= chunkSize) {
    return [text];
  }
  
  let index = 0;
  while (index < words.length) {
    const chunkWords = words.slice(index, index + chunkSize);
    if (chunkWords.length === 0) break;
    
    chunks.push(chunkWords.join(" "));
    index += (chunkSize - chunkOverlap);
  }
  
  return chunks;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "Missing documentId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve Supabase env variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase internal keys are not configured in Deno environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch document metadata
    const { data: document, error: docError } = await supabase
      .from("uploaded_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found or access denied in Edge Function.");
    }

    const { filename, storage_path, mime_type, workspace_id } = document;

    // 2. Set database status to processing
    await supabase
      .from("uploaded_documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId);

    await supabase.rpc("log_audit_event", {
      p_action: "Edge Function Ingestion Started",
      p_workspace_id: workspace_id,
      p_details: { document_id: documentId, filename },
    });

    // 3. Download file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from Storage: ${downloadError?.message}`);
    }

    // 4. Extract Text
    let rawText = "";
    if (mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const docxResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      rawText = docxResult.value;
    } else {
      rawText = await fileData.text();
    }

    // 5. Send to Gemini for Cleaning and Feature Extraction
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${googleApiKey}`;
    const featuresPrompt = `
You are an expert document processing assistant.
Analyze the attached document and return a JSON object with:
{
  "text": "Cleaned markdown version of the content",
  "title": "A descriptive title for this document",
  "category": "One of: Sleep, Feeding, Diapering, Skincare, Play, Travel, Bath, Teething, general",
  "description": "1-2 sentence summary",
  "keywords": ["keywords"],
  "safetyInformation": "Summary of safety notes",
  "attributes": {}
}
Document Content:
${rawText}
    `.trim();

    const featuresResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: featuresPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!featuresResponse.ok) {
      throw new Error(`Gemini cleaning error: ${featuresResponse.statusText}`);
    }

    const featuresData = await featuresResponse.json();
    const jsonText = featuresData?.candidates?.[0]?.content?.parts?.[0]?.text;
    const features = JSON.parse(jsonText.trim());

    // 6. LangChain semantic chunking
    const chunks = splitTextRecursive(features.text, 500, 80);

    // 7. Delete previous database indices (idempotency safety)
    await supabase
      .from("knowledge_base")
      .delete()
      .eq("document_id", documentId);

    // 8. Generate vector embeddings and store chunks
    const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${googleApiKey}`;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].replace(/\s+/g, " ").trim();
      
      const embedResponse = await fetch(embedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: chunkText }] },
          outputDimensionality: 1536,
        }),
      });

      if (!embedResponse.ok) {
        throw new Error(`Gemini Embedding error on index ${i}: ${embedResponse.statusText}`);
      }

      const embedData = await embedResponse.json();
      const embedding = embedData?.embedding?.values;

      const slug = slugify(features.title || filename);
      const metadata = {
        description: features.description || "",
        safety: features.safetyInformation || "",
        attributes: features.attributes || {},
        original_mime_type: mime_type,
        processed_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("knowledge_base")
        .insert({
          document_id: documentId,
          title: features.title || filename,
          slug,
          category: features.category || "general",
          content: features.text,
          chunk_id: i,
          chunk_text: chunkText,
          embedding,
          keywords: features.keywords || [],
          metadata,
          source_url: storage_path,
          source_type: "file",
          status: "draft",
          workspace_id: workspace_id,
        });

      if (insertError) {
        throw new Error(`Failed to store chunk ${i}: ${insertError.message}`);
      }
    }

    // 9. Mark completed successfully
    await supabase
      .from("uploaded_documents")
      .update({ status: "draft" })
      .eq("id", documentId);

    await supabase.rpc("log_audit_event", {
      p_action: "Edge Function Ingestion Finished",
      p_workspace_id: workspace_id,
      p_details: { document_id: documentId, filename, chunks_created: chunks.length },
    });

    return new Response(
      JSON.stringify({ success: true, message: `Completed processing ${chunks.length} chunks.` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error in Edge Function:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
