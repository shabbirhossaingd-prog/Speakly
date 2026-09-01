"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, type ApiError } from "@/lib/client-api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const result = await api<{ status: string }>(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify({ email, password }) });
      if (result.status === "confirmation_required") setMessage("Check your email to confirm the account, then log in.");
      else router.push(mode === "signup" ? "/onboarding" : "/dashboard");
    } catch (error) {
      const apiError = error as ApiError;
      const data = apiError.data as { message?: string } | undefined;
      setMessage(data?.message || apiError.message);
    } finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="card w-full max-w-md p-6 sm:p-8">
    <div className="mb-7"><p className="text-sm font-semibold text-violet-600">Speakly Account</p><h1 className="mt-2 text-3xl font-black">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-2 text-sm leading-6 text-muted">Your learning profile, progress and private books stay connected to your account when Supabase is configured.</p></div>
    <label className="text-sm font-semibold">Email</label><input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required className="surface mt-2 w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500" placeholder="you@example.com"/>
    <label className="mt-4 block text-sm font-semibold">Password</label><input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" minLength={8} required className="surface mt-2 w-full rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500" placeholder="Minimum 8 characters"/>
    {message && <div className="muted-surface mt-4 rounded-xl p-3 text-sm leading-6">{message}</div>}
    <button disabled={loading} className="button-primary mt-5 w-full">{loading && <Loader2 size={17} className="animate-spin"/>}{mode === "login" ? "Log in" : "Sign up"}</button>
    <a href="/api/auth/google" className="button-secondary mt-3 w-full">Continue with Google</a>
    <p className="mt-5 text-center text-sm text-muted">{mode === "login" ? <>New to Speakly? <Link className="font-semibold text-violet-600" href="/signup">Create account</Link></> : <>Already have an account? <Link className="font-semibold text-violet-600" href="/login">Log in</Link></>}</p>
  </form>;
}
