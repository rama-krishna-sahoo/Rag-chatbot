import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
      token
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
