import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { extractLogoUrl, processUrlForWorkspace } from "@/lib/website-processor";

export async function POST(req: Request) {
  try {
    const reqBody = await req.json();
    const { companyName, websiteUrl, industry, email, password } = reqBody;

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

    // 1. Resolve Active User and Workspace
    const { user: authUser, workspaceId: currentWorkspaceId } = await verifyAdminAccess();

    let verifiedUserId = authUser ? authUser.id : null;
    let targetWorkspaceId = currentWorkspaceId;
    let isNewWorkspace = false;

    // If they just signed up via the wizard, they might not have a session cookie yet.
    // Try to authenticate them securely on the backend using the provided credentials.
    if (!verifiedUserId && reqBody.email && reqBody.password) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: reqBody.email,
        password: reqBody.password,
      });
      if (signInData?.user) {
        verifiedUserId = signInData.user.id;
        // Wait for the PostgreSQL trigger to finish provisioning their workspace
        for (let i = 0; i < 4; i++) {
          const { data: roleRecord } = await supabase
            .from("user_roles")
            .select("workspace_id")
            .eq("user_id", verifiedUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (roleRecord?.workspace_id) {
            targetWorkspaceId = roleRecord.workspace_id;
            break;
          }
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }

    // If the user is brand new or using the mock fallback, they might still have the default 00000... or fffff...
    if (!targetWorkspaceId || targetWorkspaceId === "00000000-0000-0000-0000-000000000000" || targetWorkspaceId === "ffffffff-ffff-ffff-ffff-ffffffffffff") {
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

      if (wsError) throw wsError;
      targetWorkspaceId = workspace.id;
      isNewWorkspace = true;

      // Associate user with this new workspace ONLY if they are a real authenticated user
      if (verifiedUserId) {
        await supabase.from("user_roles").insert({
          user_id: verifiedUserId,
          role: "Knowledge Admin",
          workspace_id: targetWorkspaceId
        });
      }
    } else {
      // The database trigger pre-provisioned an isolated workspace! Update it with the wizard details.
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({
          name: companyName,
          website_url: websiteUrl,
          logo_url: fetchedLogo,
          industry: industry
        })
        .eq("id", targetWorkspaceId);

      if (updateError) throw updateError;
    }

    // 2. Process the website URL to create an initial isolated Knowledge Base
    if (websiteUrl && htmlContext) {
      try {
        await processUrlForWorkspace(websiteUrl, targetWorkspaceId, authUser?.id || "00000000-0000-0000-0000-000000000000", supabase, htmlContext);
      } catch (err) {
        // We log the error but do not fail the overall setup request
        console.warn("Website knowledge base ingestion failed, but workspace was created:", err);
      }
    }

    return NextResponse.json({
      success: true,
      workspaceId: targetWorkspaceId,
      logoUrl: fetchedLogo
    });
  } catch (err: any) {
    console.error("Onboarding setup API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
