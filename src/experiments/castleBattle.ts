import type { StudyRewardCurve } from "../game/study";

export const CASTLE_RUN_VERSION = 1;
export const CASTLE_LANE_LENGTH = 100;
export const CASTLE_RALLY_LIMIT = 3;
export const CASTLE_RECALL_BOLT_LIMIT = 5;
export const CASTLE_MAX_ENERGY = 12;

export type CastleSide = "player" | "enemy";
export type CastleContractId = "quick" | "regular" | "long";
export type CastleRunPhase = "battle" | "reward" | "route" | "retire" | "complete" | "lost";
export type CastleBattleMode = "study" | "command";
export type CastleRouteChoice = "battle" | "rest" | "workshop" | "event";
export type CastleUnitKind = "piplet" | "dartlet" | "bubbleBud" | "spitlet" | "bigChonk" | "shellSlime" | "nibbleImp" | "sporeBud" | "echoMoth" | "rootLump";
export type CastlePowerId = "slingshot" | "bubbleGate" | "snackCannon" | "gooMoat" | "timewobble" | "tongueSnatch" | "sporeMortar";
export type CastleUpgradeCategory = "minion" | "castle" | "trait" | "study";
export type CastleFxKind = "spawn" | "hit" | "pop" | "heal" | "power" | "shield";
export type CastleUpgradeId =
  | "splitNursery" | "bubbleBrood" | "stretchyLegs" | "gooSoles" | "snackPockets" | "popcornBodies"
  | "relayJelly" | "bigSibling" | "copycatJelly" | "swarmSchool" | "shellPolish" | "overripeSplit"
  | "snackCannon" | "gooMoat" | "echoBell" | "nurseryChimney" | "rootRepair" | "timewobbleClock"
  | "tongueCrane" | "digestor" | "sporeMortar" | "rallyLantern"
  | "impHorns" | "bubbleBelly" | "sproutTuft" | "springTail" | "starFreckles" | "mothEars"
  | "crabClaws" | "rootMouth" | "nibbleTeeth" | "puddlePaws" | "echoCheeks" | "mossCoat"
  | "firstRecall" | "dueDew" | "redemptionRibbon" | "twoWayTreat" | "deepRecall" | "calmBell"
  | "recallReservoir" | "cleanStreak";

export interface CastleUnitDef {
  kind: CastleUnitKind;
  name: string;
  cost: number;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  attackMs: number;
  accent: string;
  role: string;
}

export interface CastlePowerDef {
  id: CastlePowerId;
  name: string;
  cost: number;
  description: string;
  accent: string;
  requiredUpgradeId?: CastleUpgradeId;
}

export interface CastleUpgradeDef {
  id: CastleUpgradeId;
  name: string;
  description: string;
  category: CastleUpgradeCategory;
  rarity: "common" | "uncommon" | "rare";
  accent: string;
}

export interface CastleUnitState {
  id: string;
  side: CastleSide;
  kind: CastleUnitKind;
  hp: number;
  maxHp: number;
  shield: number;
  position: number;
  attackCooldownMs: number;
  slowMs: number;
  damageBonus: number;
  kills: number;
}

export interface CastleFxEvent {
  id: number;
  kind: CastleFxKind;
  side: CastleSide;
  position: number;
  ttlMs: number;
  label?: string;
}

export interface CastleBattleTelemetry {
  reviews: number;
  correct: number;
  wrong: number;
  unseen: number;
  energyEarned: number;
  energySpent: number;
  rallyTriggered: number;
  summons: number;
  powersUsed: number;
  activeCombatMs: number;
  damageTaken: number;
  damageDealt: number;
  responseMs: number[];
}

export interface CastleBattleState {
  battleNumber: number;
  guardian: boolean;
  mode: CastleBattleMode;
  activeTimeMs: number;
  playerCastleHp: number;
  playerCastleMaxHp: number;
  playerBarrier: number;
  enemyCastleHp: number;
  enemyCastleMaxHp: number;
  energy: number;
  rally: number;
  recallBoltCharge: number;
  missedDirectionKeys: string[];
  cleanStreak: number;
  playerSpawnCount: number;
  enemySpawnCount: number;
  firstSeenCorrectAwarded: boolean;
  firstEnemyDefeatRewarded: boolean;
  recalledDirectionKeys: string[];
  hasteMs: number;
  autoSpawnTimerMs: number;
  enemySpawnTimerMs: number;
  playerTurretTimerMs: number;
  enemyTurretTimerMs: number;
  enemySlowMs: number;
  units: CastleUnitState[];
  nextUnitId: number;
  fxEvents: CastleFxEvent[];
  nextFxId: number;
  notice: string;
  nextEnemyKind: CastleUnitKind;
  afterNextEnemyKind: CastleUnitKind;
  telemetry: CastleBattleTelemetry;
}

export interface CastleRunState {
  version: typeof CASTLE_RUN_VERSION;
  deckId: string;
  savedAt: number;
  contractId: CastleContractId;
  targetRegions: number;
  region: number;
  battleInRegion: number;
  battlesWon: number;
  phase: CastleRunPhase;
  rewardCurve: StudyRewardCurve;
  upgrades: CastleUpgradeId[];
  draftPoolIds: CastleUpgradeId[];
  rewardChoices: CastleUpgradeId[];
  routeChoices: CastleRouteChoice[];
  battle: CastleBattleState;
  rngState: number;
  carriedCastleHp: number;
  carriedEnergy: number;
  reviews: number;
  correct: number;
  wrong: number;
  introducedThisRun: number;
  bestRegion: number;
  notice: string;
}

export interface CastleStudyOutcome {
  isCorrect: boolean;
  isExposure?: boolean;
  wasUnseen: boolean;
  reward: number;
  progressKey: string;
  responseMs: number;
  selfGraded: boolean;
  due: boolean;
}

export interface CastleContractDef {
  id: CastleContractId;
  name: string;
  regions: number;
  minutes: number;
  newCards: number;
  description: string;
}

export const CASTLE_CONTRACTS: Record<CastleContractId, CastleContractDef> = {
  quick: { id: "quick", name: "Quick", regions: 1, minutes: 10, newCards: 5, description: "One region and one guardian castle." },
  regular: { id: "regular", name: "Regular", regions: 2, minutes: 25, newCards: 15, description: "Two regions with a deeper build." },
  long: { id: "long", name: "Long", regions: 3, minutes: 50, newCards: 35, description: "Three regions and the fullest run arc." },
};

