import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
