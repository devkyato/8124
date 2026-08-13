import { boardSize, toMatrix, type Tile } from "./game";

const searchDepth = 2;
const chanceSampleLimit = 4;

export function chooseMove(tiles: Tile[]) {
  const board = toMatrix(tiles);
  const cache = new Map<string, number>();
  let bestDirection: number | null = null;
  let bestScore = -Infinity;

  for (let direction = 0; direction < 4; direction += 1) {
    const result = simulate(board, direction);

    if (!result.moved) {
      continue;
    }

    const score = result.gained * 18 + chanceNode(result.board, searchDepth - 1, cache);

    if (score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function playerNode(board: number[][], depth: number, cache: Map<string, number>): number {
  if (depth <= 0) {
    return evaluate(board);
  }

  const key = `p:${depth}:${board.flat().join(",")}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  let best = -Infinity;

  for (let direction = 0; direction < 4; direction += 1) {
    const result = simulate(board, direction);

    if (result.moved) {
      best = Math.max(best, result.gained * 18 + chanceNode(result.board, depth - 1, cache));
    }
  }

  const score = best === -Infinity ? evaluate(board) - 100000 : best;
  cache.set(key, score);
  return score;
}

function chanceNode(board: number[][], depth: number, cache: Map<string, number>): number {
  const empty = emptyCells(board);

  if (!empty.length || depth < 0) {
    return evaluate(board);
  }

  const key = `c:${depth}:${board.flat().join(",")}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const samples = sampleCells(empty);
  let expected = 0;

  for (const cell of samples) {
    const withTwo = placeTile(board, cell.x, cell.y, 2);
    const withFour = placeTile(board, cell.x, cell.y, 4);
    expected += 0.9 * playerNode(withTwo, depth, cache) + 0.1 * playerNode(withFour, depth, cache);
  }

  const score = expected / samples.length;
  cache.set(key, score);
  return score;
}

function evaluate(board: number[][]) {
  const logs = board.map((row) => row.map((value) => value ? Math.log2(value) : 0));
  const empty = emptyCells(board).length;
  let smoothness = 0;
  let mergePotential = 0;
  let maximum = 0;
  let maximumPosition = { x: 0, y: 0 };

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const value = board[y][x];

      if (value > maximum) {
        maximum = value;
        maximumPosition = { x, y };
      }

      for (const [nextX, nextY] of [[x + 1, y], [x, y + 1]]) {
        if (nextX >= boardSize || nextY >= boardSize || !value || !board[nextY][nextX]) {
          continue;
        }

        smoothness -= Math.abs(logs[y][x] - logs[nextY][nextX]);

        if (value === board[nextY][nextX]) {
          mergePotential += logs[y][x];
        }
      }
    }
  }

  const inCorner = (maximumPosition.x === 0 || maximumPosition.x === boardSize - 1)
    && (maximumPosition.y === 0 || maximumPosition.y === boardSize - 1);

  return empty * 2800
    + monotonicity(logs) * 48
    + smoothness * 42
    + mergePotential * 180
    + snakeScore(logs) * 14
    + (inCorner ? Math.log2(maximum || 1) * 950 : 0);
}

function monotonicity(board: number[][]) {
  let score = 0;

  for (let index = 0; index < boardSize; index += 1) {
    let rowUp = 0;
    let rowDown = 0;
    let columnUp = 0;
    let columnDown = 0;

    for (let offset = 0; offset < boardSize - 1; offset += 1) {
      const rowDifference = board[index][offset] - board[index][offset + 1];
      const columnDifference = board[offset][index] - board[offset + 1][index];
      rowUp += Math.max(rowDifference, 0);
      rowDown += Math.max(-rowDifference, 0);
      columnUp += Math.max(columnDifference, 0);
      columnDown += Math.max(-columnDifference, 0);
    }

    score += Math.max(rowUp, rowDown) + Math.max(columnUp, columnDown);
  }

  return score;
}

function snakeScore(board: number[][]) {
  const lines = [
    board,
    [...board].reverse(),
    board.map((row) => [...row].reverse()),
    [...board].reverse().map((row) => [...row].reverse())
  ];
  let best = -Infinity;

  for (const line of lines) {
    const horizontal = line.flatMap((row, index) => index % 2 ? [...row].reverse() : row);
    const verticalBoard = line[0].map((_, x) => line.map((row) => row[x]));
    const vertical = verticalBoard.flatMap((row, index) => index % 2 ? [...row].reverse() : row);

    best = Math.max(best, weightedSnake(horizontal), weightedSnake(vertical));
  }

  return best;
}

function weightedSnake(values: number[]) {
  return values.reduce((score, value, index) => score + value * (values.length - index), 0);
}

function emptyCells(board: number[][]) {
  const cells: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (!board[y][x]) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

function sampleCells(cells: Array<{ x: number; y: number }>) {
  if (cells.length <= chanceSampleLimit) {
    return cells;
  }

  return Array.from({ length: chanceSampleLimit }, (_, index) => {
    const position = Math.round(index * (cells.length - 1) / (chanceSampleLimit - 1));
    return cells[position];
  });
}

function placeTile(board: number[][], x: number, y: number, value: number) {
  return board.map((row, rowIndex) => row.map((cell, columnIndex) => (
    rowIndex === y && columnIndex === x ? value : cell
  )));
}

function simulate(board: number[][], direction: number) {
  const next = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
  let gained = 0;

  for (let index = 0; index < boardSize; index += 1) {
    const values = readLine(board, index, direction).filter(Boolean);
    const line: number[] = [];

    for (let offset = 0; offset < values.length; offset += 1) {
      if (values[offset] === values[offset + 1]) {
        const merged = values[offset] * 2;
        line.push(merged);
        gained += merged;
        offset += 1;
      } else {
        line.push(values[offset]);
      }
    }

    while (line.length < boardSize) {
      line.push(0);
    }

    writeLine(next, index, direction, line);
  }

  return {
    board: next,
    gained,
    moved: board.some((row, y) => row.some((value, x) => value !== next[y][x]))
  };
}

function readLine(board: number[][], index: number, direction: number) {
  return Array.from({ length: boardSize }, (_, offset) => {
    if (direction === 0) return board[offset][index];
    if (direction === 1) return board[index][boardSize - 1 - offset];
    if (direction === 2) return board[boardSize - 1 - offset][index];
    return board[index][offset];
  });
}

function writeLine(board: number[][], index: number, direction: number, line: number[]) {
  line.forEach((value, offset) => {
    if (direction === 0) board[offset][index] = value;
    else if (direction === 1) board[index][boardSize - 1 - offset] = value;
    else if (direction === 2) board[boardSize - 1 - offset][index] = value;
    else board[index][offset] = value;
  });
}
