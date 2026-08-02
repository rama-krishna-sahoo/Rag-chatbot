import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data, error } = await supabase
      .from("chatbot_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    return NextResponse.json(data || {
      workspace_id: workspaceId,
      bot_name: "Oogway AI",
      brand_color: "#14b8a6",
      system_prompt: "You are a helpful customer support assistant."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const body = await req.json();
    const { data, error } = await supabase
      .from("chatbot_settings")
      .upsert({
        workspace_id: workspaceId,
        bot_name: body.bot_name,
        brand_color: body.brand_color,
        system_prompt: body.system_prompt
      })
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
