export const BLOB_BOARD_ROWS = 4;
export const BLOB_BOARD_COLS = 5;

export type BlobStudyGrade = "bad" | "good" | "great";
export type BlobStickerType =
  | "move"
  | "slap"
  | "stretch"
  | "split"
  | "rejoin"
  | "spit"
  | "goo"
  | "bubble"
  | "sourSplit";
export type BlobletKind = "basic" | "bubble";
export type BlobTacticsPhase = "study" | "player" | "won" | "lost";
export type TileEffect = "goo";

export interface BlobPosition {
  row: number;
  col: number;
}

export interface BlobSticker {
  id: string;
  type: BlobStickerType;
  upgraded?: boolean;
  sour?: boolean;
}

export interface Bloblet {
  id: string;
  kind: BlobletKind;
  hp: number;
  turnsLeft: number;
  position: BlobPosition;
}

export interface ShellSlime {
  hp: number;
  maxHp: number;
  shell: number;
  maxShell: number;
  position: BlobPosition;
}

export interface BlobTileEffect {
  id: string;
  type: TileEffect;
  position: BlobPosition;
  turnsLeft: number;
}

export interface BlobTacticsNotice {
  id: number;
  title: string;
  detail: string;
  tone: "good" | "warn" | "plain";
}

export interface BlobTacticsState {
  turn: number;
  room: number;
  phase: BlobTacticsPhase;
  pipploHp: number;
  pipploMaxHp: number;
  mass: number;
  massMax: number;
  pipploPosition: BlobPosition;
  enemy: ShellSlime;
  bloblets: Bloblet[];
  tileEffects: BlobTileEffect[];
  hand: BlobSticker[];
  selectedStickerId: string | null;
  actionSourceId: string | null;
  notice: BlobTacticsNotice;
  nextId: number;
  lastStudyGrade: BlobStudyGrade | null;
  animation: "idle" | "pipplo" | "enemy" | "pop";
}

export interface BlobStudyResult {
  grade: BlobStudyGrade;
  stickerCount: number;
  massGain: number;
  upgradedCount: number;
  sourCount: number;
}

export interface BlobEnemyIntent {
  label: string;
  detail: string;
  tone: "move" | "attack" | "shell";
  targetId: string | null;
}

export const STICKER_INFO: Record<BlobStickerType, {
  name: string;
  shortName: string;
  description: string;
  accent: string;
  massCost: number;
}> = {
  move: {
    name: "Scoot",
    shortName: "Move",
    description: "Move Pipplo one tile.",
    accent: "#54bfb4",
    massCost: 0,
  },
  slap: {
    name: "Slap",
    shortName: "Slap",
    description: "Pipplo or a bloblet bops an adjacent enemy.",
    accent: "#ff866c",
    massCost: 0,
  },
  stretch: {
    name: "Stretch Slap",
    shortName: "Stretch",
    description: "Spend 1 Mass to slap up to two tiles away.",
    accent: "#ff7895",
    massCost: 1,
  },
  split: {
    name: "Split Bloblet",
    shortName: "Split",
    description: "Spend 2 Mass to bud off a temporary helper.",
    accent: "#a987e7",
    massCost: 2,
  },
  rejoin: {
    name: "Rejoin",
    shortName: "Rejoin",
    description: "Absorb an adjacent bloblet and recover 1 Mass.",
    accent: "#ffd84d",
    massCost: 0,
  },
  spit: {
    name: "Spit Chunk",
    shortName: "Spit",
    description: "Sacrifice a bloblet to crack Shell from range.",
    accent: "#f5aa49",
    massCost: 0,
  },
  goo: {
    name: "Goo Trail",
    shortName: "Goo",
    description: "Move a bloblet and leave slowing goo behind.",
    accent: "#82cf6b",
    massCost: 0,
  },
  bubble: {
    name: "Bubble Bud",
    shortName: "Bubble",
    description: "Spend 2 Mass to grow a one-hit shield bloblet.",
    accent: "#7bcff2",
    massCost: 2,
  },
  sourSplit: {
    name: "Sour Split",
    shortName: "Sour",
    description: "Grow a cheap bloblet. It melts after one enemy turn.",
    accent: "#d982ba",
    massCost: 1,
  },
};

