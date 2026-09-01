import { NextRequest, NextResponse } from "next/server";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const body = await request.json();
  if (body.type === "objective") {
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const key = Array.isArray(body.key) ? body.key : [];
    const correct = answers.reduce((sum: number, answer: unknown, index: number) => sum + (answer === key[index] ? 1 : 0), 0);
    return applyActorCookie(NextResponse.json({ correct, total: key.length, percent: key.length ? Math.round((correct / key.length) * 100) : 0, official: false }), actor);
  }
  return applyActorCookie(NextResponse.json({ status: "configuration_required", official: false, message: "Writing and speaking band feedback needs the configured AI evaluation provider. Speakly will label all AI bands as estimates." }, { status: 503 }), actor);
}
