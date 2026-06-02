export const BLOB_BOARD_ROWS = 4;
export const BLOB_BOARD_COLS = 5;
export const BLOB_RUN_ROOMS = 8;

export type BlobStudyGrade = "bad" | "good" | "great";
export type BlobImproviseMode = "move" | "bonk";
export type BlobActionTileType =
  | "move"
  | "hop"
  | "bump"
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
export type BlobEnemyKind = "shellSlime" | "nibbleImp" | "sporeBud" | "bubbleCrab" | "echoMoth" | "rootLump";
export type BlobMapNodeKind = "encounter" | "rest" | "workshop" | "event" | "guardian";
export type BlobMapNodeId =
  | "shellGate"
  | "nibbleBurrow"
  | "snackSpring"
  | "sporeGarden"
  | "tileTinker"
  | "shellHollow"
  | "softNest"
  | "bubbleGrotto"
  | "wobbleWell"
  | "echoCanopy"
  | "secondTinker"
  | "thornGallery"
  | "finalNest"
  | "rootSanctum";
export type BlobEventChoiceId = "sipWell" | "wishWell" | "listenWell";
export type BlobRegionId = "dewMeadow" | "rootwild";
export type BlobMutationId =
  | "plumpCore"
  | "springFeet"
  | "stickySkin"
  | "bubbleWrap"
  | "sharpCheeks"
  | "studySnacks"
  | "rhythmJelly"
  | "rollingShoulder";
export type BlobTacticsPhase = "study" | "player" | "reward" | "map" | "workshop" | "event" | "won" | "lost";
export type TileEffect = "goo" | "spore" | "puddle";

export interface BlobPosition {
  row: number;
  col: number;
}

export interface BlobActionTile {
  id: string;
  type: BlobActionTileType;
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
  hand: BlobActionTile[];
  selectedActionTileId: string | null;
  actionSourceId: string | null;
  notice: BlobTacticsNotice;
  nextId: number;
  lastStudyGrade: BlobStudyGrade | null;
  animation: "idle" | "pipplo" | "enemy" | "pop";
  mutations: BlobMutationId[];
  rewardChoices: BlobMutationId[];
  absorbedEnemies: BlobEnemyKind[];
  springFeetUsedThisRoom: boolean;
  tilesPlayedThisTurn: number;
  attackedThisTurn: boolean;
  enemyPressure: number;
  improviseMode: BlobImproviseMode | null;
  mapDepth: number;
  mapChoices: BlobMapNodeId[];
  visitedNodeIds: BlobMapNodeId[];
  tileBag: BlobActionTileType[];
  workshopChoices: BlobActionTileType[];
  eventChoices: BlobEventChoiceId[];
  eventHistory: BlobEventChoiceId[];
  nextStudyBonusUpgrades: number;
}

