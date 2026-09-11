// app/api/chat/warmup/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "warmed", timestamp: Date.now() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
      },
    }
  );
}
