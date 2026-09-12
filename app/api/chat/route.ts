// app/api/chat/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding, generateGroundedAnswer, generateGroundedAnswerStream, analyzeMessageEscalation } from "@/lib/gemini";
import { getLocalProductAnswer } from "@/lib/rag-fallback";
import { getSemanticCache, setSemanticCache } from "@/lib/semantic-cache";

let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach((line: string) => {
          const [key, ...values] = line.split("=");
          if (key && values.length > 0) {
            process.env[key.trim()] = values.join("=").trim();
          }
        });
      }
    } catch (e) {
      console.warn("Failed to load .env.local dynamically in chat route:", e);
    }
  }

  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""
  );
  return supabaseClient;
}

const MOCK_CUSTOMERS: Record<string, string> = {
  "vip-sarah": "Customer Name: Sarah. Profile: VIP Returning Customer. Past Purchases: Organic Swaddle Wrap (3-pack), Bamboo Baby Washcloths. Preferences: Extremely eco-conscious, prefers 100% organic cotton, highly values GOTS certification.",
  "new-parent-john": "Customer Name: John. Profile: First-time parent. Past Purchases: None yet, but recently viewed Anti-Colic Bamboo Feeding Bottle. Preferences: Needs beginner-friendly advice, worried about colic and baby sleep."
};

