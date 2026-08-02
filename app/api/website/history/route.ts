import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json({
      history: [
        { id: "h-1", event: "Initial scan completed", pages: 24, timestamp: new Date(Date.now() - 3600000).toLocaleString() },
        { id: "h-2", event: "Weekly update sync", pages: 24, timestamp: new Date(Date.now() - 86400000).toLocaleString() }
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
