import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    // Simulate crawl job creation
    return NextResponse.json({
      success: true,
      jobId: `job-${Date.now()}`,
      status: "connected",
      message: "Website scanning scheduled successfully.",
      url
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
