import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { generateEmbedding, generateGroundedAnswer } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    let answer = "";
    let sourceChunks: any[] = [];

    try {
      const queryEmbedding = await generateEmbedding(message);
      const { data: matches, error: rpcError } = await supabase.rpc(
        "match_knowledge",
        {
          query_embedding: queryEmbedding,
          filter_workspace_id: workspaceId,
          match_count: 4,
          filter_category: null,
          filter_status: "published"
        }
      );

      if (!rpcError && matches && matches.length > 0) {
        sourceChunks = matches;
        const contextText = matches
          .map((m: any) => `Source: ${m.title || "Document"}\nContent: ${m.chunk_text}`)
          .join("\n\n---\n\n");
        answer = await generateGroundedAnswer(contextText, message, null, []);
      } else {
        answer = "I'm sorry, I couldn't locate any relevant knowledge base reference materials for this workspace.";
      }
    } catch (err: any) {
      console.warn("AI processing error in chatbot test:", err);
      answer = `Processing failed: ${err.message}`;
    }

    return NextResponse.json({
      answer,
      sourceChunks,
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
