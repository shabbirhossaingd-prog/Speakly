# Speakly

Speakly is a **Standard-to-Advanced** English learning platform built around real study, career and communication needs.

Core lesson flow: **Learn → Example → Vocabulary → Listening → Speaking → Writing → Quiz → AI Feedback → Improve**.

## Product positioning

Speakly is not an alphabet/A1/basic-sentence app. The default learning ladder is **Standard → Intermediate → Upper-Intermediate → Advanced**. Content focuses on natural conversation, fluency, academic and professional communication, IELTS, presentations, interviews, field-specific English and learning from the user's own books.

A separate **Basic / Easy Explain** help layer is available from every app section. It does not lower the main course level; it gives beginner-friendly explanations whenever a learner gets stuck.

## Free-first MVP stack

The project is intentionally designed so the first usable MVP can run at **$0 infrastructure/API cost within free-tier limits**:

- Next.js + React + TypeScript + Tailwind
- Vercel Hobby-compatible deployment
- Supabase Free-compatible Auth, PostgreSQL and private Storage adapter
- Gemini API free-tier adapter for speaking feedback and document study actions
- Browser Web Speech API for microphone → transcript when supported
- PDF.js in the browser for text extraction from text-based PDFs
- jsPDF in the browser for generated Easy English / Academic English / Study Notes PDF downloads
- No payment provider is required for the free MVP

No fake AI or payment success is returned. If Gemini is not configured, speaking feedback transparently falls back to a local text heuristic; document AI actions return `configuration_required`. Real checkout stays disabled until a payment provider is explicitly configured.

## Current features

- White/dark responsive UI
- Onboarding for School, College (Science/Commerce/Arts), University fields, IELTS candidates and Professionals
- Standard → Advanced placement test
- Personalized dashboard
- Learning engine and lesson completion/progress APIs
- **Grammar Hub** with beginner-friendly explanations, search, topic groups and examples
- Grammar coverage includes sentence structure, sentence types, 8 parts of speech, articles, nouns/pronouns, adjectives/adverbs, prepositions, **all 12 core tense forms**, subject–verb agreement, irregular verbs, questions, negatives, modals, conjunctions, gerunds/infinitives, comparisons, conditionals, active/passive voice, reported speech, relative clauses, phrases/clauses, word order, punctuation and common errors
- Persistent **Basic** help button in the app shell so grammar help is reachable from Learn, Practice, Speaking, Vocabulary, Progress, Books and other student sections
- Vocabulary and spaced-review foundation
- IELTS attempt foundation
- AI Speaking Lab with free browser transcription
- My Books: upload/read/download original PDF
- Client-side PDF text extraction
- Gemini-powered Easy English, Academic English, Ask My Book and Practice generation
- Client-side generated PDF download for processed study material
- Supabase-ready SQL schema with row-level security
- Admin/CMS API foundation

## Backend modes

1. **Session/dev mode** — profile, progress, vocabulary and lesson completion can run without external credentials. This is process-local and not durable production storage.
2. **Free production mode** — connect a Supabase Free project for persistent auth/data/private PDF storage and add a Gemini API key for AI features.

## Free setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

For persistent data/storage:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a **private** Storage bucket named `speakly-books`.
4. Add the Supabase URL, anon key and service-role key to `.env.local`.

For AI features:

1. Create a Gemini API key in Google AI Studio.
2. Set `GEMINI_API_KEY` in `.env.local`.
3. The default model is `gemini-2.5-flash-lite`; override it with `GEMINI_MODEL` if needed.

Keep `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` server-side. Never expose them with a `NEXT_PUBLIC_` prefix.

## API routes

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/session`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET|PUT /api/profile`
- `GET|POST /api/placement`
- `GET /api/lessons/recommendations`
- `POST /api/lessons/complete`
- `GET /api/progress`
- `GET|POST /api/vocabulary`
- `POST /api/speaking`
- `POST /api/ielts/attempt`
- `GET|POST /api/books`
- `POST /api/books/process`
- `POST /api/subscription/checkout`
- `GET|POST /api/admin/content`

## Known free-mode limits

- Web Speech API support and quality vary by browser/device.
- Transcript-only feedback does **not** pretend to be professional pronunciation scoring.
- PDF.js extraction works for text-based PDFs. Scanned/image-only PDFs require an OCR layer later.
- Large books are capped before sending study text to Gemini to control free-tier usage.
- Free service tiers have quotas and can change; production scale may eventually require paid capacity.
