import type { StudyQuestionType, StudyRecallMode, StudyRewardCurve } from "../game/study";

export const CASTLE_RUN_VERSION = 1;
export const CASTLE_LANE_LENGTH = 100;
export const CASTLE_RALLY_LIMIT = 3;
export const CASTLE_RECALL_BOLT_LIMIT = 5;
export const CASTLE_MAX_ENERGY = 12;

export type CastleSide = "player" | "enemy";
export type CastleContractId = "quick" | "regular" | "long";
export type CastleRunPhase = "battle" | "reward" | "route" | "event" | "retire" | "complete" | "lost";
export type CastleBattleMode = "study" | "command";
export type CastleRouteChoice = "battle" | "rest" | "workshop" | "event";
export type CastleKeepsakeId = "starBuckle" | "shellButton" | "boltBead" | "nurseryBell" | "mossPatch" | "moonTreaty";
export type CastleEventId = "starwell" | "hatchling" | "wobbleMarket" | "rootOracle";
export type CastleEventChoiceId =
  | "starwellSip" | "starwellBottle" | "starwellDive"
  | "hatchlingEscort" | "hatchlingShell" | "hatchlingShare"
  | "marketSnack" | "marketTrade" | "marketEgg"
  | "oracleListen" | "oracleShelter" | "oracleChallenge";
export type CastleUnitKind = "piplet" | "dartlet" | "bubbleBud" | "spitlet" | "bigChonk" | "shellSlime" | "nibbleImp" | "sporeBud" | "echoMoth" | "rootLump";
export type CastlePowerId = "slingshot" | "bubbleGate" | "snackCannon" | "gooMoat" | "timewobble" | "tongueSnatch" | "sporeMortar";
export type CastleUpgradeCategory = "minion" | "castle" | "trait" | "study";
export type CastleFxKind = "spawn" | "hit" | "projectile" | "pop" | "heal" | "power" | "shield";
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

