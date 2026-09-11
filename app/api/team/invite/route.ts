import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { email, role } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const mockId = `invited-${Date.now()}`;
    const { data, error } = await supabase
      .from("user_roles")
      .insert({
        user_id: null, // Invited user, not logged in yet
        email,
        role: role || "Viewer",
        workspace_id: workspaceId
      })
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: `Invitation dispatched to ${email}`, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
