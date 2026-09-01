import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuth, serverConfig } from "@/lib/server/config";
export async function GET(request: NextRequest){
  if(!hasSupabaseAuth()) return NextResponse.redirect(new URL("/login?error=Connect+Supabase+to+enable+Google+login", request.url));
  const redirectTo = `${serverConfig.appUrl}/auth/callback`;
  const url = `${serverConfig.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  return NextResponse.redirect(url);
}