const NORMAL_STICKER_POOL: BlobStickerType[] = [
  "move",
  "slap",
  "stretch",
  "split",
  "rejoin",
  "spit",
  "goo",
  "bubble",
];

const samePosition = (a: BlobPosition, b: BlobPosition) => a.row === b.row && a.col === b.col;
const distance = (a: BlobPosition, b: BlobPosition) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
const positionKey = (position: BlobPosition) => `${position.row}:${position.col}`;
const isInsideBoard = (position: BlobPosition) => (
  position.row >= 0
  && position.row < BLOB_BOARD_ROWS
  && position.col >= 0
  && position.col < BLOB_BOARD_COLS
);

const adjacentPositions = (position: BlobPosition): BlobPosition[] => [
  { row: position.row - 1, col: position.col },
  { row: position.row + 1, col: position.col },
  { row: position.row, col: position.col - 1 },
  { row: position.row, col: position.col + 1 },
].filter(isInsideBoard);

const withNotice = (
  state: BlobTacticsState,
  title: string,
  detail: string,
  tone: BlobTacticsNotice["tone"] = "plain",
): BlobTacticsState => ({
  ...state,
  notice: { id: state.notice.id + 1, title, detail, tone },
});

const makeSticker = (
  type: BlobStickerType,
  id: number,
  upgraded = false,
  sour = false,
): BlobSticker => ({ id: `sticker-${id}`, type, upgraded, sour });

const getStudyResult = (grade: BlobStudyGrade): BlobStudyResult => {
  if (grade === "great") return { grade, stickerCount: 4, massGain: 1, upgradedCount: 1, sourCount: 0 };
  if (grade === "bad") return { grade, stickerCount: 2, massGain: 0, upgradedCount: 0, sourCount: 1 };
  return { grade, stickerCount: 3, massGain: 1, upgradedCount: 0, sourCount: 0 };
};

export function createInitialBlobTacticsState(): BlobTacticsState {
  return {
    turn: 1,
    room: 1,
    phase: "study",
    pipploHp: 10,
    pipploMaxHp: 10,
    mass: 6,
    massMax: 8,
    pipploPosition: { row: 2, col: 0 },
    enemy: {
      hp: 12,
      maxHp: 12,
      shell: 5,
      maxShell: 5,
      position: { row: 1, col: 4 },
    },
    bloblets: [],
    tileEffects: [],
    hand: [],
    selectedStickerId: null,
    actionSourceId: null,
    notice: {
      id: 1,
      title: "Study simulation",
      detail: "Choose a study result to grow a sticker hand.",
      tone: "plain",
    },
    nextId: 10,
    lastStudyGrade: null,
    animation: "idle",
  };
}

export function createStickersFromStudyResult(
  result: BlobStudyResult,
  startingId: number,
): { stickers: BlobSticker[]; nextId: number } {
  let nextId = startingId;
  const stickers: BlobSticker[] = [];
  const offset = result.grade === "great" ? 2 : result.grade === "good" ? 0 : 4;
  for (let index = 0; index < result.stickerCount; index += 1) {
    const type = NORMAL_STICKER_POOL[(startingId + offset + (index * 3)) % NORMAL_STICKER_POOL.length];
    stickers.push(makeSticker(type, nextId, index < result.upgradedCount));
    nextId += 1;
  }
  for (let index = 0; index < result.sourCount; index += 1) {
    stickers.push(makeSticker("sourSplit", nextId, false, true));
    nextId += 1;
  }
  return { stickers, nextId };
}

