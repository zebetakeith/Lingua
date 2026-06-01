export const BLOB_BOARD_ROWS = 4;
export const BLOB_BOARD_COLS = 5;
export const BLOB_RUN_ROOMS = 5;

export type BlobStudyGrade = "bad" | "good" | "great";
export type BlobStickerType =
  | "move"
  | "hop"
  | "slap"
  | "stretch"
  | "bellyFlop"
  | "split"
  | "rejoin"
  | "spit"
  | "goo"
  | "bubble"
  | "sourSplit";
export type BlobletKind = "basic" | "bubble";
export type BlobEnemyKind = "shellSlime" | "nibbleImp" | "sporeBud" | "rootLump";
export type BlobMutationId =
  | "plumpCore"
  | "springFeet"
  | "stickySkin"
  | "bubbleWrap"
  | "sharpCheeks"
  | "studySnacks";
export type BlobTacticsPhase = "study" | "player" | "reward" | "won" | "lost";
export type TileEffect = "goo" | "spore";

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

export interface BlobEnemy {
  kind: BlobEnemyKind;
  name: string;
  hp: number;
  maxHp: number;
  shell: number;
  maxShell: number;
  attack: number;
  moveRange: number;
  position: BlobPosition;
  boss?: boolean;
  enraged?: boolean;
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
  roomsCleared: number;
  phase: BlobTacticsPhase;
  pipploHp: number;
  pipploMaxHp: number;
  mass: number;
  massMax: number;
  pipploPosition: BlobPosition;
  enemy: BlobEnemy;
  bloblets: Bloblet[];
  tileEffects: BlobTileEffect[];
  hand: BlobSticker[];
  selectedStickerId: string | null;
  actionSourceId: string | null;
  notice: BlobTacticsNotice;
  nextId: number;
  lastStudyGrade: BlobStudyGrade | null;
  animation: "idle" | "pipplo" | "enemy" | "pop";
  mutations: BlobMutationId[];
  rewardChoices: BlobMutationId[];
  absorbedEnemies: BlobEnemyKind[];
  springFeetUsedThisRoom: boolean;
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
  tone: "move" | "attack" | "shell" | "hazard";
  targetId: string | null;
}

