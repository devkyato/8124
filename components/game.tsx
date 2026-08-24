"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ControlGuide } from "./control-guide";
import { GameBoard } from "./game-board";
import { chooseMove } from "@/lib/solver";
import { createGame, moveGame, serializeGame, settleTiles, type GameState } from "@/lib/game";
import { loadBestScore, loadGame, saveBestScore, saveGame } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const emptyGame: GameState = {
  tiles: [],
  score: 0,
  won: false,
  over: false,
  keepPlaying: false
};

const keyDirections: Record<string, number> = {
  ArrowUp: 0,
  w: 0,
  ArrowRight: 1,
  d: 1,
  ArrowDown: 2,
  s: 2,
  ArrowLeft: 3,
  a: 3
};

export function Game({ initialGlobalBest, onRunSubmitted }: { initialGlobalBest: number; onRunSubmitted?: () => void }) {
  const [game, setGame] = useState(emptyGame);
  const [bestScore, setBestScore] = useState(initialGlobalBest);
  const [ready, setReady] = useState(false);
  const [solverActive, setSolverActive] = useState(false);
  const solverTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const solverRunning = useRef(false);
  const gameRef = useRef(game);
  const bestScoreRef = useRef(initialGlobalBest);
  const touchStart = useRef({ x: 0, y: 0 });
  const runStartedAt = useRef<number | null>(null);
  const moveCount = useRef(0);
  const runSubmitted = useRef(false);

  useEffect(() => {
    const storedGame = loadGame();
    const nextGame = storedGame ?? createGame();
    setGame(nextGame);
    const nextBest = Math.max(initialGlobalBest, loadBestScore(), nextGame.score);
    bestScoreRef.current = nextBest;
    setBestScore(nextBest);
    setReady(true);
  }, [initialGlobalBest]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const stopSolver = useCallback(() => {
    solverRunning.current = false;
    setSolverActive(false);

    if (solverTimer.current !== null) {
      window.clearInterval(solverTimer.current);
      solverTimer.current = null;
    }
  }, []);

  const submitRun = useCallback(async (state: GameState) => {
    if (runSubmitted.current || runStartedAt.current === null || moveCount.current < 1) return;
    runSubmitted.current = true;
    const maxTile = Math.max(2, ...state.tiles.filter((tile) => !tile.isGhost).map((tile) => tile.value));
    try {
      const supabase = createClient();
      const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      if (!supabase || !auth.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("game_runs").insert({
        user_id: auth.user.id,
        score: state.score,
        max_tile: maxTile,
        duration_ms: Math.max(1_000, Date.now() - runStartedAt.current),
        moves: moveCount.current,
        won: state.won
      });
      if (error) throw error;
      onRunSubmitted?.();
    } catch {
      runSubmitted.current = false;
    }
  }, [onRunSubmitted]);

  const performMove = useCallback((direction: number) => {
    const result = moveGame(settleTiles(gameRef.current), direction);

    if (!result.moved) {
      return false;
    }

    gameRef.current = result.state;
    if (runStartedAt.current === null) runStartedAt.current = Date.now();
    moveCount.current += 1;
    setGame(result.state);
    const nextBest = Math.max(bestScoreRef.current, result.state.score);
    bestScoreRef.current = nextBest;
    setBestScore(nextBest);
    saveBestScore(nextBest);
    saveGame(serializeGame(result.state));

    if (result.state.over || (result.state.won && !gameRef.current.keepPlaying)) {
      void submitRun(result.state);
    }

    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current);
    }

    settleTimer.current = window.setTimeout(() => {
      setGame((current) => {
        const settled = settleTiles(current);
        gameRef.current = settled;
        return settled;
      });
      settleTimer.current = null;
    }, 240);

    return true;
  }, [submitRun]);

  const runSolverStep = useCallback(() => {
    if (!solverRunning.current) {
      return;
    }

    const direction = chooseMove(gameRef.current.tiles);

    if (direction === null || !performMove(direction)) {
      stopSolver();
      return;
    }

  }, [performMove, stopSolver]);

  const toggleSolver = useCallback(() => {
    if (solverRunning.current) {
      stopSolver();
      return;
    }

    solverRunning.current = true;
    setSolverActive(true);
    runSolverStep();
    solverTimer.current = window.setInterval(runSolverStep, 50);
  }, [runSolverStep, stopSolver]);

  const restart = useCallback(() => {
    stopSolver();
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    const nextGame = createGame();
    runStartedAt.current = null;
    moveCount.current = 0;
    runSubmitted.current = false;
    gameRef.current = nextGame;
    setGame(nextGame);
    saveGame(nextGame);
  }, [stopSolver]);

  const keepPlaying = useCallback(() => {
    const nextGame = { ...gameRef.current, keepPlaying: true };
    gameRef.current = nextGame;
    setGame(nextGame);
    saveGame(nextGame);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "q") {
        event.preventDefault();
        toggleSolver();
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const direction = keyDirections[event.key] ?? keyDirections[event.key.toLowerCase()];

      if (direction === undefined) {
        return;
      }

      event.preventDefault();
      stopSolver();
      performMove(direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [performMove, stopSolver, toggleSolver]);

  const onPointerDown = (event: React.PointerEvent) => {
    touchStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const deltaX = event.clientX - touchStart.current.x;
    const deltaY = event.clientY - touchStart.current.y;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
      return;
    }

    const direction = Math.abs(deltaX) > Math.abs(deltaY)
      ? (deltaX > 0 ? 1 : 3)
      : (deltaY > 0 ? 2 : 0);

    stopSolver();
    performMove(direction);
  };

  if (!ready) {
    return <main className="game-container" aria-label="loading 8124" />;
  }

  return (
    <main className={`game-container${solverActive ? " solver-active" : ""}`}>
      <header className="heading game-heading">
        <div className="brand">
          <div className="brand-line">
            <h1 className="title">8124</h1>
            <p className="byline">arcade <span>season 01</span></p>
          </div>
          <button className="button" onClick={restart} type="button">new game</button>
        </div>
      </header>

      <section className="scores" aria-label="game scores">
        <div className="score-box"><span>score</span><strong>{game.score}</strong></div>
        <div className="score-box"><span>best</span><strong>{bestScore}</strong></div>
      </section>

      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <GameBoard
          game={game}
          onKeepPlaying={keepPlaying}
          onRestart={restart}
        />
      </div>

      <ControlGuide />
    </main>
  );
}
