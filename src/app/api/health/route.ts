import { NextResponse } from "next/server";
import { hasGemini, hasSupabaseAuth, hasSupabaseServer, serverConfig } from "@/lib/server/config";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "speakly",
    mode: "free-first",
    backend: {
      supabaseAuth: hasSupabaseAuth(),
      durableDatabase: hasSupabaseServer(),
      ai: {
        provider: "gemini",
        configured: hasGemini(),
        model: serverConfig.geminiModel,
      },
      browserSpeech: true,
      pdfTextExtraction: "pdfjs-client",
      generatedPdfDownload: "jspdf-client",
      paymentProvider: Boolean(serverConfig.paymentUrl && serverConfig.paymentKey && serverConfig.paymentSecret),
    },
  });
}
