// app/api/contacts/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type KeyContact = {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  availability?: string;
  keywords?: string[];
  createdAt?: number;
};

// In-memory store for instant zero-latency caching
const globalContactsStore = new Map<string, KeyContact[]>();

// Pre-fill initial contacts for default demo workspace
const DEFAULT_CONTACTS: KeyContact[] = [
  {
    id: "cnt-1",
    name: "Dr. Sangram K. Sahoo",
    designation: "Director of Admissions & Student Affairs",
    department: "Admissions",
    phone: "+91 98765 43210",
    email: "admissions@institute.edu",
    availability: "Mon - Fri (9:00 AM - 5:00 PM)",
    keywords: ["admission", "apply", "fee structure", "seat booking", "counseling", "entrance"]
  },
  {
    id: "cnt-2",
    name: "Prof. Rajesh Kumar Rout",
    designation: "Head of Training & Placement Cell",
    department: "Placements",
    phone: "+91 94370 12345",
    email: "placements@institute.edu",
    availability: "Mon - Sat (9:30 AM - 6:00 PM)",
    keywords: ["placement", "job", "campus recruitment", "internship", "salary package", "companies"]
  },
  {
    id: "cnt-3",
    name: "Er. Priyabrata Dash",
    designation: "Central IT & Technical Helpdesk Lead",
    department: "IT Support",
    phone: "+91 674 230 9999",
    email: "itsupport@institute.edu",
    availability: "24/7 Priority Desk",
    keywords: ["it support", "wifi", "portal login", "email reset", "technical issue", "hardware"]
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

    // 1. Check in-memory store first
    if (globalContactsStore.has(workspaceId)) {
      return NextResponse.json({
        success: true,
        contacts: globalContactsStore.get(workspaceId) || []
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

        if (ws?.settings?.key_contacts && Array.isArray(ws.settings.key_contacts)) {
          globalContactsStore.set(workspaceId, ws.settings.key_contacts);
          return NextResponse.json({
            success: true,
            contacts: ws.settings.key_contacts
          });
        }
      } catch (e) {
        console.warn("Failed to fetch contacts from DB settings:", e);
      }
    }

    // Default fallback list
    globalContactsStore.set(workspaceId, DEFAULT_CONTACTS);
    return NextResponse.json({
      success: true,
      contacts: DEFAULT_CONTACTS
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, contacts: DEFAULT_CONTACTS }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId = "00000000-0000-0000-0000-000000000000", contacts, contact } = body;

    let currentList = globalContactsStore.get(workspaceId) || [...DEFAULT_CONTACTS];

    if (Array.isArray(contacts)) {
      currentList = contacts;
    } else if (contact && typeof contact === "object") {
      if (contact.id) {
        // Update existing contact
        currentList = currentList.map((c) => (c.id === contact.id ? { ...c, ...contact } : c));
      } else {
        // Add new contact
        const newContact: KeyContact = {
          id: `cnt-${Date.now()}`,
          name: contact.name || "Key Contact",
          designation: contact.designation || "Department Official",
          department: contact.department || "General",
          phone: contact.phone || "",
          email: contact.email || "",
          availability: contact.availability || "Mon - Fri (9:00 AM - 5:00 PM)",
          keywords: Array.isArray(contact.keywords) ? contact.keywords : (contact.keywords || "").split(",").map((k: string) => k.trim()).filter(Boolean),
          createdAt: Date.now()
        };
        currentList = [newContact, ...currentList];
      }
    }

    globalContactsStore.set(workspaceId, currentList);

    // Save to database workspace settings if connected
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
              key_contacts: currentList
            }
          })
          .eq("id", workspaceId);
      } catch (e) {
        console.warn("Failed to persist key_contacts to database:", e);
      }
    }

    return NextResponse.json({
      success: true,
      contacts: currentList,
      message: "Key contacts updated successfully!"
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save contact" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "00000000-0000-0000-0000-000000000000";
    const contactId = searchParams.get("id");

    if (!contactId) {
      return NextResponse.json({ error: "Contact ID required" }, { status: 400 });
    }

    let currentList = globalContactsStore.get(workspaceId) || [...DEFAULT_CONTACTS];
    currentList = currentList.filter((c) => c.id !== contactId);
    globalContactsStore.set(workspaceId, currentList);

    // Persist deletion to Supabase workspace settings if available
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
              key_contacts: currentList
            }
          })
          .eq("id", workspaceId);
      } catch (e) {
        console.warn("Failed to sync contact deletion to database:", e);
      }
    }

    return NextResponse.json({
      success: true,
      contacts: currentList,
      message: "Contact deleted successfully."
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
