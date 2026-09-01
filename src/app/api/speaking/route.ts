import { NextRequest, NextResponse } from "next/server";
import { getSpeakingFeedback } from "@/lib/server/ai";
import { getSpeakingConversationReply, type SpeakingConversationTurn } from "@/lib/server/speaking-conversation";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const body = await request.json();

  if (body?.mode === "conversation") {
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-12)
          .map((turn: Partial<SpeakingConversationTurn>) => ({
            role: turn.role === "assistant" ? "assistant" as const : "user" as const,
            text: String(turn.text || "").trim(),
          }))
          .filter((turn: SpeakingConversationTurn) => turn.text)
      : [];

    if (!history.some((turn: SpeakingConversationTurn) => turn.role === "user")) {
      return applyActorCookie(NextResponse.json({ error: "Say or type something first." }, { status: 400 }), actor);
    }

    try {
      const reply = await getSpeakingConversationReply({
        scenario: String(body.scenario || "general English conversation"),
        history,
      });
      return applyActorCookie(NextResponse.json(reply), actor);
    } catch {
      return applyActorCookie(NextResponse.json({ error: "The conversation coach is unavailable right now." }, { status: 502 }), actor);
    }
  }

  const scenario = String(body?.scenario || "general");
  const transcript = String(body?.transcript || "");
  if (!transcript || transcript.trim().split(/\s+/).length < 5) {
    return applyActorCookie(NextResponse.json({ error: "Give a longer answer so Speakly can evaluate it." }, { status: 400 }), actor);
  }

  try {
    const feedback = await getSpeakingFeedback({ scenario, transcript });
    return applyActorCookie(NextResponse.json(feedback), actor);
  } catch {
    return applyActorCookie(NextResponse.json({ error: "The AI feedback provider is unavailable right now." }, { status: 502 }), actor);
  }
}
