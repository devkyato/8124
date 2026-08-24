"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

let arcadeSessionPromise: Promise<void> | null = null;

async function ensureArcadeSession() {
  const supabase = createClient();
  if (!supabase) throw new Error("The arcade connection is not configured.");

  arcadeSessionPromise ??= (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (existing.session) return;

    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: "Arcade Player", username: "arcade" } }
    });
    if (error) throw error;
  })().catch((error) => {
    arcadeSessionPromise = null;
    throw error;
  });

  return arcadeSessionPromise;
}

export function ArcadeSession({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    setError("");
    try {
      await ensureArcadeSession();
      setReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The arcade could not start.");
    }
  }, []);

  useEffect(() => { void start(); }, [start]);

  if (error) {
    return <main className="dashboard-error"><h1>Arcade unavailable</h1><p>{error}</p><button className="button" onClick={start}>try again</button></main>;
  }
  if (!ready) return <main className="dashboard-loading"><div className="loader" /><span>opening the arcade</span></main>;
  return children;
}
