export const boardSize = 4;

export type Position = { x: number; y: number };

export type Tile = Position & {
  id: string;
  value: number;
  previous?: Position;
  isNew?: boolean;
  isMerged?: boolean;
  isGhost?: boolean;
};

export type GameState = {
  tiles: Tile[];
  score: number;
  won: boolean;
  over: boolean;
  keepPlaying: boolean;
};

export type MoveResult = {
  state: GameState;
  moved: boolean;
};

let tileSequence = 0;

function createId() {
  tileSequence += 1;
  return `tile-${Date.now()}-${tileSequence}`;
}

export function createGame(): GameState {
  let tiles: Tile[] = [];
  tiles = addRandomTile(tiles);
  tiles = addRandomTile(tiles);

  return { tiles, score: 0, won: false, over: false, keepPlaying: false };
}

export function moveGame(current: GameState, direction: number): MoveResult {
  if (current.over || (current.won && !current.keepPlaying)) {
    return { state: current, moved: false };
  }

  const vector = getVector(direction);
  const positions = buildTraversal(vector);
  const tileMap = new Map<string, Tile>(
    current.tiles
      .filter((tile) => !tile.isGhost)
      .map((tile) => [positionKey(tile), { ...tile, isNew: false, isMerged: false }])
  );
  const ghosts: Tile[] = [];
  const mergedPositions = new Set<string>();
  let score = current.score;
  let won = current.won;
  let moved = false;

  for (const position of positions) {
    const key = positionKey(position);
    const tile = tileMap.get(key);

    if (!tile) {
      continue;
    }

    tileMap.delete(key);
    const positions = findDestination(position, vector, tileMap);
    const destinationKey = positionKey(positions.next);
    const nextTile = tileMap.get(destinationKey);

    if (nextTile && nextTile.value === tile.value && !mergedPositions.has(destinationKey)) {
      tileMap.delete(destinationKey);
      const value = tile.value * 2;

      ghosts.push(
        { ...tile, previous: position, x: positions.next.x, y: positions.next.y, isGhost: true },
        { ...nextTile, previous: { x: nextTile.x, y: nextTile.y }, x: positions.next.x, y: positions.next.y, isGhost: true }
      );

      tileMap.set(destinationKey, {
        id: createId(),
        value,
        x: positions.next.x,
        y: positions.next.y,
        isMerged: true
      });

      mergedPositions.add(destinationKey);
      score += value;
      won = won || value === 2048;
      moved = true;
      continue;
    }

    const next = {
      ...tile,
      x: positions.farthest.x,
      y: positions.farthest.y,
      previous: position
    };

    tileMap.set(positionKey(positions.farthest), next);
    moved = moved || positions.farthest.x !== position.x || positions.farthest.y !== position.y;
  }

  if (!moved) {
    return { state: current, moved: false };
  }

  let tiles = [...tileMap.values()];
  tiles = addRandomTile(tiles);
  const over = !hasAvailableMove(tiles);

  return {
    moved: true,
    state: {
      tiles: [...tiles, ...ghosts],
      score,
      won,
      over,
      keepPlaying: current.keepPlaying
    }
  };
}

export function settleTiles(state: GameState): GameState {
  return {
    ...state,
    tiles: state.tiles
      .filter((tile) => !tile.isGhost)
      .map(({ previous: _previous, isNew: _isNew, isMerged: _isMerged, ...tile }) => tile)
  };
}

export function serializeGame(state: GameState): GameState {
  return settleTiles(state);
}

export function addRandomTile(tiles: Tile[]) {
  const occupied = new Set(tiles.filter((tile) => !tile.isGhost).map(positionKey));
  const available: Position[] = [];

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        available.push({ x, y });
      }
    }
  }

  if (!available.length) {
    return tiles;
  }

  const position = available[Math.floor(Math.random() * available.length)];
  const value = Math.random() < 0.9 ? 2 : 4;

  return [...tiles, { ...position, id: createId(), value, isNew: true }];
}

export function toMatrix(tiles: Tile[]) {
  const matrix = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));

  tiles.filter((tile) => !tile.isGhost).forEach((tile) => {
    matrix[tile.y][tile.x] = tile.value;
  });

  return matrix;
}

function getVector(direction: number) {
  return [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ][direction];
}

function buildTraversal(vector: Position) {
  const xPositions = Array.from({ length: boardSize }, (_, index) => index);
  const yPositions = Array.from({ length: boardSize }, (_, index) => index);

  if (vector.x === 1) {
    xPositions.reverse();
  }

  if (vector.y === 1) {
    yPositions.reverse();
  }

  return yPositions.flatMap((y) => xPositions.map((x) => ({ x, y })));
}

function findDestination(position: Position, vector: Position, tileMap: Map<string, Tile>) {
  let farthest = position;
  let next = { x: position.x + vector.x, y: position.y + vector.y };

  while (withinBounds(next) && !tileMap.has(positionKey(next))) {
    farthest = next;
    next = { x: next.x + vector.x, y: next.y + vector.y };
  }

  return { farthest, next };
}

function hasAvailableMove(tiles: Tile[]) {
  const settled = tiles.filter((tile) => !tile.isGhost);

  if (settled.length < boardSize * boardSize) {
    return true;
  }

  const map = new Map(settled.map((tile) => [positionKey(tile), tile.value]));

  return settled.some((tile) => {
    return [{ x: 1, y: 0 }, { x: 0, y: 1 }].some((vector) => {
      return map.get(`${tile.x + vector.x}:${tile.y + vector.y}`) === tile.value;
    });
  });
}

function withinBounds(position: Position) {
  return position.x >= 0 && position.x < boardSize && position.y >= 0 && position.y < boardSize;
}

function positionKey(position: Position) {
  return `${position.x}:${position.y}`;
}
