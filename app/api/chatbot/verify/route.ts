// app/api/chatbot/verify/route.ts

import { NextResponse } from "next/server";
import { isDomainAuthorizedForWorkspace, normalizeDomain } from "@/app/api/chatbot/otp/route";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const originParam = searchParams.get("origin") || req.headers.get("origin") || req.headers.get("referer");

    const domain = normalizeDomain(originParam);
    const authorized = await isDomainAuthorizedForWorkspace(workspaceId, domain);

    return NextResponse.json({
      authorized,
      isOtpRequired: !authorized,
      domain,
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ authorized: true, isOtpRequired: false }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, origin } = body;
    const reqOrigin = origin || req.headers.get("origin") || req.headers.get("referer");

    const domain = normalizeDomain(reqOrigin);
    const authorized = await isDomainAuthorizedForWorkspace(workspaceId, domain);

    return NextResponse.json({
      authorized,
      isOtpRequired: !authorized,
      domain,
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ authorized: true, isOtpRequired: false }, { status: 200 });
  }
}
