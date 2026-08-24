import { FiClock, FiTrendingUp } from "react-icons/fi";
import type { DashboardData, LeaderboardEntry } from "@/lib/player-types";

function formatTime(ms: number | null) {
  if (!ms) return "—";
  return `${Math.floor(ms / 60_000)}:${Math.floor((ms % 60_000) / 1_000).toString().padStart(2, "0")}`;
}

function LeaderRow({ entry, place, current }: { entry: LeaderboardEntry; place: number; current: boolean }) {
  return (
    <li className={current ? "current-player" : ""}>
      <span className="place">#{place}</span>
      <div className="leader-name"><strong>{entry.display_name}</strong><span>{entry.rank} · @{entry.username}</span></div>
      <div className="leader-score"><strong>{Number(entry.weekly_score).toLocaleString()}</strong><span>weekly</span></div>
    </li>
  );
}

export function LeaderboardSidebar({ data }: { data: DashboardData }) {
  return (
    <aside className="side-panel leaderboard-panel" aria-label="Weekly rankings and leaderboard">
      <p className="eyebrow">weekly ranking</p>
      <div className="placement-card">
        <div><span>your place</span><strong>{data.weeklyPlace ? `#${data.weeklyPlace}` : "—"}</strong></div>
        <div><span>weekly score</span><strong>{data.weeklyScore.toLocaleString()}</strong></div>
      </div>

      <div className="section-heading leaderboard-title"><h2>leaderboard</h2><span><FiTrendingUp /> resets Monday</span></div>
      <ol className="leader-list">
        {data.leaderboard.length
          ? data.leaderboard.slice(0, 10).map((entry, index) => <LeaderRow key={entry.id} entry={entry} place={index + 1} current={entry.id === data.profile.id} />)
          : <p className="empty-copy">No arcade runs this week. Set the pace.</p>}
      </ol>

      <section className="speedrun-board">
        <div className="section-heading"><h3><FiClock /> speedruns</h3><span>fastest 2048</span></div>
        <ol>{data.leaderboard.filter((entry) => entry.fastest_2048_ms).sort((a, b) => Number(a.fastest_2048_ms) - Number(b.fastest_2048_ms)).slice(0, 5).map((entry, index) => (
          <li key={entry.id}><span>#{index + 1} {entry.display_name}</span><strong>{formatTime(entry.fastest_2048_ms)}</strong></li>
        ))}</ol>
      </section>
    </aside>
  );
}
