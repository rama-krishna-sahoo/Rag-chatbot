// app/api/admin/chunks/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { generateEmbedding } from "@/lib/gemini";

// GET: Retrieve chunks for the active workspace, optionally filtered by document
export async function GET(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const searchQuery = searchParams.get("search");

    let query = supabase.from("knowledge_base").select("*").eq("workspace_id", workspaceId);

    if (documentId) {
      query = query.eq("document_id", documentId);
    }

    if (searchQuery) {
      query = query.ilike("chunk_text", `%${searchQuery}%`);
    }

    // Sort by chunk_id ascending to keep reading order
    const { data, error } = await query.order("chunk_id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/admin/chunks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Edit a chunk (updates text + regenerates vector embedding if text changed) under workspace isolation
export async function PUT(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin', 'Content Editor', 'Reviewer']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, category, chunk_text, status, keywords, metadata } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing chunk id" }, { status: 400 });
    }

    // 1. Fetch current chunk content confirming workspace ownership
    const { data: currentChunk, error: fetchError } = await supabase
      .from("knowledge_base")
      .select("chunk_text")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !currentChunk) {
      return NextResponse.json({ error: "Chunk not found or access denied" }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (metadata !== undefined) updateData.metadata = metadata;
    updateData.updated_at = new Date().toISOString();

    // 2. If chunk_text is changing, regenerate vector embedding
    if (chunk_text !== undefined && chunk_text !== currentChunk.chunk_text) {
      updateData.chunk_text = chunk_text;
      try {
        updateData.embedding = await generateEmbedding(chunk_text);
      } catch (embErr: any) {
        return NextResponse.json({ error: `Embedding generation failed: ${embErr.message}` }, { status: 500 });
      }
    }

    // 3. Perform update enforcing workspace ID check
    const { data: updatedChunk, error: updateError } = await supabase
      .from("knowledge_base")
      .update(updateData)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "Chunk Updated",
      p_workspace_id: workspaceId,
      p_details: { chunk_id: id, document_id: updatedChunk.document_id, fields_updated: Object.keys(updateData) }
    });

    return NextResponse.json(updatedChunk);
  } catch (err: any) {
    console.error("Error in PUT /api/admin/chunks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
