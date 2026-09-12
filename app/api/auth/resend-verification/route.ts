import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server authentication configuration missing." }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (targetUser.email_confirmed_at || targetUser.user_metadata?.email_verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "This email address is already verified."
      });
    }

    const verifyToken = crypto.randomUUID();

    await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...targetUser.user_metadata,
        verification_token: verifyToken,
        email_verified: false,
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

    await sendVerificationEmail({
      email,
      name: targetUser.user_metadata?.full_name,
      verificationUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully. Please check your inbox.",
      verificationUrl, // included for dev convenience
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to resend verification email." }, { status: 500 });
  }
}
