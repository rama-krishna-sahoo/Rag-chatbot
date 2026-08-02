import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Mock conversation analytics over time
    return NextResponse.json({
      dailyConversations: [
        { date: "Mon", count: 12 },
        { date: "Tue", count: 19 },
        { date: "Wed", count: 15 },
        { date: "Thu", count: 22 },
        { date: "Fri", count: 30 },
        { date: "Sat", count: 8 },
        { date: "Sun", count: 10 }
      ],
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
