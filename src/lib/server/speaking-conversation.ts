import { serverConfig } from "./config";

export type SpeakingConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

export type SpeakingConversationReply = {
  mode: "gemini" | "demo";
  reply: string;
};

function cleanHistory(history: SpeakingConversationTurn[]) {
  return history
    .slice(-12)
    .map((turn) => ({
      role: turn.role,
      text: String(turn.text || "").replace(/\s+/g, " ").trim().slice(0, 1200),
    }))
    .filter((turn) => turn.text);
}

function demoReply(history: SpeakingConversationTurn[]): SpeakingConversationReply {
  const last = [...history].reverse().find((turn) => turn.role === "user")?.text || "";
  const words = last.trim().split(/\s+/).filter(Boolean);
  const reply = words.length < 5
    ? "I got you. Could you tell me a little more about that?"
    : words.length < 18
      ? "That makes sense. Can you give me one specific example and explain what happened next?"
      : "Good, I can follow your point. What was the most difficult part, and how did you deal with it?";
  return { mode: "demo", reply };
}

export async function getSpeakingConversationReply(input: {
  scenario: string;
  history: SpeakingConversationTurn[];
}): Promise<SpeakingConversationReply> {
  const history = cleanHistory(input.history);
  if (!serverConfig.geminiKey) return demoReply(history);

  const conversation = history
    .map((turn) => `${turn.role === "user" ? "Learner" : "Coach"}: ${turn.text}`)
    .join("\n");

  const prompt = `You are Speakly, a friendly English conversation partner and communication coach.\n\nScenario: ${input.scenario}\n\nConversation so far:\n${conversation}\n\nReply to the learner naturally and continue the roleplay. Keep the reply short enough for a real spoken conversation: usually 1-3 short sentences. Ask exactly one useful follow-up question unless the scenario is clearly finished. Do not give scores, a grammar lecture, markdown, bullet points, or pronunciation claims during the conversation. If the learner makes small language mistakes, keep the conversation flowing and model natural English in your own reply instead of interrupting them. Return only JSON with a single field named reply.`;

  const model = encodeURIComponent(serverConfig.geminiModel);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": serverConfig.geminiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 220,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { reply: { type: "string" } },
          required: ["reply"],
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GEMINI_${response.status}:${detail.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");

  const parsed = JSON.parse(text) as { reply?: string };
  const reply = String(parsed.reply || "").replace(/\s+/g, " ").trim();
  if (!reply) throw new Error("GEMINI_EMPTY_REPLY");
  return { mode: "gemini", reply: reply.slice(0, 900) };
}
