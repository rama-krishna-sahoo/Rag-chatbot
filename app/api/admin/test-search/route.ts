// app/api/admin/test-search/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { generateEmbedding, generateGroundedAnswer } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { query, matchCount, category, status } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing or invalid query" }, { status: 400 });
    }

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // 2. Perform match_knowledge search
    console.log("TEST SEARCH ARGS:", {
      workspaceId,
      matchCount: matchCount || 5,
      category: category || null,
      status: status || null,
      query
    });

    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_knowledge",
      {
        query_embedding: queryEmbedding,
        filter_workspace_id: workspaceId,
        match_count: matchCount || 5,
        filter_category: category || null,
        filter_status: status || null // allow draft and published testing
      }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    console.log("MATCHES LENGTH:", matches?.length);
    if (matches && matches.length > 0) {
      console.log("FIRST MATCH SIMILARITY:", matches[0].similarity);
    }

    let answer = "No chunks found or similarity below threshold.";
    if (matches && matches.length > 0) {
      const contextText = matches
        .map((m: any) => `Source: ${m.title || "Document"} (Category: ${m.category})\nContent: ${m.chunk_text}`)
        .join("\n\n---\n\n");

      // 3. Generate grounded answer
      answer = await generateGroundedAnswer(contextText, query);
    }

    return NextResponse.json({
      answer,
      sourceChunks: matches || []
    });
  } catch (err: any) {
    console.error("Error in /api/admin/test-search:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
