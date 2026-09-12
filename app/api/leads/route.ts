// app/api/leads/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAccess } from "@/lib/admin-auth";

export type CapturedLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  firstQuery?: string;
  source?: string;
  status: "new" | "contacted" | "qualified" | "closed";
  workspaceId: string;
  createdAt: number;
};

// In-memory global store for zero-latency lead caching
const globalLeadsStore = new Map<string, CapturedLead[]>();

// Clean, anonymized demo leads for initial workspace preview
const INITIAL_DEMO_LEADS: CapturedLead[] = [
  {
    id: "lead-101",
    name: "Sample Lead (Computer Science)",
    phone: "+1 555-0101",
    email: "inquiry1@example.com",
    firstQuery: "Interested in B.Tech Computer Science admissions & fee structure.",
    source: "Embedded Chatbot Widget",
    status: "new",
    workspaceId: "00000000-0000-0000-0000-000000000000",
    createdAt: Date.now() - 1000 * 60 * 30
  },
  {
    id: "lead-102",
    name: "Sample Lead (Placements Desk)",
    phone: "+1 555-0102",
    email: "inquiry2@example.com",
    firstQuery: "What is the average salary package for MCA placements?",
    source: "Website Live Chat",
    status: "contacted",
    workspaceId: "00000000-0000-0000-0000-000000000000",
    createdAt: Date.now() - 1000 * 60 * 180
  },
  {
    id: "lead-103",
    name: "Sample Lead (Hostel & Transport)",
    phone: "+1 555-0103",
    email: "inquiry3@example.com",
    firstQuery: "Need hostel facility details and transport route timings.",
    source: "Mobile Chatbot",
    status: "qualified",
    workspaceId: "00000000-0000-0000-0000-000000000000",
    createdAt: Date.now() - 1000 * 60 * 600
  }
];

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET /api/leads
 * Strictly protected endpoint: requires authenticated user session & matching workspace access.
 */
