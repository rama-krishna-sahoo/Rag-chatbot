import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { token, email } = await req.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification token are required." },
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

    // Find the user by email
    const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ error: "Failed to verify user credentials." }, { status: 500 });
    }

    const targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Check if already verified
    if (targetUser.email_confirmed_at || targetUser.user_metadata?.email_verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Email address is already verified."
      });
    }

    // Verify token matching
    const storedToken = targetUser.user_metadata?.verification_token;
    if (storedToken && storedToken !== token) {
      return NextResponse.json(
        { error: "Invalid or expired verification token." },
        { status: 400 }
      );
    }

    // Mark email as confirmed in Supabase Auth & user metadata
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      email_confirm: true,
      user_metadata: {
        ...targetUser.user_metadata,
        email_verified: true,
        verification_token: null,
      },
    });

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully!",
      user: {
        id: targetUser.id,
        email: targetUser.email,
        email_verified: true,
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during email verification." },
      { status: 500 }
    );
  }
}
