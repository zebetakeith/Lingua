import assert from "node:assert/strict";
import {
  ALL_CASTLE_UPGRADE_IDS,
  CASTLE_MELEE_ENGAGEMENT_SLOTS,
  CASTLE_RANGED_ENGAGEMENT_SLOTS,
  CASTLE_UNIT_DEFS,
  STARTER_CASTLE_UPGRADE_IDS,
  activateCastlePower,
  applyCastleStudyOutcome,
  canChooseCastleEvent,
  chooseCastleRoute,
  claimCastleUpgrade,
  continueCastleRun,
  createInitialCastleRun,
  getCastleBattleLesson,
  getCastleEndlessThreat,
  getCastleEventChoiceEffect,
  getCastleStudyReport,
  resolveCastleEvent,
  resumeCastleBattle,
  summonCastleUnit,
  tickCastleRun,
} from "../src/experiments/castleBattle.ts";
import { clearCastleRun, getNewCastleKeepsakeIds, loadCastleProfile, loadCastleRun, saveCastleRun, selectCastleKeepsake } from "../src/experiments/castleStorage.ts";

const localValues = new Map();
globalThis.localStorage = {
  getItem: key => localValues.get(key) ?? null,
  setItem: (key, value) => localValues.set(key, String(value)),
  removeItem: key => localValues.delete(key),
  clear: () => localValues.clear(),
};

function outcome(index, overrides = {}) {
  return {
    isCorrect: true,
    wasUnseen: false,
    reward: 1,
    progressKey: `mechanic-card-${index}::term_to_definition`,
    responseMs: 2_500,
    selfGraded: false,
    questionType: "multiple_choice",
    due: true,
    ...overrides,
  };
}

function freshRun() {
  return createInitialCastleRun("mechanics", "quick", "quadratic", ALL_CASTLE_UPGRADE_IDS, 42);
}

function keepsakeRun(keepsakeId) {
  return createInitialCastleRun("mechanics", "quick", "quadratic", ALL_CASTLE_UPGRADE_IDS, 42, "balanced", keepsakeId);
}

function testUnit(kind, side, id, overrides = {}) {
  const definition = CASTLE_UNIT_DEFS[kind];
  return {
    id,
    side,
    kind,
    hp: definition.hp,
    maxHp: definition.hp,
    shield: 0,
    position: side === "player" ? 20 : 80,
    attackCooldownMs: 500,
    slowMs: 0,
    damageBonus: 0,
    kills: 0,
    ...overrides,
  };
}

assert.equal(keepsakeRun("starBuckle").battle.energy, 1, "Star Buckle should grant one starting energy");
assert.equal(keepsakeRun("shellButton").battle.playerBarrier, 10, "Shell Button should grant ten starting barrier");
assert.equal(keepsakeRun("boltBead").battle.recallBoltCharge, 1, "Bolt Bead should grant one Recall Bolt charge");
assert.equal(keepsakeRun("nurseryBell").battle.units.filter(unit => unit.kind === "piplet").length, 1, "Nursery Bell should hatch one starting Piplet");
assert.equal(keepsakeRun("moonTreaty").battle.energy, 2, "Moon Treaty should grant two starting energy");
assert.equal(keepsakeRun("moonTreaty").battle.rally, 1, "Moon Treaty should disclose its one-pip Rally risk");

const mossRoute = chooseCastleRoute({
  ...keepsakeRun("mossPatch"),
  phase: "route",
  routeChoices: ["battle"],
  carriedCastleHp: 50,
}, "battle");
assert.equal(mossRoute.battle.playerCastleHp, 58, "Moss Patch should repair eight HP when the next battle begins");

localStorage.setItem("lexicon_labyrinth_castle_runs_v1", JSON.stringify({
  legacy: {
    profile: {
      version: 1,
      deckId: "legacy",
      unlockedUpgradeIds: ["retired-prototype-upgrade"],
      unlockedKeepsakeIds: ["retired-prototype-keepsake"],
      selectedKeepsakeId: "retired-prototype-keepsake",
      discoveredEnemyKinds: ["retired-prototype-enemy"],
      runsCompleted: 0,
      guardianClears: 0,
      bestRegion: 1,
      totalReviews: 0,
      tutorialComplete: false,
    },
    run: null,
  },
}));
const migratedProfile = loadCastleProfile("legacy");
assert.deepEqual(migratedProfile.unlockedKeepsakeIds, ["starBuckle"], "old profiles should migrate with the starter keepsake unlocked");
assert.equal(migratedProfile.selectedKeepsakeId, "starBuckle", "old profiles should safely equip the starter keepsake");
assert.deepEqual(migratedProfile.unlockedUpgradeIds, STARTER_CASTLE_UPGRADE_IDS, "retired prototype upgrades should be removed during profile recovery");
assert.deepEqual(migratedProfile.discoveredEnemyKinds, [], "retired prototype enemies should be removed during profile recovery");
localStorage.clear();

let run = freshRun();
const startingEnemyHp = run.battle.enemyCastleHp;
for (let index = 0; index < 4; index += 1) run = applyCastleStudyOutcome(run, outcome(index));
assert.equal(run.battle.recallBoltCharge, 4, "four correct seen recalls should charge four bolt pips");
assert.equal(run.battle.enemyCastleHp, startingEnemyHp, "Recall Bolt should not fire early");
run = applyCastleStudyOutcome(run, outcome(4));
assert.equal(run.battle.recallBoltCharge, 0, "fifth correct seen recall should consume the bolt charge");
assert.equal(run.battle.enemyCastleHp, startingEnemyHp - 8, "Recall Bolt should deal eight keep damage");

