// app/api/email/welcome/route.ts

import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, name, companyName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const result = await sendWelcomeEmail({ email, name, companyName });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to dispatch email" }, { status: 500 });
  }
}