export interface CastleKeepsakeDef {
  id: CastleKeepsakeId;
  name: string;
  description: string;
  unlockHint: string;
  accent: string;
  guardianRequirement?: number;
  runRequirement?: number;
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
  fromPosition?: number;
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
  guardianPhase: number;
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

export interface CastleRunStudySummary {
  exposures: number;
  gradedReviews: number;
  dueReviews: number;
  typedReviews: number;
  difficultRecalls: number;
  responseMs: number[];
}

export interface CastleStudyReport extends CastleRunStudySummary {
  accuracy: number;
  averageResponseMs: number;
  recommendation: string;
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
  recallMode: StudyRecallMode;
  keepsakeId: CastleKeepsakeId | null;
  upgrades: CastleUpgradeId[];
  draftPoolIds: CastleUpgradeId[];
  rewardChoices: CastleUpgradeId[];
  routeChoices: CastleRouteChoice[];
  pendingEventId: CastleEventId | null;
  eventHistory: CastleEventId[];
  battle: CastleBattleState;
  rngState: number;
  carriedCastleHp: number;
  carriedEnergy: number;
  reviews: number;
  correct: number;
  wrong: number;
  introducedThisRun: number;
  studySummary: CastleRunStudySummary;
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
  questionType?: StudyQuestionType;
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

export interface CastleEventChoiceDef {
  id: CastleEventChoiceId;
  name: string;
  story: string;
  effect: string;
  requiresEnergy?: number;
}

export interface CastleEventDef {
  id: CastleEventId;
  eyebrow: string;
  title: string;
  story: string;
  choices: CastleEventChoiceDef[];
}

export interface CastleRegionDef {
  id: number;
  name: string;
  shortName: string;
  enemyTheme: string;
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  ground: string;
  roadTop: string;
  roadBottom: string;
  sun: string;
}

export const CASTLE_CONTRACTS: Record<CastleContractId, CastleContractDef> = {
  quick: { id: "quick", name: "Quick", regions: 1, minutes: 10, newCards: 5, description: "One region and one guardian castle." },
  regular: { id: "regular", name: "Regular", regions: 2, minutes: 25, newCards: 15, description: "Two regions with a deeper build." },
  long: { id: "long", name: "Long", regions: 3, minutes: 50, newCards: 35, description: "Three regions and the fullest run arc." },
};

export const CASTLE_KEEPSAKE_DEFS: Record<CastleKeepsakeId, CastleKeepsakeDef> = {
  starBuckle: {
    id: "starBuckle",
    name: "Star Buckle",
    description: "Begin every battle with +1 energy.",
    unlockHint: "A gift for every new keeper.",
    accent: "#f0c95e",
  },
  shellButton: {
    id: "shellButton",
    name: "Shell Button",
    description: "Begin every battle with 10 keep barrier.",
    unlockHint: "Clear 1 guardian castle.",
    accent: "#8dcbe0",
    guardianRequirement: 1,
  },
  boltBead: {
    id: "boltBead",
    name: "Bolt Bead",
    description: "Begin every battle with 1 Recall Bolt charge.",
    unlockHint: "Clear 2 guardian castles.",
    accent: "#e6aede",
    guardianRequirement: 2,
  },
  nurseryBell: {
    id: "nurseryBell",
    name: "Nursery Bell",
    description: "A free Piplet scouts at the start of every battle.",
    unlockHint: "Clear 4 guardian castles.",
    accent: "#a9d968",
    guardianRequirement: 4,
  },
  mossPatch: {
    id: "mossPatch",
    name: "Moss Patch",
    description: "Repair 8 keep HP when each new battle begins.",
    unlockHint: "Complete 1 expedition.",
    accent: "#76b987",
    runRequirement: 1,
  },
  moonTreaty: {
    id: "moonTreaty",
    name: "Moon Treaty",
    description: "Begin with +2 energy, but Mallow starts with 1 Rally pip.",
    unlockHint: "Complete 3 expeditions.",
    accent: "#9d83dc",
    runRequirement: 3,
  },
};

export const ALL_CASTLE_KEEPSAKE_IDS = Object.keys(CASTLE_KEEPSAKE_DEFS) as CastleKeepsakeId[];
export const STARTER_CASTLE_KEEPSAKE_IDS: CastleKeepsakeId[] = ["starBuckle"];

export const CASTLE_EVENT_DEFS: Record<CastleEventId, CastleEventDef> = {
  starwell: {
    id: "starwell",
    eyebrow: "Shimmering detour",
    title: "The Recall Starwell",
    story: "A well hums with half-remembered words. The surface is gentle; the brightest stars glint much deeper.",
    choices: [
      { id: "starwellSip", name: "Sip the surface", story: "Take only the calm light.", effect: "Repair 22 keep HP." },
      { id: "starwellBottle", name: "Bottle the fizz", story: "Save the bubbles for the next siege.", effect: "Gain 3 starting energy." },
      { id: "starwellDive", name: "Dive for a deep star", story: "The stone rim is sharp, but something below can change the run.", effect: "Lose 14 HP; absorb one available mutation." },
    ],
  },
  hatchling: {
    id: "hatchling",
    eyebrow: "Tiny traveler",
    title: "A Lost Piplet Peeks Out",
    story: "A wobbling hatchling has followed the army. It can march, share its shell, or split its snack.",
    choices: [
      { id: "hatchlingEscort", name: "March together", story: "Give it a place at the front.", effect: "Next battle starts with 2 Piplets." },
      { id: "hatchlingShell", name: "Borrow its shell", story: "It curls safely into Pipplo's pack.", effect: "Next battle starts with 18 barrier." },
      { id: "hatchlingShare", name: "Split the snack", story: "Everyone takes a small, useful bite.", effect: "Repair 10 HP and gain 1.5 energy." },
    ],
  },
  wobbleMarket: {
    id: "wobbleMarket",
    eyebrow: "Roadside bargain",
    title: "The Wobble Market",
    story: "Three mushroom stalls lean toward Pipplo. Every price is written clearly, which is suspiciously considerate.",
    choices: [
      { id: "marketSnack", name: "Buy a giant snack", story: "Expensive, warm, and structurally restorative.", effect: "Spend 2 energy; repair 32 HP.", requiresEnergy: 2 },
      { id: "marketTrade", name: "Trade a castle brick", story: "The merchant promises nobody will miss one brick.", effect: "Lose 10 HP; gain 4 energy." },
      { id: "marketEgg", name: "Adopt the cracked egg", story: "Something supportive bubbles inside.", effect: "Spend 1 energy; start with a Bubble Bud.", requiresEnergy: 1 },
    ],
  },
  rootOracle: {
    id: "rootOracle",
    eyebrow: "Whispering crossroads",
    title: "The Forked Root Oracle",
    story: "An ancient root offers three futures. It is terrible at smiling but excellent at stating consequences.",
    choices: [
      { id: "oracleListen", name: "Hear the secret", story: "A new shape waits behind a painful truth.", effect: "Lose 8 HP; absorb one available mutation." },
      { id: "oracleShelter", name: "Rest under the roots", story: "Moss muffles the marching drums.", effect: "Repair 18 HP and gain 1 energy." },
      { id: "oracleChallenge", name: "Take the heavy path", story: "A huge ally rolls downhill toward the next keep.", effect: "Lose 12 HP; start with a Big Chonk." },
    ],
  },
};

export const CASTLE_REGION_DEFS: CastleRegionDef[] = [
  {
    id: 1,
    name: "Dewdrop Meadow",
    shortName: "Dewdrop",
    enemyTheme: "Shell ranks and rushing Nibble Imps",
    skyTop: "#82cfd9",
    skyBottom: "#d9f0cb",
    hillFar: "#acd987",
    hillNear: "#89c66f",
    ground: "#f7de8c",
    roadTop: "#f6dca2",
    roadBottom: "#eac581",
    sun: "#fff59a",
  },
  {
    id: 2,
    name: "Echo Mire",
    shortName: "Echo Mire",
    enemyTheme: "Spore slows and energy-siphoning Echo Moths",
    skyTop: "#8bb9d5",
    skyBottom: "#c9e3d2",
    hillFar: "#78bfa5",
    hillNear: "#5fa58e",
    ground: "#c9d69a",
    roadTop: "#dacfa7",
    roadBottom: "#bda77c",
    sun: "#d9f2ca",
  },
  {
    id: 3,
    name: "Rootwild Sunset",
    shortName: "Rootwild",
    enemyTheme: "Armored roots, moth volleys, and mixed siege waves",
    skyTop: "#d79bb2",
    skyBottom: "#f3c79d",
    hillFar: "#9fbb72",
    hillNear: "#728f58",
    ground: "#dfb66d",
    roadTop: "#e8c38b",
    roadBottom: "#c8925f",
    sun: "#ffd47d",
  },
];

export function getCastleRegionDef(region: number): CastleRegionDef {
  return CASTLE_REGION_DEFS[(Math.max(1, region) - 1) % CASTLE_REGION_DEFS.length] || CASTLE_REGION_DEFS[0];
}

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

export function normalizeCastleRunStudySummary(
  summary?: Partial<CastleRunStudySummary> | null,
): CastleRunStudySummary {
  return {
    exposures: Math.max(0, Math.floor(Number(summary?.exposures) || 0)),
    gradedReviews: Math.max(0, Math.floor(Number(summary?.gradedReviews) || 0)),
    dueReviews: Math.max(0, Math.floor(Number(summary?.dueReviews) || 0)),
    typedReviews: Math.max(0, Math.floor(Number(summary?.typedReviews) || 0)),
    difficultRecalls: Math.max(0, Math.floor(Number(summary?.difficultRecalls) || 0)),
    responseMs: Array.isArray(summary?.responseMs)
      ? summary.responseMs.filter(value => Number.isFinite(value) && value >= 0).slice(-500)
      : [],
  };
}

export function getCastleStudyReport(run: CastleRunState): CastleStudyReport {
  const normalized = normalizeCastleRunStudySummary(run.studySummary);
  const gradedReviews = Math.max(normalized.gradedReviews, run.correct + run.wrong);
  const summary = {
    ...normalized,
    exposures: Math.max(normalized.exposures, run.reviews - gradedReviews),
    gradedReviews,
  };
  const accuracy = gradedReviews > 0 ? Math.min(1, run.correct / gradedReviews) : 0;
  const averageResponseMs = summary.responseMs.length > 0
    ? summary.responseMs.reduce((total, value) => total + value, 0) / summary.responseMs.length
    : 0;
  const typedShare = gradedReviews > 0 ? summary.typedReviews / gradedReviews : 0;
  const recommendation = gradedReviews === 0
    ? "Keep the next expedition short while these new directions settle in."
    : accuracy < 0.65
      ? "Try a Quick contract with Curved rewards; corrections are doing useful work, so keep the pressure gentle."
      : accuracy < 0.82
        ? "Stay with Curved rewards and revisit this deck soon—the recall is forming, but still benefits from extra energy."
        : averageResponseMs > 7_000
          ? "Accuracy is strong. Repeat this deck once more before increasing pressure so recall can become quicker."
          : typedShare < 0.25
            ? "Accuracy is strong. Balanced Recall can add more typed prompts on the next expedition."
            : "This deck handled the pressure well. A longer contract or Steep rewards is a fair next challenge.";
  return {
    ...summary,
    accuracy,
    averageResponseMs,
    recommendation,
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
    guardianPhase: guardian ? 1 : 0,
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
  recallMode: StudyRecallMode = "balanced",
  keepsakeId: CastleKeepsakeId | null = null,
): CastleRunState {
  const contract = CASTLE_CONTRACTS[contractId];
  const seed = seedOverride ?? seedFromString(`${deckId}:${contractId}:${Date.now()}`);
  const battle = applyCastleKeepsake(createBattle(1, 1, 100, 0, []), keepsakeId, []);
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
    recallMode,
    keepsakeId,
    upgrades: [],
    draftPoolIds: Array.from(new Set([...STARTER_CASTLE_UPGRADE_IDS, ...draftPoolIds])),
    rewardChoices: [],
    routeChoices: [],
    pendingEventId: null,
    eventHistory: [],
    battle,
    rngState: seed,
    carriedCastleHp: battle.playerCastleHp,
    carriedEnergy: battle.energy,
    reviews: 0,
    correct: 0,
    wrong: 0,
    introducedThisRun: 0,
    studySummary: normalizeCastleRunStudySummary(),
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

function applyCastleKeepsake(
  battle: CastleBattleState,
  keepsakeId: CastleKeepsakeId | null,
  upgrades: CastleUpgradeId[],
): CastleBattleState {
  if (!keepsakeId) return battle;
  let next = battle;
  if (keepsakeId === "starBuckle") next = { ...next, energy: Math.min(CASTLE_MAX_ENERGY, next.energy + 1) };
  if (keepsakeId === "shellButton") next = { ...next, playerBarrier: next.playerBarrier + 10 };
  if (keepsakeId === "boltBead") next = { ...next, recallBoltCharge: Math.min(CASTLE_RECALL_BOLT_LIMIT - 1, next.recallBoltCharge + 1) };
  if (keepsakeId === "nurseryBell") next = addUnit(next, "player", "piplet", upgrades);
  if (keepsakeId === "mossPatch") next = { ...next, playerCastleHp: Math.min(next.playerCastleMaxHp, next.playerCastleHp + 8) };
  if (keepsakeId === "moonTreaty") next = {
    ...next,
    energy: Math.min(CASTLE_MAX_ENERGY, next.energy + 2),
    rally: Math.min(CASTLE_RALLY_LIMIT - 1, next.rally + 1),
  };
  return next;
}

function addBattleFx(
  battle: CastleBattleState,
  kind: CastleFxKind,
  side: CastleSide,
  position: number,
  label?: string,
  fromPosition?: number,
): CastleBattleState {
  return {
    ...battle,
    fxEvents: [...battle.fxEvents, {
      id: battle.nextFxId,
      kind,
      side,
      position,
      fromPosition,
      ttlMs: kind === "power" ? 700 : kind === "hit" ? 650 : kind === "projectile" ? 520 : 480,
      label,
    }].slice(-14),
    nextFxId: battle.nextFxId + 1,
  };
}

function advanceGuardianPhase(battle: CastleBattleState, upgrades: CastleUpgradeId[]): CastleBattleState {
  if (!battle.guardian || battle.enemyCastleHp <= 0) return battle;
  const hpRatio = battle.enemyCastleHp / Math.max(1, battle.enemyCastleMaxHp);
  const targetPhase = hpRatio <= 0.33 ? 3 : hpRatio <= 0.66 ? 2 : 1;
  if (targetPhase <= battle.guardianPhase) return battle;

  let next = battle;
  for (let phase = battle.guardianPhase + 1; phase <= targetPhase; phase += 1) {
    if (phase === 2) {
      next = addUnit(next, "enemy", "shellSlime", upgrades);
      next = addBattleFx(next, "power", "enemy", 88, "Phase 2: Rootwall!");
      next.notice = "Guardian phase 2: a Rootwall defender arrived and enemy pressure is rising.";
    } else if (phase === 3) {
      next = addUnit(next, "enemy", "rootLump", upgrades);
      const rootId = next.units[next.units.length - 1]?.id;
      next.units = next.units.map(unit => unit.id === rootId
        ? { ...unit, hp: 30, maxHp: 30, damageBonus: -2 }
        : unit);
      next.enemySpawnTimerMs = Math.min(next.enemySpawnTimerMs, 2_800);
      next = addBattleFx(next, "power", "enemy", 90, "Phase 3: Last roots!");
      next.notice = "Guardian phase 3: the last roots attack faster behind a siege beast.";
    }
    next.guardianPhase = phase;
  }
  return next;
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
  const guardianPressure = current.guardian ? 1 + (Math.max(1, current.guardianPhase) - 1) * 0.03 : 1;
  let battle: CastleBattleState = {
    ...current,
    activeTimeMs: current.activeTimeMs + deltaMs,
    autoSpawnTimerMs: current.autoSpawnTimerMs - deltaMs,
    enemySpawnTimerMs: current.enemySpawnTimerMs - (deltaMs * enemyPressureSpeed * guardianPressure),
    playerTurretTimerMs: current.playerTurretTimerMs - deltaMs,
    enemyTurretTimerMs: current.enemyTurretTimerMs - (deltaMs * enemyPressureSpeed * guardianPressure),
    enemySlowMs: Math.max(0, current.enemySlowMs - deltaMs),
    hasteMs: Math.max(0, current.hasteMs - deltaMs),
    telemetry: {
      ...current.telemetry,
      activeCombatMs: current.telemetry.activeCombatMs + deltaMs,
    },
    units: current.units.map(unit => ({
      ...unit,
      attackCooldownMs: Math.max(0, unit.attackCooldownMs - (unit.side === "enemy"
        ? deltaMs * enemyPressureSpeed * guardianPressure
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
  const generatedFx: Array<{ kind: CastleFxKind; side: CastleSide; position: number; fromPosition?: number; label?: string }> = [];
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
        generatedFx.push(stats.range >= 10
          ? { kind: "projectile", side: unit.side, position: target.position, fromPosition: unit.position, label: `${damage}` }
          : { kind: "hit", side: unit.side, position: target.position, label: `${damage}` });
        if (unit.side === "player" && hasUpgrade(upgrades, "gooSoles")) {
          slowById.set(target.id, hasUpgrade(upgrades, "puddlePaws") ? 2_600 : 1_500);
        }
        if (unit.side === "enemy" && unit.kind === "sporeBud") slowById.set(target.id, 1_600);
      } else if (canAttackCastle) {
        if (unit.side === "player") {
          enemyCastleDamage += damage;
          generatedFx.push(stats.range >= 10
            ? { kind: "projectile", side: "player", position: 98, fromPosition: unit.position, label: `${damage}` }
            : { kind: "hit", side: "player", position: 98, label: `${damage}` });
        } else {
          playerCastleDamage += damage;
          if (unit.kind === "echoMoth") energyDrain += 0.15;
          generatedFx.push(stats.range >= 10
            ? { kind: "projectile", side: "enemy", position: 2, fromPosition: unit.position, label: `${damage}` }
            : { kind: "hit", side: "enemy", position: 2, label: `${damage}` });
        }
      }
      return { ...unit, attackCooldownMs: stats.attackMs };
    }
    if (!canAttackTarget && !canAttackCastle) {
      const slowMultiplier = unit.slowMs > 0 ? 0.5 : 1;
      const globalEnemyMultiplier = unit.side === "enemy" && battle.enemySlowMs > 0 ? 0 : 1;
      const hasteMultiplier = unit.side === "player" && battle.hasteMs > 0 ? 1.3 : 1;
      const direction = unit.side === "player" ? 1 : -1;
      const sidePressureMultiplier = unit.side === "enemy" ? enemyPressureSpeed * guardianPressure : 1;
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
      const turretDamage = battle.guardian ? battle.guardianPhase >= 3 ? 5 : 4 : 3;
      battle.units = battle.units.map(unit => unit.id === target.id ? applyDamage(unit, turretDamage).unit : unit);
      generatedFx.push({ kind: "hit", side: "enemy", position: target.position, label: `${turretDamage}` });
    }
    battle.enemyTurretTimerMs += battle.guardian ? 2_700 - ((battle.guardianPhase - 1) * 250) : 3_500;
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
  for (const effect of generatedFx) next = addBattleFx(next, effect.kind, effect.side, effect.position, effect.label, effect.fromPosition);
  return advanceGuardianPhase(next, upgrades);
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
  const previousStudySummary = normalizeCastleRunStudySummary(run.studySummary);
  const studySummary: CastleRunStudySummary = {
    exposures: previousStudySummary.exposures + (outcome.isExposure ? 1 : 0),
    gradedReviews: previousStudySummary.gradedReviews + (graded ? 1 : 0),
    dueReviews: previousStudySummary.dueReviews + (graded && outcome.due ? 1 : 0),
    typedReviews: previousStudySummary.typedReviews + (graded && outcome.questionType === "typed" ? 1 : 0),
    difficultRecalls: previousStudySummary.difficultRecalls + (graded && outcome.isCorrect && outcome.reward >= 1.5 ? 1 : 0),
    responseMs: graded
      ? [...previousStudySummary.responseMs, Math.max(0, outcome.responseMs)].slice(-500)
      : previousStudySummary.responseMs,
  };
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
      battle.enemySpawnTimerMs = Math.max(750, battle.enemySpawnTimerMs - (900 + (battle.rally * 300)));
    }
    if (battle.rally >= CASTLE_RALLY_LIMIT) {
      battle.rally = 0;
      battle.missedDirectionKeys = [];
      battle = addUnit(addUnit(battle, "enemy", "nibbleImp", run.upgrades), "enemy", battle.guardian ? "sporeBud" : "shellSlime", run.upgrades);
      const rallyVolley = 3;
      const barrierAbsorbed = Math.min(battle.playerBarrier, rallyVolley);
      const keepDamage = rallyVolley - barrierAbsorbed;
      battle.playerBarrier -= barrierAbsorbed;
      battle.playerCastleHp = Math.max(0, battle.playerCastleHp - keepDamage);
      battle.telemetry.damageTaken += keepDamage;
      battle = addBattleFx(battle, "projectile", "enemy", 2, keepDamage > 0 ? `${keepDamage}` : "Blocked", 88);
      battle.telemetry.rallyTriggered += 1;
      notice = "Enemy Rally! Mallow's Moon Volley struck and a bonus squad joined the lane.";
    } else {
      notice = ignoresFirst
        ? "Rally Lantern softened the first miss."
        : `Enemy Rally ${battle.rally}/${CASTLE_RALLY_LIMIT}: the next wave moved closer.`;
    }
  }
  battle.notice = notice;
  return {
    ...run,
    savedAt: Date.now(),
    reviews: run.reviews + 1,
    correct: run.correct + (graded && outcome.isCorrect ? 1 : 0),
    wrong: run.wrong + (graded && !outcome.isCorrect ? 1 : 0),
    studySummary,
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

function drawRouteChoices(rngState: number): { choices: CastleRouteChoice[]; rngState: number } {
  const extras: CastleRouteChoice[] = ["rest", "workshop", "event"];
  let state = rngState;
  for (let index = extras.length - 1; index > 0; index -= 1) {
    const roll = nextRandom(state);
    state = roll.state;
    const swapIndex = Math.floor(roll.value * (index + 1));
    [extras[index], extras[swapIndex]] = [extras[swapIndex], extras[index]];
  }
  return { choices: ["battle", ...extras.slice(0, 2)], rngState: state };
}

function drawCastleEvent(run: CastleRunState): { eventId: CastleEventId; rngState: number } {
  const recent = new Set(run.eventHistory.slice(-2));
  const allEvents = Object.keys(CASTLE_EVENT_DEFS) as CastleEventId[];
  const pool = allEvents.filter(id => !recent.has(id));
  const candidates = pool.length > 0 ? pool : allEvents;
  const roll = nextRandom(run.rngState);
  return {
    eventId: candidates[Math.floor(roll.value * candidates.length)] || "starwell",
    rngState: roll.state,
  };
}

export function claimCastleUpgrade(run: CastleRunState, upgradeId: CastleUpgradeId): CastleRunState {
  if (run.phase !== "reward" || !run.rewardChoices.includes(upgradeId)) return run;
  const upgrades = Array.from(new Set([...run.upgrades, upgradeId]));
  const healing = 12 + (hasUpgrade(upgrades, "sproutTuft") ? 8 : 0);
  const carriedCastleHp = Math.min(120, run.carriedCastleHp + healing);
  const contractComplete = run.battle.guardian && run.region >= run.targetRegions;
  const routeDraft = contractComplete
    ? { choices: [] as CastleRouteChoice[], rngState: run.rngState }
    : drawRouteChoices(run.rngState);
  return {
    ...run,
    savedAt: Date.now(),
    phase: contractComplete ? "retire" : "route",
    upgrades,
    rewardChoices: [],
    routeChoices: routeDraft.choices,
    rngState: routeDraft.rngState,
    pendingEventId: null,
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
      pendingEventId: null,
      notice: "Study contract cleared. Retire successfully or continue into endless regions.",
    };
  }
  const battle = applyCastleKeepsake(
    createBattle(region, battleInRegion, carriedCastleHp, carriedEnergy, run.upgrades),
    run.keepsakeId,
    run.upgrades,
  );
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
    pendingEventId: null,
    bestRegion: Math.max(run.bestRegion, region),
    notice: battle.guardian ? `Region ${region} guardian ahead.` : `Region ${region}, castle ${battleInRegion}.`,
  };
}

function startNextBattleWithBonuses(
  run: CastleRunState,
  carriedCastleHp: number,
  carriedEnergy: number,
  allies: CastleUnitKind[] = [],
  barrier = 0,
  notice?: string,
): CastleRunState {
  const started = startNextBattle(run, carriedCastleHp, carriedEnergy);
  if (started.phase !== "battle") return started;
  let battle = started.battle;
  for (const kind of allies) battle = addUnit(battle, "player", kind, started.upgrades);
  battle = {
    ...battle,
    playerBarrier: battle.playerBarrier + barrier,
    notice: notice || battle.notice,
  };
  return { ...started, battle, notice: notice || started.notice };
}

export function chooseCastleRoute(run: CastleRunState, choice: CastleRouteChoice): CastleRunState {
  if (run.phase !== "route" || !run.routeChoices.includes(choice)) return run;
  if (choice === "event") {
    const drawn = drawCastleEvent(run);
    return {
      ...run,
      savedAt: Date.now(),
      phase: "event",
      pendingEventId: drawn.eventId,
      eventHistory: [...run.eventHistory, drawn.eventId].slice(-6),
      routeChoices: [],
      rngState: drawn.rngState,
      notice: `${CASTLE_EVENT_DEFS[drawn.eventId].title}: choose one revealed outcome.`,
    };
  }
  let hp = run.carriedCastleHp;
  let energy = run.carriedEnergy;
  let barrier = 0;
  let allies: CastleUnitKind[] = [];
  let notice = "The next castle is ready.";
  if (choice === "rest") {
    hp = Math.min(120, hp + 28);
    if (hasUpgrade(run.upgrades, "mossCoat")) energy = Math.min(CASTLE_MAX_ENERGY, energy + 2);
    notice = "Soft Nest: the keep repaired 28 HP before the next march.";
  } else if (choice === "workshop") {
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 1.5);
    barrier = 8;
    notice = "Goo Workshop: +1.5 energy and an 8-point starting barrier.";
  } else {
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 0.5);
    allies = ["piplet"];
    notice = "Straight Road: a scouting Piplet and +0.5 energy arrived early.";
  }
  return startNextBattleWithBonuses(run, hp, energy, allies, barrier, notice);
}

export function canChooseCastleEvent(run: CastleRunState, choiceId: CastleEventChoiceId): boolean {
  if (run.phase !== "event" || !run.pendingEventId) return false;
  const choice = CASTLE_EVENT_DEFS[run.pendingEventId].choices.find(candidate => candidate.id === choiceId);
  return Boolean(choice && run.carriedEnergy >= (choice.requiresEnergy || 0));
}

export function resolveCastleEvent(run: CastleRunState, choiceId: CastleEventChoiceId): CastleRunState {
  if (!canChooseCastleEvent(run, choiceId)) return run;
  let preparedRun = run;
  let hp = run.carriedCastleHp;
  let energy = run.carriedEnergy;
  let barrier = 0;
  let allies: CastleUnitKind[] = [];
  let result = "The road changed shape.";

  const absorbMutation = (hpCost: number) => {
    hp = Math.max(1, hp - hpCost);
    const available = preparedRun.draftPoolIds.filter(id => !preparedRun.upgrades.includes(id));
    if (available.length === 0) {
      energy = Math.min(CASTLE_MAX_ENERGY, energy + 3);
      result = `No new mutation answered, so the echo condensed into +3 energy.`;
      return;
    }
    const roll = nextRandom(preparedRun.rngState);
    const upgradeId = available[Math.floor(roll.value * available.length)] || available[0];
    preparedRun = {
      ...preparedRun,
      upgrades: [...preparedRun.upgrades, upgradeId],
      rngState: roll.state,
    };
    result = `${CASTLE_UPGRADE_DEFS[upgradeId].name} joined the run; the keep paid ${hpCost} HP.`;
  };

  if (choiceId === "starwellSip") {
    hp = Math.min(120, hp + 22);
    result = "Starwell water repaired 22 keep HP.";
  } else if (choiceId === "starwellBottle") {
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 3);
    result = "The bottled star-fizz became +3 starting energy.";
  } else if (choiceId === "starwellDive") {
    absorbMutation(14);
  } else if (choiceId === "hatchlingEscort") {
    allies = ["piplet", "piplet"];
    result = "Two Piplets joined the opening march.";
  } else if (choiceId === "hatchlingShell") {
    barrier = 18;
    result = "The hatchling wrapped the keep in 18 starting barrier.";
  } else if (choiceId === "hatchlingShare") {
    hp = Math.min(120, hp + 10);
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 1.5);
    result = "The shared snack repaired 10 HP and added 1.5 energy.";
  } else if (choiceId === "marketSnack") {
    energy -= 2;
    hp = Math.min(120, hp + 32);
    result = "The giant snack cost 2 energy and repaired 32 HP.";
  } else if (choiceId === "marketTrade") {
    hp = Math.max(1, hp - 10);
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 4);
    result = "One brick became +4 energy; the keep lost 10 HP.";
  } else if (choiceId === "marketEgg") {
    energy -= 1;
    allies = ["bubbleBud"];
    result = "The cracked egg hatched a free Bubble Bud.";
  } else if (choiceId === "oracleListen") {
    absorbMutation(8);
  } else if (choiceId === "oracleShelter") {
    hp = Math.min(120, hp + 18);
    energy = Math.min(CASTLE_MAX_ENERGY, energy + 1);
    result = "The roots repaired 18 HP and tucked away +1 energy.";
  } else if (choiceId === "oracleChallenge") {
    hp = Math.max(1, hp - 12);
    allies = ["bigChonk"];
    result = "The heavy path cost 12 HP, but a Big Chonk rolled into formation.";
  }

  return startNextBattleWithBonuses(
    { ...preparedRun, pendingEventId: null },
    hp,
    energy,
    allies,
    barrier,
    result,
  );
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
