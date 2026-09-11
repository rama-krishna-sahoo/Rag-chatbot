// app/api/workspace/info/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId || workspaceId === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({
        id: "00000000-0000-0000-0000-000000000000",
        name: "Oogway",
        industry: "products and services",
        website_url: "",
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data } = await supabase
      .from("workspaces")
      .select("id, name, industry, website_url, logo_url")
      .eq("id", workspaceId)
      .maybeSingle();

    return NextResponse.json(data || {
      id: workspaceId,
      name: "Oogway",
      industry: "products and services",
      website_url: "",
    });
  } catch (err: any) {
    return NextResponse.json({
      name: "Oogway",
      industry: "products and services",
    });
  }
}