const unseen = applyCastleStudyOutcome(freshRun(), outcome(0, { isExposure: true, wasUnseen: true, reward: 0.25 }));
assert.equal(unseen.battle.recallBoltCharge, 0, "first exposure must not charge Recall Bolt");
assert.equal(unseen.correct, 0, "an ungraded first exposure must not count as a correct answer");
assert.equal(unseen.wrong, 0, "an ungraded first exposure must not count as a miss");
assert.equal(unseen.battle.energy, 0.25, "a completed first exposure should grant only its small learning bonus");
assert.equal(unseen.studySummary.exposures, 1, "the learning report should count safe first exposures");
assert.equal(unseen.studySummary.gradedReviews, 0, "safe first exposures must stay out of graded accuracy");
assert.equal(unseen.studySummary.responseMs.length, 0, "reading time for first exposures must stay out of recall pace");
assert.equal(unseen.battle.telemetry.responseMs.length, 0, "balance telemetry must not mislabel first-exposure reading time as recall latency");

const selfGradedRecall = applyCastleStudyOutcome(freshRun(), outcome(0, {
  reward: 1.8,
  responseMs: 4_200,
  questionType: "self_grade",
}));
const selfGradedReport = getCastleStudyReport(selfGradedRecall);
assert.equal(selfGradedReport.gradedReviews, 1, "graded prompts should enter the learning report");
assert.equal(selfGradedReport.typedReviews, 0, "new Goo Keep reviews must never add typed-review history");
assert.equal(selfGradedReport.difficultRecalls, 1, "high-value correct recalls should count as difficult wins");
assert.equal(selfGradedReport.dueReviews, 1, "due prompts should be visible in the learning report");
assert.equal(selfGradedReport.averageResponseMs, 4_200, "active recall pace should use the recorded study duration");
assert.equal(selfGradedReport.accuracy, 1, "learning-report accuracy should exclude first exposures");
const reconstructedReport = getCastleStudyReport({
  ...freshRun(),
  reviews: 12,
  correct: 7,
  wrong: 2,
  studySummary: { exposures: 0, gradedReviews: 0, dueReviews: 0, typedReviews: 0, difficultRecalls: 0, responseMs: [], missedDirectionCounts: {} },
});
assert.equal(reconstructedReport.gradedReviews, 9, "legacy reports should reconstruct graded reviews from correct and wrong totals");
assert.equal(reconstructedReport.exposures, 3, "legacy reports should infer the remaining reviews as safe exposures");
assert.equal(reconstructedReport.accuracy, 7 / 9, "legacy report accuracy must stay within the valid range");

const bankedEnergyLesson = getCastleBattleLesson({
  ...freshRun(),
  phase: "lost",
  battle: { ...freshRun().battle, energy: 5, telemetry: { ...freshRun().battle.telemetry, energyEarned: 8, energySpent: 2 } },
});
assert.match(bankedEnergyLesson, /energy still banked/i, "a loss with hoarded energy should produce actionable spending guidance");
const rallyLesson = getCastleBattleLesson({
  ...freshRun(),
  phase: "lost",
  battle: { ...freshRun().battle, telemetry: { ...freshRun().battle.telemetry, rallyTriggered: 3, energyEarned: 6, energySpent: 6 } },
});
assert.match(rallyLesson, /Enemy Rally decided/i, "a rally-heavy loss should explain the recovery mechanic");
const cleanWinLesson = getCastleBattleLesson({
  ...freshRun(),
  phase: "complete",
  battle: { ...freshRun().battle, telemetry: { ...freshRun().battle.telemetry, damageTaken: 0, rallyTriggered: 0 } },
});
assert.match(cleanWinLesson, /controlled cleanly/i, "a clean win should recommend an appropriate next challenge");

let rally = freshRun();
const rallyWaveBefore = rally.battle.enemySpawnTimerMs;
for (let index = 0; index < 3; index += 1) {
  rally = applyCastleStudyOutcome(rally, outcome(index, { isCorrect: false, reward: 0 }));
}
assert.equal(rally.battle.rally, 0, "three misses should consume the Rally meter");
assert.equal(rally.battle.telemetry.rallyTriggered, 1, "three misses should trigger one enemy rally");
assert.equal(rally.battle.units.filter(unit => unit.side === "enemy").length, 2, "enemy rally should add a two-unit squad");
assert.equal(rally.battle.missedDirectionKeys.length, 0, "a triggered Rally must consume its recovery keys");
assert.deepEqual(getCastleStudyReport(rally).focusDirections, [
  { key: "mechanic-card-0::term_to_definition", misses: 1 },
  { key: "mechanic-card-1::term_to_definition", misses: 1 },
  { key: "mechanic-card-2::term_to_definition", misses: 1 },
], "the learning report should preserve troublesome directions after Rally consumes its battle keys");
assert.equal(rally.battle.playerCastleHp, 97, "an unshielded Rally should land a small Moon Volley instead of creating an all-or-nothing pressure cliff");
assert.equal(rally.battle.telemetry.damageTaken, 3, "Moon Volley damage should be represented in battle telemetry");
assert.ok(rally.battle.enemySpawnTimerMs < rallyWaveBefore, "misses should pull the next regular enemy wave closer before Rally triggers");

function completeTwoWayRecall(upgrades) {
  let twoWayRun = { ...freshRun(), upgrades };
  twoWayRun = applyCastleStudyOutcome(twoWayRun, outcome(20, { progressKey: "two-way-card::term_to_definition" }));
  return applyCastleStudyOutcome(twoWayRun, outcome(21, { progressKey: "two-way-card::definition_to_term" }));
}

