import type { User } from "@supabase/supabase-js";
import { createClient } from "./client";

let arcadeSessionPromise: Promise<User> | null = null;

export function ensureArcadeSession() {
  const supabase = createClient();
  if (!supabase) return Promise.reject(new Error("The arcade connection is not configured."));

  arcadeSessionPromise ??= (async () => {
    const { data: existing, error: sessionError } = await supabase.auth.getUser();
    if (sessionError && !sessionError.message.includes("Auth session missing")) throw sessionError;
    if (existing.user) return existing.user;

    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: "Arcade Player", username: "arcade" } }
    });
    if (error || !data.user) throw error ?? new Error("Could not create an arcade player.");
    return data.user;
  })().catch((error) => {
    arcadeSessionPromise = null;
    throw error;
  });

  return arcadeSessionPromise;
}

export async function renewArcadeSession() {
  const supabase = createClient();
  if (!supabase) throw new Error("The arcade connection is not configured.");
  await supabase.auth.signOut({ scope: "local" });
  arcadeSessionPromise = null;
  return ensureArcadeSession();
}