export const CASTLE_UNIT_DEFS: Record<CastleUnitKind, CastleUnitDef> = {
  piplet: { kind: "piplet", name: "Piplet", cost: 0, hp: 12, damage: 2, speed: 4.5, range: 2.4, attackMs: 1_000, accent: "#f4d84a", role: "Free frontline wobble" },
  dartlet: { kind: "dartlet", name: "Dartlet", cost: 1, hp: 8, damage: 3, speed: 8, range: 2.2, attackMs: 800, accent: "#ff8a72", role: "Fast pressure" },
  bubbleBud: { kind: "bubbleBud", name: "Bubble Bud", cost: 2, hp: 22, damage: 1, speed: 3.1, range: 2.5, attackMs: 1_200, accent: "#78ccef", role: "Shielding support" },
  spitlet: { kind: "spitlet", name: "Spitlet", cost: 3.5, hp: 10, damage: 4, speed: 3.5, range: 13, attackMs: 1_300, accent: "#a785e5", role: "Ranged shell cracker" },
  bigChonk: { kind: "bigChonk", name: "Big Chonk", cost: 5.5, hp: 50, damage: 7, speed: 2, range: 2.8, attackMs: 1_600, accent: "#82c95c", role: "Slow siege tank" },
  shellSlime: { kind: "shellSlime", name: "Shell Slime", cost: 0, hp: 18, damage: 2, speed: 3, range: 2.5, attackMs: 1_200, accent: "#8fb4b8", role: "Armored defender" },
  nibbleImp: { kind: "nibbleImp", name: "Nibble Imp", cost: 0, hp: 9, damage: 4, speed: 7.2, range: 2.2, attackMs: 850, accent: "#f08b68", role: "Rushing biter" },
  sporeBud: { kind: "sporeBud", name: "Spore Bud", cost: 0, hp: 12, damage: 3, speed: 2.7, range: 11, attackMs: 1_450, accent: "#d77bb7", role: "Hazard lobber" },
  echoMoth: { kind: "echoMoth", name: "Echo Moth", cost: 0, hp: 10, damage: 3, speed: 4.8, range: 14, attackMs: 1_400, accent: "#8175d5", role: "Ranged siphon" },
  rootLump: { kind: "rootLump", name: "Root Lump", cost: 0, hp: 50, damage: 6, speed: 1.7, range: 3, attackMs: 1_750, accent: "#678f45", role: "Guardian siege beast" },
};

export const CASTLE_POWER_DEFS: Record<CastlePowerId, CastlePowerDef> = {
  slingshot: { id: "slingshot", name: "Pipplo Slingshot", cost: 2.5, description: "Pipplo flings a bright goo-shot at the front enemy.", accent: "#f4c84d" },
  bubbleGate: { id: "bubbleGate", name: "Bubble Gate", cost: 3, description: "Raise a 24-point barrier around the castle.", accent: "#69c9ed" },
  snackCannon: { id: "snackCannon", name: "Snack Cannon", cost: 4, description: "Heal every friendly unit and the castle.", accent: "#ff9b7a", requiredUpgradeId: "snackCannon" },
  gooMoat: { id: "gooMoat", name: "Goo Moat", cost: 3.5, description: "Slow every enemy for a short time.", accent: "#82c95c", requiredUpgradeId: "gooMoat" },
  timewobble: { id: "timewobble", name: "Timewobble", cost: 5, description: "Freeze enemy movement and attacks for four seconds.", accent: "#927de3", requiredUpgradeId: "timewobbleClock" },
  tongueSnatch: { id: "tongueSnatch", name: "Tongue Snatch", cost: 6, description: "Pipplo eats a weakened non-guardian enemy.", accent: "#ff6f91", requiredUpgradeId: "tongueCrane" },
  sporeMortar: { id: "sporeMortar", name: "Spore Mortar", cost: 4.5, description: "Burst the three front enemies with prickly spores.", accent: "#ce6eb2", requiredUpgradeId: "sporeMortar" },
};

const upgrade = (
  id: CastleUpgradeId,
  name: string,
  description: string,
  category: CastleUpgradeCategory,
  rarity: CastleUpgradeDef["rarity"],
  accent: string,
): CastleUpgradeDef => ({ id, name, description, category, rarity, accent });

export const CASTLE_UPGRADE_DEFS: Record<CastleUpgradeId, CastleUpgradeDef> = {
  splitNursery: upgrade("splitNursery", "Split Nursery", "Big Chonks split into two Piplets when they pop.", "minion", "uncommon", "#a984e5"),
  bubbleBrood: upgrade("bubbleBrood", "Bubble Brood", "Every third friendly summon hatches with a bubble shield.", "minion", "common", "#70c9ee"),
  stretchyLegs: upgrade("stretchyLegs", "Stretchy Legs", "Friendly melee units can reach farther.", "minion", "common", "#58bfc0"),
  gooSoles: upgrade("gooSoles", "Goo Soles", "Friendly hits briefly slow their target.", "minion", "uncommon", "#78c75a"),
  snackPockets: upgrade("snackPockets", "Snack Pockets", "A friendly pop restores a little castle health.", "minion", "common", "#ff9a75"),
  popcornBodies: upgrade("popcornBodies", "Popcorn Bodies", "When a bubble shield breaks, it pops damage around itself.", "minion", "uncommon", "#f2cc4f"),
  relayJelly: upgrade("relayJelly", "Relay Jelly", "Spitlets encourage nearby allies to hit harder.", "minion", "rare", "#8c7cdb"),
  bigSibling: upgrade("bigSibling", "Big Sibling", "A premium unit summoned to an empty lane grows larger.", "minion", "uncommon", "#83bd59"),
  copycatJelly: upgrade("copycatJelly", "Copycat Jelly", "The first enemy defeated each battle grants a burst of energy.", "minion", "rare", "#d57dbc"),
  swarmSchool: upgrade("swarmSchool", "Swarm School", "Every fifth automatic Piplet brings a friend.", "minion", "uncommon", "#efcf48"),
  shellPolish: upgrade("shellPolish", "Shell Polish", "Every friendly unit begins with a small shell.", "minion", "common", "#91b7ba"),
  overripeSplit: upgrade("overripeSplit", "Overripe Split", "Paid units leave a Piplet behind when defeated.", "minion", "rare", "#d879aa"),
  snackCannon: upgrade("snackCannon", "Snack Cannon", "Unlock a castle-wide healing snack burst.", "castle", "uncommon", "#ff9877"),
  gooMoat: upgrade("gooMoat", "Goo Moat", "Unlock a lane-wide enemy slow.", "castle", "common", "#77c25d"),
  echoBell: upgrade("echoBell", "Echo Bell", "The first paid summon each battle is echoed as a Piplet.", "castle", "rare", "#9b82df"),
  nurseryChimney: upgrade("nurseryChimney", "Nursery Chimney", "Automatic Piplets hatch more quickly.", "castle", "common", "#f0cc4d"),
  rootRepair: upgrade("rootRepair", "Root Repair", "Every fifth correct review repairs the castle.", "castle", "uncommon", "#6ab65b"),
  timewobbleClock: upgrade("timewobbleClock", "Timewobble Clock", "Unlock a four-second enemy freeze.", "castle", "rare", "#927de3"),
  tongueCrane: upgrade("tongueCrane", "Tongue Crane", "Unlock Pipplo's weakened-enemy snatch.", "castle", "rare", "#f46e91"),
  digestor: upgrade("digestor", "Digestor", "Enemy defeats drip a little summon energy.", "castle", "uncommon", "#e9b84b"),
  sporeMortar: upgrade("sporeMortar", "Spore Mortar", "Unlock a burst against the enemy front line.", "castle", "uncommon", "#ce70b4"),
  rallyLantern: upgrade("rallyLantern", "Rally Lantern", "Ignore the first Rally pip in each battle.", "castle", "rare", "#f4d55a"),
  impHorns: upgrade("impHorns", "Imp Horns", "Castle shots splash a second enemy.", "trait", "uncommon", "#ef795e"),
  bubbleBelly: upgrade("bubbleBelly", "Bubble Belly", "The first paid summon each battle gains a large shield.", "trait", "uncommon", "#70c9ee"),
  sproutTuft: upgrade("sproutTuft", "Sprout Tuft", "Recover extra castle health between battles.", "trait", "common", "#73bd5c"),
  springTail: upgrade("springTail", "Spring Tail", "Friendly units move faster.", "trait", "common", "#efcf50"),
  starFreckles: upgrade("starFreckles", "Star Freckles", "Struggling recalls earn a little extra energy.", "trait", "rare", "#9a83df"),
  mothEars: upgrade("mothEars", "Moth Ears", "Preview the next two enemy wave types.", "trait", "uncommon", "#8479d4"),
  crabClaws: upgrade("crabClaws", "Crab Claws", "Increase maximum castle health.", "trait", "common", "#8db4bb"),
  rootMouth: upgrade("rootMouth", "Root Mouth", "Big Chonks deal extra damage to castles.", "trait", "rare", "#71994e"),
  nibbleTeeth: upgrade("nibbleTeeth", "Nibble Teeth", "Tongue Snatch can eat healthier targets.", "trait", "uncommon", "#ef8867"),
  puddlePaws: upgrade("puddlePaws", "Puddle Paws", "Friendly slows last longer.", "trait", "common", "#78bf58"),
  echoCheeks: upgrade("echoCheeks", "Echo Cheeks", "Two-way recall on one card summons a Piplet.", "trait", "rare", "#cf75ad"),
  mossCoat: upgrade("mossCoat", "Moss Coat", "Rest routes also grant two starting energy.", "trait", "uncommon", "#6cad57"),
  firstRecall: upgrade("firstRecall", "First Recall", "The first correct seen review each battle gives +0.5 energy.", "study", "common", "#f1c94d"),
  dueDew: upgrade("dueDew", "Due Dew", "A correct due review adds a small castle barrier.", "study", "uncommon", "#70c7e8"),
  redemptionRibbon: upgrade("redemptionRibbon", "Redemption Ribbon", "Clearing a Rally pip also repairs the castle.", "study", "uncommon", "#ef7792"),
  twoWayTreat: upgrade("twoWayTreat", "Two-Way Treat", "Recalling both directions of a card summons a Piplet.", "study", "rare", "#f0a96b"),
  deepRecall: upgrade("deepRecall", "Deep Recall", "Self-graded correct answers earn 10% more energy.", "study", "common", "#957ede"),
  calmBell: upgrade("calmBell", "Calm Bell", "Below 25% castle health, enemy pressure slows without pausing combat.", "study", "uncommon", "#7ac7c3"),
  recallReservoir: upgrade("recallReservoir", "Recall Reservoir", "Carry up to 1.5 energy between battles.", "study", "rare", "#7489dd"),
  cleanStreak: upgrade("cleanStreak", "Clean Streak", "Every fifth consecutive correct review hastes allies.", "study", "uncommon", "#f0d04f"),
};

