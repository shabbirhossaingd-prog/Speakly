import { NextRequest, NextResponse } from "next/server";
import { applyActorCookie, resolveActor } from "@/lib/server/session";
import { getProgress } from "@/lib/server/store";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  return applyActorCookie(NextResponse.json(getProgress(actor.id)), actor);
}
