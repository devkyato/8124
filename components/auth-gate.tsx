"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingSession(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase is not configured yet. Add the project URL and publishable key.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "Player").trim();
    const username = String(form.get("username") ?? "player").trim().toLowerCase();
    setBusy(true);
    setMessage("");

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href,
            data: { display_name: displayName, username }
          }
        });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (!result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("login");
      return;
    }

    setUser(result.data.user);
  }

  if (checkingSession) return <main className="dashboard-loading"><div className="loader" /><span>checking your session</span></main>;
  if (user) return children;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">8124</div>
        <p className="eyebrow">ranked play</p>
        <h1 id="auth-title">{mode === "login" ? "Welcome back" : "Create your player"}</h1>
        <p className="auth-copy">Use a local email and password account. Your runs, rank, badges, and speedruns stay attached to this profile.</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-grid">
              <label>display name<input name="displayName" maxLength={32} required autoComplete="name" /></label>
              <label>username<input name="username" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required autoComplete="username" /></label>
            </div>
          )}
          <label>email<input name="email" type="email" required autoComplete="email" /></label>
          <label>password<input name="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="button auth-submit" disabled={busy} type="submit">{busy ? "working…" : mode === "login" ? "log in" : "create account"}</button>
        </form>

        <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} type="button">
          {mode === "login" ? "new here? create an account" : "already have an account? log in"}
        </button>
      </section>
    </main>
  );
}