export const STARTER_CASTLE_UPGRADE_IDS: CastleUpgradeId[] = [
  "splitNursery", "bubbleBrood", "stretchyLegs", "gooSoles", "snackPockets", "swarmSchool",
  "shellPolish", "snackCannon", "gooMoat", "nurseryChimney", "sproutTuft", "springTail",
  "crabClaws", "firstRecall", "dueDew", "redemptionRibbon", "deepRecall", "cleanStreak",
];

export const ALL_CASTLE_UPGRADE_IDS = Object.keys(CASTLE_UPGRADE_DEFS) as CastleUpgradeId[];

export function getAvailableCastlePowers(upgrades: CastleUpgradeId[]): CastlePowerDef[] {
  return Object.values(CASTLE_POWER_DEFS).filter(power => !power.requiredUpgradeId || upgrades.includes(power.requiredUpgradeId));
}

export function getPlayerSummonKinds(): CastleUnitKind[] {
  return ["dartlet", "bubbleBud", "spitlet", "bigChonk"];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundEnergy(value: number): number {
  return Math.round(value * 100) / 100;
}

function seedFromString(value: string): number {
  let seed = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16_777_619);
  }
  return seed >>> 0 || 1;
}

function nextRandom(state: number): { value: number; state: number } {
  let next = state >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return { value: (next >>> 0) / 4_294_967_296, state: next >>> 0 || 1 };
}

function hasUpgrade(upgrades: CastleUpgradeId[], id: CastleUpgradeId): boolean {
  return upgrades.includes(id);
}

function createTelemetry(): CastleBattleTelemetry {
  return {
    reviews: 0,
    correct: 0,
    wrong: 0,
    unseen: 0,
    energyEarned: 0,
    energySpent: 0,
    rallyTriggered: 0,
    summons: 0,
    powersUsed: 0,
    activeCombatMs: 0,
    damageTaken: 0,
    damageDealt: 0,
    responseMs: [],
  };
}

function getEnemyWaveKind(region: number, battleInRegion: number, wave: number, guardian: boolean): CastleUnitKind {
  if (guardian && wave % 7 === 6) return "rootLump";
  const regionPool: CastleUnitKind[] = region <= 1
    ? ["shellSlime", "nibbleImp", "sporeBud"]
    : region === 2
      ? ["nibbleImp", "sporeBud", "echoMoth", "shellSlime"]
      : ["echoMoth", "shellSlime", "sporeBud", "nibbleImp"];
  return regionPool[(wave + battleInRegion + region) % regionPool.length];
}

function createBattle(
  region: number,
  battleInRegion: number,
  carriedCastleHp: number,
  carriedEnergy: number,
  upgrades: CastleUpgradeId[],
): CastleBattleState {
  const guardian = battleInRegion === 3;
  const playerCastleMaxHp = 100 + (hasUpgrade(upgrades, "crabClaws") ? 20 : 0);
  const enemyCastleMaxHp = 72 + (region * 18) + (battleInRegion * 10) + (guardian ? 42 : 0);
  return {
    battleNumber: ((region - 1) * 3) + battleInRegion,
    guardian,
    mode: "command",
    activeTimeMs: 0,
    playerCastleHp: clamp(carriedCastleHp || playerCastleMaxHp, 1, playerCastleMaxHp),
    playerCastleMaxHp,
    playerBarrier: hasUpgrade(upgrades, "bubbleBelly") ? 8 : 0,
    enemyCastleHp: enemyCastleMaxHp,
    enemyCastleMaxHp,
    energy: clamp(carriedEnergy, 0, CASTLE_MAX_ENERGY),
    rally: 0,
    recallBoltCharge: 0,
    missedDirectionKeys: [],
    cleanStreak: 0,
    playerSpawnCount: 0,
    enemySpawnCount: 0,
    firstSeenCorrectAwarded: false,
    firstEnemyDefeatRewarded: false,
    recalledDirectionKeys: [],
    hasteMs: 0,
    autoSpawnTimerMs: 1_500,
    enemySpawnTimerMs: guardian ? 2_500 : 4_000,
    playerTurretTimerMs: 1_500,
    enemyTurretTimerMs: 2_500,
    enemySlowMs: 0,
    units: [],
    nextUnitId: 1,
    fxEvents: [],
    nextFxId: 1,
    notice: guardian ? "A guardian castle blocks the region gate." : "Pipplo's nursery is ready. Begin the next review.",
    nextEnemyKind: getEnemyWaveKind(region, battleInRegion, 0, guardian),
    afterNextEnemyKind: getEnemyWaveKind(region, battleInRegion, 1, guardian),
    telemetry: createTelemetry(),
  };
}

