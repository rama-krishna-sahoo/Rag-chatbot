import { NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAdminAccess } from "@/lib/admin-auth";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil" as any,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plan, amount, currency = "inr", successUrl, cancelUrl } = body;

    // Try to get authenticated user info for pre-filling checkout
    let customerEmail: string | undefined;
    let workspaceId: string | undefined;
    try {
      const auth = await verifyAdminAccess();
      if (auth.authorized && auth.user?.email && !auth.user.email.includes("guest@")) {
        customerEmail = auth.user.email;
        workspaceId = auth.workspaceId;
      }
    } catch {
      // Not authenticated — continue without pre-fill
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // ─── Subscription Mode (₹2,999/month Pro plan) ───
    if (plan === "pro_monthly") {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: "Oogway Pro Monthly Subscription",
                description:
                  "Full-featured autonomous AI customer support — unlimited chatbot inquiries, 500 pages, smart sync, analytics.",
              },
              unit_amount: 299900, // ₹2,999 in paise
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        customer_email: customerEmail,
        client_reference_id: workspaceId || undefined,
        metadata: {
          workspace_id: workspaceId || "",
          plan: "pro_monthly",
          type: "subscription",
        },
        success_url:
          successUrl || `${origin}/dashboard/overview?payment=success`,
        cancel_url:
          cancelUrl || `${origin}/dashboard/overview?payment=cancelled`,
      });

      return NextResponse.json({ id: session.id, url: session.url });
    }

    // ─── One-Time Payment Mode (e.g. ₹540 branding upgrade) ───
    if (!amount) {
      return NextResponse.json(
        { error: "Either 'plan' or 'amount' is required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "Oogway Premium Branding Upgrade",
              description: "Unlock custom chatbot name and logo.",
            },
            unit_amount: amount * 100, // Convert to paise/cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: customerEmail,
      client_reference_id: workspaceId || undefined,
      metadata: {
        workspace_id: workspaceId || "",
        type: "branding_upgrade",
      },
      success_url:
        successUrl || `${origin}/dashboard/settings?payment=success`,
      cancel_url:
        cancelUrl || `${origin}/dashboard/settings?payment=cancelled`,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
