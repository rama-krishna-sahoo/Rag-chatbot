// app/api/auth/role/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { user, role, workspaceId, isSimulated, supabase } = await verifyAdminAccess();
    
    let workspaceInfo = null;
    if (workspaceId && workspaceId !== "ffffffff-ffff-ffff-ffff-ffffffffffff") {
      const { data } = await supabase
        .from("workspaces")
        .select("name, website_url, logo_url, industry")
        .eq("id", workspaceId)
        .maybeSingle();
      workspaceInfo = data;
    }

    return NextResponse.json({
      role,
      email: user.email,
      workspaceId,
      isSimulated,
      workspaceInfo
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
