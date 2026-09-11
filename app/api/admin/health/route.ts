// app/api/admin/health/route.ts

import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { generateEmbedding } from "@/lib/gemini";

export async function GET() {
  try {
    const { authorized, supabase } = await verifyAdminAccess();
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const health: { database: string; gemini: string; dbError?: string; geminiError?: string } = {
      database: "unknown",
      gemini: "unknown"
    };

    // 1. Check Database connection
    try {
      const { data, error } = await supabase.from("user_roles").select("count").limit(1);
      if (error) throw error;
      health.database = "healthy";
    } catch (err: any) {
      health.database = "unhealthy";
      health.dbError = err.message || "Unknown db error";
    }

    // 2. Check Gemini connection
    try {
      await generateEmbedding("healthcheck");
      health.gemini = "healthy";
    } catch (err: any) {
      health.gemini = "unhealthy";
      health.geminiError = err.message || "Unknown Gemini API error";
    }

    const isHealthy = health.database === "healthy" && health.gemini === "healthy";

    return NextResponse.json(health, { status: isHealthy ? 200 : 500 });
  } catch (err: any) {
    console.error("Error in GET /api/admin/health:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
