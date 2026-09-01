import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const { accessToken, refreshToken, expiresIn } = await request.json();
  if (!accessToken) return NextResponse.json({ error: "Missing access token" }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, accessToken, refreshToken, expiresIn || 3600);
  return response;
}