export function createInitialCastleRun(
  deckId: string,
  contractId: CastleContractId = "regular",
  rewardCurve: StudyRewardCurve = "quadratic",
  draftPoolIds: CastleUpgradeId[] = STARTER_CASTLE_UPGRADE_IDS,
  seedOverride?: number,
): CastleRunState {
  const contract = CASTLE_CONTRACTS[contractId];
  const seed = seedOverride ?? seedFromString(`${deckId}:${contractId}:${Date.now()}`);
  const battle = createBattle(1, 1, 100, 0, []);
  return {
    version: CASTLE_RUN_VERSION,
    deckId,
    savedAt: Date.now(),
    contractId,
    targetRegions: contract.regions,
    region: 1,
    battleInRegion: 1,
    battlesWon: 0,
    phase: "battle",
    rewardCurve,
    upgrades: [],
    draftPoolIds: Array.from(new Set([...STARTER_CASTLE_UPGRADE_IDS, ...draftPoolIds])),
    rewardChoices: [],
    routeChoices: [],
    battle,
    rngState: seed,
    carriedCastleHp: battle.playerCastleHp,
    carriedEnergy: 0,
    reviews: 0,
    correct: 0,
    wrong: 0,
    introducedThisRun: 0,
    bestRegion: 1,
    notice: `${contract.name} expedition: clear ${contract.regions} region${contract.regions === 1 ? "" : "s"}.`,
  };
}

export function recordCastleIntroductions(run: CastleRunState, count: number): CastleRunState {
  return { ...run, savedAt: Date.now(), introducedThisRun: run.introducedThisRun + Math.max(0, Math.floor(count)) };
}

function createUnit(
  side: CastleSide,
  kind: CastleUnitKind,
  id: number,
  upgrades: CastleUpgradeId[],
  paid: boolean,
  friendlyCount: number,
  playerSpawnCount: number,
): CastleUnitState {
  const def = CASTLE_UNIT_DEFS[kind];
  let hpMultiplier = 1;
  let damageBonus = 0;
  let shield = 0;
  if (side === "player") {
    if (hasUpgrade(upgrades, "shellPolish")) shield += 3;
    if (paid && friendlyCount === 0 && hasUpgrade(upgrades, "bigSibling")) {
      hpMultiplier += 0.35;
      damageBonus += 2;
    }
    if (playerSpawnCount % 3 === 2 && hasUpgrade(upgrades, "bubbleBrood")) shield += 8;
    if (paid && playerSpawnCount === 0 && hasUpgrade(upgrades, "bubbleBelly")) shield += 12;
  } else {
    if (kind === "shellSlime") shield += 6;
    if (kind === "rootLump") shield += 6;
  }
  const hp = Math.round(def.hp * hpMultiplier);
  return {
    id: `${side}-${id}`,
    side,
    kind,
    hp,
    maxHp: hp,
    shield,
    position: side === "player" ? 6 : 94,
    attackCooldownMs: 250,
    slowMs: 0,
    damageBonus,
    kills: 0,
  };
}

function addUnit(
  battle: CastleBattleState,
  side: CastleSide,
  kind: CastleUnitKind,
  upgrades: CastleUpgradeId[],
  paid = false,
): CastleBattleState {
  const friendlyCount = battle.units.filter(unit => unit.side === side).length;
  const unit = createUnit(side, kind, battle.nextUnitId, upgrades, paid, friendlyCount, battle.playerSpawnCount);
  return {
    ...battle,
    units: [...battle.units, unit],
    nextUnitId: battle.nextUnitId + 1,
    fxEvents: [...battle.fxEvents, { id: battle.nextFxId, kind: "spawn" as const, side, position: unit.position, ttlMs: 450 }].slice(-14),
    nextFxId: battle.nextFxId + 1,
    playerSpawnCount: side === "player" ? battle.playerSpawnCount + 1 : battle.playerSpawnCount,
    enemySpawnCount: side === "enemy" ? battle.enemySpawnCount + 1 : battle.enemySpawnCount,
  };
}

function addBattleFx(
  battle: CastleBattleState,
  kind: CastleFxKind,
  side: CastleSide,
  position: number,
  label?: string,
): CastleBattleState {
  return {
    ...battle,
    fxEvents: [...battle.fxEvents, { id: battle.nextFxId, kind, side, position, ttlMs: kind === "power" ? 700 : 480, label }].slice(-14),
    nextFxId: battle.nextFxId + 1,
  };
}

function getUnitStats(unit: CastleUnitState, upgrades: CastleUpgradeId[], units: CastleUnitState[]) {
  const def = CASTLE_UNIT_DEFS[unit.kind];
  const friendly = unit.side === "player";
  const meleeRangeBonus = friendly && hasUpgrade(upgrades, "stretchyLegs") && def.range < 4 ? 1.8 : 0;
  const speedMultiplier = friendly && hasUpgrade(upgrades, "springTail") ? 1.16 : 1;
  const spitletRelay = friendly && hasUpgrade(upgrades, "relayJelly") && units.some(candidate => (
    candidate.side === "player"
    && candidate.kind === "spitlet"
    && candidate.hp > 0
    && Math.abs(candidate.position - unit.position) <= 10
  )) ? 1 : 0;
  return {
    damage: def.damage + unit.damageBonus + spitletRelay,
    speed: def.speed * speedMultiplier,
    range: def.range + meleeRangeBonus,
    attackMs: def.attackMs,
  };
}

function applyDamage(unit: CastleUnitState, damage: number): { unit: CastleUnitState; shieldBroke: boolean; damageToHp: number } {
  const absorbed = Math.min(unit.shield, damage);
  const shield = unit.shield - absorbed;
  const damageToHp = Math.max(0, damage - absorbed);
  return {
    unit: { ...unit, shield, hp: unit.hp - damageToHp },
    shieldBroke: unit.shield > 0 && shield === 0,
    damageToHp,
  };
}

function nearestUnit(units: CastleUnitState[], source: CastleUnitState): CastleUnitState | null {
  const enemies = units.filter(unit => unit.side !== source.side && unit.hp > 0);
  if (enemies.length === 0) return null;
  return enemies.reduce((best, candidate) => {
    const bestDistance = Math.abs(best.position - source.position);
    const candidateDistance = Math.abs(candidate.position - source.position);
    return candidateDistance < bestDistance ? candidate : best;
  });
}

