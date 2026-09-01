import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuth } from "@/lib/server/config";
import { supabaseAuth } from "@/lib/server/supabase";
import { setAuthCookies } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAuth()) return NextResponse.json({ status: "configuration_required", message: "Connect Supabase to enable real login." }, { status: 503 });
  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  const response = await supabaseAuth("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.error_description || data.msg || "Login failed" }, { status: response.status });
  const output = NextResponse.json({ status: "authenticated", user: data.user });
  setAuthCookies(output, data.access_token, data.refresh_token, data.expires_in);
  return output;
}
