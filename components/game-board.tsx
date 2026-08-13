import type { CSSProperties } from "react";
import type { GameState } from "@/lib/game";

type Props = {
  game: GameState;
  onKeepPlaying: () => void;
  onRestart: () => void;
};

export function GameBoard({ game, onKeepPlaying, onRestart }: Props) {
  const message = game.over ? "game over!" : game.won && !game.keepPlaying ? "you win!" : null;

  return (
    <section className="game-board" aria-label="8124 game board">
      {message ? (
        <div className={`game-message visible${game.won ? " won" : ""}`} aria-live="polite">
          <p>{message}</p>
          <div className="message-actions">
            {game.won && !game.keepPlaying ? (
              <button className="button" onClick={onKeepPlaying} type="button">keep playing</button>
            ) : null}
            <button className="button" onClick={onRestart} type="button">try again</button>
          </div>
        </div>
      ) : null}

      <div className="grid-container" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => <div className="grid-cell" key={index} />)}
      </div>

      <div className="tile-container">
        {game.tiles.map((tile) => {
          const previousX = tile.previous?.x ?? tile.x;
          const previousY = tile.previous?.y ?? tile.y;
          const directionX = Math.sign(tile.x - previousX);
          const directionY = Math.sign(tile.y - previousY);
          const isMoving = !tile.isGhost && !tile.isMerged && !tile.isNew
            && (directionX !== 0 || directionY !== 0);

          return (
            <div
              className={`tile tile-${Math.min(tile.value, 2048)}${tile.isNew ? " tile-new" : ""}${tile.isMerged ? " tile-merged" : ""}${tile.isGhost ? " tile-ghost" : ""}${isMoving ? " tile-moving" : ""}`}
              key={tile.isGhost
                ? `${tile.id}-ghost`
                : `${tile.id}-${previousX}:${previousY}-${tile.x}:${tile.y}`}
              style={{
                "--x": tileOffset(tile.x),
                "--y": tileOffset(tile.y),
                "--from-x": tileOffset(previousX),
                "--from-y": tileOffset(previousY),
                "--overshoot-x": motionOffset(tile.x, directionX, 5),
                "--overshoot-y": motionOffset(tile.y, directionY, 5),
                "--rebound-x": motionOffset(tile.x, directionX, -2),
                "--rebound-y": motionOffset(tile.y, directionY, -2)
              } as CSSProperties}
            >
              <div className="tile-inner">{tile.value}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function tileOffset(position: number) {
  if (position === 0) return "0px";
  const gaps = Array.from({ length: position }, () => "var(--gap)").join(" + ");
  return `calc(${position * 100}% + ${gaps})`;
}

function motionOffset(position: number, direction: number, distance: number) {
  const offset = tileOffset(position);
  const pixels = direction * distance;

  if (!pixels) {
    return offset;
  }

  return `calc(${offset} ${pixels > 0 ? "+" : "-"} ${Math.abs(pixels)}px)`;
}
