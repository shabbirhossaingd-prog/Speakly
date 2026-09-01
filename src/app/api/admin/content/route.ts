import { NextRequest, NextResponse } from "next/server";
import { lessonCatalog } from "@/lib/lesson-catalog";
import { serverConfig } from "@/lib/server/config";
import { resolveActor } from "@/lib/server/session";

async function isAdmin(request: NextRequest) {
  const actor = await resolveActor(request);
  return Boolean(actor.authenticated && actor.email && serverConfig.adminEmails.includes(actor.email.toLowerCase()));
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json({ lessons: lessonCatalog, status: "seed_content" });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json({ status: "database_required", message: "Admin writes are intentionally disabled until Supabase tables are configured; this prevents fake publishing." }, { status: 503 });
}
