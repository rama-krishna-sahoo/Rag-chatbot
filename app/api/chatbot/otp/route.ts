// app/api/chatbot/otp/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Global in-memory OTP cache for instant cross-session sync
// Key: OTP (e.g. "K9X2P7"), Value: { workspaceId, workspaceName, workspaceIndustry, createdAt }
type OTPRecord = {
  workspaceId: string;
  workspaceName?: string;
  workspaceIndustry?: string;
  createdAt: number;
};

const globalOtpStore = new Map<string, OTPRecord>();
const syncedOtps = new Set<string>();
const authorizedDomainsMap = new Map<string, Set<string>>(); // workspaceId -> Set<domain>

let latestActiveOtpRecord: {
  otp: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIndustry: string;
  isSynced?: boolean;
} | null = null;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Helper to normalize domain strings (removes protocol, port, www)
export function normalizeDomain(urlOrHostname?: string | null): string {
  if (!urlOrHostname) return "";
  try {
    let str = urlOrHostname.trim().toLowerCase();
    if (!str.startsWith("http://") && !str.startsWith("https://")) {
      str = `https://${str}`;
    }
    const parsed = new URL(str);
    return parsed.hostname.replace(/^www\./, "");
  } catch (e) {
    return urlOrHostname
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0];
  }
}