export function applyFakeStudyResult(state: BlobTacticsState, grade: BlobStudyGrade): BlobTacticsState {
  if (state.phase === "won" || state.phase === "lost") return state;
  const result = getStudyResult(grade);
  const generated = createStickersFromStudyResult(result, state.nextId);
  return withNotice({
    ...state,
    phase: "player",
    mass: Math.min(state.massMax, state.mass + result.massGain),
    hand: generated.stickers,
    selectedStickerId: null,
    actionSourceId: null,
    nextId: generated.nextId,
    lastStudyGrade: grade,
  }, grade === "great" ? "Great study!" : grade === "good" ? "Good study" : "Messy study",
  grade === "bad"
    ? "Two regular stickers and one risky Sour Split appeared."
    : `${result.stickerCount} stickers appeared${result.massGain ? " and Pipplo recovered 1 Mass" : ""}.`,
  grade === "bad" ? "warn" : "good");
}

const isOccupied = (state: BlobTacticsState, position: BlobPosition) => (
  samePosition(state.pipploPosition, position)
  || samePosition(state.enemy.position, position)
  || state.bloblets.some(bloblet => samePosition(bloblet.position, position))
);

const getBloblet = (state: BlobTacticsState, id: string | null) => state.bloblets.find(bloblet => bloblet.id === id) || null;

const getSelectedSticker = (state: BlobTacticsState) => (
  state.hand.find(sticker => sticker.id === state.selectedStickerId) || null
);

const getSlapSources = (state: BlobTacticsState): string[] => {
  const sources: string[] = [];
  if (distance(state.pipploPosition, state.enemy.position) === 1) sources.push("pipplo");
  state.bloblets.forEach(bloblet => {
    if (distance(bloblet.position, state.enemy.position) === 1) sources.push(bloblet.id);
  });
  return sources;
};

export function getValidTargetKeys(state: BlobTacticsState): Set<string> {
  const sticker = getSelectedSticker(state);
  if (!sticker || state.phase !== "player") return new Set();
  const keys = new Set<string>();
  const addEmptyAdjacent = (position: BlobPosition) => {
    adjacentPositions(position).forEach(target => {
      if (!isOccupied(state, target)) keys.add(positionKey(target));
    });
  };

  if (sticker.type === "move") addEmptyAdjacent(state.pipploPosition);
  if (sticker.type === "split" || sticker.type === "bubble" || sticker.type === "sourSplit") {
    if (state.mass >= STICKER_INFO[sticker.type].massCost) addEmptyAdjacent(state.pipploPosition);
  }
  if (sticker.type === "rejoin") {
    state.bloblets
      .filter(bloblet => distance(bloblet.position, state.pipploPosition) === 1)
      .forEach(bloblet => keys.add(positionKey(bloblet.position)));
  }
  if (sticker.type === "stretch" && state.mass >= STICKER_INFO.stretch.massCost && distance(state.pipploPosition, state.enemy.position) <= 2) {
    keys.add(positionKey(state.enemy.position));
  }
  if (sticker.type === "slap") {
    if (!state.actionSourceId) {
      getSlapSources(state).forEach(sourceId => {
        keys.add(positionKey(sourceId === "pipplo" ? state.pipploPosition : getBloblet(state, sourceId)!.position));
      });
    } else {
      keys.add(positionKey(state.enemy.position));
    }
  }
  if (sticker.type === "spit") {
    if (!state.actionSourceId) {
      state.bloblets.forEach(bloblet => keys.add(positionKey(bloblet.position)));
    } else if (getBloblet(state, state.actionSourceId) && distance(getBloblet(state, state.actionSourceId)!.position, state.enemy.position) <= 3) {
      keys.add(positionKey(state.enemy.position));
    }
  }
  if (sticker.type === "goo") {
    if (!state.actionSourceId) {
      state.bloblets.forEach(bloblet => keys.add(positionKey(bloblet.position)));
    } else {
      const source = getBloblet(state, state.actionSourceId);
      if (source) addEmptyAdjacent(source.position);
    }
  }
  return keys;
}

