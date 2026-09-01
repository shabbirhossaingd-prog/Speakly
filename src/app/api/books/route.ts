import { NextRequest, NextResponse } from "next/server";
import { addBook, booksFor } from "@/lib/server/store";
import { applyActorCookie, resolveActor } from "@/lib/server/session";
import { hasSupabaseServer } from "@/lib/server/config";
import { uploadPrivatePdf } from "@/lib/server/supabase";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  return applyActorCookie(NextResponse.json({ books: booksFor(actor.id) }), actor);
}

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") return applyActorCookie(NextResponse.json({ error: "Upload a PDF file." }, { status: 400 }), actor);
  if (!actor.userId || !hasSupabaseServer()) {
    return applyActorCookie(NextResponse.json({ status: "local_only", message: "Permanent private upload needs login plus Supabase Storage. The browser can still read/download this PDF during the current session." }, { status: 503 }), actor);
  }
  const storagePath = await uploadPrivatePdf(actor.userId, file);
  const book = addBook(actor.id, { id: crypto.randomUUID(), name: file.name, size: file.size, storagePath, status: "uploaded", createdAt: new Date().toISOString() });
  return applyActorCookie(NextResponse.json({ status: "stored", book }, { status: 201 }), actor);
}
