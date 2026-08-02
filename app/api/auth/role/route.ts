// app/api/auth/role/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { user, role, workspaceId, isSimulated } = await verifyAdminAccess();
    return NextResponse.json({
      role,
      email: user.email,
      workspaceId,
      isSimulated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
