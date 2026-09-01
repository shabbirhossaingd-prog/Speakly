export const serverConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  booksBucket: process.env.SUPABASE_BOOKS_BUCKET || "speakly-books",
  geminiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
  paymentUrl: process.env.PAYMENT_API_URL || "",
  paymentKey: process.env.PAYMENT_PROVIDER_KEY || "",
  paymentSecret: process.env.PAYMENT_PROVIDER_SECRET || "",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
};

export const hasSupabaseAuth = () => Boolean(serverConfig.supabaseUrl && serverConfig.supabaseAnonKey);
export const hasSupabaseServer = () => Boolean(serverConfig.supabaseUrl && serverConfig.supabaseServiceKey);
export const hasGemini = () => Boolean(serverConfig.geminiKey);
