import { NextRequest, NextResponse } from "next/server";
import { lessonCatalog } from "@/lib/lesson-catalog";
import { applyActorCookie, resolveActor } from "@/lib/server/session";
import { completeLesson } from "@/lib/server/store";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const { lessonId, skill = "Speaking" } = await request.json();
  if (!lessonCatalog.some((lesson) => lesson.id === lessonId)) return applyActorCookie(NextResponse.json({ error: "Unknown lesson" }, { status: 404 }), actor);
  const progress = completeLesson(actor.id, lessonId, skill);
  return applyActorCookie(NextResponse.json({ ok: true, progress }), actor);
}
