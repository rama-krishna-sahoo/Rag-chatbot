import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia" as any, // recent stable version matching active SDK definitions
});

export async function POST(req: Request) {
  try {
    const { amount, currency = "inr", successUrl, cancelUrl } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    // Create Checkout Sessions from body params.
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
            unit_amount: amount * 100, // Stripe expects amounts in cents/paise (e.g. 54000 for 540 INR)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/admin?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/admin?payment=cancelled`,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
