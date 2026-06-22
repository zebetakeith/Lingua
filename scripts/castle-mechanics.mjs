import assert from "node:assert/strict";
import {
  ALL_CASTLE_UPGRADE_IDS,
  CASTLE_UNIT_DEFS,
  STARTER_CASTLE_UPGRADE_IDS,
  activateCastlePower,
  applyCastleStudyOutcome,
  canChooseCastleEvent,
  chooseCastleRoute,
  claimCastleUpgrade,
  createInitialCastleRun,
  resolveCastleEvent,
  resumeCastleBattle,
  summonCastleUnit,
  tickCastleRun,
} from "../src/experiments/castleBattle.ts";
import { clearCastleRun, loadCastleProfile, loadCastleRun, saveCastleRun, selectCastleKeepsake } from "../src/experiments/castleStorage.ts";

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
      unlockedUpgradeIds: [],
      discoveredEnemyKinds: [],
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

let rally = freshRun();
for (let index = 0; index < 3; index += 1) {
  rally = applyCastleStudyOutcome(rally, outcome(index, { isCorrect: false, reward: 0 }));
}
assert.equal(rally.battle.rally, 0, "three misses should consume the Rally meter");
assert.equal(rally.battle.telemetry.rallyTriggered, 1, "three misses should trigger one enemy rally");
assert.equal(rally.battle.units.filter(unit => unit.side === "enemy").length, 2, "enemy rally should add a two-unit squad");
assert.equal(rally.battle.missedDirectionKeys.length, 0, "a triggered Rally must consume its recovery keys");

let live = resumeCastleBattle({ ...freshRun(), battle: { ...freshRun().battle, energy: 12 } });
live = summonCastleUnit(live, "dartlet");
assert.equal(live.battle.telemetry.summons, 1, "summoning must work while combat is live");
assert.equal(live.battle.units.some(unit => unit.kind === "dartlet"), true, "live summon should enter the lane immediately");
live = activateCastlePower(live, "bubbleGate");
assert.equal(live.battle.playerBarrier, 24, "castle powers must work while combat is live");

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

let progressionRun = freshRun();
saveCastleRun("mechanics", { ...progressionRun, battlesWon: 2 });
let progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
assert.equal(progressionProfile.guardianClears, 1, "first guardian clear should advance permanent progression");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("shellButton"), true, "the first guardian should unlock Shell Button");
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

clearCastleRun("mechanics");
progressionRun = freshRun();
saveCastleRun("mechanics", progressionRun);
progressionProfile = saveCastleRun("mechanics", { ...progressionRun, phase: "complete" });
assert.equal(progressionProfile.runsCompleted, 1, "a finished expedition should advance permanent run progression once");
assert.equal(progressionProfile.unlockedKeepsakeIds.includes("mossPatch"), true, "the first finished expedition should unlock Moss Patch");
assert.equal(selectCastleKeepsake("mechanics", "mossPatch").selectedKeepsakeId, "mossPatch", "an unlocked keepsake should be selectable");
assert.equal(selectCastleKeepsake("mechanics", "moonTreaty").selectedKeepsakeId, "mossPatch", "a locked keepsake must not be selectable");

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

process.stdout.write("Castle mechanics assertions passed.\n");
