// app/api/chat/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding, generateGroundedAnswer } from "@/lib/gemini";
import { getLocalProductAnswer } from "@/lib/rag-fallback";

let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach((line: string) => {
          const [key, ...values] = line.split("=");
          if (key && values.length > 0) {
            process.env[key.trim()] = values.join("=").trim();
          }
        });
      }
    } catch (e) {
      console.warn("Failed to load .env.local dynamically in chat route:", e);
    }
  }

  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""
  );
  return supabaseClient;
}

const MOCK_CUSTOMERS: Record<string, string> = {
  "vip-sarah": "Customer Name: Sarah. Profile: VIP Returning Customer. Past Purchases: Organic Swaddle Wrap (3-pack), Bamboo Baby Washcloths. Preferences: Extremely eco-conscious, prefers 100% organic cotton, highly values GOTS certification.",
  "new-parent-john": "Customer Name: John. Profile: First-time parent. Past Purchases: None yet, but recently viewed Anti-Colic Bamboo Feeding Bottle. Preferences: Needs beginner-friendly advice, worried about colic and baby sleep."
};

export async function POST(req: Request) {
  try {
    const { message, customerId, history, workspaceId } = await req.json();

    // Secure domain whitelisting check
    const origin = req.headers.get("origin") || req.headers.get("referer");
    let workspaceName = "Oogway";
    let workspaceIndustry = "premium organic baby brand";

    if (workspaceId && workspaceId !== "00000000-0000-0000-0000-000000000000") {
      const supabaseAdmin = getSupabaseClient();
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("website_url, name, industry")
        .eq("id", workspaceId)
        .maybeSingle();

      if (workspace) {
        if (workspace.name) workspaceName = workspace.name;
        if (workspace.industry) workspaceIndustry = workspace.industry;

        if (workspace.website_url && origin) {
          const cleanOrigin = origin.replace(/^https?:\/\//, "").split("/")[0];
          const cleanWorkspaceUrl = workspace.website_url.replace(/^https?:\/\//, "").split("/")[0];

          // Allow local testing origins and verify domain match otherwise
          if (
            cleanOrigin !== "localhost:3000" &&
            cleanOrigin !== "127.0.0.1:3000" &&
            !cleanOrigin.endsWith(cleanWorkspaceUrl)
          ) {
            return NextResponse.json(
              { error: "Forbidden: Origin domain is not whitelisted for this chatbot workspace." },
              { status: 403 }
            );
          }
        }
      }
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    let answer: string | null = null;
    let sourceChunks: any[] = [];

    // Try Google Gemini embeddings + Supabase vector search
    try {
      // 1. Generate embedding using gemini-embedding-2 (1536 dims)
      const queryEmbedding = await generateEmbedding(message);

      // 2. Query match_knowledge RPC on Supabase
      const { data: matches, error: rpcError } = await supabase.rpc(
        "match_knowledge",
        {
          query_embedding: queryEmbedding,
          filter_workspace_id: workspaceId || "00000000-0000-0000-0000-000000000000",
          match_count: 5,
          filter_category: null,
          filter_status: "published" // Only query published chunks
        }
      );

      if (rpcError) {
        console.error("Supabase match_knowledge error:", rpcError);
      }

      let contextText = "";
      const THRESHOLD = 0.45; // Similarity threshold for cosine similarity
      const topMatch = matches?.[0];

      if (matches && matches.length > 0 && topMatch?.similarity >= THRESHOLD) {
        sourceChunks = matches;

        // Assemble chunks as context
        contextText = matches
          .map((m: any) => `Source: ${m.title || "Document"} (Category: ${m.category})\nContent: ${m.chunk_text}`)
          .join("\n\n---\n\n");
      }

      // 4. Always generate grounded answer (handles greetings, empty context, and personalization)
      const customerProfile = customerId ? MOCK_CUSTOMERS[customerId] : null;
      answer = await generateGroundedAnswer(contextText, message, customerProfile, history, workspaceName, workspaceIndustry);
    } catch (aiErr: any) {
      console.warn(
        "Gemini / Supabase RAG request failed, switching to local knowledge fallback:",
        aiErr?.message || aiErr
      );
    }

    // Fall back to local intelligent product answer if AI/RAG didn't produce an answer
    if (!answer) {
      if (!workspaceId || workspaceId === "00000000-0000-0000-0000-000000000000" || workspaceName.toLowerCase() === "oogway") {
        answer = getLocalProductAnswer(message);
      } else {
        answer = `I'm here to help you with questions about ${workspaceName}. Could you please specify which product or topic you would like to know more about?`;
      }
    }

    try {
      await supabase.rpc("log_audit_event", {
        p_action: "Chat Conversation",
        p_workspace_id: workspaceId || "00000000-0000-0000-0000-000000000000",
        p_details: {
          message,
          answer,
          customerId: customerId || "Anonymous Guest"
        }
      });
    } catch (logErr) {
      console.warn("Failed to log chat conversation to audit trail:", logErr);
    }

    return NextResponse.json({
      answer,
      sourceChunks,
    });
  } catch (err: any) {
    console.error("Error in /api/chat POST:", err);
    return NextResponse.json({
      answer: "I'm having trouble connecting right now. Please try again later.",
      sourceChunks: [],
    });
  }
}