export interface BlobMutationDef {
  id: BlobMutationId;
  name: string;
  description: string;
  accent: string;
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
  hop: {
    name: "Long Scoot",
    shortName: "Hop",
    description: "Bounce Pipplo up to two tiles away.",
    accent: "#45b4d1",
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
  bellyFlop: {
    name: "Belly Flop",
    shortName: "Flop",
    description: "Spend 1 Mass for a heavy adjacent Pipplo hit.",
    accent: "#ef6d57",
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
    description: "Absorb an adjacent bloblet and recover Mass.",
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

export const MUTATION_DEFS: Record<BlobMutationId, BlobMutationDef> = {
  plumpCore: {
    id: "plumpCore",
    name: "Plump Core",
    description: "+2 maximum Mass and immediately recover 2 Mass.",
    accent: "#a987e7",
  },
  springFeet: {
    id: "springFeet",
    name: "Spring Feet",
    description: "Long Scoot also restores 1 HP the first time each room.",
    accent: "#45b4d1",
  },
  stickySkin: {
    id: "stickySkin",
    name: "Sticky Skin",
    description: "Goo Trail puddles last longer and stop two advances.",
    accent: "#82cf6b",
  },
  bubbleWrap: {
    id: "bubbleWrap",
    name: "Bubble Wrap",
    description: "Bubble Buds survive one extra enemy turn.",
    accent: "#7bcff2",
  },
  sharpCheeks: {
    id: "sharpCheeks",
    name: "Sharp Cheeks",
    description: "Pipplo's direct hits deal +1 HP damage.",
    accent: "#ff866c",
  },
  studySnacks: {
    id: "studySnacks",
    name: "Study Snacks",
    description: "Good and Great study hands restore 1 additional Mass.",
    accent: "#ffd84d",
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
  "hop",
  "bellyFlop",
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
  if (grade === "great") return { grade, stickerCount: 5, massGain: 1, upgradedCount: 1, sourCount: 0 };
  if (grade === "bad") return { grade, stickerCount: 3, massGain: 0, upgradedCount: 0, sourCount: 1 };
  return { grade, stickerCount: 4, massGain: 1, upgradedCount: 0, sourCount: 0 };
};

const createEnemyForRoom = (room: number): BlobEnemy => {
  if (room === 2) {
    return {
      kind: "nibbleImp",
      name: "Nibble Imp",
      hp: 9,
      maxHp: 9,
      shell: 0,
      maxShell: 0,
      attack: 1,
      moveRange: 2,
      position: { row: 1, col: 4 },
    };
  }
  if (room === 3) {
    return {
      kind: "sporeBud",
      name: "Spore Bud",
      hp: 11,
      maxHp: 11,
      shell: 0,
      maxShell: 0,
      attack: 1,
      moveRange: 1,
      position: { row: 0, col: 4 },
    };
  }
  if (room === 4) {
    return {
      kind: "shellSlime",
      name: "Shell Slime Duo",
      hp: 15,
      maxHp: 15,
      shell: 7,
      maxShell: 7,
      attack: 2,
      moveRange: 1,
      position: { row: 1, col: 4 },
    };
  }
  if (room === 5) {
    return {
      kind: "rootLump",
      name: "Root Lump",
      hp: 22,
      maxHp: 22,
      shell: 4,
      maxShell: 4,
      attack: 3,
      moveRange: 1,
      position: { row: 1, col: 4 },
      boss: true,
    };
  }
  return {
    kind: "shellSlime",
    name: "Shell Slime",
    hp: 12,
    maxHp: 12,
    shell: 5,
    maxShell: 5,
    attack: 2,
    moveRange: 1,
    position: { row: 1, col: 4 },
  };
};

export function createInitialBlobTacticsState(): BlobTacticsState {
  return {
    turn: 1,
    room: 1,
    roomsCleared: 0,
    phase: "study",
    pipploHp: 10,
    pipploMaxHp: 10,
    mass: 6,
    massMax: 8,
    pipploPosition: { row: 2, col: 0 },
    enemy: createEnemyForRoom(1),
    bloblets: [],
    tileEffects: [],
    hand: [],
    selectedStickerId: null,
    actionSourceId: null,
    notice: {
      id: 1,
      title: "Room 1: crack the Shell",
      detail: "Study to grow a sticker hand. Spit Chunk is especially good at breaking Shell.",
      tone: "plain",
    },
    nextId: 10,
    lastStudyGrade: null,
    animation: "idle",
    mutations: [],
    rewardChoices: [],
    absorbedEnemies: [],
    springFeetUsedThisRoom: false,
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
  if (state.phase !== "study") return state;
  const result = getStudyResult(grade);
  const generated = createStickersFromStudyResult(result, state.nextId);
  const snackBonus = grade !== "bad" && state.mutations.includes("studySnacks") ? 1 : 0;
  const massGain = result.massGain + snackBonus;
  return withNotice({
    ...state,
    phase: "player",
    mass: Math.min(state.massMax, state.mass + massGain),
    hand: generated.stickers,
    selectedStickerId: null,
    actionSourceId: null,
    nextId: generated.nextId,
    lastStudyGrade: grade,
  }, grade === "great" ? "Great study!" : grade === "good" ? "Good study" : "Messy study",
  grade === "bad"
    ? "Three regular stickers and one risky Sour Split appeared."
    : `${result.stickerCount} stickers appeared${massGain ? ` and Pipplo recovered ${massGain} Mass` : ""}.`,
  grade === "bad" ? "warn" : "good");
}

const isOccupied = (state: BlobTacticsState, position: BlobPosition) => (
  samePosition(state.pipploPosition, position)
  || samePosition(state.enemy.position, position)
  || state.bloblets.some(bloblet => samePosition(bloblet.position, position))
);

const getBloblet = (state: BlobTacticsState, id: string | null) => state.bloblets.find(bloblet => bloblet.id === id) || null;
const getSelectedSticker = (state: BlobTacticsState) => state.hand.find(sticker => sticker.id === state.selectedStickerId) || null;

const getSlapSources = (state: BlobTacticsState): string[] => {
  const sources: string[] = [];
  if (distance(state.pipploPosition, state.enemy.position) === 1) sources.push("pipplo");
  state.bloblets.forEach(bloblet => {
    if (distance(bloblet.position, state.enemy.position) === 1) sources.push(bloblet.id);
  });
  return sources;
};

const getEmptyTargetsWithin = (state: BlobTacticsState, source: BlobPosition, range: number): BlobPosition[] => {
  const targets: BlobPosition[] = [];
  for (let row = 0; row < BLOB_BOARD_ROWS; row += 1) {
    for (let col = 0; col < BLOB_BOARD_COLS; col += 1) {
      const position = { row, col };
      if (distance(source, position) > 0 && distance(source, position) <= range && !isOccupied(state, position)) targets.push(position);
    }
  }
  return targets;
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
  if (sticker.type === "hop") getEmptyTargetsWithin(state, state.pipploPosition, 2).forEach(target => keys.add(positionKey(target)));
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
  if (sticker.type === "bellyFlop" && state.mass >= STICKER_INFO.bellyFlop.massCost && distance(state.pipploPosition, state.enemy.position) === 1) {
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
  if (sticker.type === "bellyFlop" && distance(state.pipploPosition, state.enemy.position) !== 1) return "Pipplo must be beside the enemy.";
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

const getRewardChoices = (state: BlobTacticsState): BlobMutationId[] => {
  const available = (Object.keys(MUTATION_DEFS) as BlobMutationId[]).filter(id => !state.mutations.includes(id));
  const offset = (state.room * 2) % Math.max(1, available.length);
  return Array.from({ length: Math.min(3, available.length) }, (_, index) => available[(offset + index) % available.length]);
};

const dealDamageToEnemy = (state: BlobTacticsState, damage: number, shellDamage: number, title: string): BlobTacticsState => {
  const shellHit = Math.min(state.enemy.shell, shellDamage);
  const nextShell = state.enemy.shell - shellHit;
  const hpDamage = state.enemy.shell === 0 ? damage : Math.max(0, damage - shellHit);
  const nextHp = Math.max(0, state.enemy.hp - hpDamage);
  const defeated = nextHp === 0;
  const roomsCleared = defeated ? state.roomsCleared + 1 : state.roomsCleared;
  const finalRoom = defeated && state.room >= BLOB_RUN_ROOMS;
  return withNotice({
    ...state,
    roomsCleared,
    phase: finalRoom ? "won" : defeated ? "reward" : state.phase,
    enemy: { ...state.enemy, shell: nextShell, hp: nextHp },
    rewardChoices: defeated && !finalRoom ? getRewardChoices(state) : [],
    absorbedEnemies: defeated ? [...state.absorbedEnemies, state.enemy.kind] : state.absorbedEnemies,
    hand: defeated ? [] : state.hand,
    selectedStickerId: defeated ? null : state.selectedStickerId,
    actionSourceId: defeated ? null : state.actionSourceId,
    animation: defeated ? "pop" : "enemy",
  }, title, defeated
    ? `${state.enemy.name} wobbled apart. Pipplo absorbed the leftovers!`
    : `${shellHit ? `${shellHit} Shell cracked. ` : ""}${hpDamage ? `${hpDamage} damage landed.` : "Its Shell softened the hit."}`,
  defeated ? "good" : "plain");
};

const consumeSporeAt = (state: BlobTacticsState, position: BlobPosition): BlobTacticsState => {
  const spore = state.tileEffects.find(effect => effect.type === "spore" && samePosition(effect.position, position));
  if (!spore) return state;
  const nextHp = Math.max(0, state.pipploHp - 1);
  return withNotice({
    ...state,
    pipploHp: nextHp,
    phase: nextHp === 0 ? "lost" : state.phase,
    tileEffects: state.tileEffects.filter(effect => effect.id !== spore.id),
  }, "Pipplo stepped on spores", nextHp === 0 ? "The prickly patch flattened Pipplo." : "Pipplo lost 1 HP.", "warn");
};

const useStickerAt = (state: BlobTacticsState, target: BlobPosition): BlobTacticsState => {
  const sticker = getSelectedSticker(state);
  if (!sticker) return state;
  const info = STICKER_INFO[sticker.type];
  const damageBonus = sticker.upgraded ? 1 : 0;
  const pipploDamageBonus = state.mutations.includes("sharpCheeks") ? 1 : 0;
  let next = consumeSelectedSticker({ ...state, mass: Math.max(0, state.mass - info.massCost) });

  if (sticker.type === "move" || sticker.type === "hop") {
    const healed = sticker.type === "hop" && state.mutations.includes("springFeet") && !state.springFeetUsedThisRoom;
    next = consumeSporeAt({
      ...next,
      pipploPosition: target,
      pipploHp: healed ? Math.min(state.pipploMaxHp, state.pipploHp + 1) : state.pipploHp,
      springFeetUsedThisRoom: healed ? true : state.springFeetUsedThisRoom,
      animation: "pipplo",
    }, target);
    return withNotice(next, sticker.type === "hop" ? "Long Scoot" : "Scoot",
      healed ? "Pipplo bounced into position and Spring Feet restored 1 HP." : "Pipplo bounced into position.",
      "good");
  }
  if (sticker.type === "split" || sticker.type === "bubble" || sticker.type === "sourSplit") {
    const extraBubbleTurn = sticker.type === "bubble" && state.mutations.includes("bubbleWrap") ? 1 : 0;
    const bloblet: Bloblet = {
      id: `bloblet-${state.nextId}`,
      kind: sticker.type === "bubble" ? "bubble" : "basic",
      hp: 1,
      turnsLeft: sticker.type === "sourSplit" ? 1 : 2 + extraBubbleTurn,
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
    const recoveredMass = sticker.upgraded ? 2 : 1;
    return withNotice({
      ...next,
      mass: Math.min(state.massMax, next.mass + recoveredMass),
      bloblets: state.bloblets.filter(bloblet => bloblet.id !== absorbed.id),
      animation: "pipplo",
    }, "Rejoin", `Pipplo slurped the bloblet back up and recovered ${recoveredMass} Mass.`, "good");
  }
  if (sticker.type === "stretch") return dealDamageToEnemy(next, 1 + damageBonus + pipploDamageBonus, 2 + damageBonus, "Stretch Slap");
  if (sticker.type === "bellyFlop") return dealDamageToEnemy(next, 3 + damageBonus + pipploDamageBonus, 2 + damageBonus, "Belly Flop");
  if (sticker.type === "slap") {
    const sourceIsPipplo = state.actionSourceId === "pipplo";
    return dealDamageToEnemy(next, (sourceIsPipplo ? 2 + pipploDamageBonus : 1) + damageBonus, 1 + damageBonus, sourceIsPipplo ? "Pipplo Slap" : "Bloblet Slap");
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
        {
          id: `goo-${state.nextId}`,
          type: "goo",
          position: source.position,
          turnsLeft: state.mutations.includes("stickySkin") ? 4 : 2,
        },
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
      sticker.type === "goo" ? "Now tap an empty neighboring tile." : `Now tap ${state.enemy.name}.`, "plain");
  }
  return useStickerAt(state, target);
}

const getEnemyTarget = (state: BlobTacticsState): { id: string; position: BlobPosition } => {
  const adjacentBloblet = state.bloblets.find(bloblet => distance(bloblet.position, state.enemy.position) === 1);
  if (adjacentBloblet) return { id: adjacentBloblet.id, position: adjacentBloblet.position };
  return { id: "pipplo", position: state.pipploPosition };
};

const getSporeTarget = (state: BlobTacticsState): BlobPosition => {
  const candidates = adjacentPositions(state.pipploPosition)
    .filter(position => !isOccupied(state, position))
    .filter(position => !state.tileEffects.some(effect => samePosition(effect.position, position)));
  return candidates[0] || state.pipploPosition;
};

export function getEnemyIntent(state: BlobTacticsState): BlobEnemyIntent {
  if (state.phase === "reward" || state.phase === "won") return { label: "Absorbed", detail: "The room is clear.", tone: "shell", targetId: null };
  const target = getEnemyTarget(state);
  const targetDistance = distance(target.position, state.enemy.position);
  if (state.enemy.kind === "sporeBud" && state.turn % 2 === 0 && targetDistance > 1) {
    return { label: "Scatter spores", detail: "A prickly patch will appear near Pipplo.", tone: "hazard", targetId: null };
  }
  if (state.enemy.kind === "rootLump" && state.turn % 2 === 0 && targetDistance > 1) {
    return { label: "Root sprout", detail: "Root Lump will grow a prickly patch near Pipplo.", tone: "hazard", targetId: null };
  }
  if (targetDistance === 1) {
    return {
      label: target.id === "pipplo" ? (state.enemy.kind === "nibbleImp" ? "Nibble Pipplo" : "Slam Pipplo") : "Pop bloblet",
      detail: target.id === "pipplo" ? `${state.enemy.name} will deal ${state.enemy.attack} HP.` : `${state.enemy.name} will remove the nearby helper.`,
      tone: "attack",
      targetId: target.id,
    };
  }
  if (state.enemy.kind === "nibbleImp" && targetDistance <= 3) {
    return { label: "Pounce", detail: "Nibble Imp will dash closer and deal 1 HP if it reaches Pipplo.", tone: "attack", targetId: "pipplo" };
  }
  return {
    label: state.enemy.kind === "nibbleImp" ? "Skitter closer" : state.enemy.kind === "rootLump" ? "Stomp closer" : "Waddle closer",
    detail: `${state.enemy.name} will move ${state.enemy.moveRange === 1 ? "one tile" : "up to two tiles"} toward Pipplo.`,
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

const moveEnemyTowardPipplo = (state: BlobTacticsState, steps: number): { state: BlobTacticsState; stuck: boolean } => {
  let next = state;
  let stuck = false;
  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
    if (distance(next.enemy.position, next.pipploPosition) <= 1) break;
    const step = chooseEnemyStep(next);
    if (samePosition(step, next.enemy.position)) break;
    const goo = next.tileEffects.find(effect => effect.type === "goo" && samePosition(effect.position, step));
    if (goo) {
      stuck = true;
      next = {
        ...next,
        tileEffects: next.tileEffects
          .map(effect => effect.id === goo.id ? { ...effect, turnsLeft: effect.turnsLeft - 2 } : effect)
          .filter(effect => effect.turnsLeft > 0),
      };
      break;
    }
    next = { ...next, enemy: { ...next.enemy, position: step } };
    if (distance(next.enemy.position, next.pipploPosition) <= 1) break;
  }
  return { state: next, stuck };
};

const ageTemporaryEffects = (state: BlobTacticsState): BlobTacticsState => {
  const survivingBloblets = state.bloblets
    .map(bloblet => ({ ...bloblet, turnsLeft: bloblet.turnsLeft - 1 }))
    .filter(bloblet => bloblet.turnsLeft > 0);
  const melted = state.bloblets.length - survivingBloblets.length;
  const next: BlobTacticsState = {
    ...state,
    bloblets: survivingBloblets,
    tileEffects: state.tileEffects
      .map(effect => effect.type === "spore" ? { ...effect, turnsLeft: effect.turnsLeft - 1 } : effect)
      .filter(effect => effect.turnsLeft > 0),
  };
  return melted > 0
    ? withNotice(next, "Bloblet melted", `${melted} temporary helper${melted === 1 ? "" : "s"} dissolved.`, "warn")
    : next;
};

const damagePipplo = (state: BlobTacticsState, damage: number, title: string): BlobTacticsState => {
  const nextHp = Math.max(0, state.pipploHp - damage);
  return withNotice({
    ...state,
    pipploHp: nextHp,
    phase: nextHp === 0 ? "lost" : "study",
  }, nextHp === 0 ? "Pipplo flattened" : title,
  nextHp === 0 ? "The micro-run is over. Pipplo needs another try." : `Pipplo lost ${damage} HP. Study again to make a new sticker hand.`,
  "warn");
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
    if (intent.targetId === "pipplo" && intent.label === "Pounce") {
      const moved = moveEnemyTowardPipplo(next, 2);
      next = moved.state;
      next = distance(next.enemy.position, next.pipploPosition) === 1
        ? damagePipplo(next, 1, "Nibble Imp pounced!")
        : withNotice({ ...next, phase: "study" }, moved.stuck ? "Nibble Imp got stuck" : "Nibble Imp pounced closer", moved.stuck ? "Goo stopped the dash." : "Its next bite is close.", moved.stuck ? "good" : "plain");
    } else if (intent.targetId === "pipplo") {
      next = damagePipplo(next, next.enemy.attack, `${next.enemy.name} struck!`);
    } else {
      const target = next.bloblets.find(bloblet => bloblet.id === intent.targetId);
      next = withNotice({
        ...next,
        phase: "study",
        bloblets: next.bloblets.filter(bloblet => bloblet.id !== intent.targetId),
      }, target?.kind === "bubble" ? "Bubble Bud blocked it!" : "Bloblet popped!",
      target?.kind === "bubble" ? "The shield helper absorbed the hit." : "The helper protected Pipplo from the hit.",
      target?.kind === "bubble" ? "good" : "warn");
    }
  } else if (intent.tone === "hazard") {
    const sporeTarget = getSporeTarget(next);
    next = withNotice({
      ...next,
      phase: "study",
      tileEffects: [
        ...next.tileEffects,
        { id: `spore-${next.nextId}`, type: "spore", position: sporeTarget, turnsLeft: 3 },
      ],
      nextId: next.nextId + 1,
    }, intent.label, "A prickly patch appeared. Avoid stepping on it.", "warn");
  } else {
    const moved = moveEnemyTowardPipplo(next, next.enemy.moveRange);
    next = withNotice({
      ...moved.state,
      phase: "study",
    }, moved.stuck ? `${next.enemy.name} got stuck` : `${next.enemy.name} moved closer`,
    moved.stuck ? "Sticky goo stopped its advance." : "Its next intent is now visible.",
    moved.stuck ? "good" : "plain");
  }

  if (next.phase !== "lost") {
    const enraged = next.enemy.kind === "rootLump" && next.enemy.hp <= Math.ceil(next.enemy.maxHp / 2);
    next = ageTemporaryEffects({
      ...next,
      enemy: enraged && !next.enemy.enraged
        ? { ...next.enemy, enraged: true, attack: next.enemy.attack + 1 }
        : next.enemy,
    });
    if (enraged && !state.enemy.enraged) next = withNotice(next, "Root Lump is furious", "Below half HP, its attacks now hit harder.", "warn");
  }
  return { ...next, turn: next.turn + 1 };
}

export function claimBlobMutation(state: BlobTacticsState, mutationId: BlobMutationId): BlobTacticsState {
  if (state.phase !== "reward" || !state.rewardChoices.includes(mutationId)) return state;
  const mutations = [...state.mutations, mutationId];
  const gainsMass = mutationId === "plumpCore";
  const nextRoom = state.room + 1;
  return withNotice({
    ...state,
    room: nextRoom,
    phase: "study",
    pipploHp: Math.min(state.pipploMaxHp, state.pipploHp + 1),
    massMax: gainsMass ? state.massMax + 2 : state.massMax,
    mass: Math.min(gainsMass ? state.massMax + 2 : state.massMax, state.mass + (gainsMass ? 3 : 1)),
    pipploPosition: { row: 2, col: 0 },
    enemy: createEnemyForRoom(nextRoom),
    bloblets: [],
    tileEffects: [],
    hand: [],
    selectedStickerId: null,
    actionSourceId: null,
    rewardChoices: [],
    mutations,
    springFeetUsedThisRoom: false,
  }, `Room ${nextRoom}: ${createEnemyForRoom(nextRoom).name}`,
  `${MUTATION_DEFS[mutationId].name} absorbed. Pipplo recovered 1 HP and bounced into the next room.`,
  "good");
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
