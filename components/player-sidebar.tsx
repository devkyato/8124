"use client";

import { useState, type FormEvent } from "react";
import { FiAward, FiEdit3, FiLogOut, FiTarget, FiZap } from "react-icons/fi";
import type { DashboardData } from "@/lib/player-types";
import { getRankProgress } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/client";

function formatTime(ms: number | null) {
  if (!ms) return "—";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlayerSidebar({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const { profile, badges } = data;
  const rank = getRankProgress(profile.xp);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const displayName = String(form.get("displayName") ?? "").trim();
    if (!supabase || !/^[a-z0-9_]{3,20}$/.test(username) || !displayName || displayName.length > 32) {
      setMessage("Use a 3–20 character username and a display name up to 32 characters.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setMessage("Your session expired. Sign in again.");
      return;
    }
    const { error } = await supabase.from("profiles").update({ username, display_name: displayName }).eq("id", auth.user.id);
    if (error) {
      setMessage(error.code === "23505" ? "That username is already taken." : error.message);
      return;
    }
    setEditing(false);
    setMessage("");
    onRefresh();
  }

  async function signOut() {
    await createClient()?.auth.signOut();
  }

  return (
    <aside className="side-panel player-panel" aria-label="Your profile and progress">
      <div className="panel-heading">
        <div><p className="eyebrow">your progress</p><h2>{profile.display_name}</h2><span>@{profile.username}</span></div>
        <button className="icon-button" onClick={() => setEditing(!editing)} aria-label="Edit profile"><FiEdit3 /></button>
      </div>

      {editing && (
        <form className="profile-form" onSubmit={saveProfile}>
          <input name="displayName" defaultValue={profile.display_name} maxLength={32} required aria-label="Display name" />
          <input name="username" defaultValue={profile.username} minLength={3} maxLength={20} pattern="[a-z0-9_]+" required aria-label="Username" />
          {message && <small>{message}</small>}
          <button className="mini-button" type="submit">save profile</button>
        </form>
      )}

      <section className="rank-card" style={{ "--rank-color": rank.current.color } as React.CSSProperties}>
        <div className="rank-mark"><FiAward /></div>
        <div className="rank-title"><span>current rank</span><strong>{rank.current.name}</strong></div>
        <div className="progress-track"><i style={{ width: `${rank.progress}%` }} /></div>
        <div className="progress-label"><span>{profile.xp.toLocaleString()} XP</span><span>{rank.next ? `${rank.xpToNext.toLocaleString()} to ${rank.next.name}` : "maximum rank"}</span></div>
      </section>

      <div className="stat-grid">
        <div><FiTarget /><span>best score</span><strong>{profile.best_score.toLocaleString()}</strong></div>
        <div><FiZap /><span>best tile</span><strong>{profile.max_tile.toLocaleString()}</strong></div>
        <div><span>runs</span><strong>{profile.games_played.toLocaleString()}</strong></div>
        <div><span>2048 speedrun</span><strong>{formatTime(profile.fastest_2048_ms)}</strong></div>
      </div>

      <section className="badges-section">
        <div className="section-heading"><h3>badges</h3><span>{badges.length} earned</span></div>
        {badges.length ? (
          <div className="badge-list">{badges.map((badge) => <div className="badge-chip" key={badge.id} title={badge.description}><b>{badge.icon}</b><span>{badge.name}</span></div>)}</div>
        ) : <p className="empty-copy">Finish a ranked run to earn your first badge.</p>}
      </section>

      <button className="signout-button" onClick={signOut} type="button"><FiLogOut /> sign out</button>
    </aside>
  );
}
