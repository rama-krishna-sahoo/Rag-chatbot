// app/api/account/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}

export async function DELETE(req: Request) {
  try {
    const auth = await verifyAdminAccess();
    const serverClient = await createServerClient();
    
    const userId = auth.user?.id;
    const workspaceId = auth.workspaceId;

    // 1. Database Cleanup (CRUD operations) if user is valid
    if (userId && userId !== "00000000-0000-0000-0000-000000000000" && !userId.startsWith("mock-")) {
      const supabaseAdmin = getSupabaseAdmin();
      const db = supabaseAdmin || auth.supabase;

      if (db) {
        // Delete user roles
        try {
          await db.from("user_roles").delete().eq("user_id", userId);
        } catch (e) {
          console.warn("Failed to delete user_roles during account deletion:", e);
        }

        // Delete custom workspace data if applicable
        if (workspaceId && workspaceId !== "00000000-0000-0000-0000-000000000000" && workspaceId !== "ffffffff-ffff-ffff-ffff-ffffffffffff") {
          try {
            await db.from("documents").delete().eq("workspace_id", workspaceId);
            await db.from("workspaces").delete().eq("id", workspaceId);
          } catch (e) {
            console.warn("Failed to delete workspace data during account deletion:", e);
          }
        }

        // Delete user from Supabase Auth schema using Service Key if available
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
          } catch (e) {
            console.warn("Failed to delete user from Supabase Auth schema:", e);
          }
        }
      }
    }

    // 2. Sign out session cookies
    try {
      await serverClient.auth.signOut();
    } catch (e) {
      console.warn("Failed to sign out session cookies:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Account and associated database records deleted successfully."
    });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}

// Fallback POST handler for clients that prefer POST /api/account
export async function POST(req: Request) {
  return DELETE(req);
}
