import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "./supabase";

const SESSION_COOKIE = "speakly_session";
const ACCESS_COOKIE = "speakly_access_token";
const REFRESH_COOKIE = "speakly_refresh_token";

export type Actor = { id: string; userId: string | null; email: string | null; authenticated: boolean; sessionId: string; freshSession: boolean };

export async function resolveActor(request: NextRequest): Promise<Actor> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || "";
  const user = accessToken ? await getAuthUser(accessToken) : null;
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existing || crypto.randomUUID();
  if (user) return { id: `user:${user.id}`, userId: user.id, email: user.email || null, authenticated: true, sessionId, freshSession: !existing };
  return { id: `anon:${sessionId}`, userId: null, email: null, authenticated: false, sessionId, freshSession: !existing };
}

export function applyActorCookie(response: NextResponse, actor: Actor) {
  if (actor.freshSession) response.cookies.set(SESSION_COOKIE, actor.sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken?: string, expiresIn = 3600) {
  response.cookies.set(ACCESS_COOKIE, accessToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: expiresIn });
  if (refreshToken) response.cookies.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