export async function POST(req: Request) {
  try {
    const { message, customerId, customerEmail, customerName, history, workspaceId, workspaceName: passedWsName, workspaceIndustry: passedWsIndustry, stream: wantStream } = await req.json();

    // Secure domain whitelisting check
    const origin = req.headers.get("origin") || req.headers.get("referer");
    let workspaceName = passedWsName && passedWsName.trim() ? passedWsName : "Oogway";
    let workspaceIndustry = passedWsIndustry && passedWsIndustry.trim() ? passedWsIndustry : "products and services";

    const targetWsId = workspaceId && workspaceId !== "00000000-0000-0000-0000-000000000000"
      ? workspaceId
      : "00000000-0000-0000-0000-000000000000";

    if (targetWsId !== "00000000-0000-0000-0000-000000000000") {
      const supabaseAdmin = getSupabaseClient();
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("website_url, name, industry")
        .eq("id", targetWsId)
        .maybeSingle();

      if (workspace) {
        if (workspace.name) workspaceName = workspace.name;
        if (workspace.industry) workspaceIndustry = workspace.industry;

        if (workspace.website_url && origin) {
          const cleanOrigin = origin.replace(/^https?:\/\//, "").split("/")[0];
          const cleanWorkspaceUrl = workspace.website_url.replace(/^https?:\/\//, "").split("/")[0];

          if (
            cleanOrigin !== "localhost:3000" &&
            cleanOrigin !== "127.0.0.1:3000" &&
            !cleanOrigin.endsWith(cleanWorkspaceUrl)
          ) {
            return NextResponse.json(
              { error: "Forbidden: Origin domain is not whitelisted for this chatbot workspace." },
              { status: 403 }
            );
          }
        }
      }
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    let answer: string | null = null;
    let sourceChunks: any[] = [];
    let createdTicket: any = null;

    // Non-blocking background ticket escalation promise
    const escalation = analyzeMessageEscalation(message);
    let ticketPromise: Promise<any> | null = null;
    if (escalation.shouldEscalate) {
      const ticketNum = `#TICK-${Math.floor(1000 + Math.random() * 9000)}`;
      const targetSupportWsId = targetWsId !== "00000000-0000-0000-0000-000000000000"
        ? targetWsId
        : "ffffffff-ffff-ffff-ffff-ffffffffffff";

      const emailToUse = customerEmail || (customerId && customerId.includes("@") ? customerId : "customer@yopmail.com");
      const nameToUse = customerName || (customerId ? customerId.replace(/-/g, " ") : "Valued Customer");

      ticketPromise = (async () => {
        try {
          const { data: ticket } = await supabase
            .from("support_tickets")
            .insert({
              ticket_number: ticketNum,
              workspace_id: targetSupportWsId,
              customer_email: emailToUse,
              customer_name: nameToUse,
              subject: escalation.subject,
              priority: escalation.priority,
              status: "open",
              sentiment: escalation.sentiment,
              chat_history: [
                ...(history || []),
                { role: "user", text: message }
              ]
            })
            .select("*")
            .single();
          return ticket;
        } catch (tErr) {
          console.warn("Failed to create support ticket in DB:", tErr);
          return null;
        }
      })();
    }

    const words = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 2 && !["what", "when", "where", "which", "your", "this", "that", "from", "have", "with", "about", "tell", "show", "make"].includes(w));

    const dbFilterWsId = targetWsId !== "00000000-0000-0000-0000-000000000000" ? targetWsId : null;

    // Parallelize embedding generation and keyword search concurrently
    const [queryEmbedding, kwMatches] = await Promise.all([
      (async () => {
        try {
          return await generateEmbedding(message);
        } catch (embErr) {
          console.warn("Failed to generate query embedding:", embErr);
          return null;
        }
      })(),
      (async () => {
        try {
          if (words.length === 0) return [];
          const orConditions = words.flatMap((w: string) => [
            `chunk_text.ilike.%${w}%`,
            `title.ilike.%${w}%`,
            `category.ilike.%${w}%`
          ]);

          let query = supabase
            .from("knowledge_base")
            .select("id, document_id, title, category, chunk_id, chunk_text, source_url, metadata")
            .or(orConditions.join(","))
            .limit(3);

          if (dbFilterWsId) {
            query = query.eq("workspace_id", dbFilterWsId);
          } else {
            query = query.is("workspace_id", null);
          }

          const { data } = await query;
          return (data || []).map((m: any) => ({ ...m, similarity: 0.88 }));
        } catch (e) {
          return [];
        }
      })()
    ]);

    // Check Sub-15ms Semantic Cache immediately if embedding matched
    if (queryEmbedding && (!history || history.length === 0)) {
      const cachedHit = getSemanticCache(message, queryEmbedding, targetWsId);
      if (cachedHit) {
        createdTicket = ticketPromise ? await ticketPromise : null;
        let cachedAnswer = cachedHit.answer;
        if (createdTicket) {
          cachedAnswer += `\n\n📌 **Support Ticket Created**: I've created official Support Ticket **${createdTicket.ticket_number}** (${createdTicket.priority.toUpperCase()} priority) for our senior support team.`;
        }

        if (wantStream) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cachedAnswer, sourceChunks: cachedHit.sourceChunks, isCacheHit: true })}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            }
          });
        }

        return NextResponse.json({
          answer: cachedAnswer,
          sourceChunks: cachedHit.sourceChunks,
          ticket: createdTicket,
          isCacheHit: true,
        });
      }
    }

    // Step 3: Fast Vector Match using pre-computed embedding
    let vectorMatches: any[] = [];
    if (queryEmbedding) {
      try {
        const { data } = await supabase.rpc("match_knowledge", {
          query_embedding: queryEmbedding,
          filter_workspace_id: dbFilterWsId,
          match_count: 3,
          filter_category: null,
          filter_status: null
        });
        vectorMatches = data || [];
      } catch (e) {
        vectorMatches = [];
      }
    }

    const seenIds = new Set<string>();
    const matches: any[] = [];
    [...vectorMatches, ...kwMatches].forEach((m: any) => {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        matches.push(m);
      }
    });

    let contextText = "";
    if (matches.length > 0) {
      sourceChunks = matches;
      contextText = matches
        .map((m: any) => `Document Title: ${m.title || "Knowledge Document"}\nCategory: ${m.category || "General"}\nContent: ${m.chunk_text ? m.chunk_text.slice(0, 500) : ""}`)
        .join("\n\n---\n\n");
    }

    // Match Workspace Key Contacts
    let matchedContacts: any[] = [];
    try {
      let contactsList: any[] = [];
      if (targetWsId !== "00000000-0000-0000-0000-000000000000") {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("settings")
          .eq("id", targetWsId)
          .maybeSingle();
        if (ws?.settings?.key_contacts && Array.isArray(ws.settings.key_contacts)) {
          contactsList = ws.settings.key_contacts;
        }
      }

      if (contactsList.length === 0) {
        contactsList = [
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
      }

      const lower = message.toLowerCase();
      const contactTerms = ["contact", "phone", "email", "call", "number", "reach", "who to", "officer", "head", "support", "help", "department", "desk", "admission", "placement", "director", "dean", "warden"];
      const isGeneralContactQuery = contactTerms.some(t => lower.includes(t));

      matchedContacts = contactsList.filter(c => {
        const nameMatch = c.name && lower.includes(c.name.toLowerCase());
        const deptMatch = c.department && lower.includes(c.department.toLowerCase());
        const roleMatch = c.designation && lower.includes(c.designation.toLowerCase());
        const kwMatch = Array.isArray(c.keywords) && c.keywords.some((k: string) => lower.includes(k.toLowerCase()));
        return nameMatch || deptMatch || roleMatch || kwMatch;
      });

      if (matchedContacts.length === 0 && isGeneralContactQuery) {
        matchedContacts = contactsList.slice(0, 3);
      }

      if (matchedContacts.length > 0) {
        const contactBlock = matchedContacts
          .map(c => `Official Key Contact: ${c.name}\nDesignation: ${c.designation}\nDepartment: ${c.department}\nPhone: ${c.phone || 'N/A'}\nEmail: ${c.email || 'N/A'}\nHours: ${c.availability || 'N/A'}`)
          .join("\n\n");
        contextText += `\n\n--- OFFICIAL KEY DIRECTORY CONTACTS ---\n${contactBlock}`;
      }
    } catch (cErr) {
      console.warn("Failed matching contacts:", cErr);
    }

    const customerProfile = customerId
      ? (MOCK_CUSTOMERS[customerId] || `Customer Email: ${customerEmail || customerId}`)
      : (customerName ? `Customer Name: ${customerName}, Email: ${customerEmail || "registered@example.com"}` : null);

    // If streaming requested, return low-latency SSE ReadableStream
    if (wantStream) {
      const sseStream = await generateGroundedAnswerStream(
        contextText,
        message,
        customerProfile,
        history,
        workspaceName,
        workspaceIndustry
      );

      return new Response(sseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Step 4: Standard synchronous AI response fallback
    try {
      answer = await generateGroundedAnswer(contextText, message, customerProfile, history, workspaceName, workspaceIndustry);
    } catch (aiErr: any) {
      console.warn("Gemini LLM request failed:", aiErr?.message || aiErr);
    }

    if (!answer) {
      if (targetWsId === "00000000-0000-0000-0000-000000000000" && workspaceName.toLowerCase() === "oogway") {
        answer = getLocalProductAnswer(message);
      } else {
        answer = `I'm here to help you with questions about ${workspaceName}. Could you please specify which product or topic you would like to know more about?`;
      }
    }

    if (createdTicket) {
      answer += `\n\n📌 **Support Ticket Created**: I've created official Support Ticket **${createdTicket.ticket_number}** (${createdTicket.priority.toUpperCase()} priority) for our senior support team. A dedicated representative will review your request and follow up directly via **${createdTicket.customer_email}**.`;
    }

    // Store generated answer in Semantic Cache for future instant hits
    if (queryEmbedding && answer && (!history || history.length === 0)) {
      setSemanticCache(message, queryEmbedding, answer, sourceChunks, targetWsId);
    }

    try {
      await supabase.rpc("log_audit_event", {
        p_action: createdTicket ? `Support Ticket Created ${createdTicket.ticket_number}` : "Chat Conversation",
        p_workspace_id: targetWsId,
        p_details: {
          message,
          answer,
          customerId: customerId || customerEmail || "Anonymous Guest",
          ticket: createdTicket ? createdTicket.ticket_number : null
        }
      });
    } catch (logErr) {
      console.warn("Failed to log chat conversation to audit trail:", logErr);
    }

    return NextResponse.json({
      answer,
      sourceChunks,
      ticket: createdTicket,
      contacts: matchedContacts
    });
  } catch (err: any) {
    console.error("Error in /api/chat POST:", err);
    return NextResponse.json({
      answer: "I'm having trouble connecting right now. Please try again later.",
      sourceChunks: [],
    });
  }
}