const treatedTwoWay = completeTwoWayRecall(["twoWayTreat"]);
assert.equal(treatedTwoWay.battle.units.filter(unit => unit.kind === "piplet").length, 1, "Two-Way Treat should hatch one Piplet after both card directions are recalled");
assert.equal(treatedTwoWay.battle.energy, 2, "Two-Way Treat should not silently add an undisclosed energy reward");
const echoedTwoWay = completeTwoWayRecall(["echoCheeks"]);
assert.equal(echoedTwoWay.battle.units.filter(unit => unit.kind === "piplet").length, 0, "Echo Cheeks should remain distinct from the Piplet-hatching Two-Way Treat");
assert.equal(echoedTwoWay.battle.energy, 2.5, "Echo Cheeks should grant its disclosed half-energy two-way bonus");
const stackedTwoWay = completeTwoWayRecall(["twoWayTreat", "echoCheeks"]);
assert.equal(stackedTwoWay.battle.units.filter(unit => unit.kind === "piplet").length, 1, "the two rare two-way upgrades should stack without duplicating the same reward");
assert.equal(stackedTwoWay.battle.energy, 2.5, "stacking the two-way upgrades should preserve Echo Cheeks' energy bonus");

let live = resumeCastleBattle({ ...freshRun(), battle: { ...freshRun().battle, energy: 12 } });
live = summonCastleUnit(live, "dartlet");
assert.equal(live.battle.telemetry.summons, 1, "summoning must work while combat is live");
assert.equal(live.battle.units.some(unit => unit.kind === "dartlet"), true, "live summon should enter the lane immediately");
live = activateCastlePower(live, "bubbleGate");
assert.equal(live.battle.playerBarrier, 24, "castle powers must work while combat is live");

let slingshot = { ...freshRun(), battle: { ...freshRun().battle, energy: 12 } };
const slingshotCastleHp = slingshot.battle.enemyCastleHp;
slingshot = activateCastlePower(slingshot, "slingshot");
assert.equal(slingshot.battle.enemyCastleHp, slingshotCastleHp - 8, "Slingshot should strike the rival keep when the lane is empty");
assert.equal(slingshot.battle.energy, 9.5, "Slingshot should spend its disclosed energy cost");

const lockedSnack = { ...freshRun(), battle: { ...freshRun().battle, energy: 12 } };
assert.equal(activateCastlePower(lockedSnack, "snackCannon"), lockedSnack, "locked castle powers must reject activation without spending energy");

let snack = {
  ...freshRun(),
  upgrades: ["snackCannon"],
  battle: {
    ...freshRun().battle,
    energy: 12,
    playerCastleHp: 60,
    units: [testUnit("dartlet", "player", "snack-ally", { hp: 1 })],
  },
};
snack = activateCastlePower(snack, "snackCannon");
assert.equal(snack.battle.playerCastleHp, 70, "Snack Cannon should repair ten keep HP");
assert.equal(snack.battle.units[0].hp, CASTLE_UNIT_DEFS.dartlet.hp, "Snack Cannon should heal allies without exceeding max HP");

let moat = {
  ...freshRun(),
  upgrades: ["gooMoat", "puddlePaws"],
  battle: { ...freshRun().battle, energy: 12, units: [testUnit("nibbleImp", "enemy", "moat-target")] },
};
moat = activateCastlePower(moat, "gooMoat");
assert.equal(moat.battle.units[0].slowMs, 6_000, "Goo Moat plus Puddle Paws should apply the upgraded lane slow");

let timewobble = {
  ...freshRun(),
  upgrades: ["timewobbleClock"],
  battle: { ...freshRun().battle, energy: 12, units: [testUnit("nibbleImp", "enemy", "frozen-attacker", { position: 3, attackCooldownMs: 0 })] },
};
timewobble = activateCastlePower(timewobble, "timewobble");
assert.equal(timewobble.battle.enemySlowMs, 4_000, "Timewobble should freeze enemy movement and attacks for four seconds");
const frozenCastleHp = timewobble.battle.playerCastleHp;
timewobble = tickCastleRun(resumeCastleBattle(timewobble), 100, 1);
assert.equal(timewobble.battle.playerCastleHp, frozenCastleHp, "an enemy already in range must not attack during Timewobble");

const emptySnatch = { ...freshRun(), upgrades: ["tongueCrane"], battle: { ...freshRun().battle, energy: 12 } };
const refundedSnatch = activateCastlePower(emptySnatch, "tongueSnatch");
assert.equal(refundedSnatch.battle.energy, 12, "Tongue Snatch should refund all energy when no target qualifies");
assert.equal(refundedSnatch.battle.telemetry.powersUsed, 0, "a refunded Tongue Snatch should not count as a used power");

let snatch = {
  ...freshRun(),
  upgrades: ["tongueCrane", "nibbleTeeth", "digestor"],
  battle: { ...freshRun().battle, energy: 12, units: [testUnit("nibbleImp", "enemy", "snatch-target", { hp: 4 })] },
};
snatch = activateCastlePower(snatch, "tongueSnatch");
assert.equal(snatch.battle.units.length, 0, "Tongue Snatch should remove a weakened non-guardian enemy");
assert.equal(snatch.battle.energy, 6.75, "Digestor should return a small energy drip after a successful snatch");

let mortar = {
  ...freshRun(),
  upgrades: ["sporeMortar"],
  battle: {
    ...freshRun().battle,
    energy: 12,
    units: [
      testUnit("shellSlime", "enemy", "mortar-1", { position: 30 }),
      testUnit("shellSlime", "enemy", "mortar-2", { position: 40 }),
      testUnit("shellSlime", "enemy", "mortar-3", { position: 50 }),
      testUnit("shellSlime", "enemy", "mortar-4", { position: 60 }),
    ],
  },
};
mortar = activateCastlePower(mortar, "sporeMortar");
assert.deepEqual(mortar.battle.units.map(unit => unit.hp), [10, 10, 10, 18], "Spore Mortar should damage only the three front enemies");
assert.equal(mortar.battle.telemetry.powersUsed, 1, "successful castle powers should be represented in telemetry");

