import { NextRequest, NextResponse } from "next/server";
import { recommendLessons } from "@/lib/lesson-catalog";
import { applyActorCookie, resolveActor } from "@/lib/server/session";
import { getProfile, getProgress } from "@/lib/server/store";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  const profile = getProfile(actor.id);
  const progress = getProgress(actor.id);
  const lessons = recommendLessons({ goals: profile?.goals, field: profile?.field, level: profile?.englishLevel, weakAreas: progress.weakAreas });
  return applyActorCookie(NextResponse.json({ lessons }), actor);
}
