import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

function formatErrorMessage(err: any): string {
  if (!err) return "Failed to resend verification email.";
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message.trim() && err.message !== "{}") return err.message;
  if (typeof err.error_description === "string" && err.error_description.trim()) return err.error_description;
  if (typeof err.msg === "string" && err.msg.trim()) return err.msg;
  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}" && json !== "null") return json;
  } catch (e) {}
  return "Failed to resend verification email.";
}

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

    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    let requestOrigin = originHeader;
    if (!requestOrigin && refererHeader) {
      try {
        requestOrigin = new URL(refererHeader).origin;
      } catch (e) {}
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin || "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

    const emailResult = await sendVerificationEmail({
      email,
      name: targetUser.user_metadata?.full_name,
      verificationUrl,
    });

    // Also trigger Supabase Auth native email dispatch directly to the user's specific email address
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (anonKey) {
      try {
        const supabaseAnon = createClient(supabaseUrl, anonKey);
        await supabaseAnon.auth.resend({
          type: "signup",
          email: email,
          options: {
            emailRedirectTo: `${appUrl}/verify-email`,
          },
        });
        emailResult.success = true;
      } catch (resendErr) {
        console.warn("Supabase native auth resend error:", resendErr);
      }
    }

    const emailErrFormatted = emailResult.error ? formatErrorMessage(emailResult.error) : null;

    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
      emailError: emailErrFormatted,
      message: emailResult.success
        ? "Verification email sent successfully. Please check your email inbox."
        : `Email delivery issue (${emailErrFormatted || "Email service unavailable"}). You can verify your email directly below.`,
      verificationUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: formatErrorMessage(err) }, { status: 500 });
  }
}