let support = { ...freshRun(), battle: { ...freshRun().battle, energy: 12 } };
support = summonCastleUnit(support, "dartlet");
support = summonCastleUnit(support, "bubbleBud");
support = resumeCastleBattle(support);
for (let index = 0; index < 20; index += 1) support = tickCastleRun(support, 100, 1);
assert.equal(
  support.battle.units.some(unit => unit.side === "player" && unit.kind !== "bubbleBud" && unit.shield > 0),
  true,
  "Bubble Bud should shield a nearby ally",
);

const spitletDef = CASTLE_UNIT_DEFS.spitlet;
const shellDef = CASTLE_UNIT_DEFS.shellSlime;
let ranged = freshRun();
ranged = {
  ...ranged,
  battle: {
    ...ranged.battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [
      { id: "spitlet-test", side: "player", kind: "spitlet", hp: spitletDef.hp, maxHp: spitletDef.hp, shield: 0, position: 36, attackCooldownMs: 0, slowMs: 0, damageBonus: 0, kills: 0 },
      { id: "shell-test", side: "enemy", kind: "shellSlime", hp: shellDef.hp, maxHp: shellDef.hp, shield: 0, position: 48, attackCooldownMs: 500, slowMs: 0, damageBonus: 0, kills: 0 },
    ],
  },
};
ranged = tickCastleRun(ranged, 100, 1);
const projectile = ranged.battle.fxEvents.find(event => event.kind === "projectile");
assert.ok(projectile, "ranged units should emit a visible travelling projectile");
assert.equal(projectile.fromPosition, 36, "a projectile should begin at its attacker");
assert.equal(projectile.position, 48, "a projectile should end at its target");
assert.equal(projectile.side, "player", "projectile direction should preserve the attacking side");

let cheapSwarm = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: Array.from({ length: 10 }, (_, index) => testUnit("dartlet", "player", `swarm-${index}`, { position: 95, attackCooldownMs: 0 })),
  },
};
const cheapSwarmCastleHp = cheapSwarm.battle.enemyCastleHp;
cheapSwarm = tickCastleRun(cheapSwarm, 100, 1);
assert.equal(
  cheapSwarmCastleHp - cheapSwarm.battle.enemyCastleHp,
  CASTLE_MELEE_ENGAGEMENT_SLOTS * CASTLE_UNIT_DEFS.dartlet.damage,
  "ten cheap melee units should use only the three front engagement slots against a castle",
);
assert.equal(cheapSwarm.battle.units.filter(unit => unit.attackCooldownMs > 0).length, CASTLE_MELEE_ENGAGEMENT_SLOTS, "surplus melee units should queue as ready reserves instead of attacking simultaneously");

let mixedFormation = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [
      ...Array.from({ length: 3 }, (_, index) => testUnit("dartlet", "player", `melee-${index}`, { position: 95, attackCooldownMs: 0 })),
      ...Array.from({ length: 2 }, (_, index) => testUnit("spitlet", "player", `ranged-${index}`, { position: 85, attackCooldownMs: 0 })),
    ],
  },
};
const mixedCastleHp = mixedFormation.battle.enemyCastleHp;
mixedFormation = tickCastleRun(mixedFormation, 100, 1);
assert.equal(
  mixedCastleHp - mixedFormation.battle.enemyCastleHp,
  (CASTLE_MELEE_ENGAGEMENT_SLOTS * CASTLE_UNIT_DEFS.dartlet.damage) + (CASTLE_RANGED_ENGAGEMENT_SLOTS * CASTLE_UNIT_DEFS.spitlet.damage),
  "melee and ranged formation lanes should stack so a varied army outperforms one-unit spam",
);

let echoMoth = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    energy: 1,
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [testUnit("echoMoth", "enemy", "echo-siphon", { position: 10, attackCooldownMs: 0 })],
  },
};
echoMoth = tickCastleRun(echoMoth, 100, 1);
assert.equal(echoMoth.battle.playerCastleHp, 97, "Echo Moth should damage the player keep from range");
assert.equal(echoMoth.battle.energy, 0.85, "Echo Moth keep attacks should siphon a visible sliver of energy");
assert.equal(echoMoth.battle.fxEvents.some(event => event.label?.includes("siphon")), true, "Echo Moth energy theft should be named in the battlefield feedback");

let sporeBud = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [
      testUnit("sporeBud", "enemy", "spore-slow", { position: 40, attackCooldownMs: 0 }),
      testUnit("dartlet", "player", "spore-target", { position: 49, attackCooldownMs: 999_999 }),
    ],
  },
};
sporeBud = tickCastleRun(sporeBud, 100, 1);
const sporeTarget = sporeBud.battle.units.find(unit => unit.id === "spore-target");
assert.equal(sporeTarget.hp, CASTLE_UNIT_DEFS.dartlet.hp - CASTLE_UNIT_DEFS.sporeBud.damage, "Spore Bud should damage its ranged target");
assert.equal(sporeTarget.slowMs, 1_600, "Spore Bud attacks should slow their target for 1.6 seconds");
assert.equal(sporeBud.battle.fxEvents.some(event => event.label?.includes("slowed")), true, "Spore Bud slow should be named in the battlefield feedback");