function resolveBattleStep(
  current: CastleBattleState,
  deltaMs: number,
  upgrades: CastleUpgradeId[],
  region: number,
  battleInRegion: number,
  enemyPressureSpeed: number,
): CastleBattleState {
  let battle: CastleBattleState = {
    ...current,
    activeTimeMs: current.activeTimeMs + deltaMs,
    autoSpawnTimerMs: current.autoSpawnTimerMs - deltaMs,
    enemySpawnTimerMs: current.enemySpawnTimerMs - (deltaMs * enemyPressureSpeed),
    playerTurretTimerMs: current.playerTurretTimerMs - deltaMs,
    enemyTurretTimerMs: current.enemyTurretTimerMs - (deltaMs * enemyPressureSpeed),
    enemySlowMs: Math.max(0, current.enemySlowMs - deltaMs),
    hasteMs: Math.max(0, current.hasteMs - deltaMs),
    telemetry: {
      ...current.telemetry,
      activeCombatMs: current.telemetry.activeCombatMs + deltaMs,
    },
    units: current.units.map(unit => ({
      ...unit,
      attackCooldownMs: Math.max(0, unit.attackCooldownMs - (unit.side === "enemy"
        ? deltaMs * enemyPressureSpeed
        : deltaMs * (current.hasteMs > 0 ? 1.3 : 1))),
      slowMs: Math.max(0, unit.slowMs - deltaMs),
    })),
    fxEvents: current.fxEvents
      .map(event => ({ ...event, ttlMs: event.ttlMs - deltaMs }))
      .filter(event => event.ttlMs > 0),
  };

  const autoInterval = hasUpgrade(upgrades, "nurseryChimney") ? 5_500 : 6_800;
  if (battle.autoSpawnTimerMs <= 0) {
    battle = addUnit(battle, "player", "piplet", upgrades);
    if (hasUpgrade(upgrades, "swarmSchool") && battle.playerSpawnCount % 5 === 0) {
      battle = addUnit(battle, "player", "piplet", upgrades);
    }
    battle.autoSpawnTimerMs += autoInterval;
  }
  if (battle.enemySpawnTimerMs <= 0) {
    battle = addUnit(battle, "enemy", battle.nextEnemyKind, upgrades);
    battle.nextEnemyKind = battle.afterNextEnemyKind;
    battle.afterNextEnemyKind = getEnemyWaveKind(region, battleInRegion, battle.enemySpawnCount + 1, battle.guardian);
    battle.enemySpawnTimerMs += Math.max(5_500, 9_500 - (region * 450) - (battle.guardian ? 900 : 0));
  }

  const damageById = new Map<string, number>();
  const slowById = new Map<string, number>();
  const shieldById = new Map<string, number>();
  const popSplashById = new Map<string, number>();
  const generatedFx: Array<{ kind: CastleFxKind; side: CastleSide; position: number; label?: string }> = [];
  let playerCastleDamage = 0;
  let enemyCastleDamage = 0;
  let energyDrain = 0;
  const updatedUnits = battle.units.map(unit => {
    if (unit.hp <= 0) return unit;
    const stats = getUnitStats(unit, upgrades, battle.units);
    const target = nearestUnit(battle.units, unit);
    const targetDistance = target ? Math.abs(target.position - unit.position) : Number.POSITIVE_INFINITY;
    const castleDistance = unit.side === "player" ? CASTLE_LANE_LENGTH - unit.position : unit.position;
    const canAttackTarget = target && targetDistance <= stats.range;
    const canAttackCastle = !canAttackTarget && castleDistance <= stats.range + 3;
    if (unit.side === "player" && unit.kind === "bubbleBud" && unit.attackCooldownMs <= 0) {
      const ally = battle.units
        .filter(candidate => candidate.side === "player" && candidate.id !== unit.id && candidate.hp > 0 && Math.abs(candidate.position - unit.position) <= 10)
        .sort((a, b) => a.shield - b.shield)[0];
      if (ally) {
        shieldById.set(ally.id, (shieldById.get(ally.id) || 0) + 3);
        generatedFx.push({ kind: "shield", side: "player", position: ally.position, label: "+3" });
        return { ...unit, attackCooldownMs: 1_500 };
      }
    }
    if ((canAttackTarget || canAttackCastle) && unit.attackCooldownMs <= 0) {
      let damage = stats.damage;
      if (unit.side === "player" && unit.kind === "bigChonk" && hasUpgrade(upgrades, "rootMouth") && canAttackCastle) damage += 4;
      if (canAttackTarget && target) {
        if (unit.kind === "spitlet" && target.shield > 0) damage += 3;
        damageById.set(target.id, (damageById.get(target.id) || 0) + damage);
        generatedFx.push({ kind: "hit", side: unit.side, position: target.position, label: `${damage}` });
        if (unit.side === "player" && hasUpgrade(upgrades, "gooSoles")) {
          slowById.set(target.id, hasUpgrade(upgrades, "puddlePaws") ? 2_600 : 1_500);
        }
        if (unit.side === "enemy" && unit.kind === "sporeBud") slowById.set(target.id, 1_600);
      } else if (canAttackCastle) {
        if (unit.side === "player") {
          enemyCastleDamage += damage;
          generatedFx.push({ kind: "hit", side: "player", position: 98, label: `${damage}` });
        } else {
          playerCastleDamage += damage;
          if (unit.kind === "echoMoth") energyDrain += 0.15;
          generatedFx.push({ kind: "hit", side: "enemy", position: 2, label: `${damage}` });
        }
      }
      return { ...unit, attackCooldownMs: stats.attackMs };
    }
    if (!canAttackTarget && !canAttackCastle) {
      const slowMultiplier = unit.slowMs > 0 ? 0.5 : 1;
      const globalEnemyMultiplier = unit.side === "enemy" && battle.enemySlowMs > 0 ? 0 : 1;
      const hasteMultiplier = unit.side === "player" && battle.hasteMs > 0 ? 1.3 : 1;
      const direction = unit.side === "player" ? 1 : -1;
      const sidePressureMultiplier = unit.side === "enemy" ? enemyPressureSpeed : 1;
      const movement = stats.speed * (deltaMs / 1_000) * slowMultiplier * globalEnemyMultiplier * hasteMultiplier * sidePressureMultiplier;
      const nextPosition = clamp(unit.position + (direction * movement), 2, CASTLE_LANE_LENGTH - 2);
      return { ...unit, position: nextPosition };
    }
    return unit;
  });

  const damagedUnits = updatedUnits.map(unit => {
    const damage = damageById.get(unit.id) || 0;
    if (damage <= 0) return {
      ...unit,
      shield: Math.min(18, unit.shield + (shieldById.get(unit.id) || 0)),
      slowMs: Math.max(unit.slowMs, slowById.get(unit.id) || 0),
    };
    const damaged = applyDamage(unit, damage);
    if (damaged.shieldBroke && hasUpgrade(upgrades, "popcornBodies")) {
      const nearby = updatedUnits.find(candidate => candidate.side !== unit.side && Math.abs(candidate.position - unit.position) <= 5);
        if (nearby) popSplashById.set(nearby.id, (popSplashById.get(nearby.id) || 0) + 2);
    }
    return {
      ...damaged.unit,
      shield: Math.min(18, damaged.unit.shield + (shieldById.get(unit.id) || 0)),
      slowMs: Math.max(damaged.unit.slowMs, slowById.get(unit.id) || 0),
    };
  });

  battle = {
    ...battle,
    units: damagedUnits.map(unit => {
      const splash = popSplashById.get(unit.id) || 0;
      return splash > 0 ? applyDamage(unit, splash).unit : unit;
    }),
  };
  if (battle.playerTurretTimerMs <= 0) {
    const target = battle.units.filter(unit => unit.side === "enemy" && unit.position <= 32 && unit.hp > 0).sort((a, b) => a.position - b.position)[0];
    if (target) {
      battle.units = battle.units.map(unit => unit.id === target.id ? applyDamage(unit, 4).unit : unit);
      generatedFx.push({ kind: "hit", side: "player", position: target.position, label: "4" });
      if (hasUpgrade(upgrades, "impHorns")) {
        const splash = battle.units.filter(unit => unit.side === "enemy" && unit.id !== target.id && unit.hp > 0).sort((a, b) => a.position - b.position)[0];
        if (splash) battle.units = battle.units.map(unit => unit.id === splash.id ? applyDamage(unit, 2).unit : unit);
      }
    }
    battle.playerTurretTimerMs += 3_200;
  }
  if (battle.enemyTurretTimerMs <= 0) {
    const target = battle.units.filter(unit => unit.side === "player" && unit.position >= 68 && unit.hp > 0).sort((a, b) => b.position - a.position)[0];
    if (target) {
      battle.units = battle.units.map(unit => unit.id === target.id ? applyDamage(unit, battle.guardian ? 4 : 3).unit : unit);
      generatedFx.push({ kind: "hit", side: "enemy", position: target.position, label: `${battle.guardian ? 4 : 3}` });
    }
    battle.enemyTurretTimerMs += battle.guardian ? 2_700 : 3_500;
  }

  const defeated = battle.units.filter(unit => unit.hp <= 0);
  const survivors = battle.units.filter(unit => unit.hp > 0);
  let next = { ...battle, units: survivors };
  for (const unit of defeated) {
    generatedFx.push({ kind: "pop", side: unit.side, position: unit.position });
    if (unit.side === "player") {
      if (hasUpgrade(upgrades, "snackPockets")) next.playerCastleHp = Math.min(next.playerCastleMaxHp, next.playerCastleHp + 1);
      if (unit.kind === "bigChonk" && hasUpgrade(upgrades, "splitNursery")) {
        next = addUnit(addUnit(next, "player", "piplet", upgrades), "player", "piplet", upgrades);
      } else if (unit.kind !== "piplet" && hasUpgrade(upgrades, "overripeSplit")) {
        next = addUnit(next, "player", "piplet", upgrades);
      }
    } else {
      if (hasUpgrade(upgrades, "digestor")) next.energy = roundEnergy(Math.min(CASTLE_MAX_ENERGY, next.energy + 0.15));
      if (!next.firstEnemyDefeatRewarded && hasUpgrade(upgrades, "copycatJelly")) {
        next.energy = roundEnergy(Math.min(CASTLE_MAX_ENERGY, next.energy + 0.75));
        next.firstEnemyDefeatRewarded = true;
      }
    }
  }

  const barrierAbsorb = Math.min(next.playerBarrier, playerCastleDamage);
  const hpDamage = Math.max(0, playerCastleDamage - barrierAbsorb);
  next.playerBarrier -= barrierAbsorb;
  next.playerCastleHp = Math.max(0, next.playerCastleHp - hpDamage);
  next.enemyCastleHp = Math.max(0, next.enemyCastleHp - enemyCastleDamage);
  next.energy = roundEnergy(Math.max(0, next.energy - energyDrain));
  next.telemetry = {
    ...next.telemetry,
    damageTaken: next.telemetry.damageTaken + hpDamage,
    damageDealt: next.telemetry.damageDealt + enemyCastleDamage,
  };
  for (const effect of generatedFx) next = addBattleFx(next, effect.kind, effect.side, effect.position, effect.label);
  return next;
}

