export type TileKind = "flame" | "tide" | "leaf" | "light" | "shadow" | "heart";
export type RuneStatus = "enhanced" | "cursed";

export interface BoardTile {
  id: number;
  kind: TileKind;
  status?: RuneStatus;
}

export interface MatchCascadeStep {
  boardBefore: BoardTile[];
  boardAfter: BoardTile[];
  matchedTileIds: number[];
  spawnedTileIds: number[];
  kindCounts: Record<TileKind, number>;
  matchedCount: number;
  comboCount: number;
  statusCounts: Record<RuneStatus, number>;
  enhancedKindCounts: Record<TileKind, number>;
}

export interface MatchResult {
  board: BoardTile[];
  spawnedTileIds: number[];
  cascadeSteps: MatchCascadeStep[];
  matchedCount: number;
  comboCount: number;
  kindCounts: Record<TileKind, number>;
  statusCounts: Record<RuneStatus, number>;
  enhancedKindCounts: Record<TileKind, number>;
}

export interface TunedShuffleResult {
  board: BoardTile[];
  highlightIds: number[];
  convertedIds: number[];
  movedIds: number[];
  immediateCombos: number;
  immediateMatched: number;
  productiveSwaps: number;
  preferredKind?: TileKind;
}

export const BOARD_COLS = 6;
export const BOARD_ROWS = 5;
export const BOARD_SIZE = BOARD_COLS * BOARD_ROWS;
export const TILE_KINDS: TileKind[] = ["flame", "tide", "leaf", "light", "shadow", "heart"];

let tileIdCounter = 0;

export function createRuneCountMap(): Record<TileKind, number> {
  return {
    flame: 0,
    tide: 0,
    leaf: 0,
    light: 0,
    shadow: 0,
    heart: 0,
  };
}

export function createRuneStatusCountMap(): Record<RuneStatus, number> {
  return {
    enhanced: 0,
    cursed: 0,
  };
}

export function createBoardTile(kind?: TileKind, status?: RuneStatus): BoardTile {
  return {
    id: tileIdCounter++,
    kind: kind || TILE_KINDS[Math.floor(Math.random() * TILE_KINDS.length)],
    ...(status ? { status } : {}),
  };
}

export function createRuneBoard(): BoardTile[] {
  const board: BoardTile[] = [];

  for (let index = 0; index < BOARD_SIZE; index++) {
    let kind = TILE_KINDS[Math.floor(Math.random() * TILE_KINDS.length)];
    const col = index % BOARD_COLS;

    while (
      (col >= 2 && board[index - 1]?.kind === kind && board[index - 2]?.kind === kind) ||
      (index >= BOARD_COLS * 2 && board[index - BOARD_COLS]?.kind === kind && board[index - BOARD_COLS * 2]?.kind === kind)
    ) {
      kind = TILE_KINDS[Math.floor(Math.random() * TILE_KINDS.length)];
    }

    board.push(createBoardTile(kind));
  }

  return board;
}

export function areAdjacentTiles(first: number, second: number): boolean {
  const firstCol = first % BOARD_COLS;
  const secondCol = second % BOARD_COLS;
  const sameRow = Math.floor(first / BOARD_COLS) === Math.floor(second / BOARD_COLS);
  return (sameRow && Math.abs(firstCol - secondCol) === 1) || Math.abs(first - second) === BOARD_COLS;
}

export function swapBoardTiles(board: BoardTile[], first: number, second: number): BoardTile[] {
  const nextBoard = [...board];
  [nextBoard[first], nextBoard[second]] = [nextBoard[second], nextBoard[first]];
  return nextBoard;
}

export function shuffleRuneBoard(board: BoardTile[]): BoardTile[] {
  return [...board].sort(() => Math.random() - 0.5);
}

function shuffleItems<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function uniqueIds(ids: number[]): number[] {
  return Array.from(new Set(ids));
}

function cloneWithoutCurse(tile: BoardTile): BoardTile {
  return tile.status === "cursed" ? { id: tile.id, kind: tile.kind } : { ...tile };
}

function getSetupLines(): number[][] {
  const lines: number[][] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col <= BOARD_COLS - 3; col++) {
      lines.push([row * BOARD_COLS + col, row * BOARD_COLS + col + 1, row * BOARD_COLS + col + 2]);
    }
  }

  for (let col = 0; col < BOARD_COLS; col++) {
    for (let row = 0; row <= BOARD_ROWS - 3; row++) {
      lines.push([row * BOARD_COLS + col, (row + 1) * BOARD_COLS + col, (row + 2) * BOARD_COLS + col]);
    }
  }

  return lines;
}

