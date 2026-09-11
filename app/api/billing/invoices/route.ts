import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json({
      invoices: [
        { id: "inv-1", amount: "$79.00", status: "paid", date: new Date().toLocaleDateString() },
        { id: "inv-2", amount: "$79.00", status: "paid", date: new Date(Date.now() - 30 * 86400000).toLocaleDateString() }
      ],
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
