import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { companyName, websiteUrl, industry, companyLogo } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Insert Workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: companyName,
        website_url: websiteUrl,
        logo_url: companyLogo || "💼",
        industry: industry
      })
      .select()
      .single();

    if (wsError) {
      throw wsError;
    }

    // Resolve active user (fallback to mock developer user if not fully logged in)
    let userId = "00000000-0000-0000-0000-000000000000";
    
    // Look for session user via server client (cookie aware)
    try {
      const cookieClient = await createServerClient();
      const { data: { user } } = await cookieClient.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (err) {
      console.warn("Failed to get session user in setup route:", err);
    }

    // 2. Associate user with this workspace as 'Super Admin'
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "Super Admin",
      workspace_id: workspace.id
    });

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id
    });
  } catch (err: any) {
    console.error("Onboarding setup API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
