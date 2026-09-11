import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json({
      status: "synced",
      pagesDiscovered: 24,
      lastSyncTime: new Date().toLocaleString(),
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