export function getStickerDisabledReason(state: BlobTacticsState, sticker: BlobSticker): string | null {
  if (state.phase !== "player") return "Finish studying first.";
  const cost = STICKER_INFO[sticker.type].massCost;
  if (state.mass < cost) return `Needs ${cost} Mass.`;
  if ((sticker.type === "spit" || sticker.type === "goo") && state.bloblets.length === 0) return "Needs a bloblet.";
  if (sticker.type === "rejoin" && !state.bloblets.some(bloblet => distance(bloblet.position, state.pipploPosition) === 1)) return "No adjacent bloblet.";
  if (sticker.type === "stretch" && distance(state.pipploPosition, state.enemy.position) > 2) return "Enemy is too far away.";
  if (sticker.type === "slap" && getSlapSources(state).length === 0) return "Nobody can reach the enemy.";
  return null;
}

export function selectSticker(state: BlobTacticsState, stickerId: string): BlobTacticsState {
  const sticker = state.hand.find(entry => entry.id === stickerId);
  if (!sticker) return state;
  const reason = getStickerDisabledReason(state, sticker);
  if (reason) return withNotice(state, STICKER_INFO[sticker.type].name, reason, "warn");
  return {
    ...state,
    selectedStickerId: state.selectedStickerId === stickerId ? null : stickerId,
    actionSourceId: null,
  };
}

const consumeSelectedSticker = (state: BlobTacticsState): BlobTacticsState => ({
  ...state,
  hand: state.hand.filter(sticker => sticker.id !== state.selectedStickerId),
  selectedStickerId: null,
  actionSourceId: null,
});

const dealDamageToEnemy = (state: BlobTacticsState, damage: number, shellDamage: number, title: string): BlobTacticsState => {
  const shellHit = Math.min(state.enemy.shell, shellDamage);
  const nextShell = state.enemy.shell - shellHit;
  const hpDamage = state.enemy.shell === 0 ? damage : Math.max(0, damage - shellHit);
  const nextHp = Math.max(0, state.enemy.hp - hpDamage);
  const defeated = nextHp === 0;
  return withNotice({
    ...state,
    phase: defeated ? "won" : state.phase,
    enemy: { ...state.enemy, shell: nextShell, hp: nextHp },
    animation: defeated ? "pop" : "enemy",
  }, title, defeated
    ? "Shell Slime wobbled apart. Room cleared!"
    : `${shellHit ? `${shellHit} Shell cracked. ` : ""}${hpDamage ? `${hpDamage} damage landed.` : "Its Shell softened the hit."}`,
  defeated ? "good" : "plain");
};

const useStickerAt = (state: BlobTacticsState, target: BlobPosition): BlobTacticsState => {
  const sticker = getSelectedSticker(state);
  if (!sticker) return state;
  const info = STICKER_INFO[sticker.type];
  const damageBonus = sticker.upgraded ? 1 : 0;
  let next = consumeSelectedSticker({ ...state, mass: Math.max(0, state.mass - info.massCost) });

  if (sticker.type === "move") {
    return withNotice({ ...next, pipploPosition: target, animation: "pipplo" }, "Scoot", "Pipplo bounced into position.", "good");
  }
  if (sticker.type === "split" || sticker.type === "bubble" || sticker.type === "sourSplit") {
    const bloblet: Bloblet = {
      id: `bloblet-${state.nextId}`,
      kind: sticker.type === "bubble" ? "bubble" : "basic",
      hp: 1,
      turnsLeft: sticker.type === "sourSplit" ? 1 : 2,
      position: target,
    };
    return withNotice({
      ...next,
      bloblets: [...state.bloblets, bloblet],
      nextId: state.nextId + 1,
      animation: "pipplo",
    }, info.name, sticker.type === "bubble"
      ? "A shielding Bubble Bud popped into place."
      : sticker.type === "sourSplit"
        ? "A fragile sour bloblet wobbled free."
        : "Pipplo budded off a temporary helper.",
    sticker.sour ? "warn" : "good");
  }
  if (sticker.type === "rejoin") {
    const absorbed = state.bloblets.find(bloblet => samePosition(bloblet.position, target));
    if (!absorbed) return state;
    return withNotice({
      ...next,
      mass: Math.min(state.massMax, next.mass + 1),
      bloblets: state.bloblets.filter(bloblet => bloblet.id !== absorbed.id),
      animation: "pipplo",
    }, "Rejoin", "Pipplo slurped the bloblet back up and recovered 1 Mass.", "good");
  }
  if (sticker.type === "stretch") {
    return dealDamageToEnemy(next, 1 + damageBonus, 2 + damageBonus, "Stretch Slap");
  }
  if (sticker.type === "slap") {
    const sourceIsPipplo = state.actionSourceId === "pipplo";
    return dealDamageToEnemy(next, (sourceIsPipplo ? 2 : 1) + damageBonus, 1 + damageBonus, sourceIsPipplo ? "Pipplo Slap" : "Bloblet Slap");
  }
  if (sticker.type === "spit") {
    const source = getBloblet(state, state.actionSourceId);
    if (!source) return state;
    next = { ...next, bloblets: state.bloblets.filter(bloblet => bloblet.id !== source.id) };
    return dealDamageToEnemy(next, 3 + damageBonus, 4 + damageBonus, "Spit Chunk");
  }
  if (sticker.type === "goo") {
    const source = getBloblet(state, state.actionSourceId);
    if (!source) return state;
    return withNotice({
      ...next,
      bloblets: state.bloblets.map(bloblet => bloblet.id === source.id ? { ...bloblet, position: target } : bloblet),
      tileEffects: [
        ...state.tileEffects.filter(effect => !samePosition(effect.position, source.position)),
        { id: `goo-${state.nextId}`, type: "goo", position: source.position, turnsLeft: 2 },
      ],
      nextId: state.nextId + 1,
      animation: "pipplo",
    }, "Goo Trail", "The bloblet scooted away and left sticky goo behind.", "good");
  }
  return next;
};

