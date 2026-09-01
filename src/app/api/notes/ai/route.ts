import { NextRequest, NextResponse } from "next/server";
import { runNoteAi } from "@/lib/server/note-ai";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const body = await request.json();
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  if (noteBody.length < 20) {
    return applyActorCookie(NextResponse.json({ error: "Write a little more in the note before using Study AI." }, { status: 400 }), actor);
  }
  try {
    const result = await runNoteAi({
      action: typeof body.action === "string" ? body.action : "summary",
      title: typeof body.title === "string" ? body.title : "Untitled note",
      subject: typeof body.subject === "string" ? body.subject : "",
      body: noteBody,
    });
    return applyActorCookie(NextResponse.json(result), actor);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Study AI failed";
    if (message === "GEMINI_NOT_CONFIGURED") {
      return applyActorCookie(
        NextResponse.json({ status: "configuration_required", message: "Add a free Gemini API key to use AI on notes. Your notes still stay on this device." }, { status: 503 }),
        actor,
      );
    }
    return applyActorCookie(NextResponse.json({ error: "Study AI is unavailable right now." }, { status: 502 }), actor);
  }
}
