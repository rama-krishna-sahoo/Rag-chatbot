import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { extractLogoUrl, processUrlForWorkspace } from "@/lib/website-processor";

export async function POST(req: Request) {
  try {
    const { companyName, websiteUrl, industry } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Try to fetch the logo automatically from the website
    let fetchedLogo = "💼";
    let htmlContext = "";
    
    if (websiteUrl) {
      try {
        const response = await fetch(websiteUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        if (response.ok) {
          htmlContext = await response.text();
          fetchedLogo = extractLogoUrl(htmlContext, websiteUrl);
        }
      } catch (err) {
        console.warn("Failed to scrape logo from website during setup:", err);
      }
    }

    // 1. Insert Workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: companyName,
        website_url: websiteUrl,
        logo_url: fetchedLogo,
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

    // 2. Associate user with this workspace as 'Knowledge Admin'
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "Knowledge Admin",
      workspace_id: workspace.id
    });

    // 3. Process the website URL to create an initial isolated Knowledge Base
    if (websiteUrl && htmlContext) {
      try {
        await processUrlForWorkspace(websiteUrl, workspace.id, userId, supabase, htmlContext);
      } catch (err) {
        // We log the error but do not fail the overall setup request
        console.warn("Website knowledge base ingestion failed, but workspace was created:", err);
      }
    }

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      logoUrl: fetchedLogo
    });
  } catch (err: any) {
    console.error("Onboarding setup API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
