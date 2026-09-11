// app/api/admin/metrics/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("get_admin_metrics", {
      filter_workspace_id: workspaceId
    });

    if (error) {
      console.error("Error fetching metrics:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in /api/admin/metrics:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
