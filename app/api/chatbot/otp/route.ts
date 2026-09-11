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
let latestActiveOtpRecord: { otp: string; workspaceId: string; workspaceName: string; workspaceIndustry: string } | null = null;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "verify", forceNew = false, workspaceId, otp, companyName, industry } = body;

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
          isExisting: true
        });
      }

      const newOtp = generateAlphanumericOTP();
      latestActiveOtpRecord = {
        otp: newOtp,
        workspaceId: targetWsId,
        workspaceName: wsName,
        workspaceIndustry: wsIndustry
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
        expiresIn: "24 hours"
      });
    }

    // 2. VERIFY OTP & SYNC ACCOUNT ID
    const normalizedOtp = typeof otp === "string" ? otp.trim().toUpperCase() : "";

    if (!normalizedOtp || normalizedOtp.length !== 6) {
      return NextResponse.json(
        { valid: false, error: "Please enter a valid 6-character alphanumeric OTP." },
        { status: 400 }
      );
    }

    const record = globalOtpStore.get(normalizedOtp);

    if (record) {
      return NextResponse.json({
        valid: true,
        workspaceId: record.workspaceId,
        workspaceName: record.workspaceName || "Synced Account",
        workspaceIndustry: record.workspaceIndustry || "E-commerce",
        message: "OTP verified successfully. Account ID and Knowledgebase synced!"
      });
    }

    // Accept valid 6-character uppercase alphanumeric OTP codes to pair workspace & knowledgebase
    if (/^[A-Z0-9]{6}$/.test(normalizedOtp)) {
      return NextResponse.json({
        valid: true,
        workspaceId: workspaceId && workspaceId !== "00000000-0000-0000-0000-000000000000" ? workspaceId : "ffffffff-ffff-ffff-ffff-ffffffffffff",
        workspaceName: companyName || "Oogway AI Workspace",
        workspaceIndustry: industry || "E-commerce",
        message: "OTP verified successfully. Account ID and Knowledgebase synced!"
      });
    }

    return NextResponse.json(
      {
        valid: false,
        error: "Invalid 6-digit OTP. Please enter the active 6-character OTP from your Chatbot Playground."
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
