import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuth } from "@/lib/server/config";
import { supabaseAuth } from "@/lib/server/supabase";
import { setAuthCookies } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAuth()) return NextResponse.json({ status: "configuration_required", message: "Connect Supabase to enable real email signup." }, { status: 503 });
  const { email, password } = await request.json();
  if (!email || !password || password.length < 8) return NextResponse.json({ error: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
  const response = await supabaseAuth("/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.msg || data.message || "Signup failed" }, { status: response.status });
  const output = NextResponse.json({ status: data.access_token ? "authenticated" : "confirmation_required", user: data.user ?? null });
  if (data.access_token) setAuthCookies(output, data.access_token, data.refresh_token, data.expires_in);
  return output;
}