for (const [kind, label] of [["shellSlime", "Shell Slime"], ["rootLump", "Root Lump"]]) {
  let armoredSpawn = {
    ...freshRun(),
    battle: {
      ...freshRun().battle,
      mode: "study",
      autoSpawnTimerMs: 999_999,
      enemySpawnTimerMs: 0,
      nextEnemyKind: kind,
      playerTurretTimerMs: 999_999,
      enemyTurretTimerMs: 999_999,
      units: [],
    },
  };
  armoredSpawn = tickCastleRun(armoredSpawn, 100, 1);
  const spawned = armoredSpawn.battle.units.find(unit => unit.kind === kind);
  assert.ok(spawned, `${label} should enter through the regular enemy spawn path`);
  assert.equal(spawned.shield, 6, `${label} should arrive with its six-point armor shell`);
}

let hornSplash = {
  ...freshRun(),
  upgrades: ["impHorns"],
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 0,
    enemyTurretTimerMs: 999_999,
    units: [
      testUnit("shellSlime", "enemy", "horn-primary", { position: 20 }),
      testUnit("shellSlime", "enemy", "horn-splash", { position: 30 }),
    ],
  },
};
hornSplash = tickCastleRun(hornSplash, 100, 1);
assert.equal(hornSplash.battle.units.find(unit => unit.id === "horn-primary").hp, CASTLE_UNIT_DEFS.shellSlime.hp - 4, "Imp Horns should preserve the turret's full primary hit");
assert.equal(hornSplash.battle.units.find(unit => unit.id === "horn-splash").hp, CASTLE_UNIT_DEFS.shellSlime.hp - 2, "Imp Horns should splash a second enemy for half turret damage");

let encounterRun = createInitialCastleRun("encounter-memory", "quick", "quadratic", ALL_CASTLE_UPGRADE_IDS, 7);
encounterRun = {
  ...encounterRun,
  battle: {
    ...encounterRun.battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 0,
    nextEnemyKind: "echoMoth",
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
  },
};
encounterRun = tickCastleRun(encounterRun, 100, 1);
assert.equal(encounterRun.battle.encounteredEnemyKinds.includes("echoMoth"), true, "enemy families should be recorded at spawn time");
encounterRun = { ...encounterRun, battle: { ...encounterRun.battle, units: [] } };
const encounterProfile = saveCastleRun("encounter-memory", encounterRun);
assert.equal(encounterProfile.discoveredEnemyKinds.includes("echoMoth"), true, "a defeated enemy should remain discovered even when no longer alive at autosave");

let hasted = { ...freshRun(), upgrades: ["cleanStreak"], battle: { ...freshRun().battle, energy: 12 } };
for (let index = 0; index < 5; index += 1) hasted = applyCastleStudyOutcome(hasted, outcome(index));
hasted = summonCastleUnit(hasted, "dartlet");
hasted = resumeCastleBattle(hasted);
hasted = tickCastleRun(hasted, 100, 1);
const hastedDartlet = hasted.battle.units.find(unit => unit.kind === "dartlet");
assert.ok(hastedDartlet && hastedDartlet.attackCooldownMs < 130, "Clean Streak haste should accelerate friendly attack recovery");

let paused = freshRun();
const pausedSnapshot = paused.battle.activeTimeMs;
paused = tickCastleRun(paused, 1_000, 1);
assert.equal(paused.battle.activeTimeMs, pausedSnapshot, "command-mode battles must remain paused for unseen cards and interruptions");

const startingTotalReviews = loadCastleProfile("mechanics").totalReviews;
let reviewProgress = saveCastleRun("mechanics", { ...freshRun(), reviews: 4 });
assert.equal(reviewProgress.totalReviews, startingTotalReviews + 4, "permanent review totals should count the first saved progress delta");
reviewProgress = saveCastleRun("mechanics", { ...freshRun(), reviews: 4 });
assert.equal(reviewProgress.totalReviews, startingTotalReviews + 4, "autosaving the same reviews twice must not duplicate the total");
clearCastleRun("mechanics");
reviewProgress = saveCastleRun("mechanics", { ...freshRun(), reviews: 3 });
assert.equal(reviewProgress.totalReviews, startingTotalReviews + 7, "review totals should accumulate across separate runs");
const legacyStudySave = JSON.parse(localStorage.getItem("lexicon_labyrinth_castle_runs_v1"));
delete legacyStudySave.mechanics.run.studySummary;
legacyStudySave.mechanics.run.recallMode = "typed";
delete legacyStudySave.mechanics.run.upgrades;
delete legacyStudySave.mechanics.run.draftPoolIds;
delete legacyStudySave.mechanics.run.eventHistory;
delete legacyStudySave.mechanics.run.battle.missedDirectionKeys;
delete legacyStudySave.mechanics.run.battle.recalledDirectionKeys;
delete legacyStudySave.mechanics.run.battle.fxEvents;
delete legacyStudySave.mechanics.run.battle.telemetry.responseMs;
legacyStudySave.mechanics.run.battle.units.push({ kind: "retired-prototype-enemy", side: "enemy" });
localStorage.setItem("lexicon_labyrinth_castle_runs_v1", JSON.stringify(legacyStudySave));
const restoredLegacyRun = loadCastleRun("mechanics");
assert.equal(restoredLegacyRun.recallMode, "balanced", "legacy typing runs should migrate to non-typing Balanced Recall");
assert.deepEqual(
  restoredLegacyRun.studySummary,
  { exposures: 0, gradedReviews: 0, dueReviews: 0, typedReviews: 0, difficultRecalls: 0, responseMs: [], missedDirectionCounts: {} },
  "old in-progress runs should migrate with an empty learning report",
);
assert.deepEqual(restoredLegacyRun.battle.missedDirectionKeys, [], "old runs should recover a safe missed-direction list");
assert.deepEqual(restoredLegacyRun.battle.recalledDirectionKeys, [], "old runs should recover a safe recalled-direction list");
assert.deepEqual(restoredLegacyRun.battle.telemetry.responseMs, [], "old runs should recover a safe response-time list");
assert.equal(restoredLegacyRun.battle.units.some(unit => unit.kind === "retired-prototype-enemy"), false, "unknown prototype units should be discarded during recovery");
assert.doesNotThrow(
  () => applyCastleStudyOutcome(restoredLegacyRun, outcome(99)),
  "a repaired prototype run should accept the next study outcome without crashing",
);
clearCastleRun("mechanics");

