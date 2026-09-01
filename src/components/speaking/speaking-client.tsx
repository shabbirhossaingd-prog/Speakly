"use client";

import { useEffect, useRef, useState } from "react";
import { Mic2, MicOff, RefreshCw, Send, Sparkles, Target, Volume2, VolumeX } from "lucide-react";
import { api } from "@/lib/client-api";

type Feedback = {
  mode: "gemini" | "demo";
  scores: { fluency: number; grammar: number; vocabulary: number; clarity: number };
  corrected: string;
  notes: string[];
  nextTask: string;
};

type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

type ConversationReply = {
  mode: "gemini" | "demo";
  reply: string;
};

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
  isFinal: boolean;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    [index: number]: SpeechRecognitionResultLike | undefined;
    length: number;
  };
};
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type Scenario = { id: string; label: string; level: string; objective: string; prompt: string; targets: string[] };

const scenarios: Scenario[] = [
  { id: "project-update", label: "Project Update", level: "B1", objective: "Report progress, explain one blocker and give a next step.", prompt: "Give me a short update about a current or simulated project. What did you complete, what is blocking you, and what will you do next?", targets: ["make progress", "run into an issue", "next step"] },
  { id: "job-interview", label: "Job Interview", level: "B1–B2", objective: "Answer clearly with evidence instead of memorized phrases.", prompt: "Tell me about a difficult problem you solved. What was the situation, what did you do, and what happened as a result?", targets: ["I was responsible for", "the main challenge", "as a result"] },
  { id: "meeting", label: "Meeting", level: "B2", objective: "Disagree politely and propose an alternative.", prompt: "Imagine I am your teammate and I have suggested a risky plan. Tell me your concern and suggest a better option.", targets: ["I see your point", "my concern is", "an alternative would be"] },
  { id: "presentation", label: "Presentation", level: "B2", objective: "Guide an audience through a technical explanation.", prompt: "Explain a technical concept to me. Start with an overview, give one example, and finish with a short conclusion.", targets: ["first, let me explain", "for example", "to summarize"] },
  { id: "cse-viva", label: "University / CSE Viva", level: "B1–B2", objective: "Explain a concept accurately and respond to follow-up questions.", prompt: "I am your viva examiner. Explain one CSE concept you know well, including how it works and one practical use.", targets: ["it is used to", "the process works by", "a practical example"] },
  { id: "ielts", label: "IELTS Speaking", level: "B1–C1", objective: "Develop an answer with reasons, examples and coherent extension.", prompt: "Tell me about a skill you would like to improve. Why does it matter to you, and how do you plan to improve it?", targets: ["one reason is", "for instance", "in the future"] },
  { id: "everyday", label: "Everyday", level: "A2–B1", objective: "Keep a familiar conversation going with connected language.", prompt: "Let's have a normal conversation. How do you usually organize a busy day, and what do you do when your plans change?", targets: ["usually", "when that happens", "then I"] },
];

