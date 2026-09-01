import { NextRequest, NextResponse } from "next/server";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  return applyActorCookie(NextResponse.json({ authenticated: actor.authenticated, user: actor.authenticated ? { id: actor.userId, email: actor.email } : null }), actor);
}
