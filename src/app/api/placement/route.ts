import { NextRequest, NextResponse } from "next/server";
import { placementQuestions, scorePlacement } from "@/lib/placement-test";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  const questions = placementQuestions.map(({ answer: _answer, ...question }) => question);
  return applyActorCookie(NextResponse.json({ questions }), actor);
}

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const { answers } = await request.json();
  const result = scorePlacement(answers || {});
  return applyActorCookie(NextResponse.json(result), actor);
}
