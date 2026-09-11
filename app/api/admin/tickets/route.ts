// app/api/admin/tickets/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const { authorized, supabase, workspaceId } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

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
    const { authorized, supabase, user } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

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

    const { data: updatedTicket, error } = await supabase
      .from("support_tickets")
      .update(updatePayload)
      .eq("id", ticketId)
      .select()
      .single();

    if (error) {
      console.error("Error updating support ticket:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log admin action to audit logs
    try {
      await supabase.from("audit_logs").insert({
        workspace_id: updatedTicket.workspace_id,
        user_id: user?.id || null,
        actor_email: user?.email || "Admin",
        action: `support_ticket.${status}`,
        details: {
          ticket_number: updatedTicket.ticket_number,
          customer_email: updatedTicket.customer_email,
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