export interface BlobStudyResult {
  grade: BlobStudyGrade;
  tileCount: number;
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

export interface BlobEnemyPreview {
  pathKeys: Set<string>;
  dangerKeys: Set<string>;
  hazardKeys: Set<string>;
}

export interface BlobMutationDef {
  id: BlobMutationId;
  name: string;
  description: string;
  accent: string;
}

export interface BlobMapNodeDef {
  id: BlobMapNodeId;
  depth: number;
  kind: BlobMapNodeKind;
  name: string;
  description: string;
  accent: string;
  enemyKind?: BlobEnemyKind;
}

export interface BlobEventChoiceDef {
  id: BlobEventChoiceId;
  name: string;
  description: string;
  accent: string;
}

export interface BlobRegionDef {
  id: BlobRegionId;
  name: string;
  description: string;
}

export const ACTION_TILE_INFO: Record<BlobActionTileType, {
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
  bump: {
    name: "Bump",
    shortName: "Bump",
    description: "Nudge an adjacent enemy backward and lightly crack Shell.",
    accent: "#f5aa49",
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
  rhythmJelly: {
    id: "rhythmJelly",
    name: "Rhythm Jelly",
    description: "Every third tile played restores 2 Mass instead of 1.",
    accent: "#ef78b2",
  },
  rollingShoulder: {
    id: "rollingShoulder",
    name: "Rolling Shoulder",
    description: "Bump deals +1 HP and Shell damage before pushing.",
    accent: "#f5aa49",
  },
};

const NORMAL_ACTION_TILE_POOL: BlobActionTileType[] = [
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
  "bump",
];

export const STARTING_TILE_BAG: BlobActionTileType[] = [
  "move",
  "move",
  "hop",
  "slap",
  "stretch",
  "bellyFlop",
  "bump",
  "split",
  "rejoin",
  "spit",
  "goo",
  "bubble",
];

export const BLOB_MAP_NODES: Record<BlobMapNodeId, BlobMapNodeDef> = {
  shellGate: {
    id: "shellGate",
    depth: 1,
    kind: "encounter",
    name: "Shell Gate",
    description: "A shelled wobble blocks the first doorway.",
    accent: "#7bcff2",
    enemyKind: "shellSlime",
  },
  nibbleBurrow: {
    id: "nibbleBurrow",
    depth: 2,
    kind: "encounter",
    name: "Nibble Burrow",
    description: "Fight a quick imp and absorb an extra body mutation.",
    accent: "#a8d941",
    enemyKind: "nibbleImp",
  },
  snackSpring: {
    id: "snackSpring",
    depth: 2,
    kind: "rest",
    name: "Snack Spring",
    description: "Recover 3 HP and 2 Mass, but skip a mutation fight.",
    accent: "#ffdf5d",
  },
  sporeGarden: {
    id: "sporeGarden",
    depth: 3,
    kind: "encounter",
    name: "Spore Garden",
    description: "Fight a hazard-making bud and absorb another mutation.",
    accent: "#a987e7",
    enemyKind: "sporeBud",
  },
  tileTinker: {
    id: "tileTinker",
    depth: 3,
    kind: "workshop",
    name: "Tile Tinker",
    description: "Add a favored domino tile to Pipplo's study bag.",
    accent: "#f5aa49",
  },
  shellHollow: {
    id: "shellHollow",
    depth: 4,
    kind: "encounter",
    name: "Shell Hollow",
    description: "Fight a sturdy shelled duo for one final mutation.",
    accent: "#54bfb4",
    enemyKind: "shellSlime",
  },
  softNest: {
    id: "softNest",
    depth: 4,
    kind: "rest",
    name: "Soft Nest",
    description: "Recover 4 HP and fully refill Mass before crossing into the Rootwild.",
    accent: "#ff7895",
  },
  bubbleGrotto: {
    id: "bubbleGrotto",
    depth: 5,
    kind: "encounter",
    name: "Bubble Grotto",
    description: "Fight a shell-mending crab for another body mutation.",
    accent: "#69c6e8",
    enemyKind: "bubbleCrab",
  },
  wobbleWell: {
    id: "wobbleWell",
    depth: 5,
    kind: "event",
    name: "Wobble Well",
    description: "A humming puddle offers three peculiar bargains.",
    accent: "#a987e7",
  },
  echoCanopy: {
    id: "echoCanopy",
    depth: 6,
    kind: "encounter",
    name: "Echo Canopy",
    description: "A floating moth drains Mass when left alone.",
    accent: "#a987e7",
    enemyKind: "echoMoth",
  },
  secondTinker: {
    id: "secondTinker",
    depth: 6,
    kind: "workshop",
    name: "Rootwild Tinker",
    description: "Add one more favored domino before the last climb.",
    accent: "#f5aa49",
  },
  thornGallery: {
    id: "thornGallery",
    depth: 7,
    kind: "encounter",
    name: "Thorn Gallery",
    description: "Crack an armored roller to earn a final mutation.",
    accent: "#8fbd57",
    enemyKind: "shellSlime",
  },
  finalNest: {
    id: "finalNest",
    depth: 7,
    kind: "rest",
    name: "Warm Hollow",
    description: "Recover 5 HP and refill Mass before the guardian.",
    accent: "#ff7895",
  },
  rootSanctum: {
    id: "rootSanctum",
    depth: 8,
    kind: "guardian",
    name: "Root Sanctum",
    description: "The route converges on Root Lump.",
    accent: "#8fbd57",
    enemyKind: "rootLump",
  },
};

export const BLOB_EVENT_CHOICES: Record<BlobEventChoiceId, BlobEventChoiceDef> = {
  sipWell: {
    id: "sipWell",
    name: "Sip the sour puddle",
    description: "Recover 3 HP, but add one risky Sour Split to the tile bag.",
    accent: "#d982ba",
  },
  wishWell: {
    id: "wishWell",
    name: "Feed it a chunk",
    description: "Lose 1 max HP. Add Bubble Bud and Bump tiles to the bag.",
    accent: "#69c6e8",
  },
  listenWell: {
    id: "listenWell",
    name: "Listen to the hum",
    description: "Recover 2 Mass. Your next study hand gains one extra upgraded tile.",
    accent: "#ffdf5d",
  },
};

export function getBlobRegion(depth: number): BlobRegionDef {
  if (depth >= 5) {
    return {
      id: "rootwild",
      name: "Rootwild",
      description: "Stranger creatures and meaner bargains wait beneath the roots.",
    };
  }
  return {
    id: "dewMeadow",
    name: "Dew Meadow",
    description: "A bright practice trail full of bouncy trouble.",
  };
}

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

const makeActionTile = (
  type: BlobActionTileType,
  id: number,
  upgraded = false,
  sour = false,
): BlobActionTile => ({ id: `tile-${id}`, type, upgraded, sour });

const getStudyResult = (grade: BlobStudyGrade): BlobStudyResult => {
  if (grade === "great") return { grade, tileCount: 5, massGain: 1, upgradedCount: 1, sourCount: 0 };
  if (grade === "bad") return { grade, tileCount: 3, massGain: 0, upgradedCount: 0, sourCount: 1 };
  return { grade, tileCount: 4, massGain: 1, upgradedCount: 0, sourCount: 0 };
};

const createEnemyForRoom = (room: number, kind?: BlobEnemyKind): BlobEnemy => {
  const enemyKind = kind || (room === 1 ? "shellSlime" : room === 8 ? "rootLump" : "shellSlime");
  if (enemyKind === "nibbleImp") {
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
  if (enemyKind === "sporeBud") {
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
  if (enemyKind === "bubbleCrab") {
    return {
      kind: "bubbleCrab",
      name: "Bubble Crab",
      hp: 16,
      maxHp: 16,
      shell: 6,
      maxShell: 6,
      attack: 2,
      moveRange: 1,
      position: { row: 1, col: 4 },
    };
  }
  if (enemyKind === "echoMoth") {
    return {
      kind: "echoMoth",
      name: "Echo Moth",
      hp: 14,
      maxHp: 14,
      shell: 0,
      maxShell: 0,
      attack: 2,
      moveRange: 2,
      position: { row: 0, col: 4 },
    };
  }
  if (enemyKind === "rootLump") {
    return {
      kind: "rootLump",
      name: "Root Lump",
      hp: 30,
      maxHp: 30,
      shell: 6,
      maxShell: 6,
      attack: 4,
      moveRange: 1,
      position: { row: 1, col: 4 },
      boss: true,
    };
  }
  if (room >= 7) {
    return {
      kind: "shellSlime",
      name: "Thornshell Roller",
      hp: 20,
      maxHp: 20,
      shell: 9,
      maxShell: 9,
      attack: 3,
      moveRange: 1,
      position: { row: 1, col: 4 },
    };
  }
  if (room >= 4) {
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

const getMapChoicesAfterDepth = (depth: number): BlobMapNodeId[] => {
  if (depth === 1) return ["nibbleBurrow", "snackSpring"];
  if (depth === 2) return ["sporeGarden", "tileTinker"];
  if (depth === 3) return ["shellHollow", "softNest"];
  if (depth === 4) return ["bubbleGrotto", "wobbleWell"];
  if (depth === 5) return ["echoCanopy", "secondTinker"];
  if (depth === 6) return ["thornGallery", "finalNest"];
  if (depth === 7) return ["rootSanctum"];
  return [];
};

const getWorkshopChoices = (state: BlobTacticsState): BlobActionTileType[] => {
  const candidates: BlobActionTileType[] = ["move", "bump", "bellyFlop", "split", "goo", "bubble", "spit"];
  const offset = (state.tileBag.length + state.roomsCleared) % candidates.length;
  return Array.from({ length: 3 }, (_, index) => candidates[(offset + (index * 2)) % candidates.length]);
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
    selectedActionTileId: null,
    actionSourceId: null,
    notice: {
      id: 1,
      title: "Room 1: crack the Shell",
      detail: "Study to grow a tile hand. Spit Chunk is especially good at breaking Shell.",
      tone: "plain",
    },
    nextId: 10,
    lastStudyGrade: null,
    animation: "idle",
    mutations: [],
    rewardChoices: [],
    absorbedEnemies: [],
    springFeetUsedThisRoom: false,
    tilesPlayedThisTurn: 0,
    attackedThisTurn: false,
    enemyPressure: 0,
    improviseMode: null,
    mapDepth: 1,
    mapChoices: [],
    visitedNodeIds: ["shellGate"],
    tileBag: [...STARTING_TILE_BAG],
    workshopChoices: [],
    eventChoices: [],
    eventHistory: [],
    nextStudyBonusUpgrades: 0,
  };
}

export function createActionTilesFromStudyResult(
  result: BlobStudyResult,
  startingId: number,
  tileBag: BlobActionTileType[] = NORMAL_ACTION_TILE_POOL,
): { tiles: BlobActionTile[]; nextId: number } {
  let nextId = startingId;
  const tiles: BlobActionTile[] = [];
  const offset = result.grade === "great" ? 2 : result.grade === "good" ? 0 : 4;
  for (let index = 0; index < result.tileCount; index += 1) {
    const type = tileBag[(startingId + offset + (index * 3)) % tileBag.length];
    tiles.push(makeActionTile(type, nextId, index < result.upgradedCount));
    nextId += 1;
  }
  if (!tiles.some(tile => tile.type === "move" || tile.type === "hop") && tiles[0]) {
    tiles[0] = { ...tiles[0], type: startingId % 2 === 0 ? "move" : "hop" };
  }
  for (let index = 0; index < result.sourCount; index += 1) {
    tiles.push(makeActionTile("sourSplit", nextId, false, true));
    nextId += 1;
  }
  return { tiles, nextId };
}

export function applyFakeStudyResult(state: BlobTacticsState, grade: BlobStudyGrade): BlobTacticsState {
  if (state.phase !== "study") return state;
  return applyBlobStudyResult(state, getStudyResult(grade));
}

export function applyBlobStudyResult(state: BlobTacticsState, result: BlobStudyResult): BlobTacticsState {
  if (state.phase !== "study") return state;
  const adjustedResult = {
    ...result,
    upgradedCount: result.upgradedCount + state.nextStudyBonusUpgrades,
  };
  const generated = createActionTilesFromStudyResult(adjustedResult, state.nextId, state.tileBag);
  const snackBonus = result.grade !== "bad" && state.mutations.includes("studySnacks") ? 1 : 0;
  const massGain = result.massGain + snackBonus;
  return withNotice({
    ...state,
    phase: "player",
    mass: Math.min(state.massMax, state.mass + massGain),
    hand: generated.tiles,
    selectedActionTileId: null,
    actionSourceId: null,
    improviseMode: null,
    nextId: generated.nextId,
    lastStudyGrade: result.grade,
    tilesPlayedThisTurn: 0,
    nextStudyBonusUpgrades: 0,
  }, result.grade === "great" ? "Great study!" : result.grade === "good" ? "Good study" : "Messy study",
  result.grade === "bad"
    ? `${adjustedResult.tileCount} tiles${adjustedResult.upgradedCount ? ` with ${adjustedResult.upgradedCount} upgraded` : ""} and ${adjustedResult.sourCount} risky Sour Split${adjustedResult.sourCount === 1 ? "" : "s"} appeared.`
    : `${adjustedResult.tileCount} tiles appeared${adjustedResult.upgradedCount ? ` with ${adjustedResult.upgradedCount} upgraded` : ""}${massGain ? ` and Pipplo recovered ${massGain} Mass` : ""}.`,
  result.grade === "bad" ? "warn" : "good");
}

const isOccupied = (state: BlobTacticsState, position: BlobPosition) => (
  samePosition(state.pipploPosition, position)
  || samePosition(state.enemy.position, position)
  || state.bloblets.some(bloblet => samePosition(bloblet.position, position))
);

const getBloblet = (state: BlobTacticsState, id: string | null) => state.bloblets.find(bloblet => bloblet.id === id) || null;
const getSelectedActionTile = (state: BlobTacticsState) => state.hand.find(tile => tile.id === state.selectedActionTileId) || null;

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
  const tile = getSelectedActionTile(state);
  if (!tile || state.phase !== "player") return new Set();
  const keys = new Set<string>();
  const addEmptyAdjacent = (position: BlobPosition) => {
    adjacentPositions(position).forEach(target => {
      if (!isOccupied(state, target)) keys.add(positionKey(target));
    });
  };

  if (state.improviseMode === "move") {
    addEmptyAdjacent(state.pipploPosition);
    return keys;
  }
  if (state.improviseMode === "bonk") {
    if (distance(state.pipploPosition, state.enemy.position) === 1) keys.add(positionKey(state.enemy.position));
    return keys;
  }
  if (tile.type === "move") addEmptyAdjacent(state.pipploPosition);
  if (tile.type === "hop") getEmptyTargetsWithin(state, state.pipploPosition, 2).forEach(target => keys.add(positionKey(target)));
  if (tile.type === "bump" && distance(state.pipploPosition, state.enemy.position) === 1) keys.add(positionKey(state.enemy.position));
  if (tile.type === "split" || tile.type === "bubble" || tile.type === "sourSplit") {
    if (state.mass >= ACTION_TILE_INFO[tile.type].massCost) addEmptyAdjacent(state.pipploPosition);
  }
  if (tile.type === "rejoin") {
    state.bloblets
      .filter(bloblet => distance(bloblet.position, state.pipploPosition) === 1)
      .forEach(bloblet => keys.add(positionKey(bloblet.position)));
  }
  if (tile.type === "stretch" && state.mass >= ACTION_TILE_INFO.stretch.massCost && distance(state.pipploPosition, state.enemy.position) <= 2) {
    keys.add(positionKey(state.enemy.position));
  }
  if (tile.type === "bellyFlop" && state.mass >= ACTION_TILE_INFO.bellyFlop.massCost && distance(state.pipploPosition, state.enemy.position) === 1) {
    keys.add(positionKey(state.enemy.position));
  }
  if (tile.type === "slap") {
    if (!state.actionSourceId) {
      getSlapSources(state).forEach(sourceId => {
        keys.add(positionKey(sourceId === "pipplo" ? state.pipploPosition : getBloblet(state, sourceId)!.position));
      });
    } else {
      keys.add(positionKey(state.enemy.position));
    }
  }
  if (tile.type === "spit") {
    if (!state.actionSourceId) {
      state.bloblets.forEach(bloblet => keys.add(positionKey(bloblet.position)));
    } else if (getBloblet(state, state.actionSourceId) && distance(getBloblet(state, state.actionSourceId)!.position, state.enemy.position) <= 3) {
      keys.add(positionKey(state.enemy.position));
    }
  }
  if (tile.type === "goo") {
    if (!state.actionSourceId) {
      state.bloblets.forEach(bloblet => keys.add(positionKey(bloblet.position)));
    } else {
      const source = getBloblet(state, state.actionSourceId);
      if (source) addEmptyAdjacent(source.position);
    }
  }
  return keys;
}

export function getActionTileDisabledReason(state: BlobTacticsState, tile: BlobActionTile): string | null {
  if (state.phase !== "player") return "Finish studying first.";
  const cost = ACTION_TILE_INFO[tile.type].massCost;
  if (state.mass < cost) return `Needs ${cost} Mass.`;
  if ((tile.type === "spit" || tile.type === "goo") && state.bloblets.length === 0) return "Needs a bloblet.";
  if (tile.type === "rejoin" && !state.bloblets.some(bloblet => distance(bloblet.position, state.pipploPosition) === 1)) return "No adjacent bloblet.";
  if (tile.type === "stretch" && distance(state.pipploPosition, state.enemy.position) > 2) return "Enemy is too far away.";
  if (tile.type === "bellyFlop" && distance(state.pipploPosition, state.enemy.position) !== 1) return "Pipplo must be beside the enemy.";
  if (tile.type === "bump" && distance(state.pipploPosition, state.enemy.position) !== 1) return "Pipplo must be beside the enemy.";
  if (tile.type === "slap" && getSlapSources(state).length === 0) return "Nobody can reach the enemy.";
  return null;
}

export function selectActionTile(state: BlobTacticsState, tileId: string): BlobTacticsState {
  const tile = state.hand.find(entry => entry.id === tileId);
  if (!tile) return state;
  const reason = getActionTileDisabledReason(state, tile);
  const next = {
    ...state,
    selectedActionTileId: state.selectedActionTileId === tileId ? null : tileId,
    actionSourceId: null,
    improviseMode: null,
  };
  if (reason && next.selectedActionTileId) {
    return withNotice(next, `${ACTION_TILE_INFO[tile.type].name} cannot be used normally`, `${reason} Burn it for an improvised Scoot or Bonk instead.`, "warn");
  }
  return next;
}

export function selectBlobImproviseMode(state: BlobTacticsState, mode: BlobImproviseMode): BlobTacticsState {
  if (state.phase !== "player" || !state.selectedActionTileId) return state;
  if (state.mass < 1) return withNotice(state, "Not enough Mass", "Improvising needs 1 Mass.", "warn");
  const next = {
    ...state,
    actionSourceId: null,
    improviseMode: state.improviseMode === mode ? null : mode,
  };
  return next.improviseMode
    ? withNotice(next, mode === "move" ? "Improvise Scoot" : "Improvise Bonk",
      mode === "move" ? "Burn this tile and spend 1 Mass to move one space." : "Burn this tile and spend 1 Mass for a weak adjacent hit.",
      "plain")
    : next;
}

const consumeSelectedActionTile = (state: BlobTacticsState, countForChain = true): BlobTacticsState => {
  const tilesPlayedThisTurn = state.tilesPlayedThisTurn + (countForChain ? 1 : 0);
  const chainMass = tilesPlayedThisTurn % 3 === 0
    && countForChain
    ? state.mutations.includes("rhythmJelly") ? 2 : 1
    : 0;
  return {
    ...state,
    mass: Math.min(state.massMax, state.mass + chainMass),
    hand: state.hand.filter(tile => tile.id !== state.selectedActionTileId),
    selectedActionTileId: null,
    actionSourceId: null,
    improviseMode: null,
    tilesPlayedThisTurn,
  };
};

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
  const finalRoom = defeated && state.enemy.boss;
  return withNotice({
    ...state,
    roomsCleared,
    attackedThisTurn: true,
    enemyPressure: 0,
    phase: finalRoom ? "won" : defeated ? "reward" : state.phase,
    enemy: { ...state.enemy, shell: nextShell, hp: nextHp },
    rewardChoices: defeated && !finalRoom ? getRewardChoices(state) : [],
    absorbedEnemies: defeated ? [...state.absorbedEnemies, state.enemy.kind] : state.absorbedEnemies,
    hand: defeated ? [] : state.hand,
    selectedActionTileId: defeated ? null : state.selectedActionTileId,
    actionSourceId: defeated ? null : state.actionSourceId,
    animation: defeated ? "pop" : "enemy",
  }, title, defeated
    ? `${state.enemy.name} wobbled apart. Pipplo absorbed the leftovers!`
    : `${shellHit ? `${shellHit} Shell cracked. ` : ""}${hpDamage ? `${hpDamage} damage landed.` : "Its Shell softened the hit."}`,
  defeated ? "good" : "plain");
};

const useImprovisedActionAt = (state: BlobTacticsState, target: BlobPosition): BlobTacticsState => {
  if (!state.improviseMode || !state.selectedActionTileId || state.mass < 1) return state;
  const mode = state.improviseMode;
  const next = consumeSelectedActionTile({ ...state, mass: state.mass - 1 }, false);
  if (mode === "move") {
    return withNotice(consumeBoardEffectsAt({
      ...next,
      pipploPosition: target,
      animation: "pipplo",
    }, target), "Improvised Scoot", "Pipplo burned a tile and spent 1 Mass to wobble away. Improvised tiles do not build the bounce chain.", "warn");
  }
  return dealDamageToEnemy(next, 1, 1, "Improvised Bonk");
};

const addMassPuddle = (state: BlobTacticsState, position: BlobPosition): BlobTacticsState => {
  if (state.tileEffects.some(effect => effect.type === "puddle" && samePosition(effect.position, position))) return state;
  return {
    ...state,
    tileEffects: [
      ...state.tileEffects,
      { id: `puddle-${state.nextId}`, type: "puddle", position, turnsLeft: 4 },
    ],
    nextId: state.nextId + 1,
  };
};

const consumeBoardEffectsAt = (state: BlobTacticsState, position: BlobPosition): BlobTacticsState => {
  const spore = state.tileEffects.find(effect => effect.type === "spore" && samePosition(effect.position, position));
  const puddle = state.tileEffects.find(effect => effect.type === "puddle" && samePosition(effect.position, position));
  if (!spore && !puddle) return state;
  const nextHp = Math.max(0, state.pipploHp - (spore ? 1 : 0));
  const nextMass = Math.min(state.massMax, state.mass + (puddle ? 1 : 0));
  const consumedIds = new Set([spore?.id, puddle?.id].filter(Boolean));
  return withNotice({
    ...state,
    pipploHp: nextHp,
    mass: nextMass,
    phase: nextHp === 0 ? "lost" : state.phase,
    tileEffects: state.tileEffects.filter(effect => !consumedIds.has(effect.id)),
  }, nextHp === 0
    ? "Pipplo stepped on spores"
    : spore && puddle
      ? "A prickly slurp"
      : spore
        ? "Pipplo stepped on spores"
        : "Pipplo slurped a puddle",
  nextHp === 0
    ? "The prickly patch flattened Pipplo."
    : spore && puddle
      ? "Pipplo lost 1 HP but recovered 1 Mass from the puddle."
      : spore
        ? "Pipplo lost 1 HP."
        : "A dissolved helper restored 1 Mass.",
  spore ? "warn" : "good");
};

const pushEnemyAwayFromPipplo = (state: BlobTacticsState): BlobTacticsState => {
  const pushTarget = adjacentPositions(state.enemy.position)
    .filter(position => !isOccupied(state, position))
    .sort((a, b) => distance(b, state.pipploPosition) - distance(a, state.pipploPosition))[0];
  return pushTarget ? { ...state, enemy: { ...state.enemy, position: pushTarget } } : state;
};

const useActionTileAt = (state: BlobTacticsState, target: BlobPosition): BlobTacticsState => {
  const tile = getSelectedActionTile(state);
  if (!tile) return state;
  const info = ACTION_TILE_INFO[tile.type];
  const damageBonus = tile.upgraded ? 1 : 0;
  const pipploDamageBonus = state.mutations.includes("sharpCheeks") ? 1 : 0;
  let next = consumeSelectedActionTile({ ...state, mass: Math.max(0, state.mass - info.massCost) });

  if (tile.type === "move" || tile.type === "hop") {
    const healed = tile.type === "hop" && state.mutations.includes("springFeet") && !state.springFeetUsedThisRoom;
    next = consumeBoardEffectsAt({
      ...next,
      pipploPosition: target,
      pipploHp: healed ? Math.min(state.pipploMaxHp, state.pipploHp + 1) : state.pipploHp,
      springFeetUsedThisRoom: healed ? true : state.springFeetUsedThisRoom,
      animation: "pipplo",
    }, target);
    return withNotice(next, tile.type === "hop" ? "Long Scoot" : "Scoot",
      healed ? "Pipplo bounced into position and Spring Feet restored 1 HP." : "Pipplo bounced into position.",
      "good");
  }
  if (tile.type === "split" || tile.type === "bubble" || tile.type === "sourSplit") {
    const extraBubbleTurn = tile.type === "bubble" && state.mutations.includes("bubbleWrap") ? 1 : 0;
    const bloblet: Bloblet = {
      id: `bloblet-${state.nextId}`,
      kind: tile.type === "bubble" ? "bubble" : "basic",
      hp: 1,
      turnsLeft: tile.type === "sourSplit" ? 1 : 2 + extraBubbleTurn,
      position: target,
    };
    return withNotice({
      ...next,
      bloblets: [...state.bloblets, bloblet],
      nextId: state.nextId + 1,
      animation: "pipplo",
    }, info.name, tile.type === "bubble"
      ? "A shielding Bubble Bud popped into place."
      : tile.type === "sourSplit"
        ? "A fragile sour bloblet wobbled free."
        : "Pipplo budded off a temporary helper.",
    tile.sour ? "warn" : "good");
  }
  if (tile.type === "rejoin") {
    const absorbed = state.bloblets.find(bloblet => samePosition(bloblet.position, target));
    if (!absorbed) return state;
    const recoveredMass = tile.upgraded ? 2 : 1;
    return withNotice({
      ...next,
      mass: Math.min(state.massMax, next.mass + recoveredMass),
      bloblets: state.bloblets.filter(bloblet => bloblet.id !== absorbed.id),
      animation: "pipplo",
    }, "Rejoin", `Pipplo slurped the bloblet back up and recovered ${recoveredMass} Mass.`, "good");
  }
  if (tile.type === "stretch") return dealDamageToEnemy(next, 1 + damageBonus + pipploDamageBonus, 2 + damageBonus, "Stretch Slap");
  if (tile.type === "bellyFlop") return dealDamageToEnemy(next, 3 + damageBonus + pipploDamageBonus, 2 + damageBonus, "Belly Flop");
  if (tile.type === "bump") {
    const shoulderBonus = state.mutations.includes("rollingShoulder") ? 1 : 0;
    const bumped = dealDamageToEnemy(next, 1 + damageBonus + shoulderBonus, 1 + damageBonus + shoulderBonus, "Bump");
    return bumped.phase === "reward" || bumped.phase === "won" ? bumped : pushEnemyAwayFromPipplo(bumped);
  }
  if (tile.type === "slap") {
    const sourceIsPipplo = state.actionSourceId === "pipplo";
    return dealDamageToEnemy(next, (sourceIsPipplo ? 2 + pipploDamageBonus : 1) + damageBonus, 1 + damageBonus, sourceIsPipplo ? "Pipplo Slap" : "Bloblet Slap");
  }
  if (tile.type === "spit") {
    const source = getBloblet(state, state.actionSourceId);
    if (!source) return state;
    next = { ...next, bloblets: state.bloblets.filter(bloblet => bloblet.id !== source.id) };
    return dealDamageToEnemy(next, 3 + damageBonus, 4 + damageBonus, "Spit Chunk");
  }
  if (tile.type === "goo") {
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
  const tile = getSelectedActionTile(state);
  if (!tile) return withNotice(state, "Pick a tile", "Choose a tile, then tap a highlighted tile.", "plain");
  const validKeys = getValidTargetKeys(state);
  if (!validKeys.has(positionKey(target))) return state;

  if (state.improviseMode) return useImprovisedActionAt(state, target);
  if (!state.actionSourceId && (tile.type === "slap" || tile.type === "spit" || tile.type === "goo")) {
    const sourceIsPipplo = samePosition(state.pipploPosition, target);
    const sourceBloblet = state.bloblets.find(bloblet => samePosition(bloblet.position, target));
    const sourceId = sourceIsPipplo ? "pipplo" : sourceBloblet?.id;
    if (!sourceId) return state;
    return withNotice({ ...state, actionSourceId: sourceId }, ACTION_TILE_INFO[tile.type].name,
      tile.type === "goo" ? "Now tap an empty neighboring tile." : `Now tap ${state.enemy.name}.`, "plain");
  }
  return useActionTileAt(state, target);
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

const getEnemyMoveSteps = (state: BlobTacticsState, pouncing = false): number => (
  Math.min(4, (pouncing ? 2 : state.enemy.moveRange) + state.enemyPressure)
);

export function getEnemyIntent(state: BlobTacticsState): BlobEnemyIntent {
  if (state.phase === "reward" || state.phase === "map" || state.phase === "workshop" || state.phase === "event" || state.phase === "won") {
    return { label: "Absorbed", detail: "The room is clear.", tone: "shell", targetId: null };
  }
  const target = getEnemyTarget(state);
  const targetDistance = distance(target.position, state.enemy.position);
  if (state.enemy.kind === "sporeBud" && state.turn % 2 === 0 && targetDistance > 1) {
    return { label: "Scatter spores", detail: "A prickly patch will appear near Pipplo.", tone: "hazard", targetId: null };
  }
  if (state.enemy.kind === "rootLump" && state.turn % 2 === 0 && targetDistance > 1) {
    return { label: "Root sprout", detail: "Root Lump will grow a prickly patch near Pipplo.", tone: "hazard", targetId: null };
  }
  if (state.enemy.kind === "bubbleCrab" && state.enemy.shell > 0 && state.enemy.shell < state.enemy.maxShell && state.turn % 2 === 0 && targetDistance > 1) {
    return { label: "Rebubble", detail: "Bubble Crab will restore 2 Shell unless Pipplo keeps pressuring it.", tone: "shell", targetId: null };
  }
  if (state.enemy.kind === "echoMoth" && state.turn % 2 === 0 && targetDistance > 1) {
    return { label: "Dust drain", detail: "Echo Moth will siphon 2 Mass unless Pipplo closes the distance.", tone: "hazard", targetId: null };
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
    return { label: "Pounce", detail: `Nibble Imp will dash up to ${getEnemyMoveSteps(state, true)} tiles and deal 1 HP if it reaches Pipplo.`, tone: "attack", targetId: "pipplo" };
  }
  const moveSteps = getEnemyMoveSteps(state);
  return {
    label: state.enemy.kind === "nibbleImp"
      ? "Skitter closer"
      : state.enemy.kind === "rootLump"
        ? "Stomp closer"
        : state.enemy.kind === "echoMoth"
          ? "Flutter closer"
          : state.enemy.kind === "bubbleCrab"
            ? "Side-step closer"
            : "Waddle closer",
    detail: `${state.enemy.name} will move ${moveSteps === 1 ? "one tile" : `up to ${moveSteps} tiles`} toward Pipplo${state.enemyPressure ? " while Pursuit is active" : ""}.`,
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

export function getEnemyPreview(state: BlobTacticsState): BlobEnemyPreview {
  const preview: BlobEnemyPreview = { pathKeys: new Set(), dangerKeys: new Set(), hazardKeys: new Set() };
  if (state.phase === "reward" || state.phase === "map" || state.phase === "workshop" || state.phase === "event" || state.phase === "won" || state.phase === "lost") return preview;
  const intent = getEnemyIntent(state);
  if (intent.label === "Rebubble" || intent.label === "Dust drain") return preview;
  if (intent.tone === "hazard") {
    preview.hazardKeys.add(positionKey(getSporeTarget(state)));
    return preview;
  }
  if (intent.tone === "attack" && intent.label !== "Pounce") {
    const target = intent.targetId === "pipplo" ? state.pipploPosition : getBloblet(state, intent.targetId)?.position;
    if (target) preview.dangerKeys.add(positionKey(target));
    return preview;
  }

  const steps = getEnemyMoveSteps(state, intent.label === "Pounce");
  let simulated = state;
  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
    if (distance(simulated.enemy.position, simulated.pipploPosition) <= 1) break;
    const step = chooseEnemyStep(simulated);
    if (samePosition(step, simulated.enemy.position)) break;
    preview.pathKeys.add(positionKey(step));
    if (simulated.tileEffects.some(effect => effect.type === "goo" && samePosition(effect.position, step))) break;
    simulated = { ...simulated, enemy: { ...simulated.enemy, position: step } };
  }
  if (intent.label === "Pounce" && distance(simulated.enemy.position, simulated.pipploPosition) === 1) {
    preview.dangerKeys.add(positionKey(simulated.pipploPosition));
  }
  return preview;
}

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
  const agedBloblets = state.bloblets.map(bloblet => ({ ...bloblet, turnsLeft: bloblet.turnsLeft - 1 }));
  const survivingBloblets = agedBloblets.filter(bloblet => bloblet.turnsLeft > 0);
  const meltedBloblets = agedBloblets.filter(bloblet => bloblet.turnsLeft <= 0);
  let next: BlobTacticsState = {
    ...state,
    bloblets: survivingBloblets,
    tileEffects: state.tileEffects
      .map(effect => effect.type === "spore" || effect.type === "puddle" ? { ...effect, turnsLeft: effect.turnsLeft - 1 } : effect)
      .filter(effect => effect.turnsLeft > 0),
  };
  meltedBloblets.forEach(bloblet => {
    next = addMassPuddle(next, bloblet.position);
  });
  return meltedBloblets.length > 0
    ? withNotice(next, "Bloblet melted", `${meltedBloblets.length} temporary helper${meltedBloblets.length === 1 ? "" : "s"} dissolved into a Mass puddle.`, "plain")
    : next;
};

const damagePipplo = (state: BlobTacticsState, damage: number, title: string): BlobTacticsState => {
  const nextHp = Math.max(0, state.pipploHp - damage);
  return withNotice({
    ...state,
    pipploHp: nextHp,
    phase: nextHp === 0 ? "lost" : "study",
  }, nextHp === 0 ? "Pipplo flattened" : title,
  nextHp === 0 ? "The micro-run is over. Pipplo needs another try." : `Pipplo lost ${damage} HP. Study again to make a new tile hand.`,
  "warn");
};

export function endBlobTacticsTurn(state: BlobTacticsState): BlobTacticsState {
  if (state.phase !== "player") return state;
  const intent = getEnemyIntent(state);
  let next: BlobTacticsState = {
    ...state,
    selectedActionTileId: null,
    actionSourceId: null,
    improviseMode: null,
    hand: [],
    tilesPlayedThisTurn: 0,
    attackedThisTurn: false,
    enemyPressure: 0,
    animation: "enemy",
  };

  if (intent.tone === "attack" && intent.targetId) {
    if (intent.targetId === "pipplo" && intent.label === "Pounce") {
      const moved = moveEnemyTowardPipplo(next, getEnemyMoveSteps(state, true));
      next = moved.state;
      next = distance(next.enemy.position, next.pipploPosition) === 1
        ? damagePipplo(next, 1, "Nibble Imp pounced!")
        : withNotice({ ...next, phase: "study" }, moved.stuck ? "Nibble Imp got stuck" : "Nibble Imp pounced closer", moved.stuck ? "Goo stopped the dash." : "Its next bite is close.", moved.stuck ? "good" : "plain");
    } else if (intent.targetId === "pipplo") {
      next = damagePipplo(next, next.enemy.attack, `${next.enemy.name} struck!`);
    } else {
      const target = next.bloblets.find(bloblet => bloblet.id === intent.targetId);
      next = withNotice(addMassPuddle({
        ...next,
        phase: "study",
        bloblets: next.bloblets.filter(bloblet => bloblet.id !== intent.targetId),
      }, target?.position || next.enemy.position), target?.kind === "bubble" ? "Bubble Bud blocked it!" : "Bloblet popped!",
      target?.kind === "bubble" ? "The shield helper absorbed the hit and left a Mass puddle." : "The helper protected Pipplo and left a Mass puddle.",
      target?.kind === "bubble" ? "good" : "warn");
    }
  } else if (intent.label === "Rebubble") {
    next = withNotice({
      ...next,
      phase: "study",
      enemy: { ...next.enemy, shell: Math.min(next.enemy.maxShell, next.enemy.shell + 2) },
    }, "Bubble Crab rebubbled", "Its soft Shell recovered 2 points. Keep up the pressure.", "warn");
  } else if (intent.label === "Dust drain") {
    const drainedMass = Math.min(2, next.mass);
    next = withNotice({
      ...next,
      phase: "study",
      mass: Math.max(0, next.mass - drainedMass),
    }, "Echo Moth drank the rhythm", drainedMass
      ? `Pipplo lost ${drainedMass} Mass. Move in before it siphons again.`
      : "Pipplo had no Mass left to drain. Move in before the next flutter.",
    "warn");
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
    const moved = moveEnemyTowardPipplo(next, getEnemyMoveSteps(state));
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
  if (next.phase === "study") {
    const enemyPressure = state.attackedThisTurn ? 0 : Math.min(3, state.enemyPressure + 1);
    next = {
      ...next,
      attackedThisTurn: false,
      enemyPressure,
      notice: enemyPressure > state.enemyPressure
        ? {
            ...next.notice,
            detail: `${next.notice.detail} Pursuit rose to ${enemyPressure}: hit the enemy to calm the chase.`,
          }
        : next.notice,
    };
  }
  return { ...next, turn: next.turn + 1 };
}

export function claimBlobMutation(state: BlobTacticsState, mutationId: BlobMutationId): BlobTacticsState {
  if (state.phase !== "reward" || !state.rewardChoices.includes(mutationId)) return state;
  const mutations = [...state.mutations, mutationId];
  const gainsMass = mutationId === "plumpCore";
  return withNotice({
    ...state,
    phase: "map",
    pipploHp: Math.min(state.pipploMaxHp, state.pipploHp + 1),
    massMax: gainsMass ? state.massMax + 2 : state.massMax,
    mass: Math.min(gainsMass ? state.massMax + 2 : state.massMax, state.mass + (gainsMass ? 3 : 1)),
    bloblets: [],
    tileEffects: [],
    hand: [],
    selectedActionTileId: null,
    actionSourceId: null,
    improviseMode: null,
    rewardChoices: [],
    mutations,
    springFeetUsedThisRoom: false,
    tilesPlayedThisTurn: 0,
    attackedThisTurn: false,
    enemyPressure: 0,
    mapChoices: getMapChoicesAfterDepth(state.mapDepth),
    eventChoices: [],
  }, "Choose a path",
  `${MUTATION_DEFS[mutationId].name} absorbed. Pipplo recovered 1 HP and can choose the next stop.`,
  "good");
}

const enterEncounter = (state: BlobTacticsState, node: BlobMapNodeDef): BlobTacticsState => {
  const enemy = createEnemyForRoom(node.depth, node.enemyKind);
  return withNotice({
    ...state,
    room: node.depth,
    mapDepth: node.depth,
    phase: "study",
    pipploPosition: { row: 2, col: 0 },
    enemy,
    bloblets: [],
    tileEffects: [],
    hand: [],
    selectedActionTileId: null,
    actionSourceId: null,
    improviseMode: null,
    mapChoices: [],
    eventChoices: [],
    visitedNodeIds: [...state.visitedNodeIds, node.id],
    springFeetUsedThisRoom: false,
    tilesPlayedThisTurn: 0,
    attackedThisTurn: false,
    enemyPressure: 0,
  }, `${node.name}: ${enemy.name}`,
  node.kind === "guardian" ? "The guardian is waiting. Study for a fresh tile hand." : "Study for a fresh tile hand and absorb another mutation.",
  "plain");
};

const completeSupportStop = (state: BlobTacticsState, node: BlobMapNodeDef, title: string, detail: string): BlobTacticsState => withNotice({
  ...state,
  room: node.depth,
  mapDepth: node.depth,
  phase: "map",
  mapChoices: getMapChoicesAfterDepth(node.depth),
  visitedNodeIds: [...state.visitedNodeIds, node.id],
}, title, detail, "good");

export function chooseBlobMapNode(state: BlobTacticsState, nodeId: BlobMapNodeId): BlobTacticsState {
  if (state.phase !== "map" || !state.mapChoices.includes(nodeId)) return state;
  const node = BLOB_MAP_NODES[nodeId];
  if (node.kind === "encounter" || node.kind === "guardian") return enterEncounter(state, node);
  if (node.kind === "rest") {
    const isFullRest = node.id === "softNest" || node.id === "finalNest";
    const hpGain = node.id === "finalNest" ? 5 : isFullRest ? 4 : 3;
    return completeSupportStop({
      ...state,
      pipploHp: Math.min(state.pipploMaxHp, state.pipploHp + hpGain),
      mass: isFullRest ? state.massMax : Math.min(state.massMax, state.mass + 2),
    }, node, node.name, isFullRest
      ? `Pipplo curled up, recovered ${hpGain} HP, and refilled Mass.`
      : "Pipplo splashed around, recovered 3 HP, and gained 2 Mass.");
  }
  if (node.kind === "event") {
    return withNotice({
      ...state,
      room: node.depth,
      mapDepth: node.depth,
      phase: "event",
      mapChoices: [],
      visitedNodeIds: [...state.visitedNodeIds, node.id],
      eventChoices: ["sipWell", "wishWell", "listenWell"],
    }, node.name, "The humming puddle offers three strange bargains.", "plain");
  }
  return withNotice({
    ...state,
    room: node.depth,
    mapDepth: node.depth,
    phase: "workshop",
    mapChoices: [],
    visitedNodeIds: [...state.visitedNodeIds, node.id],
    workshopChoices: getWorkshopChoices(state),
  }, node.name, "Choose one domino tile to add to Pipplo's study bag.", "good");
}

export function claimBlobEventChoice(state: BlobTacticsState, choiceId: BlobEventChoiceId): BlobTacticsState {
  if (state.phase !== "event" || !state.eventChoices.includes(choiceId)) return state;
  const nextMapChoices = getMapChoicesAfterDepth(state.mapDepth);
  if (choiceId === "sipWell") {
    return withNotice({
      ...state,
      phase: "map",
      pipploHp: Math.min(state.pipploMaxHp, state.pipploHp + 3),
      tileBag: [...state.tileBag, "sourSplit"],
      eventChoices: [],
      eventHistory: [...state.eventHistory, choiceId],
      mapChoices: nextMapChoices,
    }, "Sour sip", "Pipplo recovered 3 HP. A risky Sour Split joined the tile bag.", "good");
  }
  if (choiceId === "wishWell") {
    const pipploMaxHp = Math.max(4, state.pipploMaxHp - 1);
    return withNotice({
      ...state,
      phase: "map",
      pipploMaxHp,
      pipploHp: Math.min(pipploMaxHp, state.pipploHp),
      tileBag: [...state.tileBag, "bubble", "bump"],
      eventChoices: [],
      eventHistory: [...state.eventHistory, choiceId],
      mapChoices: nextMapChoices,
    }, "A soft chunk traded away", "Pipplo lost 1 max HP. Bubble Bud and Bump joined the tile bag.", "warn");
  }
  return withNotice({
    ...state,
    phase: "map",
    mass: Math.min(state.massMax, state.mass + 2),
    nextStudyBonusUpgrades: state.nextStudyBonusUpgrades + 1,
    eventChoices: [],
    eventHistory: [...state.eventHistory, choiceId],
    mapChoices: nextMapChoices,
  }, "The well hummed back", "Pipplo recovered 2 Mass. The next study hand gains an upgraded tile.", "good");
}

export function claimWorkshopTile(state: BlobTacticsState, tileType: BlobActionTileType): BlobTacticsState {
  if (state.phase !== "workshop" || !state.workshopChoices.includes(tileType)) return state;
  return withNotice({
    ...state,
    phase: "map",
    tileBag: [...state.tileBag, tileType],
    workshopChoices: [],
    mapChoices: getMapChoicesAfterDepth(state.mapDepth),
  }, `${ACTION_TILE_INFO[tileType].name} added`,
  `Future study hands are now more likely to contain ${ACTION_TILE_INFO[tileType].name}.`,
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