export function tapBoardTile(state: BlobTacticsState, target: BlobPosition): BlobTacticsState {
  const sticker = getSelectedSticker(state);
  if (!sticker) return withNotice(state, "Pick a sticker", "Choose a sticker, then tap a highlighted tile.", "plain");
  const validKeys = getValidTargetKeys(state);
  if (!validKeys.has(positionKey(target))) return state;

  if (!state.actionSourceId && (sticker.type === "slap" || sticker.type === "spit" || sticker.type === "goo")) {
    const sourceIsPipplo = samePosition(state.pipploPosition, target);
    const sourceBloblet = state.bloblets.find(bloblet => samePosition(bloblet.position, target));
    const sourceId = sourceIsPipplo ? "pipplo" : sourceBloblet?.id;
    if (!sourceId) return state;
    return withNotice({ ...state, actionSourceId: sourceId }, STICKER_INFO[sticker.type].name,
      sticker.type === "goo" ? "Now tap an empty neighboring tile." : "Now tap Shell Slime.", "plain");
  }
  return useStickerAt(state, target);
}

const getEnemyTarget = (state: BlobTacticsState): { id: string; position: BlobPosition } => {
  const adjacentBloblet = state.bloblets.find(bloblet => distance(bloblet.position, state.enemy.position) === 1);
  if (adjacentBloblet) return { id: adjacentBloblet.id, position: adjacentBloblet.position };
  return { id: "pipplo", position: state.pipploPosition };
};

export function getEnemyIntent(state: BlobTacticsState): BlobEnemyIntent {
  if (state.phase === "won") return { label: "Wobbling apart", detail: "The room is clear.", tone: "shell", targetId: null };
  const target = getEnemyTarget(state);
  if (distance(target.position, state.enemy.position) === 1) {
    return {
      label: target.id === "pipplo" ? "Slam Pipplo" : "Pop bloblet",
      detail: target.id === "pipplo" ? "Shell Slime will deal 2 HP." : "Shell Slime will remove the nearby helper.",
      tone: "attack",
      targetId: target.id,
    };
  }
  return {
    label: "Waddle closer",
    detail: "Shell Slime will move one tile toward Pipplo.",
    tone: "move",
    targetId: "pipplo",
  };
}