const SETUP_LINES = getSetupLines();

function chooseSetupKind(preferredKinds: TileKind[], attempt: number): TileKind {
  const attackKinds = TILE_KINDS.filter(kind => kind !== "heart");
  const preferredAttackKinds = preferredKinds.filter(kind => kind !== "heart");

  if (attempt % 6 === 0) return "heart";
  if (preferredAttackKinds.length > 0 && Math.random() < 0.68) {
    return preferredAttackKinds[Math.floor(Math.random() * preferredAttackKinds.length)];
  }

  return attackKinds[Math.floor(Math.random() * attackKinds.length)];
}

function seedMatchLine(
  board: BoardTile[],
  targetKind: TileKind,
  conversionsLeft: number
): { board: BoardTile[]; changedIds: number[]; conversionsUsed: number } {
  const rankedLines = SETUP_LINES
    .map(indexes => {
      const conversionsNeeded = indexes.filter(index => board[index].kind !== targetKind).length;
      const cursedClears = indexes.filter(index => board[index].status === "cursed").length;
      return {
        indexes,
        conversionsNeeded,
        score: (3 - conversionsNeeded) * 8 + cursedClears * 2 + Math.random(),
      };
    })
    .filter(line => line.conversionsNeeded <= conversionsLeft)
    .sort((a, b) => b.score - a.score);

  const chosen = rankedLines[0];
  if (!chosen) {
    return { board, changedIds: [], conversionsUsed: 0 };
  }

  const chosenIndexes = new Set(chosen.indexes);
  const changedIds: number[] = [];
  const nextBoard = board.map((tile, index) => {
    if (!chosenIndexes.has(index)) return tile;
    if (tile.kind === targetKind && tile.status !== "cursed") return tile;
    changedIds.push(tile.id);
    return tile.status === "cursed" ? { id: tile.id, kind: targetKind } : { ...tile, kind: targetKind };
  });

  return {
    board: nextBoard,
    changedIds,
    conversionsUsed: chosen.conversionsNeeded,
  };
}

function scoreBoardSetup(board: BoardTile[], preferredKinds: TileKind[]) {
  const preferred = new Set(preferredKinds);
  const immediate = findBoardMatches(board);
  let preferredImmediate = 0;
  let heartImmediate = 0;
  let enhancedImmediate = 0;
  let cursedImmediate = 0;

  immediate.matched.forEach(index => {
    const tile = board[index];
    if (preferred.has(tile.kind)) preferredImmediate++;
    if (tile.kind === "heart") heartImmediate++;
    if (tile.status === "enhanced") enhancedImmediate++;
    if (tile.status === "cursed") cursedImmediate++;
  });

  let productiveSwaps = 0;
  let bestSwapScore = 0;
  let preferredSwapHits = 0;

  for (let index = 0; index < BOARD_SIZE; index++) {
    const col = index % BOARD_COLS;
    const neighbors = [
      ...(col < BOARD_COLS - 1 ? [index + 1] : []),
      ...(index + BOARD_COLS < BOARD_SIZE ? [index + BOARD_COLS] : []),
    ];

    neighbors.forEach(neighbor => {
      const swapped = swapBoardTiles(board, index, neighbor);
      const swapMatch = findBoardMatches(swapped);
      if (swapMatch.matched.size === 0) return;

      productiveSwaps++;
      let swapPreferred = 0;
      swapMatch.matched.forEach(matchIndex => {
        if (preferred.has(swapped[matchIndex].kind)) swapPreferred++;
      });
      preferredSwapHits += swapPreferred;
      bestSwapScore = Math.max(bestSwapScore, swapMatch.comboCount * 16 + swapMatch.matched.size * 3 + swapPreferred * 5);
    });
  }

  const score =
    immediate.comboCount * 120 +
    immediate.matched.size * 16 +
    preferredImmediate * 18 +
    heartImmediate * 9 +
    enhancedImmediate * 12 -
    cursedImmediate * 16 +
    productiveSwaps * 5 +
    bestSwapScore * 2 +
    preferredSwapHits * 3;

  return {
    score,
    immediateCombos: immediate.comboCount,
    immediateMatched: immediate.matched.size,
    productiveSwaps,
  };
}

