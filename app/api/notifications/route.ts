import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json({
      notifications: [
        { id: "n-1", title: "Website crawling succeeded", read: false, date: new Date().toLocaleString() },
        { id: "n-2", title: "New team member joined", read: true, date: new Date(Date.now() - 3600000).toLocaleString() }
      ],
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