function drawUpgradeChoices(run: CastleRunState): { choices: CastleUpgradeId[]; rngState: number } {
  const owned = new Set(run.upgrades);
  let pool = run.draftPoolIds.filter(id => !owned.has(id));
  if (pool.length < 3) pool = run.draftPoolIds;
  const choices: CastleUpgradeId[] = [];
  let rngState = run.rngState;
  while (pool.length > 0 && choices.length < 3) {
    const roll = nextRandom(rngState);
    rngState = roll.state;
    const index = Math.floor(roll.value * pool.length);
    const [picked] = pool.splice(index, 1);
    if (picked && !choices.includes(picked)) choices.push(picked);
  }
  return { choices, rngState };
}

export function tickCastleRun(run: CastleRunState, deltaMs: number, combatSpeed = 1): CastleRunState {
  if (run.phase !== "battle" || run.battle.mode !== "study") return run;
  const safeDelta = clamp(deltaMs, 0, 250);
  const battle = resolveBattleStep(run.battle, safeDelta, run.upgrades, run.region, run.battleInRegion, clamp(combatSpeed, 0.25, 1.5));
  if (battle.playerCastleHp <= 0) {
    return {
      ...run,
      savedAt: Date.now(),
      phase: "lost",
      battle: { ...battle, mode: "command", notice: "Pipplo's castle fell, but every review is safely recorded." },
      carriedCastleHp: 0,
      notice: "The expedition ended. Your learning progress remains saved.",
    };
  }
  if (battle.enemyCastleHp <= 0) {
    const choiceResult = drawUpgradeChoices({ ...run, battle });
    return {
      ...run,
      savedAt: Date.now(),
      phase: "reward",
      battle: { ...battle, mode: "command", notice: "The enemy castle burst into edible sparkles!" },
      rewardChoices: choiceResult.choices,
      rngState: choiceResult.rngState,
      carriedCastleHp: battle.playerCastleHp,
      carriedEnergy: hasUpgrade(run.upgrades, "recallReservoir") ? Math.min(1.5, battle.energy) : 0,
      battlesWon: run.battlesWon + 1,
      bestRegion: Math.max(run.bestRegion, run.region),
      notice: battle.guardian ? "Guardian defeated. Choose what Pipplo digests." : "Castle defeated. Choose one run mutation.",
    };
  }
  return { ...run, savedAt: Date.now(), battle };
}

export function summonCastleUnit(run: CastleRunState, kind: CastleUnitKind): CastleRunState {
  if (run.phase !== "battle") return run;
  if (!getPlayerSummonKinds().includes(kind)) return run;
  const def = CASTLE_UNIT_DEFS[kind];
  if (run.battle.energy < def.cost) return run;
  let battle = addUnit(run.battle, "player", kind, run.upgrades, true);
  const firstPaid = run.battle.telemetry.summons === 0;
  if (firstPaid && hasUpgrade(run.upgrades, "echoBell")) battle = addUnit(battle, "player", "piplet", run.upgrades);
  battle = {
    ...battle,
    energy: roundEnergy(battle.energy - def.cost),
    notice: `${def.name} wobbled out of Pipplo's nursery.`,
    telemetry: {
      ...battle.telemetry,
      energySpent: battle.telemetry.energySpent + def.cost,
      summons: battle.telemetry.summons + 1,
    },
  };
  return { ...run, savedAt: Date.now(), battle };
}