let progressionRun = freshRun();
saveCastleRun("mechanics", { ...progressionRun, battlesWon: 2 });
let progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
assert.equal(progressionProfile.guardianClears, 1, "first guardian clear should advance permanent progression");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("shellButton"), true, "the first guardian should unlock Shell Button");
assert.deepEqual(getNewCastleKeepsakeIds(progressionProfile, { ...progressionRun, phase: "reward", battlesWon: 3 }), ["shellButton"], "the first guardian reward should celebrate only Shell Button");
progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
assert.equal(progressionProfile.guardianClears, 1, "saving the same guardian clear twice must not duplicate progression");
clearCastleRun("mechanics");
assert.equal(loadCastleRun("mechanics"), null, "clearing a run should preserve the profile but remove the active expedition");
progressionRun = freshRun();
saveCastleRun("mechanics", progressionRun);
progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
assert.equal(progressionProfile.guardianClears, 2, "guardian clears should accumulate across separate runs");
assert.equal(progressionProfile.unlockedUpgradeIds.length, STARTER_CASTLE_UPGRADE_IDS.length + 2, "each accumulated guardian clear should unlock one discovery");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("boltBead"), true, "the second guardian should unlock Bolt Bead");
assert.deepEqual(getNewCastleKeepsakeIds(progressionProfile, { ...progressionRun, phase: "reward", battlesWon: 3 }), ["boltBead"], "a later guardian reward must not re-announce previously earned keepsakes");

for (let guardianIndex = 0; guardianIndex < 2; guardianIndex += 1) {
  clearCastleRun("mechanics");
  progressionRun = freshRun();
  saveCastleRun("mechanics", progressionRun);
  progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
}
assert.equal(progressionProfile.guardianClears, 4, "guardian progression should continue across four separate expeditions");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("nurseryBell"), true, "the fourth guardian should unlock Nursery Bell");
assert.deepEqual(getNewCastleKeepsakeIds(progressionProfile, { ...progressionRun, phase: "reward", battlesWon: 3 }), ["nurseryBell"], "the fourth guardian should celebrate only Nursery Bell");

clearCastleRun("mechanics");
progressionRun = freshRun();
saveCastleRun("mechanics", progressionRun);
progressionProfile = saveCastleRun("mechanics", { ...progressionRun, phase: "complete" });
assert.equal(progressionProfile.runsCompleted, 1, "a finished expedition should advance permanent run progression once");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("mossPatch"), true, "the first finished expedition should unlock Moss Patch");
assert.deepEqual(getNewCastleKeepsakeIds(progressionProfile, { ...progressionRun, phase: "complete" }), ["mossPatch"], "a completed expedition should celebrate only its newly unlocked keepsake");
assert.equal(selectCastleKeepsake("mechanics", "mossPatch").selectedKeepsakeId, "mossPatch", "an unlocked keepsake should be selectable");
assert.equal(selectCastleKeepsake("mechanics", "moonTreaty").selectedKeepsakeId, "mossPatch", "a locked keepsake must not be selectable");

for (let runIndex = 0; runIndex < 2; runIndex += 1) {
  clearCastleRun("mechanics");
  progressionRun = freshRun();
  saveCastleRun("mechanics", progressionRun);
  progressionProfile = saveCastleRun("mechanics", { ...progressionRun, phase: "complete" });
}
assert.equal(progressionProfile.runsCompleted, 3, "expedition progression should continue across three completed runs");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("moonTreaty"), true, "the third completed expedition should unlock Moon Treaty");
assert.deepEqual(getNewCastleKeepsakeIds(progressionProfile, { ...progressionRun, phase: "complete" }), ["moonTreaty"], "the third expedition should celebrate only Moon Treaty");
assert.equal(selectCastleKeepsake("mechanics", "moonTreaty").selectedKeepsakeId, "moonTreaty", "the final keepsake should become selectable at its advertised milestone");

let routeDraft = {
  ...freshRun(),
  phase: "reward",
  rewardChoices: ["springTail"],
  carriedCastleHp: 50,
  carriedEnergy: 0,
};
routeDraft = claimCastleUpgrade(routeDraft, "springTail");
assert.equal(routeDraft.phase, "route", "claiming a non-final reward should open a route draft");
assert.equal(routeDraft.routeChoices.length, 3, "each route draft should offer three paths, not every route every time");
assert.equal(routeDraft.routeChoices.includes("battle"), true, "the safe straight road should always remain available");
assert.equal(new Set(routeDraft.routeChoices).size, 3, "route choices should never duplicate");

const workshop = chooseCastleRoute({ ...routeDraft, routeChoices: ["workshop"] }, "workshop");
assert.equal(workshop.phase, "battle", "a workshop route should advance to the next battle");
assert.equal(workshop.battle.energy, 1.5, "a workshop should grant 1.5 starting energy");
assert.equal(workshop.battle.playerBarrier, 8, "a workshop should grant an eight-point starting barrier");

