import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Query real audit log for conversation events in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
      .from("audit_logs")
      .select("created_at")
      .in("action", ["Chat Conversation", "Support Ticket Created"])
      .eq("workspace_id", workspaceId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true });

    if (error) {
      // audit_logs may not exist — return graceful empty
      return NextResponse.json({ dailyConversations: [], workspaceId });
    }

    // Group by day-of-week label
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: Record<string, number> = {};
    dayLabels.forEach((d) => (counts[d] = 0));

    (events || []).forEach((e: any) => {
      const dayIdx = new Date(e.created_at).getDay();
      const label = dayLabels[dayIdx];
      counts[label] = (counts[label] || 0) + 1;
    });

    const dailyConversations = dayLabels.map((date) => ({
      date,
      count: counts[date],
    }));

    return NextResponse.json({ dailyConversations, workspaceId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

