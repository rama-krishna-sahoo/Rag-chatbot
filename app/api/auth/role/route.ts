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
        .select("name, website_url, logo_url, industry, created_at")
        .eq("id", workspaceId)
        .maybeSingle();
      workspaceInfo = data;
    }

    // 15-Day Free Trial calculation
    const trialDays = 15;
    let daysRemaining = 15;
    const wsCreatedAt = (workspaceInfo as any)?.created_at;
    if (wsCreatedAt) {
      const elapsed = Math.floor((Date.now() - new Date(wsCreatedAt).getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, trialDays - elapsed);
    }

    return NextResponse.json({
      role,
      email: user.email,
      user: {
        id: user.id,
        email: user.email,
      },
      workspaceId,
      isSimulated,
      workspaceInfo,
      trial: {
        durationDays: trialDays,
        daysRemaining,
        isTrialActive: daysRemaining > 0,
        monthlyPrice: 2999,
        currency: "INR",
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