export function createTunedRuneShuffle(
  board: BoardTile[],
  preferredKinds: TileKind[] = []
): TunedShuffleResult {
  let bestBoard = board.map(cloneWithoutCurse);
  let bestChangedIds = board.filter(tile => tile.status === "cursed").map(tile => tile.id);
  let bestPreferredKind: TileKind | undefined;
  let bestStats = scoreBoardSetup(bestBoard, preferredKinds);
  let bestScore = bestStats.score;

  for (let attempt = 0; attempt < 54; attempt++) {
    let candidate = shuffleItems(board).map(cloneWithoutCurse);
    const changedIds = board.filter(tile => tile.status === "cursed").map(tile => tile.id);
    let conversionsLeft = 5;
    const primaryKind = chooseSetupKind(preferredKinds, attempt);

    const primarySeed = seedMatchLine(candidate, primaryKind, conversionsLeft);
    candidate = primarySeed.board;
    changedIds.push(...primarySeed.changedIds);
    conversionsLeft -= primarySeed.conversionsUsed;

    if (conversionsLeft >= 2 && Math.random() < 0.55) {
      const secondaryKind = chooseSetupKind(preferredKinds, attempt + 3);
      const secondarySeed = seedMatchLine(candidate, secondaryKind, conversionsLeft);
      candidate = secondarySeed.board;
      changedIds.push(...secondarySeed.changedIds);
    }

    const stats = scoreBoardSetup(candidate, preferredKinds);
    const preferredBonus = preferredKinds.includes(primaryKind) ? 25 : 0;
    const candidateScore = stats.score + preferredBonus + Math.random() * 6;

    if (candidateScore > bestScore) {
      bestBoard = candidate;
      bestChangedIds = uniqueIds(changedIds);
      bestPreferredKind = primaryKind;
      bestStats = stats;
      bestScore = candidateScore;
    }
  }

  const movedIds = bestBoard
    .filter((tile, index) => board[index]?.id !== tile.id)
    .map(tile => tile.id);
  const convertedIds = uniqueIds(bestChangedIds);

  return {
    board: bestBoard,
    highlightIds: uniqueIds([...movedIds, ...convertedIds]),
    convertedIds,
    movedIds,
    immediateCombos: bestStats.immediateCombos,
    immediateMatched: bestStats.immediateMatched,
    productiveSwaps: bestStats.productiveSwaps,
    preferredKind: bestPreferredKind,
  };
}

export function convertRandomRunes(board: BoardTile[], targetKind: TileKind, count: number): { board: BoardTile[]; changedIds: number[] } {
  const preferred = board
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => tile.kind !== targetKind && tile.kind !== "heart");
  const fallback = board
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => tile.kind !== targetKind && tile.kind === "heart");
  const chosen = shuffleItems([...preferred, ...fallback]).slice(0, count);
  const chosenIndexes = new Set(chosen.map(item => item.index));

  return {
    board: board.map((tile, index) => (
      chosenIndexes.has(index) ? { ...tile, kind: targetKind } : tile
    )),
    changedIds: chosen.map(item => item.tile.id),
  };
}

export function setRandomRuneStatus(
  board: BoardTile[],
  status: RuneStatus,
  count: number,
  options: { kind?: TileKind; excludeKinds?: TileKind[]; clearExisting?: boolean } = {}
): { board: BoardTile[]; changedIds: number[] } {
  const excluded = new Set(options.excludeKinds || []);
  const candidates = board
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => {
      if (excluded.has(tile.kind)) return false;
      if (options.kind && tile.kind !== options.kind) return false;
      return options.clearExisting || tile.status !== status;
    });
  const chosen = shuffleItems(candidates).slice(0, count);
  const chosenIndexes = new Set(chosen.map(item => item.index));

  return {
    board: board.map((tile, index) => (
      chosenIndexes.has(index) ? { ...tile, status } : tile
    )),
    changedIds: chosen.map(item => item.tile.id),
  };
}

export function clearRuneStatuses(
  board: BoardTile[],
  status?: RuneStatus,
  count = Number.POSITIVE_INFINITY
): { board: BoardTile[]; changedIds: number[] } {
  const candidates = board
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => tile.status && (!status || tile.status === status));
  const chosen = shuffleItems(candidates).slice(0, count);
  const chosenIndexes = new Set(chosen.map(item => item.index));

  return {
    board: board.map((tile, index) => (
      chosenIndexes.has(index)
        ? { id: tile.id, kind: tile.kind }
        : tile
    )),
    changedIds: chosen.map(item => item.tile.id),
  };
}