export async function GET(req: Request) {
  try {
    const auth = await verifyAdminAccess();
    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get("workspaceId");

    // 1. Verify authentication
    if (!auth.authorized && auth.user.id === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json(
        { error: "Authentication required to access workspace leads." },
        { status: 401 }
      );
    }

    // 2. Resolve workspace ID and check authorization
    const workspaceId = (auth.role === "Super Admin" && requestedWsId)
      ? requestedWsId
      : (auth.workspaceId || requestedWsId || "00000000-0000-0000-0000-000000000000");

    if (auth.role !== "Super Admin" && requestedWsId && requestedWsId !== auth.workspaceId && auth.workspaceId !== "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json(
        { error: "Unauthorized access to requested workspace leads." },
        { status: 403 }
      );
    }

    // 3. Return from in-memory cache if populated
    if (globalLeadsStore.has(workspaceId)) {
      return NextResponse.json({
        success: true,
        leads: globalLeadsStore.get(workspaceId) || []
      });
    }

    // 4. Query Supabase database workspace settings if available
    const supabase = getSupabaseClient();
    if (supabase && workspaceId !== "00000000-0000-0000-0000-000000000000") {
      try {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("settings")
          .eq("id", workspaceId)
          .maybeSingle();

        if (ws?.settings?.captured_leads && Array.isArray(ws.settings.captured_leads)) {
          globalLeadsStore.set(workspaceId, ws.settings.captured_leads);
          return NextResponse.json({
            success: true,
            leads: ws.settings.captured_leads
          });
        }
      } catch (e) {
        console.warn("Failed to query database for leads:", e);
      }
    }

    // Default anonymized preview list
    globalLeadsStore.set(workspaceId, INITIAL_DEMO_LEADS);
    return NextResponse.json({
      success: true,
      leads: INITIAL_DEMO_LEADS
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to retrieve leads." }, { status: 500 });
  }
}

/**
 * POST /api/leads
 * Public Chatbot Lead Capture or Admin Lead Addition.
 * SECURITY: Never returns the full workspace leads array to unauthenticated clients!
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      phone = "",
      email = "",
      firstQuery = "",
      source = "Chatbot Widget",
      workspaceId = "00000000-0000-0000-0000-000000000000"
    } = body;

    if (!name || (!phone && !email)) {
      return NextResponse.json({ error: "Name and phone or email required" }, { status: 400 });
    }

    const auth = await verifyAdminAccess();
    const isDashboardAdmin = auth.authorized && auth.user.id !== "00000000-0000-0000-0000-000000000000";

    let currentLeads = globalLeadsStore.get(workspaceId) || [...INITIAL_DEMO_LEADS];

    // Check if lead already exists by phone or email
    const existingIndex = currentLeads.findIndex(
      (l) => (phone && l.phone === phone) || (email && l.email === email)
    );

    const newLead: CapturedLead = {
      id: existingIndex >= 0 ? currentLeads[existingIndex].id : `lead-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      firstQuery: firstQuery.trim() || (existingIndex >= 0 ? currentLeads[existingIndex].firstQuery : "General Inquiry"),
      source: source,
      status: existingIndex >= 0 ? currentLeads[existingIndex].status : "new",
      workspaceId: workspaceId,
      createdAt: Date.now()
    };

    if (existingIndex >= 0) {
      currentLeads[existingIndex] = newLead;
    } else {
      currentLeads = [newLead, ...currentLeads];
    }

    globalLeadsStore.set(workspaceId, currentLeads);

    // Save to database workspace settings if available
    const supabase = getSupabaseClient();
    if (supabase && workspaceId !== "00000000-0000-0000-0000-000000000000") {
      try {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("settings")
          .eq("id", workspaceId)
          .maybeSingle();

        const existingSettings = ws?.settings || {};
        await supabase
          .from("workspaces")
          .update({
            settings: {
              ...existingSettings,
              captured_leads: currentLeads
            }
          })
          .eq("id", workspaceId);
      } catch (e) {
        console.warn("Failed to persist leads to database:", e);
      }
    }

    // SECURITY: Only return full leads list to authenticated dashboard admins!
    if (isDashboardAdmin) {
      return NextResponse.json({
        success: true,
        lead: newLead,
        leads: currentLeads,
        message: "Lead captured successfully!"
      });
    }

    // Public chatbot visitors only receive a success acknowledgement
    return NextResponse.json({
      success: true,
      leadId: newLead.id,
      message: "Lead captured successfully!"
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}

/**
 * PUT /api/leads
 * Protected endpoint for status updates.
 */
export async function PUT(req: Request) {
  try {
    const auth = await verifyAdminAccess();
    if (!auth.authorized && auth.user.id === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, workspaceId = auth.workspaceId || "00000000-0000-0000-0000-000000000000" } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Lead ID and status required" }, { status: 400 });
    }

    if (auth.role !== "Super Admin" && workspaceId !== auth.workspaceId && auth.workspaceId !== "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Unauthorized workspace access." }, { status: 403 });
    }

    let currentLeads = globalLeadsStore.get(workspaceId) || [...INITIAL_DEMO_LEADS];
    currentLeads = currentLeads.map((l) => (l.id === id ? { ...l, status } : l));
    globalLeadsStore.set(workspaceId, currentLeads);

    const supabase = getSupabaseClient();
    if (supabase && workspaceId !== "00000000-0000-0000-0000-000000000000") {
      try {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("settings")
          .eq("id", workspaceId)
          .maybeSingle();

        const existingSettings = ws?.settings || {};
        await supabase
          .from("workspaces")
          .update({
            settings: {
              ...existingSettings,
              captured_leads: currentLeads
            }
          })
          .eq("id", workspaceId);
      } catch (e) {
        console.warn("Failed to sync lead status to database:", e);
      }
    }

    return NextResponse.json({
      success: true,
      leads: currentLeads,
      message: "Lead status updated."
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update lead status" }, { status: 500 });
  }
}

/**
 * DELETE /api/leads
 * Protected endpoint for lead deletion.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await verifyAdminAccess();
    if (!auth.authorized && auth.user.id === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get("workspaceId");
    const workspaceId = requestedWsId || auth.workspaceId || "00000000-0000-0000-0000-000000000000";
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    if (auth.role !== "Super Admin" && workspaceId !== auth.workspaceId && auth.workspaceId !== "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Unauthorized workspace access." }, { status: 403 });
    }

    let currentLeads = globalLeadsStore.get(workspaceId) || [...INITIAL_DEMO_LEADS];
    currentLeads = currentLeads.filter((l) => l.id !== id);
    globalLeadsStore.set(workspaceId, currentLeads);

    const supabase = getSupabaseClient();
    if (supabase && workspaceId !== "00000000-0000-0000-0000-000000000000") {
      try {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("settings")
          .eq("id", workspaceId)
          .maybeSingle();

        const existingSettings = ws?.settings || {};
        await supabase
          .from("workspaces")
          .update({
            settings: {
              ...existingSettings,
              captured_leads: currentLeads
            }
          })
          .eq("id", workspaceId);
      } catch (e) {
        console.warn("Failed to delete lead from database:", e);
      }
    }

    return NextResponse.json({
      success: true,
      leads: currentLeads,
      message: "Lead deleted successfully."
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
