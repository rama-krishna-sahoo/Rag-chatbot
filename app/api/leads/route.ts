// app/api/leads/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// Initial demo leads for workspace initialization
const INITIAL_DEMO_LEADS: CapturedLead[] = [
  {
    id: "lead-101",
    name: "Sangram Sahoo",
    phone: "+91 98765 43210",
    email: "sangram@yopmail.com",
    firstQuery: "Interested in B.Tech Computer Science admissions & fee structure for 2026.",
    source: "Embedded Chatbot Widget",
    status: "new",
    workspaceId: "00000000-0000-0000-0000-000000000000",
    createdAt: Date.now() - 1000 * 60 * 30
  },
  {
    id: "lead-102",
    name: "Priyanka Mohanty",
    phone: "+91 94370 88990",
    email: "priyanka.m@gmail.com",
    firstQuery: "What is the average salary package for MCA placements?",
    source: "Website Live Chat",
    status: "contacted",
    workspaceId: "00000000-0000-0000-0000-000000000000",
    createdAt: Date.now() - 1000 * 60 * 180
  },
  {
    id: "lead-103",
    name: "Amitav Pattnaik",
    phone: "+91 674 250 1122",
    email: "amitav.p@yahoo.com",
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "00000000-0000-0000-0000-000000000000";

    // 1. Return from in-memory cache if populated
    if (globalLeadsStore.has(workspaceId)) {
      return NextResponse.json({
        success: true,
        leads: globalLeadsStore.get(workspaceId) || []
      });
    }

    // 2. Query Supabase database workspace settings if available
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

    // Default demo list
    globalLeadsStore.set(workspaceId, INITIAL_DEMO_LEADS);
    return NextResponse.json({
      success: true,
      leads: INITIAL_DEMO_LEADS
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, leads: INITIAL_DEMO_LEADS }, { status: 500 });
  }
}

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

    return NextResponse.json({
      success: true,
      lead: newLead,
      leads: currentLeads,
      message: "Lead captured successfully!"
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, workspaceId = "00000000-0000-0000-0000-000000000000" } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Lead ID and status required" }, { status: 400 });
    }

    let currentLeads = globalLeadsStore.get(workspaceId) || [...INITIAL_DEMO_LEADS];
    currentLeads = currentLeads.map((l) => (l.id === id ? { ...l, status } : l));
    globalLeadsStore.set(workspaceId, currentLeads);

    // Sync status change to database if connected
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "00000000-0000-0000-0000-000000000000";
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    let currentLeads = globalLeadsStore.get(workspaceId) || [...INITIAL_DEMO_LEADS];
    currentLeads = currentLeads.filter((l) => l.id !== id);
    globalLeadsStore.set(workspaceId, currentLeads);

    // Sync deletion to database if connected
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
