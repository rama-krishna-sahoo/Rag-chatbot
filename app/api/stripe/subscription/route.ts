import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Check branding purchase status
    const { data: branding } = await supabase
      .from("branding_purchases")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const isSubscriptionActive =
      subscription?.status === "active" ||
      subscription?.status === "trialing";

    const isPastDue = subscription?.status === "past_due";

    return NextResponse.json({
      subscription: {
        active: isSubscriptionActive,
        pastDue: isPastDue,
        plan: subscription?.plan || null,
        status: subscription?.status || "none",
        currentPeriodEnd: subscription?.current_period_end || null,
        stripeCustomerId: subscription?.stripe_customer_id || null,
      },
      branding: {
        unlocked: !!branding,
        purchasedAt: branding?.created_at || null,
      },
      workspaceId,
    });
  } catch (err: any) {
    console.error("Subscription status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
