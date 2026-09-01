import { NextRequest, NextResponse } from "next/server";
import { getDocumentStudy } from "@/lib/server/ai";
import { hasGemini } from "@/lib/server/config";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const body = await request.json();
  const mode = String(body.mode || "Practice");
  const name = String(body.name || "Uploaded PDF");
  const extractedText = String(body.extractedText || "").trim();
  const question = body.question ? String(body.question) : undefined;

  if (!hasGemini()) {
    return applyActorCookie(
      NextResponse.json(
        {
          status: "configuration_required",
          message: "Add a free GEMINI_API_KEY to enable Easy English, Academic English, Ask My Book and PDF practice. Original reading/download still works without it.",
        },
        { status: 503 },
      ),
      actor,
    );
  }

  if (extractedText.length < 80) {
    return applyActorCookie(
      NextResponse.json(
        {
          error: "Not enough readable text was found in this PDF. Text-based PDFs work in free mode; scanned/image-only PDFs will need OCR support.",
        },
        { status: 400 },
      ),
      actor,
    );
  }

  if (mode === "Ask My Book" && !question?.trim()) {
    return applyActorCookie(NextResponse.json({ error: "Write a question to ask this book." }, { status: 400 }), actor);
  }

  try {
    const result = await getDocumentStudy({ action: mode, name, extractedText, question });
    return applyActorCookie(
      NextResponse.json({
        status: "complete",
        provider: "gemini-free",
        sourceTruncated: extractedText.length > 40000,
        result,
      }),
      actor,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown document processing error";
    return applyActorCookie(
      NextResponse.json({ error: "Gemini could not process this document right now.", detail: message.slice(0, 220) }, { status: 502 }),
      actor,
    );
  }
}
