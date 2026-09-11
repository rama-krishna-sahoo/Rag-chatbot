import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { authorized, workspaceId } = await verifyAdminAccess(['Super Admin', 'Knowledge Admin']);
    if (!authorized) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { plan } = await req.json();
    return NextResponse.json({
      success: true,
      checkoutUrl: `https://checkout.stripe.com/pay/mock-${workspaceId}`,
      plan
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
