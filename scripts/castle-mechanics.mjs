import assert from "node:assert/strict";
import {
  ALL_CASTLE_UPGRADE_IDS,
  STARTER_CASTLE_UPGRADE_IDS,
  activateCastlePower,
  applyCastleStudyOutcome,
  createInitialCastleRun,
  resumeCastleBattle,
  summonCastleUnit,
  tickCastleRun,
} from "../src/experiments/castleBattle.ts";
import { clearCastleRun, loadCastleRun, saveCastleRun } from "../src/experiments/castleStorage.ts";

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
progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
assert.equal(progressionProfile.guardianClears, 1, "saving the same guardian clear twice must not duplicate progression");
clearCastleRun("mechanics");
assert.equal(loadCastleRun("mechanics"), null, "clearing a run should preserve the profile but remove the active expedition");
progressionRun = freshRun();
saveCastleRun("mechanics", progressionRun);
progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
assert.equal(progressionProfile.guardianClears, 2, "guardian clears should accumulate across separate runs");
assert.equal(progressionProfile.unlockedUpgradeIds.length, STARTER_CASTLE_UPGRADE_IDS.length + 2, "each accumulated guardian clear should unlock one discovery");

process.stdout.write("Castle mechanics: 22 assertions passed.\n");