export function findBoardMatches(board: BoardTile[]) {
  const matched = new Set<number>();
  let comboCount = 0;

  for (let row = 0; row < BOARD_ROWS; row++) {
    let runStart = 0;
    for (let col = 1; col <= BOARD_COLS; col++) {
      const current = col < BOARD_COLS ? board[row * BOARD_COLS + col].kind : null;
      const previous = board[row * BOARD_COLS + col - 1].kind;
      if (current !== previous) {
        const runLength = col - runStart;
        if (runLength >= 3) {
          comboCount++;
          for (let runCol = runStart; runCol < col; runCol++) {
            matched.add(row * BOARD_COLS + runCol);
          }
        }
        runStart = col;
      }
    }
  }

  for (let col = 0; col < BOARD_COLS; col++) {
    let runStart = 0;
    for (let row = 1; row <= BOARD_ROWS; row++) {
      const current = row < BOARD_ROWS ? board[row * BOARD_COLS + col].kind : null;
      const previous = board[(row - 1) * BOARD_COLS + col].kind;
      if (current !== previous) {
        const runLength = row - runStart;
        if (runLength >= 3) {
          comboCount++;
          for (let runRow = runStart; runRow < row; runRow++) {
            matched.add(runRow * BOARD_COLS + col);
          }
        }
        runStart = row;
      }
    }
  }

  return { matched, comboCount };
}

export function collapseBoard(board: BoardTile[], matched: Set<number>): { board: BoardTile[]; spawnedTileIds: number[] } {
  const nextBoard = [...board];
  const spawnedTileIds: number[] = [];

  for (let col = 0; col < BOARD_COLS; col++) {
    const remaining: BoardTile[] = [];

    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      const index = row * BOARD_COLS + col;
      if (!matched.has(index)) {
        remaining.push(nextBoard[index]);
      }
    }

    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      const index = row * BOARD_COLS + col;
      const fallingTile = remaining.shift();
      if (fallingTile) {
        nextBoard[index] = fallingTile;
      } else {
        const newTile = createBoardTile();
        nextBoard[index] = newTile;
        spawnedTileIds.push(newTile.id);
      }
    }
  }

  return { board: nextBoard, spawnedTileIds };
}

export function resolveBoard(board: BoardTile[]): MatchResult {
  let nextBoard = [...board];
  const spawnedTileIds: number[] = [];
  const cascadeSteps: MatchCascadeStep[] = [];
  let matchedCount = 0;
  let comboCount = 0;
  const kindCounts = createRuneCountMap();
  const statusCounts = createRuneStatusCountMap();
  const enhancedKindCounts = createRuneCountMap();

  for (let cascade = 0; cascade < 8; cascade++) {
    const { matched, comboCount: cascadeCombos } = findBoardMatches(nextBoard);
    if (matched.size === 0) break;

    const stepKindCounts = createRuneCountMap();
    const stepStatusCounts = createRuneStatusCountMap();
    const stepEnhancedKindCounts = createRuneCountMap();
    const matchedTileIds: number[] = [];
    matched.forEach(index => {
      const tile = nextBoard[index];
      kindCounts[tile.kind]++;
      stepKindCounts[tile.kind]++;
      if (tile.status) {
        statusCounts[tile.status]++;
        stepStatusCounts[tile.status]++;
        if (tile.status === "enhanced") {
          enhancedKindCounts[tile.kind]++;
          stepEnhancedKindCounts[tile.kind]++;
        }
      }
      matchedTileIds.push(tile.id);
    });
    matchedCount += matched.size;
    comboCount += cascadeCombos;
    const collapsed = collapseBoard(nextBoard, matched);
    cascadeSteps.push({
      boardBefore: nextBoard,
      boardAfter: collapsed.board,
      matchedTileIds,
      spawnedTileIds: collapsed.spawnedTileIds,
      kindCounts: stepKindCounts,
      matchedCount: matched.size,
      comboCount: cascadeCombos,
      statusCounts: stepStatusCounts,
      enhancedKindCounts: stepEnhancedKindCounts,
    });
    nextBoard = collapsed.board;
    spawnedTileIds.push(...collapsed.spawnedTileIds);
  }

  return { board: nextBoard, spawnedTileIds, cascadeSteps, matchedCount, comboCount, kindCounts, statusCounts, enhancedKindCounts };
}

export function getPrimaryKindFromCounts(kindCounts: Record<TileKind, number>): TileKind {
  let bestKind: TileKind = "heart";
  let bestCount = 0;

  TILE_KINDS.forEach(kind => {
    if (kind === "heart") return;
    if (kindCounts[kind] > bestCount) {
      bestKind = kind;
      bestCount = kindCounts[kind];
    }
  });

  return bestCount > 0 ? bestKind : "heart";
}

export function getPrimaryRuneKind(result: MatchResult): TileKind {
  return getPrimaryKindFromCounts(result.kindCounts);
}
