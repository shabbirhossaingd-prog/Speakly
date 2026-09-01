import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/session";

export async function POST() {
  return clearAuthCookies(NextResponse.json({ ok: true }));
}