function normalizeSpeech(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeSpeechParts(parts: string[]) {
  let output = "";
  for (const rawPart of parts) {
    const part = normalizeSpeech(rawPart);
    if (!part) continue;
    if (!output) {
      output = part;
      continue;
    }

    const outputWords = output.split(" ");
    const partWords = part.split(" ");
    const outputLower = output.toLowerCase();
    const partLower = part.toLowerCase();

    if (outputLower === partLower || outputLower.endsWith(` ${partLower}`)) continue;
    if (partLower.startsWith(`${outputLower} `)) {
      output = part;
      continue;
    }

    let overlap = 0;
    const maxOverlap = Math.min(12, outputWords.length, partWords.length);
    for (let size = maxOverlap; size > 0; size -= 1) {
      const left = outputWords.slice(-size).join(" ").toLowerCase();
      const right = partWords.slice(0, size).join(" ").toLowerCase();
      if (left === right) {
        overlap = size;
        break;
      }
    }
    output = `${output} ${partWords.slice(overlap).join(" ")}`.trim();
  }
  return normalizeSpeech(output);
}

export function SpeakingClient() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const scenario = scenarios.find((item) => item.id === scenarioId) || scenarios[0];
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [heard, setHeard] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalPartsRef = useRef<Map<number, string>>(new Map());
  const submitTimerRef = useRef<number | null>(null);
  const liveRef = useRef(false);
  const waitingRef = useRef(false);
  const speakingRef = useRef(false);
  const voiceEnabledRef = useRef(true);
  const conversationRef = useRef<ConversationTurn[]>([]);
  const lastUserRef = useRef("");
  const lastUserAtRef = useRef(0);

  useEffect(() => {
    return () => {
      liveRef.current = false;
      if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
      recognitionRef.current?.abort?.();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function setConversationSafe(next: ConversationTurn[]) {
    conversationRef.current = next;
    setConversation(next);
  }

  function appendTurn(turn: ConversationTurn) {
    setConversationSafe([...conversationRef.current, turn]);
  }

  function stopRecognition() {
    if (submitTimerRef.current) {
      window.clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try { recognition.stop(); } catch {}
    }
    setListening(false);
    setHeard("");
  }

  function startRecognition() {
    if (!liveRef.current || waitingRef.current || speakingRef.current || recognitionRef.current) return;
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      liveRef.current = false;
      setLive(false);
      setMessage("Continuous browser speech recognition is unavailable here. You can still type and get AI replies.");
      return;
    }

    finalPartsRef.current = new Map();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const interimParts: string[] = [];
      let hasFinal = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = normalizeSpeech(result?.[0]?.transcript || "");
        if (!result || !text) continue;
        if (result.isFinal) {
          finalPartsRef.current.set(index, text);
          hasFinal = true;
        } else {
          interimParts.push(text);
        }
      }

      const finalText = mergeSpeechParts(
        Array.from(finalPartsRef.current.entries())
          .sort(([left], [right]) => left - right)
          .map(([, text]) => text),
      );
      const preview = mergeSpeechParts([finalText, ...interimParts]);
      setHeard(preview);

      if (submitTimerRef.current) window.clearTimeout(submitTimerRef.current);
      if (hasFinal && finalText) {
        submitTimerRef.current = window.setTimeout(() => {
          submitTimerRef.current = null;
          const clean = normalizeSpeech(finalText);
          if (!clean) return;
          void sendConversationTurn(clean);
        }, 900);
      }
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
      if (liveRef.current && !waitingRef.current && !speakingRef.current) {
        window.setTimeout(startRecognition, 700);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
      if (liveRef.current && !waitingRef.current && !speakingRef.current && !submitTimerRef.current) {
        window.setTimeout(startRecognition, 350);
      }
    };

    try {
      recognition.start();
      setListening(true);
      setMessage("");
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }

  function speakCoach(text: string) {
    if (!liveRef.current) return;
    if (!voiceEnabledRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
      window.setTimeout(startRecognition, 350);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.98;
    utterance.pitch = 1;
    speakingRef.current = true;
    setSpeaking(true);
    utterance.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
      if (liveRef.current) window.setTimeout(startRecognition, 300);
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
      if (liveRef.current) window.setTimeout(startRecognition, 300);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function sendConversationTurn(rawText: string) {
    const text = normalizeSpeech(rawText);
    if (!text || waitingRef.current) return;

    const now = Date.now();
    if (text.toLowerCase() === lastUserRef.current.toLowerCase() && now - lastUserAtRef.current < 2500) {
      setHeard("");
      return;
    }
    lastUserRef.current = text;
    lastUserAtRef.current = now;

    waitingRef.current = true;
    setBusy(true);
    stopRecognition();
    setDraft("");
    setFeedback(null);
    appendTurn({ role: "user", text });

    try {
      const history = conversationRef.current.slice(-12);
      const result = await api<ConversationReply>("/api/speaking", {
        method: "POST",
        body: JSON.stringify({
          mode: "conversation",
          scenario: `${scenario.label} (${scenario.level}) — ${scenario.objective}. ${scenario.prompt}`,
          history,
        }),
      });
      appendTurn({ role: "assistant", text: result.reply });
      speakCoach(result.reply);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not get a conversation reply.");
      if (liveRef.current) window.setTimeout(startRecognition, 600);
    } finally {
      waitingRef.current = false;
      setBusy(false);
    }
  }

  function startLiveConversation() {
    if (liveRef.current) return;
    liveRef.current = true;
    setLive(true);
    setMessage("");
    setFeedback(null);

    if (!conversationRef.current.length) {
      appendTurn({ role: "assistant", text: scenario.prompt });
      speakCoach(scenario.prompt);
    } else {
      startRecognition();
    }
  }

  function stopLiveConversation() {
    liveRef.current = false;
    setLive(false);
    waitingRef.current = false;
    stopRecognition();
    speakingRef.current = false;
    setSpeaking(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setMessage("Voice conversation paused. Start again whenever you are ready.");
  }

  async function evaluateLastAnswer() {
    const transcript = lastUserRef.current || [...conversationRef.current].reverse().find((turn) => turn.role === "user")?.text || "";
    if (transcript.trim().split(/\s+/).length < 5) return setMessage("Give a slightly longer answer before requesting feedback.");
    setBusy(true);
    setMessage("");
    try {
      const result = await api<Feedback>("/api/speaking", {
        method: "POST",
        body: JSON.stringify({ scenario: `${scenario.label} (${scenario.level}) — ${scenario.objective}`, transcript }),
      });
      setFeedback({ ...result, notes: result.notes.slice(0, 3) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not evaluate your response.");
    } finally {
      setBusy(false);
    }
  }

  function retryLastAnswer() {
    setFeedback(null);
    setMessage("Try the answer again in your own words. The conversation can continue after your retry.");
    if (liveRef.current && !listening && !speaking) startRecognition();
  }

  function chooseScenario(id: string) {
    stopLiveConversation();
    setScenarioId(id);
    setConversationSafe([]);
    setDraft("");
    setHeard("");
    setFeedback(null);
    lastUserRef.current = "";
    lastUserAtRef.current = 0;
    setMessage("");
  }

  function toggleVoiceReply() {
    const next = !voiceEnabledRef.current;
    voiceEnabledRef.current = next;
    setVoiceEnabled(next);
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setSpeaking(false);
      if (liveRef.current) window.setTimeout(startRecognition, 200);
    }
  }

  return (
    <div>
      <section className="border-b pb-6" style={{ borderColor: "rgb(var(--border))" }}>
        <div className="flex flex-wrap items-center gap-2">
          {scenarios.map((item) => (
            <button key={item.id} onClick={() => chooseScenario(item.id)} className={`rounded-full px-3 py-2 text-xs font-semibold ${scenarioId === item.id ? "bg-violet-600 text-white" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-8 py-7 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside>
          <div className="flex items-start gap-3">
            <Target className="mt-1 shrink-0 text-violet-600" size={18}/>
            <div>
              <div className="flex items-center gap-2"><h2 className="font-semibold">{scenario.label}</h2><span className="text-xs text-muted">{scenario.level}</span></div>
              <p className="mt-2 text-sm leading-6 text-muted">{scenario.objective}</p>
              <p className="mt-4 text-sm leading-6">{scenario.prompt}</p>
              <p className="mt-4 text-xs leading-5 text-muted"><strong>Useful language:</strong> {scenario.targets.join(" • ")}</p>
            </div>
          </div>

          <div className="mt-7 space-y-2">
            {!live ? (
              <button onClick={startLiveConversation} className="button-primary w-full"><Mic2 size={17}/>Start voice conversation</button>
            ) : (
              <button onClick={stopLiveConversation} className="button-primary w-full bg-red-600 hover:bg-red-700"><MicOff size={17}/>Stop conversation</button>
            )}
            <button onClick={toggleVoiceReply} className="button-secondary w-full">
              {voiceEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}
              {voiceEnabled ? "Coach voice on" : "Coach voice off"}
            </button>
          </div>

          <div className="mt-6 text-sm">
            <p className="font-medium">{speaking ? "Coach is speaking…" : listening ? "Listening…" : busy ? "Coach is thinking…" : live ? "Ready for your next turn" : "Conversation paused"}</p>
            <p className="mt-1 text-xs leading-5 text-muted">Mic pauses while the coach speaks, then starts listening again automatically.</p>
          </div>

          <div className="mt-6 border-t pt-5 text-xs leading-5 text-muted" style={{ borderColor: "rgb(var(--border))" }}>
            <strong className="text-[rgb(var(--foreground))]">Pronunciation is not scored from transcript text.</strong> Speaking feedback covers task completion, organization, grammar, vocabulary and clarity only.
          </div>
        </aside>

        <section className="min-w-0">
          <div className="min-h-[420px] max-h-[58vh] overflow-y-auto pr-2">
            {!conversation.length && (
              <div className="flex min-h-80 items-center justify-center text-center">
                <div className="max-w-md"><Sparkles className="mx-auto text-violet-600"/><h3 className="mt-4 font-semibold">A real back-and-forth speaking session</h3><p className="mt-2 text-sm leading-6 text-muted">Start voice conversation. Speak normally, wait for the coach reply, then continue. You do not need to press feedback after every sentence.</p></div>
              </div>
            )}

            <div className="space-y-1">
              {conversation.map((turn, index) => (
                <div key={`${index}-${turn.role}`} className={`border-b py-4 ${turn.role === "user" ? "pl-8" : "pr-8"}`} style={{ borderColor: "rgb(var(--border))" }}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${turn.role === "user" ? "text-violet-600" : "text-muted"}`}>{turn.role === "user" ? "You" : "Coach"}</p>
                  <p className="mt-1.5 text-[15px] leading-7">{turn.text}</p>
                </div>
              ))}
            </div>
          </div>

          {heard && (
            <div className="mt-3 rounded-lg bg-violet-500/10 px-3 py-2 text-sm">
              <span className="mr-2 text-xs font-semibold text-violet-600">Hearing</span>{heard}
            </div>
          )}

          <div className="mt-5 flex items-end gap-2 border-t pt-4" style={{ borderColor: "rgb(var(--border))" }}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (draft.trim()) void sendConversationTurn(draft);
                }
              }}
              className="min-h-12 max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
              placeholder="Type a reply, or use continuous voice…"
            />
            <button onClick={() => void sendConversationTurn(draft)} disabled={!draft.trim() || busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-40" aria-label="Send reply"><Send size={17}/></button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => void evaluateLastAnswer()} disabled={busy || !conversation.some((turn) => turn.role === "user")} className="button-secondary"><Sparkles size={16}/>Feedback on last answer</button>
            {message && <p className="text-xs text-muted">{message}</p>}
          </div>
        </section>
      </div>

      {feedback && (
        <section className="border-t pt-7" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Last-answer feedback</p><h2 className="mt-1 text-xl font-semibold">Fix only the highest-value points.</h2></div>
            <span className="text-xs text-muted">{feedback.mode === "gemini" ? "AI coach" : "Local fallback"}</span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-3">
              {Object.entries(feedback.scores).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between border-b pb-2 text-sm" style={{ borderColor: "rgb(var(--border))" }}><span className="capitalize text-muted">{key}</span><strong>{value}</strong></div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-600">Natural version</p>
              <p className="mt-2 leading-7">{feedback.corrected}</p>
              <ol className="mt-5 space-y-2 text-sm leading-6">{feedback.notes.map((note, index) => <li key={`${index}-${note}`}><strong>{index + 1}.</strong> {note}</li>)}</ol>
              <p className="mt-5 text-sm"><strong>Retry:</strong> {feedback.nextTask}</p>
              <button onClick={retryLastAnswer} className="button-primary mt-5"><RefreshCw size={16}/>Retry now</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
