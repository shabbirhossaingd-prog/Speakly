import { NextRequest, NextResponse } from "next/server";
import { addWord, reviewWord, wordsFor, type ReviewRating, type VocabularyKind } from "@/lib/server/store";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  return applyActorCookie(NextResponse.json({ words: wordsFor(actor.id) }), actor);
}

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const body = await request.json();
  if (body.action === "review") {
    const rating = (body.rating || (body.remembered ? "good" : "again")) as ReviewRating;
    const word = reviewWord(actor.id, body.id, rating);
    return applyActorCookie(word ? NextResponse.json({ word }) : NextResponse.json({ error: "Word not found" }, { status: 404 }), actor);
  }
  if (!body.word || !body.meaning) return applyActorCookie(NextResponse.json({ error: "word and meaning are required" }, { status: 400 }), actor);
  const word = addWord(actor.id, {
    word: String(body.word).trim(),
    meaning: String(body.meaning).trim(),
    example: String(body.example || "").trim(),
    kind: (body.kind || "word") as VocabularyKind,
    cefr: String(body.cefr || "").trim(),
    register: String(body.register || "").trim(),
    source: String(body.source || "").trim(),
  });
  return applyActorCookie(NextResponse.json({ word }, { status: 201 }), actor);
}