export function activateCastlePower(run: CastleRunState, powerId: CastlePowerId): CastleRunState {
  if (run.phase !== "battle") return run;
  const power = CASTLE_POWER_DEFS[powerId];
  if (!getAvailableCastlePowers(run.upgrades).some(candidate => candidate.id === powerId)) return run;
  if (run.battle.energy < power.cost) return run;
  let battle: CastleBattleState = {
    ...run.battle,
    energy: roundEnergy(run.battle.energy - power.cost),
    notice: `${power.name}! ${power.description}`,
    telemetry: {
      ...run.battle.telemetry,
      energySpent: run.battle.telemetry.energySpent + power.cost,
      powersUsed: run.battle.telemetry.powersUsed + 1,
    },
  };
  if (powerId === "slingshot") {
    const targets = battle.units.filter(unit => unit.side === "enemy").sort((a, b) => a.position - b.position).slice(0, hasUpgrade(run.upgrades, "impHorns") ? 2 : 1);
    const ids = new Set(targets.map(unit => unit.id));
    battle.units = battle.units.map(unit => ids.has(unit.id) ? applyDamage(unit, unit.id === targets[0]?.id ? 12 : 6).unit : unit);
    if (targets.length === 0) {
      battle.enemyCastleHp = Math.max(0, battle.enemyCastleHp - 8);
      battle = addBattleFx(battle, "hit", "player", 98, "8");
    } else {
      for (const target of targets) battle = addBattleFx(battle, "hit", "player", target.position, target.id === targets[0]?.id ? "12" : "6");
    }
    battle = addBattleFx(battle, "power", "player", 18, "Fling!");
  } else if (powerId === "bubbleGate") {
    battle.playerBarrier += 24;
    battle = addBattleFx(battle, "shield", "player", 4, "+24");
  } else if (powerId === "snackCannon") {
    battle.playerCastleHp = Math.min(battle.playerCastleMaxHp, battle.playerCastleHp + 10);
    battle.units = battle.units.map(unit => unit.side === "player" ? { ...unit, hp: Math.min(unit.maxHp, unit.hp + 8) } : unit);
    battle = addBattleFx(battle, "heal", "player", 7, "+10");
  } else if (powerId === "gooMoat") {
    battle.units = battle.units.map(unit => unit.side === "enemy" ? { ...unit, slowMs: Math.max(unit.slowMs, hasUpgrade(run.upgrades, "puddlePaws") ? 6_000 : 4_000) } : unit);
    battle = addBattleFx(battle, "power", "player", 50, "Goo moat!");
  } else if (powerId === "timewobble") {
    battle.enemySlowMs = 4_000;
    battle = addBattleFx(battle, "power", "player", 66, "Wobble!");
  } else if (powerId === "tongueSnatch") {
    const threshold = hasUpgrade(run.upgrades, "nibbleTeeth") ? 0.65 : 0.4;
    const target = battle.units.filter(unit => unit.side === "enemy" && unit.kind !== "rootLump" && unit.hp / unit.maxHp <= threshold).sort((a, b) => a.position - b.position)[0];
    if (target) {
      battle.units = battle.units.filter(unit => unit.id !== target.id);
      battle.energy = roundEnergy(Math.min(CASTLE_MAX_ENERGY, battle.energy + (hasUpgrade(run.upgrades, "digestor") ? 0.75 : 0.35)));
      battle = addBattleFx(battle, "pop", "player", target.position, "Snatched!");
    } else {
      battle.energy = roundEnergy(Math.min(CASTLE_MAX_ENERGY, battle.energy + power.cost));
      battle.notice = "No weakened enemy was close enough to snatch. Energy refunded.";
      battle.telemetry.energySpent -= power.cost;
      battle.telemetry.powersUsed -= 1;
    }
  } else if (powerId === "sporeMortar") {
    const targets = battle.units.filter(unit => unit.side === "enemy").sort((a, b) => a.position - b.position).slice(0, 3);
    const ids = new Set(targets.map(unit => unit.id));
    battle.units = battle.units.map(unit => ids.has(unit.id) ? applyDamage(unit, 8).unit : unit);
    for (const target of targets) battle = addBattleFx(battle, "hit", "player", target.position, "8");
    battle = addBattleFx(battle, "power", "player", 54, "Spore burst!");
  }
  return { ...run, savedAt: Date.now(), battle };
}

function removeOne<T>(items: T[], value: T): T[] {
  const index = items.indexOf(value);
  return index < 0 ? items : [...items.slice(0, index), ...items.slice(index + 1)];
}

export function applyCastleStudyOutcome(run: CastleRunState, outcome: CastleStudyOutcome): CastleRunState {
  if (run.phase !== "battle") return run;
  const graded = !outcome.isExposure;
  let battle: CastleBattleState = {
    ...run.battle,
    mode: "command",
    telemetry: {
      ...run.battle.telemetry,
      reviews: run.battle.telemetry.reviews + 1,
      correct: run.battle.telemetry.correct + (graded && outcome.isCorrect ? 1 : 0),
      wrong: run.battle.telemetry.wrong + (graded && !outcome.isCorrect ? 1 : 0),
      unseen: run.battle.telemetry.unseen + (outcome.wasUnseen ? 1 : 0),
      responseMs: [...run.battle.telemetry.responseMs, Math.max(0, outcome.responseMs)].slice(-200),
    },
  };
  let notice = "Review recorded.";
  if (outcome.isExposure) {
    battle.energy = roundEnergy(Math.min(CASTLE_MAX_ENERGY, battle.energy + outcome.reward));
    battle.telemetry.energyEarned = roundEnergy(battle.telemetry.energyEarned + outcome.reward);
    notice = `New direction learned: +${roundEnergy(outcome.reward)} energy. Combat stayed safely paused.`;
  } else if (outcome.isCorrect) {
    let reward = outcome.reward;
    if (outcome.selfGraded && hasUpgrade(run.upgrades, "deepRecall")) reward *= 1.1;
    if (!outcome.wasUnseen && !battle.firstSeenCorrectAwarded && hasUpgrade(run.upgrades, "firstRecall")) {
      reward += 0.5;
      battle.firstSeenCorrectAwarded = true;
    }
    if (!outcome.wasUnseen && outcome.reward >= 1.5 && hasUpgrade(run.upgrades, "starFreckles")) reward += 0.25;
    const recovered = battle.missedDirectionKeys.includes(outcome.progressKey);
    if (recovered) {
      battle.missedDirectionKeys = removeOne(battle.missedDirectionKeys, outcome.progressKey);
      battle.rally = Math.max(0, battle.rally - 1);
      if (hasUpgrade(run.upgrades, "redemptionRibbon")) {
        battle.playerCastleHp = Math.min(battle.playerCastleMaxHp, battle.playerCastleHp + 3);
      }
    }
    const otherDirectionKey = outcome.progressKey.endsWith("::term_to_definition")
      ? outcome.progressKey.replace("::term_to_definition", "::definition_to_term")
      : outcome.progressKey.replace("::definition_to_term", "::term_to_definition");
    const completedBothDirections = battle.recalledDirectionKeys.includes(otherDirectionKey)
      && !battle.recalledDirectionKeys.includes(outcome.progressKey);
    battle.recalledDirectionKeys = Array.from(new Set([...battle.recalledDirectionKeys, outcome.progressKey]));
    if (completedBothDirections && (hasUpgrade(run.upgrades, "twoWayTreat") || hasUpgrade(run.upgrades, "echoCheeks"))) {
      battle = addUnit(battle, "player", "piplet", run.upgrades);
    }
    battle.cleanStreak += 1;
    let recallBoltFired = false;
    if (!outcome.wasUnseen) {
      battle.recallBoltCharge += 1;
      if (battle.recallBoltCharge >= CASTLE_RECALL_BOLT_LIMIT) {
        battle.recallBoltCharge -= CASTLE_RECALL_BOLT_LIMIT;
        battle.enemyCastleHp = Math.max(0, battle.enemyCastleHp - 8);
        battle.telemetry.damageDealt += 8;
        battle = addBattleFx(battle, "power", "player", 12, "Recall Bolt!");
        battle = addBattleFx(battle, "hit", "player", 98, "8");
        recallBoltFired = true;
      }
    }
    if (battle.cleanStreak % 5 === 0) {
      if (hasUpgrade(run.upgrades, "rootRepair")) battle.playerCastleHp = Math.min(battle.playerCastleMaxHp, battle.playerCastleHp + 5);
      if (hasUpgrade(run.upgrades, "cleanStreak")) battle.hasteMs = Math.max(battle.hasteMs, 5_000);
    }
    if (outcome.due && hasUpgrade(run.upgrades, "dueDew")) battle.playerBarrier += 3;
    battle.energy = roundEnergy(Math.min(CASTLE_MAX_ENERGY, battle.energy + reward));
    battle.telemetry.energyEarned = roundEnergy(battle.telemetry.energyEarned + reward);
    notice = recallBoltFired
      ? `Recall Bolt! +${roundEnergy(reward)} energy and 8 damage to the rival keep.`
      : recovered
      ? `Recovered recall: +${roundEnergy(reward)} energy and one Rally pip cleared.`
      : `Correct: +${roundEnergy(reward)} summon energy.`;
  } else if (outcome.wasUnseen) {
    battle.cleanStreak = 0;
    notice = "First exposure is protected. Read the answer; no Rally was added.";
  } else {
    battle.cleanStreak = 0;
    const ignoresFirst = hasUpgrade(run.upgrades, "rallyLantern") && battle.telemetry.wrong === 1;
    if (!ignoresFirst) {
      battle.rally += 1;
      battle.missedDirectionKeys = [...battle.missedDirectionKeys, outcome.progressKey];
    }
    if (battle.rally >= CASTLE_RALLY_LIMIT) {
      battle.rally = 0;
      battle.missedDirectionKeys = [];
      battle = addUnit(addUnit(battle, "enemy", "nibbleImp", run.upgrades), "enemy", battle.guardian ? "sporeBud" : "shellSlime", run.upgrades);
      battle.telemetry.rallyTriggered += 1;
      notice = "Enemy Rally! A bonus squad joined the next wave.";
    } else {
      notice = ignoresFirst ? "Rally Lantern softened the first miss." : `Enemy Rally ${battle.rally}/${CASTLE_RALLY_LIMIT}.`;
    }
  }
  battle.notice = notice;
  return {
    ...run,
    savedAt: Date.now(),
    reviews: run.reviews + 1,
    correct: run.correct + (graded && outcome.isCorrect ? 1 : 0),
    wrong: run.wrong + (graded && !outcome.isCorrect ? 1 : 0),
    battle,
    notice,
  };
}

