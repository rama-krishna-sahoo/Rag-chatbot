// lib/admin-auth.ts

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export type AdminRole = 'Super Admin' | 'Knowledge Admin' | 'Content Editor' | 'Reviewer' | 'Viewer' | 'Chatbot User';

/**
 * Checks if the current user has one of the allowed admin roles.
 * Resolves real Supabase session, with support for x-simulated-role developer headers.
 */
export async function verifyAdminAccess(allowedRoles?: AdminRole[]) {
  // Service client (RLS bypass for admin panel actions)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  let role: AdminRole = "Viewer";
  let userId = "00000000-0000-0000-0000-000000000000";
  let email = "guest@oogway.com";
  let workspaceId = "00000000-0000-0000-0000-000000000000"; // Default Oogway Workspace
  let isSimulated = false;

  // 1. Try resolving real Supabase Auth session first
  try {
    const cookieClient = await createServerClient();
    const { data: { user } } = await cookieClient.auth.getUser();

    if (user) {
      userId = user.id;
      email = user.email || "";

      const { data: userRoleRecord } = await supabase
        .from("user_roles")
        .select("role, workspace_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userRoleRecord) {
        role = userRoleRecord.role as AdminRole;
        workspaceId = userRoleRecord.workspace_id || workspaceId;
      } else {
        // SAFETY NET: If an authenticated user has no role record (e.g. legacy user before trigger),
        // DO NOT let them fall back to the shared 00000000-0000-0000-0000-000000000000 workspace.
        workspaceId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
      }

      if (email === "superadmin@yopmail.com") {
        role = "Super Admin";
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve auth session (Supabase):", err);
  }

  // 2. Check for simulation headers (fallback/override for local testing or demo)
  const reqHeaders = await headers();
  let simulatedRole = reqHeaders.get("x-simulated-role") as AdminRole | null;
  const simulatedWorkspaceId = reqHeaders.get("x-simulated-workspace-id");

  // SECURITY FIX: Only allow role simulation if the user is a guest or the global super admin.
  // Regular authenticated users must use their actual database role.
  const isGuest = userId === "00000000-0000-0000-0000-000000000000";
  const isGlobalSuperAdmin = email === "superadmin@yopmail.com";

  if (simulatedRole && !isGuest && !isGlobalSuperAdmin) {
    simulatedRole = null;
  }

  if (simulatedRole) {
    role = simulatedRole;
    isSimulated = true;
    if (userId === "00000000-0000-0000-0000-000000000000") {
      userId = `mock-${role.toLowerCase().replace(/\s+/g, "-")}`;
    }
    if (email === "guest@oogway.com") {
      email = `${role.toLowerCase().replace(/\s+/g, "")}@oogway.com`;
    }
  }

  if (simulatedWorkspaceId && (isGuest || isGlobalSuperAdmin)) {
    workspaceId = simulatedWorkspaceId;
  }

  // Enforce access control list
  const authorized = !allowedRoles || allowedRoles.includes(role);

  return {
    user: { id: userId, email },
    role,
    authorized,
    workspaceId,
    supabase,
    isSimulated
  };
}
