// app/api/admin/tickets/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const { authorized, supabase, workspaceId, user } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isGlobalSuperAdmin = user?.email === "superadmin@yopmail.com";

    let query = supabase
      .from("support_tickets")
      .select("*");

    // Enforce workspace isolation unless global super admin
    if (!isGlobalSuperAdmin) {
      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      } else {
        return NextResponse.json([]);
      }
    }

    const { data: tickets, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching support tickets:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tickets || []);
  } catch (err: any) {
    console.error("Error in GET /api/admin/tickets:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { authorized, supabase, workspaceId, user } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isGlobalSuperAdmin = user?.email === "superadmin@yopmail.com";
    const body = await req.json();
    const { ticketId, status, adminNotes } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: "ticketId and status are required" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (typeof adminNotes === "string") {
      updatePayload.admin_notes = adminNotes;
    }

    let updateQuery = supabase
      .from("support_tickets")
      .update(updatePayload)
      .eq("id", ticketId);

    // Enforce workspace isolation for PATCH operations unless global super admin
    if (!isGlobalSuperAdmin && workspaceId) {
      updateQuery = updateQuery.eq("workspace_id", workspaceId);
    }

    const { data: updatedTicket, error } = await updateQuery
      .select()
      .single();

    if (error) {
      console.error("Error updating support ticket:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action to audit logs under active workspace
    try {
      await supabase.from("audit_logs").insert({
        workspace_id: updatedTicket?.workspace_id || workspaceId,
        user_id: user?.id || null,
        actor_email: user?.email || "Admin",
        action: `support_ticket.${status}`,
        details: {
          ticket_number: updatedTicket?.ticket_number,
          customer_email: updatedTicket?.customer_email,
          new_status: status,
          admin_notes: adminNotes || null
        }
      });
    } catch (auditErr) {
      console.warn("Failed to write ticket audit log:", auditErr);
    }

    return NextResponse.json(updatedTicket);
  } catch (err: any) {
    console.error("Error in PATCH /api/admin/tickets:", err);
    return NextResponse.json({ error: err.message || "Failed to update ticket" }, { status: 500 });
  }
}
