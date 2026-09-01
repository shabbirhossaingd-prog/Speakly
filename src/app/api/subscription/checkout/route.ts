import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@/lib/server/payment";
import { applyActorCookie, resolveActor } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  const { plan } = await request.json();
  if (!plan) return applyActorCookie(NextResponse.json({ error: "Plan is required" }, { status: 400 }), actor);
  const checkout = await createCheckout({ plan, userId: actor.userId, email: actor.email });
  const status = checkout.status === "configuration_required" ? 503 : 200;
  return applyActorCookie(NextResponse.json(checkout, { status }), actor);
}