export function resumeCastleBattle(run: CastleRunState): CastleRunState {
  if (run.phase !== "battle") return run;
  return {
    ...run,
    savedAt: Date.now(),
    battle: { ...run.battle, mode: "study", notice: "Combat is live while this seen prompt is active." },
  };
}

export function pauseCastleBattle(run: CastleRunState, notice = "Combat paused."): CastleRunState {
  if (run.phase !== "battle") return run;
  return { ...run, savedAt: Date.now(), battle: { ...run.battle, mode: "command", notice } };
}

export function claimCastleUpgrade(run: CastleRunState, upgradeId: CastleUpgradeId): CastleRunState {
  if (run.phase !== "reward" || !run.rewardChoices.includes(upgradeId)) return run;
  const upgrades = Array.from(new Set([...run.upgrades, upgradeId]));
  const healing = 12 + (hasUpgrade(upgrades, "sproutTuft") ? 8 : 0);
  const carriedCastleHp = Math.min(120, run.carriedCastleHp + healing);
  const contractComplete = run.battle.guardian && run.region >= run.targetRegions;
  return {
    ...run,
    savedAt: Date.now(),
    phase: contractComplete ? "retire" : "route",
    upgrades,
    rewardChoices: [],
    routeChoices: contractComplete ? [] : ["battle", "rest", "workshop", "event"],
    carriedCastleHp,
    notice: contractComplete
      ? `${CASTLE_UPGRADE_DEFS[upgradeId].name} absorbed. The study contract is complete.`
      : `${CASTLE_UPGRADE_DEFS[upgradeId].name} absorbed. Choose the next route.`,
  };
}

function startNextBattle(run: CastleRunState, carriedCastleHp: number, carriedEnergy: number): CastleRunState {
  let region = run.region;
  let battleInRegion = run.battleInRegion + 1;
  if (battleInRegion > 3) {
    region += 1;
    battleInRegion = 1;
  }
  if (region > run.targetRegions) {
    return {
      ...run,
      savedAt: Date.now(),
      phase: "retire",
      region: run.targetRegions,
      routeChoices: [],
      notice: "Study contract cleared. Retire successfully or continue into endless regions.",
    };
  }
  const battle = createBattle(region, battleInRegion, carriedCastleHp, carriedEnergy, run.upgrades);
  return {
    ...run,
    savedAt: Date.now(),
    phase: "battle",
    region,
    battleInRegion,
    battle,
    carriedCastleHp: battle.playerCastleHp,
    carriedEnergy: battle.energy,
    routeChoices: [],
    bestRegion: Math.max(run.bestRegion, region),
    notice: battle.guardian ? `Region ${region} guardian ahead.` : `Region ${region}, castle ${battleInRegion}.`,
  };
}

export function chooseCastleRoute(run: CastleRunState, choice: CastleRouteChoice): CastleRunState {
  if (run.phase !== "route" || !run.routeChoices.includes(choice)) return run;
  let hp = run.carriedCastleHp;
  let energy = run.carriedEnergy;
  if (choice === "rest") {
    hp = Math.min(120, hp + 28);
    if (hasUpgrade(run.upgrades, "mossCoat")) energy = Math.min(CASTLE_MAX_ENERGY, energy + 2);
  } else if (choice === "workshop") {
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 1.5);
  } else if (choice === "event") {
    hp = Math.max(1, hp - 5);
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 3);
  }
  return startNextBattle(run, hp, energy);
}

export function retireCastleRun(run: CastleRunState): CastleRunState {
  if (run.phase !== "retire") return run;
  return { ...run, savedAt: Date.now(), phase: "complete", notice: "Expedition complete. Pipplo tucked the discoveries into this deck-world." };
}

export function continueCastleRun(run: CastleRunState): CastleRunState {
  if (run.phase !== "retire") return run;
  const extended = { ...run, targetRegions: run.targetRegions + 1 };
  return startNextBattle(extended, Math.min(120, run.carriedCastleHp + 20), run.carriedEnergy);
}

export function formatCastleEnergy(value: number): string {
  return Number.isInteger(roundEnergy(value)) ? `${roundEnergy(value)}` : roundEnergy(value).toFixed(2).replace(/0$/, "");
}

export function getCastleBattleProgress(run: CastleRunState): string {
  return `Region ${run.region}/${run.targetRegions} · Castle ${run.battleInRegion}/3`;
}
