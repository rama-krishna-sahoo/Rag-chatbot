import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

function formatErrorMessage(err: any): string {
  if (!err) return "Registration failed. Please check your details.";
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message.trim() && err.message !== "{}") return err.message;
  if (typeof err.error_description === "string" && err.error_description.trim()) return err.error_description;
  if (typeof err.msg === "string" && err.msg.trim()) return err.msg;
  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}" && json !== "null") return json;
  } catch (e) {}
  return "Registration failed. Please check your details.";
}

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

    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    let requestOrigin = originHeader;
    if (!requestOrigin && refererHeader) {
      try {
        requestOrigin = new URL(refererHeader).origin;
      } catch (e) {}
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin || "http://localhost:3000";

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseClient = createClient(supabaseUrl, anonKey || serviceKey);

    const verifyToken = crypto.randomUUID();

    // Register user via Supabase Auth signUp to trigger automatic native email delivery to specified email ID
    let signUpRes = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          source: "web_registration",
          full_name: name,
          username: name,
          verification_token: verifyToken,
          email_verified: false,
        },
        emailRedirectTo: `${appUrl}/verify-email`,
      },
    });

    let createdUser = signUpRes.data?.user || null;
    let authError = signUpRes.error;

    if (authError || !createdUser) {
      // Fallback: create user via admin API if client signUp encountered an issue
      const adminRes = await supabaseAdmin.auth.admin.createUser({
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
      if (adminRes.error && !createdUser) {
        authError = adminRes.error;
      } else if (adminRes.data?.user) {
        createdUser = adminRes.data.user;
        authError = null;
      }
    }

    if (authError || !createdUser) {
      const errMsg = formatErrorMessage(authError);
      const msg = errMsg.toLowerCase();
      const isAlreadyExists = 
        msg.includes("already registered") || 
        msg.includes("already been registered") || 
        msg.includes("already exists") || 
        msg.includes("user_already_exists") || 
        (authError as any)?.code === "user_already_exists" ||
        (authError as any)?.status === 422;

      if (isAlreadyExists) {
        return NextResponse.json(
          { 
            alreadyExists: true,
            error: "This email ID is already in use. Redirecting you to the login page..." 
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const verificationUrl = `${appUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

    // Dispatch verification link to the given email address
    let emailResult: any = { success: false };
    if (createdUser.email) {
      // 1. Send via custom email service / Resend if configured
      emailResult = await sendVerificationEmail({
        email: createdUser.email,
        name: name || undefined,
        verificationUrl,
      }).catch((emailErr) => {
        console.warn("Background verification email dispatch error:", emailErr);
        return { success: false, error: formatErrorMessage(emailErr) };
      });

      // 2. Also trigger Supabase Auth native email dispatch directly to the user's specific email address
      if (anonKey) {
        try {
          const supabaseAnon = createClient(supabaseUrl, anonKey);
          await supabaseAnon.auth.resend({
            type: "signup",
            email: createdUser.email,
            options: {
              emailRedirectTo: `${appUrl}/verify-email`,
            },
          });
          emailResult.success = true;
        } catch (resendErr) {
          console.warn("Supabase native auth resend error:", resendErr);
        }
      }

      sendWelcomeEmail({
        email: createdUser.email,
        name: name || undefined,
        companyName: companyName || undefined,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: createdUser.id,
        email: createdUser.email,
      },
      verificationUrl,
      emailSent: emailResult.success,
      emailError: emailResult.error ? formatErrorMessage(emailResult.error) : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: formatErrorMessage(err) },
      { status: 500 }
    );
  }
}
