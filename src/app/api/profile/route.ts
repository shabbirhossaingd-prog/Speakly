import { NextRequest, NextResponse } from "next/server";
import type { LearningProfile } from "@/lib/learning-profile";
import { applyActorCookie, resolveActor } from "@/lib/server/session";
import { dbSelect, dbUpsert } from "@/lib/server/supabase";
import { getProfile, saveProfile } from "@/lib/server/store";
import { hasSupabaseServer } from "@/lib/server/config";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  let profile = getProfile(actor.id);
  if (actor.userId && hasSupabaseServer()) {
    const rows = await dbSelect<{ learning_profile: LearningProfile }>("profiles", `select=learning_profile&id=eq.${actor.userId}&limit=1`);
    profile = rows[0]?.learning_profile ?? profile;
  }
  return applyActorCookie(NextResponse.json({ profile, mode: actor.userId && hasSupabaseServer() ? "database" : "session" }), actor);
}

export async function PUT(request: NextRequest) {
  const actor = await resolveActor(request);
  const profile = (await request.json()) as LearningProfile;
  if (!profile || !profile.learnerType || !profile.englishLevel) return applyActorCookie(NextResponse.json({ error: "Incomplete learning profile" }, { status: 400 }), actor);
  saveProfile(actor.id, profile);
  if (actor.userId && hasSupabaseServer()) await dbUpsert("profiles", { id: actor.userId, learning_profile: profile, updated_at: new Date().toISOString() });
  return applyActorCookie(NextResponse.json({ ok: true, profile, mode: actor.userId && hasSupabaseServer() ? "database" : "session" }), actor);
}