const straight = chooseCastleRoute({ ...routeDraft, routeChoices: ["battle"] }, "battle");
assert.equal(straight.battle.units.some(unit => unit.side === "player" && unit.kind === "piplet"), true, "the straight road should bring a scouting Piplet");
assert.equal(straight.battle.energy, 0.5, "the straight road should grant a small energy head start");

const eventDraw = chooseCastleRoute({ ...routeDraft, routeChoices: ["event"] }, "event");
assert.equal(eventDraw.phase, "event", "an event route should pause at a revealed decision");
assert.ok(eventDraw.pendingEventId, "an event route should deterministically select an event");

const poorMarket = { ...eventDraw, pendingEventId: "wobbleMarket", carriedEnergy: 0 };
assert.equal(canChooseCastleEvent(poorMarket, "marketSnack"), false, "resource-gated event choices should disclose and enforce their cost");
assert.equal(resolveCastleEvent(poorMarket, "marketSnack").phase, "event", "an unaffordable event choice must not consume the event");

const escorted = resolveCastleEvent({ ...eventDraw, pendingEventId: "hatchling" }, "hatchlingEscort");
assert.equal(escorted.phase, "battle", "resolving an event should prepare the next battle");
assert.equal(escorted.battle.units.filter(unit => unit.side === "player" && unit.kind === "piplet").length, 2, "the hatchling escort should start with two Piplets");
assert.equal(escorted.pendingEventId, null, "resolved events should clear their pending state");

function eventState(pendingEventId, carriedCastleHp = 50, carriedEnergy = 5, overrides = {}) {
  return {
    ...eventDraw,
    phase: "event",
    pendingEventId,
    carriedCastleHp,
    carriedEnergy,
    upgrades: [],
    draftPoolIds: STARTER_CASTLE_UPGRADE_IDS,
    ...overrides,
  };
}

const starwellSip = resolveCastleEvent(eventState("starwell"), "starwellSip");
assert.equal(starwellSip.battle.playerCastleHp, 72, "Starwell Sip should deliver its disclosed 22-HP repair");
assert.equal(starwellSip.battle.energy, 5, "Starwell Sip should not change stored energy");
const starwellBottle = resolveCastleEvent(eventState("starwell"), "starwellBottle");
assert.equal(starwellBottle.battle.playerCastleHp, 50, "Starwell Bottle should not change keep health");
assert.equal(starwellBottle.battle.energy, 8, "Starwell Bottle should deliver its disclosed three energy");

const hatchlingShell = resolveCastleEvent(eventState("hatchling"), "hatchlingShell");
assert.equal(hatchlingShell.battle.playerBarrier, 18, "Hatchling Shell should deliver its disclosed eighteen barrier");
const hatchlingShare = resolveCastleEvent(eventState("hatchling"), "hatchlingShare");
assert.equal(hatchlingShare.battle.playerCastleHp, 60, "Hatchling Share should repair ten keep HP");
assert.equal(hatchlingShare.battle.energy, 6.5, "Hatchling Share should add 1.5 energy");

const marketSnack = resolveCastleEvent(eventState("wobbleMarket"), "marketSnack");
assert.equal(marketSnack.battle.playerCastleHp, 82, "Market Snack should repair its disclosed 32 HP");
assert.equal(marketSnack.battle.energy, 3, "Market Snack should charge exactly two energy");
const marketTrade = resolveCastleEvent(eventState("wobbleMarket"), "marketTrade");
assert.equal(marketTrade.battle.playerCastleHp, 40, "Market Trade should charge exactly ten keep HP");
assert.equal(marketTrade.battle.energy, 9, "Market Trade should deliver its disclosed four energy");
const marketEgg = resolveCastleEvent(eventState("wobbleMarket"), "marketEgg");
assert.equal(marketEgg.battle.energy, 4, "Market Egg should charge exactly one energy");
assert.equal(marketEgg.battle.units.filter(unit => unit.kind === "bubbleBud").length, 1, "Market Egg should hatch one opening Bubble Bud");

const oracleShelter = resolveCastleEvent(eventState("rootOracle"), "oracleShelter");
assert.equal(oracleShelter.battle.playerCastleHp, 68, "Oracle Shelter should repair eighteen keep HP");
assert.equal(oracleShelter.battle.energy, 6, "Oracle Shelter should add one energy");
const oracleChallenge = resolveCastleEvent(eventState("rootOracle"), "oracleChallenge");
assert.equal(oracleChallenge.battle.playerCastleHp, 38, "Oracle Challenge should charge exactly twelve keep HP");
assert.equal(oracleChallenge.battle.units.filter(unit => unit.kind === "bigChonk").length, 1, "Oracle Challenge should add one opening Big Chonk");
const oracleListen = resolveCastleEvent(eventState("rootOracle"), "oracleListen");
assert.equal(oracleListen.battle.playerCastleHp, 42, "Oracle Listen should charge exactly eight keep HP");
assert.equal(oracleListen.upgrades.length, 1, "Oracle Listen should absorb one available mutation");
const exhaustedMutationEvent = eventState("rootOracle", 50, 5, {
  upgrades: [...STARTER_CASTLE_UPGRADE_IDS],
  draftPoolIds: [...STARTER_CASTLE_UPGRADE_IDS],
});
assert.equal(
  getCastleEventChoiceEffect(exhaustedMutationEvent, "oracleListen"),
  "Lose 8 HP; no new mutation remains, so gain 3 energy.",
  "an exhausted mutation event should disclose its energy fallback before the player chooses",
);
const exhaustedOracle = resolveCastleEvent(exhaustedMutationEvent, "oracleListen");
assert.equal(exhaustedOracle.battle.playerCastleHp, 42, "the exhausted Oracle fallback should still charge the disclosed HP cost");
assert.equal(exhaustedOracle.battle.energy, 8, "the exhausted Oracle fallback should grant the disclosed three energy");