const chooseEnemyStep = (state: BlobTacticsState): BlobPosition => {
  const options = adjacentPositions(state.enemy.position)
    .filter(position => !samePosition(position, state.pipploPosition))
    .filter(position => !state.bloblets.some(bloblet => samePosition(bloblet.position, position)))
    .sort((a, b) => distance(a, state.pipploPosition) - distance(b, state.pipploPosition));
  return options[0] || state.enemy.position;
};

const ageBloblets = (state: BlobTacticsState): BlobTacticsState => {
  const surviving = state.bloblets
    .map(bloblet => ({ ...bloblet, turnsLeft: bloblet.turnsLeft - 1 }))
    .filter(bloblet => bloblet.turnsLeft > 0);
  const melted = state.bloblets.length - surviving.length;
  return {
    ...state,
    bloblets: surviving,
    tileEffects: state.tileEffects
      .map(effect => ({ ...effect, turnsLeft: effect.turnsLeft - 1 }))
      .filter(effect => effect.turnsLeft > 0),
    notice: melted > 0
      ? { id: state.notice.id + 1, title: "Bloblet melted", detail: `${melted} temporary helper${melted === 1 ? "" : "s"} dissolved.`, tone: "warn" }
      : state.notice,
  };
};

export function endBlobTacticsTurn(state: BlobTacticsState): BlobTacticsState {
  if (state.phase !== "player") return state;
  const intent = getEnemyIntent(state);
  let next: BlobTacticsState = {
    ...state,
    selectedStickerId: null,
    actionSourceId: null,
    hand: [],
    animation: "enemy",
  };

  if (intent.tone === "attack" && intent.targetId) {
    if (intent.targetId === "pipplo") {
      const nextHp = Math.max(0, next.pipploHp - 2);
      next = withNotice({ ...next, pipploHp: nextHp, phase: nextHp === 0 ? "lost" : "study" },
        nextHp === 0 ? "Pipplo flattened" : "Shell Slime slammed!",
        nextHp === 0 ? "The experiment is over. Pipplo needs another try." : "Pipplo lost 2 HP. Study again to make a new sticker hand.",
        "warn");
    } else {
      const target = next.bloblets.find(bloblet => bloblet.id === intent.targetId);
      next = withNotice({
        ...next,
        phase: "study",
        bloblets: next.bloblets.filter(bloblet => bloblet.id !== intent.targetId),
      }, target?.kind === "bubble" ? "Bubble Bud blocked it!" : "Bloblet popped!",
      target?.kind === "bubble" ? "The shield helper absorbed Shell Slime's hit." : "The helper protected Pipplo from the slam.",
      target?.kind === "bubble" ? "good" : "warn");
    }
  } else {
    const step = chooseEnemyStep(next);
    const goo = next.tileEffects.find(effect => samePosition(effect.position, step));
    next = withNotice({
      ...next,
      phase: "study",
      enemy: { ...next.enemy, position: goo ? next.enemy.position : step },
      tileEffects: goo ? next.tileEffects.filter(effect => effect.id !== goo.id) : next.tileEffects,
    }, goo ? "Shell Slime got stuck" : "Shell Slime waddled closer",
    goo ? "Sticky goo slowed its advance and dissolved." : "Its next intent is now visible.",
    goo ? "good" : "plain");
  }

  if (next.phase !== "lost") next = ageBloblets(next);
  return { ...next, turn: next.turn + 1 };
}

export function getBoardTileKey(position: BlobPosition): string {
  return positionKey(position);
}

export function getBlobletAt(state: BlobTacticsState, position: BlobPosition): Bloblet | null {
  return state.bloblets.find(bloblet => samePosition(bloblet.position, position)) || null;
}

export function getTileEffectAt(state: BlobTacticsState, position: BlobPosition): BlobTileEffect | null {
  return state.tileEffects.find(effect => samePosition(effect.position, position)) || null;
}

export function isPipploAt(state: BlobTacticsState, position: BlobPosition): boolean {
  return samePosition(state.pipploPosition, position);
}

export function isEnemyAt(state: BlobTacticsState, position: BlobPosition): boolean {
  return samePosition(state.enemy.position, position);
}
