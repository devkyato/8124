"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ControlGuide } from "./control-guide";
import { GameBoard } from "./game-board";
import { chooseMove } from "@/lib/solver";
import { createGame, moveGame, serializeGame, settleTiles, type GameState } from "@/lib/game";
import { loadBestScore, loadGame, saveBestScore, saveGame } from "@/lib/storage";

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

export function Game({ initialGlobalBest }: { initialGlobalBest: number }) {
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

  const submitScore = useCallback(async (score: number) => {
    try {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score })
      });
    } catch {
      // a network issue should never interrupt the local game
    }
  }, []);

  const performMove = useCallback((direction: number) => {
    const result = moveGame(settleTiles(gameRef.current), direction);

    if (!result.moved) {
      return false;
    }

    gameRef.current = result.state;
    setGame(result.state);
    const nextBest = Math.max(bestScoreRef.current, result.state.score);
    bestScoreRef.current = nextBest;
    setBestScore(nextBest);
    saveBestScore(nextBest);
    saveGame(serializeGame(result.state));

    if (result.state.over) {
      void submitScore(result.state.score);
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
  }, [submitScore]);

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
      <header className="heading">
        <div className="brand">
          <div className="brand-line">
            <h1 className="title">8124</h1>
            <p className="byline">by <span>@devmako</span></p>
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