const mutationEvent = {
  ...eventDraw,
  pendingEventId: "starwell",
  upgrades: [],
  draftPoolIds: STARTER_CASTLE_UPGRADE_IDS,
  carriedCastleHp: 80,
};
const mutated = resolveCastleEvent(mutationEvent, "starwellDive");
assert.equal(mutated.upgrades.length, 1, "a risky mutation event should add one available run mutation");
assert.equal(mutated.battle.playerCastleHp, 66, "the Starwell dive should visibly charge its fourteen-HP cost");

let guardian = freshRun();
guardian = {
  ...guardian,
  battleInRegion: 3,
  battle: {
    ...guardian.battle,
    guardian: true,
    guardianPhase: 1,
    mode: "study",
    enemyCastleMaxHp: 100,
    enemyCastleHp: 60,
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [],
  },
};
guardian = tickCastleRun(guardian, 100, 1);
assert.equal(guardian.battle.guardianPhase, 2, "a guardian should telegraph phase two below 66% HP");
assert.equal(guardian.battle.units.some(unit => unit.kind === "shellSlime"), true, "guardian phase two should add an armored reinforcement");
guardian = tickCastleRun({ ...guardian, battle: { ...guardian.battle, enemyCastleHp: 30 } }, 100, 1);
assert.equal(guardian.battle.guardianPhase, 3, "a guardian should telegraph its final phase below 33% HP");
assert.equal(guardian.battle.units.some(unit => unit.kind === "rootLump"), true, "guardian phase three should add a siege beast");
assert.ok(guardian.battle.enemySpawnTimerMs <= 2_800, "guardian phase three should accelerate the next wave");

const endlessStart = continueCastleRun({
  ...freshRun(),
  phase: "retire",
  region: 3,
  battleInRegion: 3,
  targetRegions: 3,
  carriedCastleHp: 100,
  carriedEnergy: 0,
});
assert.equal(endlessStart.phase, "battle", "continuing after a contract should begin the endless road");
assert.equal(endlessStart.region, 4, "the first endless battle should begin in region four");
assert.equal(endlessStart.battle.enemyThreatTier, 1, "region four should begin Moon Ascension 1");
assert.equal(getCastleEndlessThreat(6).tier, 3, "each region after the core three should add one ascension tier");

let scaledWave = {
  ...endlessStart,
  battle: {
    ...endlessStart.battle,
    mode: "study",
    enemySpawnTimerMs: 0,
    nextEnemyKind: "shellSlime",
    afterNextEnemyKind: "shellSlime",
    autoSpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
  },
};
scaledWave = tickCastleRun(scaledWave, 100, 1);
const ascendedShell = scaledWave.battle.units.find(unit => unit.side === "enemy" && unit.kind === "shellSlime");
assert.ok(ascendedShell, "an endless wave should still spawn its announced unit");
assert.equal(ascendedShell.maxHp, 20, "Moon Ascension 1 should add ten percent enemy health");
assert.equal(ascendedShell.damageBonus, 1, "Moon Ascension 1 should add its first attack bonus");
assert.equal(ascendedShell.shield, 8, "ascended armored enemies should gain two barrier per early tier");

function guardianAtThreat(tier, phase, enemyCastleHp, playerBarrier = 0) {
  const base = freshRun();
  return {
    ...base,
    region: 3 + tier,
    battleInRegion: 3,
    battle: {
      ...base.battle,
      guardian: true,
      guardianPhase: phase,
      enemyThreatTier: tier,
      mode: "study",
      enemyCastleMaxHp: 100,
      enemyCastleHp,
      playerCastleHp: 100,
      playerBarrier,
      autoSpawnTimerMs: 999_999,
      enemySpawnTimerMs: 999_999,
      playerTurretTimerMs: 999_999,
      enemyTurretTimerMs: 999_999,
      units: [],
    },
  };
}

const ascensionOneGuardian = tickCastleRun(guardianAtThreat(1, 1, 60), 100, 1);
assert.equal(ascensionOneGuardian.battle.units.some(unit => unit.kind === "echoMoth"), true, "Ascension 1 phase two should add an Echo Moth escort");
const ascensionTwoGuardian = tickCastleRun(guardianAtThreat(2, 2, 30), 100, 1);
assert.equal(ascensionTwoGuardian.battle.units.some(unit => unit.kind === "sporeBud"), true, "Ascension 2 phase three should add Spore support");
const ascendedRoot = ascensionTwoGuardian.battle.units.find(unit => unit.kind === "rootLump");
assert.ok(ascendedRoot.maxHp > 30, "endless guardian siege beasts should retain their ascension scaling");
const ascensionThreeGuardian = tickCastleRun(guardianAtThreat(3, 2, 30, 3), 100, 1);
assert.equal(ascensionThreeGuardian.battle.playerBarrier, 0, "Moon Pulse should consume keep barrier first");
assert.equal(ascensionThreeGuardian.battle.playerCastleHp, 98, "Ascension 3 Moon Pulse should deal only its unblocked two damage");
assert.equal(ascensionThreeGuardian.battle.telemetry.damageTaken, 2, "Moon Pulse damage should appear in battle telemetry");
assert.match(ascensionThreeGuardian.battle.notice, /Moon Pulse dealt 2/, "the guardian notice should explain Moon Pulse's actual damage");

process.stdout.write("Castle mechanics assertions passed.\n");
