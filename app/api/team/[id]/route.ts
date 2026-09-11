import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { role } = await req.json();
    const resolvedParams = await params;
    const { data, error } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("id", resolvedParams.id)
      .eq("workspace_id", workspaceId)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const resolvedParams = await params;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", resolvedParams.id)
      .eq("workspace_id", workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Member evicted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
