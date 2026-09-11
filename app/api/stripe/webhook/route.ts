import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil" as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Disable Next.js body parsing — Stripe needs the raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // If webhook secret is configured, verify the signature
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // For demo/testing without webhook secret — parse the event directly
      // WARNING: In production, always verify webhook signatures
      event = JSON.parse(body) as Stripe.Event;
      console.warn(
        "⚠️  Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET configured)"
      );
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // ─── Checkout completed (subscription or one-time) ───
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const workspaceId = metadata.workspace_id || session.client_reference_id;

        if (!workspaceId) {
          console.error("No workspace_id in checkout session metadata");
          break;
        }

        if (metadata.type === "subscription") {
          // Pro Monthly Subscription activated
          const subscriptionId = session.subscription as string;

          // Fetch subscription details to get period end
          let currentPeriodEnd: string | null = null;
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              currentPeriodEnd = new Date(
                ((sub as any).current_period_end || Date.now() / 1000 + 30 * 86400) * 1000
              ).toISOString();
            } catch {
              // If retrieval fails, set to 30 days from now
              currentPeriodEnd = new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString();
            }
          }

          await supabase.from("subscriptions").upsert(
            {
              workspace_id: workspaceId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              plan: "pro_monthly",
              status: "active",
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id" }
          );

          console.log(
            `✅ Subscription activated for workspace ${workspaceId}`
          );
        } else if (metadata.type === "branding_upgrade") {
          // One-time branding purchase
          await supabase.from("branding_purchases").upsert(
            {
              workspace_id: workspaceId,
              stripe_payment_id: session.payment_intent as string,
              amount_paid: (session.amount_total || 54000) / 100,
              currency: session.currency || "inr",
              status: "completed",
            },
            { onConflict: "workspace_id" }
          );

          console.log(
            `✅ Branding upgrade purchased for workspace ${workspaceId}`
          );
        }
        break;
      }

      // ─── Subscription updated (renewal, plan change) ───
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find workspace by customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              current_period_end: new Date(
                ((subscription as any).current_period_end || Date.now() / 1000 + 30 * 86400) * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", existingSub.workspace_id);

          console.log(
            `🔄 Subscription updated for workspace ${existingSub.workspace_id}: ${subscription.status}`
          );
        }
        break;
      }

      // ─── Subscription cancelled or expired ───
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from("subscriptions")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", existingSub.workspace_id);

          console.log(
            `❌ Subscription cancelled for workspace ${existingSub.workspace_id}`
          );
        }
        break;
      }

      // ─── Invoice payment failed ───
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", existingSub.workspace_id);

          console.log(
            `⚠️ Payment failed for workspace ${existingSub.workspace_id}`
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
