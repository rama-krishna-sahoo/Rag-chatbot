import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const settingsData = data?.settings || {};

    return NextResponse.json({
      id: workspaceId,
      name: data?.name || "Default Workspace",
      industry: data?.industry || "E-commerce",
      website_url: data?.website_url || "",
      logo_url: data?.logo_url || "",
      chatbot_name: settingsData.chatbot_name || "Oogway AI Assistant",
      default_language: settingsData.default_language || "English (US)",
      time_zone: settingsData.time_zone || "UTC-8 (Pacific Time)",
      welcome_message: settingsData.welcome_message || "Hi there! How can I help you today?",
      suggested_questions: settingsData.suggested_questions || "What are your pricing plans?\nHow do I reset my password?\nCan I schedule a demo?",
      response_length: settingsData.response_length || "balanced",
      sync_enabled: settingsData.sync_enabled ?? true,
      sync_frequency: settingsData.sync_frequency || "weekly",
      notify_failures: settingsData.notify_failures ?? true,
      notify_success: settingsData.notify_success ?? false,
      avatar_url: settingsData.avatar_url || ""
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

    const newSettings = {
      chatbot_name: body.chatbot_name || body.chatbotName,
      default_language: body.default_language || body.defaultLanguage,
      time_zone: body.time_zone || body.timeZone,
      welcome_message: body.welcome_message || body.welcomeMessage,
      suggested_questions: body.suggested_questions || body.suggestedQuestions,
      response_length: body.response_length || body.responseLength,
      sync_enabled: body.sync_enabled ?? body.syncEnabled,
      sync_frequency: body.sync_frequency || body.syncFrequency,
      notify_failures: body.notify_failures ?? body.notifyFailures,
      notify_success: body.notify_success ?? body.notifySuccess,
      avatar_url: body.avatar_url || body.avatarUrl
    };

    // First attempt to update with settings JSONB column
    const { data: updatedWs, error } = await supabase
      .from("workspaces")
      .update({
        name: body.name || body.companyName,
        website_url: body.website_url || body.websiteUrl,
        logo_url: body.logo_url || body.companyLogo || body.logoUrl,
        industry: body.industry,
        settings: newSettings
      })
      .eq("id", workspaceId)
      .select()
      .maybeSingle();

    if (error) {
      // Fallback: if settings column doesn't exist, update standard columns
      await supabase
        .from("workspaces")
        .update({
          name: body.name || body.companyName,
          website_url: body.website_url || body.websiteUrl,
          logo_url: body.logo_url || body.companyLogo || body.logoUrl
        })
        .eq("id", workspaceId);
    }

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

