// app/api/admin/users/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess, AdminRole } from "@/lib/admin-auth";

// In-memory role store for demo users to survive client updates/refetches during dev
const demoUserRoles: { [userId: string]: string } = {};

// GET: Retrieve list of users and roles
export async function GET() {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin', 'Viewer']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Call the security definer function to read users safely
    let dbUsers: any[] = [];
    try {
      const { data, error } = await supabase.rpc("list_users_for_admin", {
        filter_workspace_id: workspaceId
      });
      if (!error && data) {
        dbUsers = data;
      }
    } catch (e) {
      console.warn("list_users_for_admin RPC not available, using empty array", e);
    }

    // Mix in default demo users only for the default Oogway Workspace
    if (workspaceId === "00000000-0000-0000-0000-000000000000") {
      const demoUsers = [
        { id: "demo-1", email: "alice.smith@oogway.com", created_at: "2026-07-15T08:30:00Z", role: demoUserRoles["demo-1"] || "Knowledge Admin" },
        { id: "demo-2", email: "bob.jones@oogway.com", created_at: "2026-07-20T10:15:00Z", role: demoUserRoles["demo-2"] || "Content Editor" },
        { id: "demo-3", email: "carol.white@oogway.com", created_at: "2026-07-22T14:45:00Z", role: demoUserRoles["demo-3"] || "Reviewer" },
        { id: "demo-4", email: "david.brown@oogway.com", created_at: "2026-07-25T09:00:00Z", role: demoUserRoles["demo-4"] || "Viewer" },
        { id: "demo-5", email: "elizabeth.taylor@oogway.com", created_at: "2026-07-28T11:20:00Z", role: demoUserRoles["demo-5"] || "Chatbot User" }
      ];

      // Combine avoiding duplicate emails
      const combined = [...dbUsers];
      demoUsers.forEach(demo => {
        if (!combined.some(u => u.email === demo.email)) {
          combined.push(demo);
        }
      });

      return NextResponse.json(combined);
    }

    return NextResponse.json(dbUsers);
  } catch (err: any) {
    console.error("Error in GET /api/admin/users:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create a new user with a role (Super Admin only)
export async function POST(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    const allowedRoles = ['Super Admin', 'Knowledge Admin', 'Content Editor', 'Reviewer', 'Viewer', 'Chatbot User'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // 1. Create user in Supabase Auth via Admin service role
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-12), // Safe random password
      email_confirm: true
    });

    if (createError) {
      // If user already exists in Auth schema, assign/update their role in user_roles table
      if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        if (existingUser) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .upsert({
              user_id: existingUser.id,
              role,
              workspace_id: workspaceId,
              updated_at: new Date().toISOString()
            }, {
              onConflict: "user_id"
            });
          if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });
          return NextResponse.json({ success: true, message: `User already existed. Role updated to ${role} in this company.` });
        }
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // 2. Insert into user_roles table
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: userData.user.id,
        role,
        workspace_id: workspaceId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      });

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    // 3. Log audit event
    await supabase.rpc("log_audit_event", {
      p_action: "User Created",
      p_workspace_id: workspaceId,
      p_details: { email, assigned_role: role }
    });

    return NextResponse.json({ success: true, message: `User ${email} created with role ${role}.` });
  } catch (err: any) {
    console.error("Error in POST /api/admin/users:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update a user's role (Super Admin only)
export async function PUT(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess(['Super Admin']);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
    }

    const allowedRoles = ['Super Admin', 'Knowledge Admin', 'Content Editor', 'Reviewer', 'Viewer', 'Chatbot User'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // If it's a demo mock user, we update the in-memory map
    if (userId.startsWith("demo-")) {
      demoUserRoles[userId] = role;
      return NextResponse.json({ success: true, message: `Demo user role updated to ${role} (mock success).` });
    }

    // Perform upsert (insert or update on user_id constraint)
    const { error } = await supabase
      .from("user_roles")
      .upsert({
        user_id: userId,
        role,
        workspace_id: workspaceId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.rpc("log_audit_event", {
      p_action: "User Role Changed",
      p_workspace_id: workspaceId,
      p_details: { target_user_id: userId, new_role: role }
    });

    return NextResponse.json({ success: true, message: `User role updated to ${role} successfully.` });
  } catch (err: any) {
    console.error("Error in PUT /api/admin/users:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
