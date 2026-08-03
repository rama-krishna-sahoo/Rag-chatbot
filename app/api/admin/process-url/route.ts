import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { processUrlForWorkspace } from "@/lib/website-processor";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, user, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    const result = await processUrlForWorkspace(
      url,
      workspaceId,
      user?.id || null,
      supabase
    );

    return NextResponse.json({
      success: true,
      message: `Website processed successfully. Created ${result.chunksCount} chunks.`,
      chunksCount: result.chunksCount
    });

  } catch (err: any) {
    console.error("Error in /api/admin/process-url:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
