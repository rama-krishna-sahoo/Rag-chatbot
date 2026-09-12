import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password, name, companyName } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server authentication configuration missing." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const verifyToken = crypto.randomUUID();

    // Create user with email_confirm: false requiring link click verification
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        source: "web_registration",
        full_name: name,
        username: name,
        verification_token: verifyToken,
        email_verified: false,
      },
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isAlreadyExists = 
        msg.includes("already registered") || 
        msg.includes("already been registered") || 
        msg.includes("already exists") || 
        msg.includes("user_already_exists") || 
        error.code === "user_already_exists" ||
        (error as any).status === 422;

      if (isAlreadyExists) {
        return NextResponse.json(
          { 
            alreadyExists: true,
            error: "This email ID is already in use. Redirecting you to the login page..." 
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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

    // Dispatch verification link to the given email address
    let emailResult: any = { success: false };
    if (data.user && data.user.email) {
      emailResult = await sendVerificationEmail({
        email: data.user.email,
        name: name || undefined,
        verificationUrl,
      }).catch((emailErr) => {
        console.warn("Background verification email dispatch error:", emailErr);
        return { success: false, error: String(emailErr) };
      });

      sendWelcomeEmail({
        email: data.user.email,
        name: name || undefined,
        companyName: companyName || undefined,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      verificationUrl,
      emailSent: emailResult.success,
      emailError: emailResult.error || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