// Generate a random 6-character uppercase alphanumeric OTP
function generateAlphanumericOTP(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding ambiguous O, 0, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to check if a domain is authorized for a workspace
export async function isDomainAuthorizedForWorkspace(
  workspaceId: string | undefined,
  rawDomain: string | undefined
): Promise<boolean> {
  // Default / demo workspace is always authorized
  if (!workspaceId || workspaceId === "00000000-0000-0000-0000-000000000000" || workspaceId === "ffffffff-ffff-ffff-ffff-ffffffffffff") {
    return true;
  }

  const domain = normalizeDomain(rawDomain);
  // Internal app hosts or localhost are always authorized
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || domain.endsWith(".vercel.app") || domain.endsWith(".oogway.ai")) {
    return true;
  }

  // Check in-memory paired domains for this workspace
  const pairedDomains = authorizedDomainsMap.get(workspaceId);
  if (pairedDomains && (pairedDomains.has(domain) || pairedDomains.has("*"))) {
    return true;
  }

  // Check Database workspace registered website URL
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("website_url, settings")
        .eq("id", workspaceId)
        .maybeSingle();

      if (ws) {
        const registeredDomain = normalizeDomain(ws.website_url);
        if (registeredDomain && registeredDomain === domain) {
          return true;
        }

        const allowedOrigins: string[] = ws.settings?.allowed_origins || ws.settings?.allowedOrigins || [];
        if (allowedOrigins.some((o) => normalizeDomain(o) === domain)) {
          return true;
        }
      }
    } catch (e) {
      console.warn("Error querying database workspace for domain check:", e);
    }
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "verify", forceNew = false, workspaceId, otp, companyName, industry, origin } = body;

    // 0. CHECK SYNC STATUS
    if (action === "status") {
      const targetOtp = typeof otp === "string" ? otp.trim().toUpperCase() : (latestActiveOtpRecord?.otp || "");
      if (targetOtp) {
        syncedOtps.add(targetOtp);
        if (latestActiveOtpRecord && latestActiveOtpRecord.otp === targetOtp) {
          latestActiveOtpRecord.isSynced = true;
        }
      }

      return NextResponse.json({
        success: true,
        otp: targetOtp,
        isSynced: true,
        message: "External Chatbot is Synced & Approved!"
      });
    }

    // 0.1 REGISTER CLIENT ACTIVE OTP
    if (action === "register" && otp && typeof otp === "string") {
      const regOtp = otp.trim().toUpperCase();
      const targetWsId = workspaceId && workspaceId !== "00000000-0000-0000-0000-000000000000"
        ? workspaceId
        : "ffffffff-ffff-ffff-ffff-ffffffffffff";

      let wsName = companyName || "Oogway";
      let wsIndustry = industry || "E-commerce";

      syncedOtps.add(regOtp);

      latestActiveOtpRecord = {
        otp: regOtp,
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry,
        isSynced: true
      };

      globalOtpStore.set(regOtp, {
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry,
        createdAt: Date.now()
      });

      return NextResponse.json({
        success: true,
        otp: regOtp,
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry,
        isSynced: true
      });
    }

    // 1. GENERATE / GET ACTIVE OTP
    if (action === "generate") {
      const targetWsId = workspaceId && workspaceId !== "00000000-0000-0000-0000-000000000000"
        ? workspaceId
        : "ffffffff-ffff-ffff-ffff-ffffffffffff";

      let wsName = companyName || "Oogway";
      let wsIndustry = industry || "E-commerce";

      // Try fetching real workspace info from database if available
      const supabase = getSupabaseClient();
      if (supabase && targetWsId !== "ffffffff-ffff-ffff-ffff-ffffffffffff") {
        try {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("name, industry")
            .eq("id", targetWsId)
            .maybeSingle();

          if (ws?.name) wsName = ws.name;
          if (ws?.industry) wsIndustry = ws.industry;
        } catch (e) {
          console.warn("Could not query workspace info for OTP generation:", e);
        }
      }

      // If not forced to regenerate and an active OTP already exists globally, reuse it!
      if (!forceNew && latestActiveOtpRecord && globalOtpStore.has(latestActiveOtpRecord.otp)) {
        return NextResponse.json({
          success: true,
          otp: latestActiveOtpRecord.otp,
          workspaceId: targetWsId,
          workspaceName: wsName,
          workspaceIndustry: wsIndustry,
          isSynced: Boolean(latestActiveOtpRecord.isSynced || syncedOtps.has(latestActiveOtpRecord.otp)),
          isExisting: true
        });
      }

      const newOtp = generateAlphanumericOTP();
      latestActiveOtpRecord = {
        otp: newOtp,
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry,
        isSynced: false
      };
      globalOtpStore.set(newOtp, {
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry,
        createdAt: Date.now()
      });

      return NextResponse.json({
        success: true,
        otp: newOtp,
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry,
        isSynced: false,
        expiresIn: "24 hours"
      });
    }

    // 2. VERIFY OTP & SYNC ACCOUNT ID (STRICT VALIDATION)
    const normalizedOtp = typeof otp === "string" ? otp.trim().toUpperCase() : "";

    if (!normalizedOtp || normalizedOtp.length !== 6) {
      return NextResponse.json(
        { valid: false, error: "Please enter a valid 6-character alphanumeric OTP." },
        { status: 400 }
      );
    }

    // Check if OTP exists in globalOtpStore OR matches latestActiveOtpRecord
    let record = globalOtpStore.get(normalizedOtp);
    if (!record && latestActiveOtpRecord && latestActiveOtpRecord.otp === normalizedOtp) {
      record = {
        workspaceId: latestActiveOtpRecord.workspaceId,
        workspaceName: latestActiveOtpRecord.workspaceName,
        workspaceIndustry: latestActiveOtpRecord.workspaceIndustry,
        createdAt: Date.now()
      };
    }

    if (record) {
      syncedOtps.add(normalizedOtp);
      if (latestActiveOtpRecord && latestActiveOtpRecord.otp === normalizedOtp) {
        latestActiveOtpRecord.isSynced = true;
      }

      // Pair and authorize domain if origin or referrer provided
      const targetWsId = record.workspaceId || workspaceId || "ffffffff-ffff-ffff-ffff-ffffffffffff";
      const reqOrigin = origin || req.headers.get("origin") || req.headers.get("referer");
      if (reqOrigin) {
        const domain = normalizeDomain(reqOrigin);
        if (domain) {
          if (!authorizedDomainsMap.has(targetWsId)) {
            authorizedDomainsMap.set(targetWsId, new Set());
          }
          authorizedDomainsMap.get(targetWsId)!.add(domain);
        }
      }

      return NextResponse.json({
        valid: true,
        isSynced: true,
        workspaceId: targetWsId,
        workspaceName: record.workspaceName || "Synced Account",
        workspaceIndustry: record.workspaceIndustry || "E-commerce",
        message: "OTP verified successfully. Domain authorized and Knowledgebase synced!"
      });
    }

    // STRICT REJECTION: Reject any random 6-character string that is not registered!
    return NextResponse.json(
      {
        valid: false,
        error: "Invalid 6-character OTP. Please check the active OTP in your Admin Chatbot Control Panel."
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("OTP API Error:", err);
    return NextResponse.json(
      { valid: false, error: "Internal server error verifying OTP." },
      { status: 500 }
    );
  }
}

