import { serverConfig } from "./config";

export async function createCheckout(input: { plan: string; userId: string | null; email: string | null }) {
  if (!serverConfig.paymentUrl || !serverConfig.paymentKey || !serverConfig.paymentSecret) {
    return { status: "configuration_required" as const, message: "A real payment provider is not configured yet. No charge was created." };
  }
  const response = await fetch(serverConfig.paymentUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${serverConfig.paymentSecret}`, "Content-Type": "application/json", "X-Provider-Key": serverConfig.paymentKey },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`PAYMENT_PROVIDER_${response.status}`);
  return { status: "ready" as const, ...(await response.json()) };
}
