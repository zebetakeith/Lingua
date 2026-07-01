import assert from "node:assert/strict";
import {
  ALL_CASTLE_UPGRADE_IDS,
  CASTLE_ARMY_CAPACITY,
  CASTLE_DIFFICULTIES,
  CASTLE_ENEMY_AFFIX_DEFS,
  CASTLE_MELEE_ENGAGEMENT_SLOTS,
  CASTLE_RANGED_ENGAGEMENT_SLOTS,
  CASTLE_UNIT_DEFS,
  STARTER_CASTLE_UPGRADE_IDS,
  acknowledgeCastleGuardianBriefing,
  activateCastlePower,
  applyCastleStudyOutcome,
  canDraftCastleUpgrade,
  canChooseCastleEvent,
  chooseCastleRoute,
  claimCastleUpgrade,
  continueCastleRun,
  createInitialCastleRun,
  getCastleBattleLesson,
  getCastleArmyPopulation,
  getCastleBattleProgress,
  getCastleEndlessThreat,
  getCastleEnemyAffix,
  getCastleEventChoiceEffect,
  getCastleGuardianPower,
  getActiveCastleSynergies,
  getCastleSynergyProgress,
  getCastleStudyReport,
  refreshCastleCommandHand,
  resolveCastleEvent,
  resumeCastleBattle,
  startCastleCombatBeat,
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

function readyCommand(run, cardId) {
  return {
    ...run,
    battle: {
      ...run.battle,
      commandWindowReady: true,
      summonPlayedThisWindow: false,
      powerPlayedThisWindow: false,
      commandHand: [cardId, ...run.battle.commandHand.filter(id => id !== cardId)].slice(0, 4),
    },
  };
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
    affix: null,
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
assert.equal(keepsakeRun("boltBead").battle.recallBoltCharge, 1, "Focus Bead should grant one Focus mark");
assert.equal(keepsakeRun("nurseryBell").battle.units.filter(unit => unit.kind === "piplet").length, 1, "Nursery Bell should hatch one starting Piplet");
assert.equal(keepsakeRun("moonTreaty").battle.energy, 2, "Moon Treaty should grant two starting energy");
assert.equal(keepsakeRun("moonTreaty").battle.rally, 1, "Moon Treaty should disclose its one-pip Rally risk");

const studyDifficultyRun = createInitialCastleRun("difficulty", "quick", "quadratic", [], 42, "balanced", null, "study");
const standardDifficultyRun = createInitialCastleRun("difficulty", "quick", "quadratic", [], 42, "balanced", null, "standard");
const siegeDifficultyRun = createInitialCastleRun("difficulty", "quick", "quadratic", [], 42, "balanced", null, "siege");
assert.ok(studyDifficultyRun.battle.enemyCastleMaxHp < standardDifficultyRun.battle.enemyCastleMaxHp, "Study First should reduce enemy keep health");
assert.equal(siegeDifficultyRun.battle.enemyCastleMaxHp, standardDifficultyRun.battle.enemyCastleMaxHp, "Moonstorm should add pressure without creating inflated keep-health stalemates");
assert.equal(CASTLE_DIFFICULTIES.siege.enemyDamageBonus, 1, "Moonstorm should add one enemy damage");
assert.ok(CASTLE_DIFFICULTIES.siege.enemySpeedMultiplier > 1, "Moonstorm should accelerate enemy pressure");
assert.equal(siegeDifficultyRun.battle.difficultyId, "siege", "battle state should carry the selected pressure profile");
const studyRewardResult = applyCastleStudyOutcome(studyDifficultyRun, outcome(500, { reward: 1.25 }));
const standardRewardResult = applyCastleStudyOutcome(standardDifficultyRun, outcome(500, { reward: 1.25 }));
const siegeRewardResult = applyCastleStudyOutcome(siegeDifficultyRun, outcome(500, { reward: 1.25 }));
assert.equal(studyRewardResult.battle.energy, standardRewardResult.battle.energy, "Study First must not change recall rewards");
assert.equal(siegeRewardResult.battle.energy, standardRewardResult.battle.energy, "Moonstorm must not change recall rewards");

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
assert.equal(run.battle.enemyCastleHp, startingEnemyHp, "Focus bonus should never deal automatic castle damage");
run = applyCastleStudyOutcome(run, outcome(4));
assert.equal(run.battle.recallBoltCharge, 0, "fifth correct seen recall should consume the bolt charge");
assert.equal(run.battle.enemyCastleHp, startingEnemyHp, "focus rewards should not bypass tactical combat with automatic damage");
assert.equal(run.battle.energy, 6, "the fifth correct recall should grant one bonus Goo");

const unseen = applyCastleStudyOutcome(freshRun(), outcome(0, { isExposure: true, wasUnseen: true, reward: 0.25 }));
assert.equal(unseen.battle.recallBoltCharge, 0, "first exposure must not charge the Focus bonus");
assert.equal(unseen.correct, 0, "an ungraded first exposure must not count as a correct answer");
assert.equal(unseen.wrong, 0, "an ungraded first exposure must not count as a miss");
assert.equal(unseen.battle.energy, 0, "a completed first exposure should not grant battle Goo");
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
assert.match(bankedEnergyLesson, /Goo still banked/i, "a loss with hoarded Goo should produce actionable spending guidance");
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

const minionEvolutionUpgrades = ["splitNursery", "bubbleBrood", "stretchyLegs"];
assert.equal(getCastleSynergyProgress(minionEvolutionUpgrades).minion, 3, "three minion mutations should fill the minion evolution track");
assert.equal(getActiveCastleSynergies(minionEvolutionUpgrades).some(synergy => synergy.id === "broodHeart"), true, "three minion mutations should evolve Brood Heart");
let broodHeartRun = readyCommand({ ...freshRun(), upgrades: minionEvolutionUpgrades, battle: { ...freshRun().battle, energy: 12 } }, "dartlet");
broodHeartRun = summonCastleUnit(broodHeartRun, "dartlet");
assert.equal(broodHeartRun.battle.units.find(unit => unit.kind === "dartlet").maxHp, 9, "Brood Heart should hatch friendly units with twelve percent more health");

const engineUpgrades = ["snackCannon", "gooMoat", "nurseryChimney"];
const engineTarget = testUnit("nibbleImp", "enemy", "engine-target", { position: 20 });
let engineRun = {
  ...freshRun(),
  upgrades: engineUpgrades,
  battle: { ...freshRun().battle, mode: "study", combatBeatRemainingMs: 4_000, units: [engineTarget], playerTurretTimerMs: 0, autoSpawnTimerMs: 999_999, enemySpawnTimerMs: 999_999, enemyTurretTimerMs: 999_999 },
};
engineRun = tickCastleRun(engineRun, 100, 1);
assert.equal(engineRun.battle.playerTurretTimerMs, 2_500, "Nursery Engine should reduce the keep turret reload to 2.6 seconds");

const instinctUpgrades = ["impHorns", "springTail", "crabClaws"];
const instinctUnit = testUnit("dartlet", "player", "instinct-unit", { position: 20 });
const instinctBase = { ...freshRun(), upgrades: instinctUpgrades, battle: { ...freshRun().battle, mode: "study", combatBeatRemainingMs: 4_000, units: [instinctUnit], autoSpawnTimerMs: 999_999, enemySpawnTimerMs: 999_999, playerTurretTimerMs: 999_999, enemyTurretTimerMs: 999_999 } };
const instinctRun = tickCastleRun(instinctBase, 250, 1);
assert.ok(instinctRun.battle.units.find(unit => unit.id === "instinct-unit").position > 22.5, "Keeper Instinct should stack a visible movement bonus with trait builds");

let memoryBloomRun = { ...freshRun(), upgrades: ["firstRecall", "dueDew", "deepRecall"], battle: { ...freshRun().battle, playerBarrier: 0 } };
for (let index = 0; index < 5; index += 1) memoryBloomRun = applyCastleStudyOutcome(memoryBloomRun, outcome(700 + index, { reward: 0 }));
assert.equal(memoryBloomRun.battle.playerBarrier, 19, "Memory Bloom should add four barrier on the fifth correct recall alongside Due Dew");
assert.match(memoryBloomRun.notice, /Memory Bloom raised 4 keep barrier/, "Memory Bloom should announce its fifth-recall shield payoff");
assert.equal(memoryBloomRun.battle.fxEvents.some(effect => effect.kind === "shield" && effect.label === "+4 Bloom"), true, "Memory Bloom should create a visible keep shield burst");

const evolutionClaim = claimCastleUpgrade({ ...freshRun(), phase: "reward", upgrades: ["splitNursery", "bubbleBrood"], rewardChoices: ["stretchyLegs"] }, "stretchyLegs");
assert.match(evolutionClaim.notice, /Brood Heart evolved/, "claiming a third category mutation should announce its evolution");

let live = readyCommand({ ...freshRun(), battle: { ...freshRun().battle, energy: 12 } }, "dartlet");
live = summonCastleUnit(live, "dartlet");
assert.equal(live.battle.telemetry.summons, 1, "summoning must work during the command window");
assert.equal(live.battle.units.some(unit => unit.kind === "dartlet"), true, "live summon should enter the lane immediately");
live = activateCastlePower(readyCommand(live, "bubbleGate"), "bubbleGate");
assert.equal(live.battle.playerBarrier, 24, "castle powers must work during the command window");

let refreshedHand = readyCommand(freshRun(), "dartlet");
const handBeforeRefresh = [...refreshedHand.battle.commandHand];
const totalCardsBeforeRefresh = refreshedHand.battle.commandHand.length + refreshedHand.battle.commandDrawPile.length + refreshedHand.battle.commandDiscardPile.length;
refreshedHand = refreshCastleCommandHand(refreshedHand);
assert.notDeepEqual(refreshedHand.battle.commandHand, handBeforeRefresh, "refreshing should replace a stale command hand");
assert.equal(refreshedHand.battle.commandRefreshUsedThisWindow, true, "the free refresh should be limited to once per answer");
assert.equal(refreshedHand.battle.commandHand.length + refreshedHand.battle.commandDrawPile.length + refreshedHand.battle.commandDiscardPile.length, totalCardsBeforeRefresh, "refreshing must preserve the complete command deck");
assert.equal(refreshCastleCommandHand(refreshedHand), refreshedHand, "a second hand refresh in the same command window must be rejected");

let commandRules = readyCommand({ ...freshRun(), battle: { ...freshRun().battle, energy: 12 } }, "dartlet");
const originalHand = [...commandRules.battle.commandHand];
commandRules = summonCastleUnit(commandRules, "dartlet");
assert.equal(commandRules.battle.summonPlayedThisWindow, true, "one summon should consume the summon action for this answer");
assert.notDeepEqual(commandRules.battle.commandHand, originalHand, "a played command card should rotate out of the four-card hand");
const afterFirstSummon = commandRules;
commandRules = summonCastleUnit(commandRules, "bubbleBud");
assert.equal(commandRules.battle.telemetry.summons, afterFirstSummon.battle.telemetry.summons, "a second summon in one command window must be rejected");
assert.equal(refreshCastleCommandHand(commandRules), commandRules, "the hand cannot be refreshed after a command card has been played");

let beat = startCastleCombatBeat(readyCommand(freshRun(), "dartlet"));
assert.equal(beat.battle.combatBeatRemainingMs, 4_000, "marching should start one four-second battle beat");
for (let index = 0; index < 16; index += 1) beat = tickCastleRun(beat, 250, 1);
assert.equal(beat.battle.combatBeatRemainingMs, 0, "a battle beat should end after exactly four simulated seconds");
assert.equal(beat.battle.mode, "command", "the lane should freeze when its battle beat ends");

let capped = { ...freshRun(), battle: { ...freshRun().battle, energy: 12, units: Array.from({ length: CASTLE_ARMY_CAPACITY }, (_, index) => testUnit("dartlet", "player", `cap-${index}`)) } };
capped = summonCastleUnit(readyCommand(capped, "dartlet"), "dartlet");
assert.equal(getCastleArmyPopulation(capped.battle), CASTLE_ARMY_CAPACITY, "the army cap must reject summons that would exceed ten spaces");

let slingshot = readyCommand({ ...freshRun(), battle: { ...freshRun().battle, energy: 12 } }, "slingshot");
const slingshotCastleHp = slingshot.battle.enemyCastleHp;
slingshot = activateCastlePower(slingshot, "slingshot");
assert.equal(slingshot.battle.enemyCastleHp, slingshotCastleHp - 8, "Slingshot should strike the rival keep when the lane is empty");
assert.equal(slingshot.battle.energy, 9.5, "Slingshot should spend its disclosed energy cost");

const lockedSnack = readyCommand({ ...freshRun(), upgrades: [], battle: { ...freshRun().battle, energy: 12 } }, "snackCannon");
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
snack = activateCastlePower(readyCommand(snack, "snackCannon"), "snackCannon");
assert.equal(snack.battle.playerCastleHp, 70, "Snack Cannon should repair ten keep HP");
assert.equal(snack.battle.units[0].hp, CASTLE_UNIT_DEFS.dartlet.hp, "Snack Cannon should heal allies without exceeding max HP");

let moat = {
  ...freshRun(),
  upgrades: ["gooMoat", "puddlePaws"],
  battle: { ...freshRun().battle, energy: 12, units: [testUnit("nibbleImp", "enemy", "moat-target")] },
};
moat = activateCastlePower(readyCommand(moat, "gooMoat"), "gooMoat");
assert.equal(moat.battle.units[0].slowMs, 6_000, "Goo Moat plus Puddle Paws should apply the upgraded lane slow");

let timewobble = {
  ...freshRun(),
  upgrades: ["timewobbleClock"],
  battle: { ...freshRun().battle, energy: 12, units: [testUnit("nibbleImp", "enemy", "frozen-attacker", { position: 3, attackCooldownMs: 0 })] },
};
timewobble = activateCastlePower(readyCommand(timewobble, "timewobble"), "timewobble");
assert.equal(timewobble.battle.enemySlowMs, 4_000, "Timewobble should freeze enemy movement and attacks for four seconds");
const frozenCastleHp = timewobble.battle.playerCastleHp;
timewobble = tickCastleRun(resumeCastleBattle(timewobble), 100, 1);
assert.equal(timewobble.battle.playerCastleHp, frozenCastleHp, "an enemy already in range must not attack during Timewobble");

const emptySnatch = { ...freshRun(), upgrades: ["tongueCrane"], battle: { ...freshRun().battle, energy: 12 } };
const refundedSnatch = activateCastlePower(readyCommand(emptySnatch, "tongueSnatch"), "tongueSnatch");
assert.equal(refundedSnatch.battle.energy, 12, "Tongue Snatch should refund all energy when no target qualifies");
assert.equal(refundedSnatch.battle.telemetry.powersUsed, 0, "a refunded Tongue Snatch should not count as a used power");

let snatch = {
  ...freshRun(),
  upgrades: ["tongueCrane", "nibbleTeeth", "digestor"],
  battle: { ...freshRun().battle, energy: 12, units: [testUnit("nibbleImp", "enemy", "snatch-target", { hp: 4 })] },
};
snatch = activateCastlePower(readyCommand(snatch, "tongueSnatch"), "tongueSnatch");
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
mortar = activateCastlePower(readyCommand(mortar, "sporeMortar"), "sporeMortar");
assert.deepEqual(mortar.battle.units.map(unit => unit.hp), [10, 10, 10, 18], "Spore Mortar should damage only the three front enemies");
assert.equal(mortar.battle.telemetry.powersUsed, 1, "successful castle powers should be represented in telemetry");

let lockedMendlet = { ...freshRun(), upgrades: [], battle: { ...freshRun().battle, energy: 12 } };
lockedMendlet = summonCastleUnit(readyCommand(lockedMendlet, "mendlet"), "mendlet");
assert.equal(lockedMendlet.battle.units.some(unit => unit.kind === "mendlet"), false, "Mendlet should not be summonable before its egg mutation is chosen");

let hatchedMendlet = { ...freshRun(), upgrades: ["mendletEgg"], battle: { ...freshRun().battle, energy: 12 } };
hatchedMendlet = summonCastleUnit(readyCommand(hatchedMendlet, "mendlet"), "mendlet");
assert.equal(hatchedMendlet.battle.energy, 8, "Mendlet should cost four energy");
assert.equal(hatchedMendlet.battle.units.some(unit => unit.kind === "mendlet"), true, "Mendlet Egg should add Mendlet to the command tray summon roster");
assert.equal(canDraftCastleUpgrade("dewSatchel", []), false, "a Mendlet evolution should stay out of drafts before Mendlet Egg is active");
assert.equal(canDraftCastleUpgrade("pollenPuff", ["mendletEgg"]), true, "Mendlet evolutions should enter drafts after their parent mutation is active");

let healingSupport = {
  ...freshRun(),
  upgrades: ["mendletEgg"],
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [
      testUnit("mendlet", "player", "mendlet-healer", { position: 40, attackCooldownMs: 0 }),
      testUnit("dartlet", "player", "mendlet-patient", { position: 45, hp: 2, attackCooldownMs: 999_999 }),
      testUnit("piplet", "player", "mendlet-healthier", { position: 42, hp: 8, attackCooldownMs: 999_999 }),
    ],
  },
};
healingSupport = tickCastleRun(healingSupport, 100, 1);
assert.equal(healingSupport.battle.units.find(unit => unit.id === "mendlet-patient").hp, 6, "Mendlet should heal the most wounded nearby ally for four HP");
assert.equal(healingSupport.battle.units.find(unit => unit.id === "mendlet-healer").attackCooldownMs, CASTLE_UNIT_DEFS.mendlet.attackMs, "Mendlet healing should use its support cooldown");
assert.equal(healingSupport.battle.fxEvents.some(event => event.kind === "heal" && event.label === "+4"), true, "Mendlet healing should be visible in battlefield feedback");

let evolvedSupport = {
  ...freshRun(),
  upgrades: ["mendletEgg", "dewSatchel", "pollenPuff"],
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [
      testUnit("mendlet", "player", "evolved-healer", { position: 40, attackCooldownMs: 0 }),
      testUnit("dartlet", "player", "evolved-patient", { position: 45, hp: 2, shield: 0, attackCooldownMs: 999_999 }),
    ],
  },
};
evolvedSupport = tickCastleRun(evolvedSupport, 100, 1);
assert.equal(evolvedSupport.battle.units.find(unit => unit.id === "evolved-patient").hp, 8, "Bottomless Dew Satchel should raise Mendlet healing from four to six");
assert.equal(evolvedSupport.battle.units.find(unit => unit.id === "evolved-patient").shield, 2, "Pollen Puff should add two shield to Mendlet's patient");
assert.equal(evolvedSupport.battle.fxEvents.some(event => event.kind === "shield" && event.label === "+2"), true, "Pollen Puff should have distinct shield feedback");

let support = { ...freshRun(), battle: { ...freshRun().battle, energy: 12 } };
support = summonCastleUnit(readyCommand(support, "dartlet"), "dartlet");
support = summonCastleUnit(readyCommand(support, "bubbleBud"), "bubbleBud");
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
      testUnit("mendlet", "player", "formation-mendlet", { position: 95, attackCooldownMs: 0 }),
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
assert.equal(mixedFormation.battle.units.find(unit => unit.id === "formation-mendlet").attackCooldownMs, 0, "support units should not consume a melee or ranged attack slot");

const branchDraftBattle = {
  ...freshRun().battle,
  mode: "study",
  enemyCastleHp: 1,
  autoSpawnTimerMs: 999_999,
  enemySpawnTimerMs: 999_999,
  playerTurretTimerMs: 999_999,
  enemyTurretTimerMs: 999_999,
  units: [testUnit("dartlet", "player", "branch-finisher", { position: 95, attackCooldownMs: 0 })],
};
let lockedBranchDraft = {
  ...freshRun(),
  upgrades: [],
  draftPoolIds: ["springTail", "dewSatchel", "pollenPuff"],
  battle: branchDraftBattle,
};
lockedBranchDraft = tickCastleRun(lockedBranchDraft, 100, 1);
assert.deepEqual(lockedBranchDraft.rewardChoices, ["springTail"], "a reward draft should hide child mutations until their parent is owned");

let openBranchDraft = {
  ...freshRun(),
  upgrades: ["mendletEgg"],
  draftPoolIds: ["springTail", "dewSatchel", "pollenPuff"],
  battle: branchDraftBattle,
};
openBranchDraft = tickCastleRun(openBranchDraft, 100, 1);
assert.deepEqual(new Set(openBranchDraft.rewardChoices), new Set(["springTail", "dewSatchel", "pollenPuff"]), "owning Mendlet Egg should open both of its evolution choices in later drafts");

let evolutionFinisherDraft = {
  ...freshRun(),
  upgrades: ["splitNursery", "bubbleBrood"],
  draftPoolIds: ["springTail", "firstRecall", "stretchyLegs"],
  battle: branchDraftBattle,
};
evolutionFinisherDraft = tickCastleRun(evolutionFinisherDraft, 100, 1);
assert.equal(
  evolutionFinisherDraft.rewardChoices.includes("stretchyLegs"),
  true,
  "a draft should guarantee an eligible category finisher when an evolution is one mutation away",
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

let boomcapBurst = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [
      testUnit("boomcap", "enemy", "burst-boomcap", { position: 50, hp: 0 }),
      testUnit("dartlet", "player", "burst-near", { position: 44, attackCooldownMs: 999_999 }),
      testUnit("dartlet", "player", "burst-shielded", { position: 55, shield: 2, attackCooldownMs: 999_999 }),
      testUnit("dartlet", "player", "burst-distant", { position: 59, attackCooldownMs: 999_999 }),
    ],
  },
};
boomcapBurst = tickCastleRun(boomcapBurst, 100, 1);
assert.equal(boomcapBurst.battle.units.some(unit => unit.id === "burst-boomcap"), false, "a defeated Boomcap should pop normally after releasing its burst");
assert.equal(boomcapBurst.battle.units.find(unit => unit.id === "burst-near").hp, CASTLE_UNIT_DEFS.dartlet.hp - 3, "Boomcap should damage every nearby friendly unit when defeated");
assert.equal(boomcapBurst.battle.units.find(unit => unit.id === "burst-shielded").hp, CASTLE_UNIT_DEFS.dartlet.hp - 1, "unit shields should absorb Boomcap burst damage before HP");
assert.equal(boomcapBurst.battle.units.find(unit => unit.id === "burst-shielded").shield, 0, "Boomcap should consume the nearby unit's shield");
assert.equal(boomcapBurst.battle.units.find(unit => unit.id === "burst-distant").hp, CASTLE_UNIT_DEFS.dartlet.hp, "Boomcap should not damage formations outside its eight-space burst radius");
assert.equal(boomcapBurst.battle.fxEvents.some(event => event.kind === "power" && event.label === "Boomcap burst ×2"), true, "Boomcap should telegraph how many friendly units its burst hit");

let boomcapWave = {
  ...freshRun(),
  region: 3,
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 0,
    nextEnemyKind: "boomcap",
    afterNextEnemyKind: "boomcap",
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [],
  },
};
boomcapWave = tickCastleRun(boomcapWave, 100, 1);
assert.equal(boomcapWave.battle.units.some(unit => unit.kind === "boomcap"), true, "Boomcap should enter through the standard late-region wave path");
assert.equal(boomcapWave.battle.encounteredEnemyKinds.includes("boomcap"), true, "meeting Boomcap should reveal it in the field guide");

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
hasted = summonCastleUnit(readyCommand(hasted, "dartlet"), "dartlet");
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
delete legacyStudySave.mechanics.run.difficultyId;
delete legacyStudySave.mechanics.run.battle.difficultyId;
legacyStudySave.mechanics.run.recallMode = "typed";
delete legacyStudySave.mechanics.run.upgrades;
delete legacyStudySave.mechanics.run.draftPoolIds;
delete legacyStudySave.mechanics.run.eventHistory;
delete legacyStudySave.mechanics.run.battle.missedDirectionKeys;
delete legacyStudySave.mechanics.run.battle.recalledDirectionKeys;
delete legacyStudySave.mechanics.run.battle.fxEvents;
delete legacyStudySave.mechanics.run.battle.telemetry.responseMs;
legacyStudySave.mechanics.run.battle.units.push({ kind: "retired-prototype-enemy", side: "enemy" });
legacyStudySave.mechanics.run.battle.units.push(testUnit("nibbleImp", "enemy", "legacy-affix", { affix: "retired-affix" }));
localStorage.setItem("lexicon_labyrinth_castle_runs_v1", JSON.stringify(legacyStudySave));
const restoredLegacyRun = loadCastleRun("mechanics");
assert.equal(restoredLegacyRun.difficultyId, "standard", "legacy runs should migrate to Standard Siege");
assert.equal(restoredLegacyRun.battle.difficultyId, "standard", "legacy battle state should inherit the migrated difficulty");
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
assert.equal(restoredLegacyRun.battle.units.find(unit => unit.id === "legacy-affix").affix, null, "unknown enemy affixes should be cleared during recovery");
assert.doesNotThrow(
  () => applyCastleStudyOutcome(restoredLegacyRun, outcome(99)),
  "a repaired prototype run should accept the next study outcome without crashing",
);
clearCastleRun("mechanics");

const preBriefingGuardianSave = freshRun();
saveCastleRun("mechanics", {
  ...preBriefingGuardianSave,
  battleInRegion: 3,
  battle: {
    ...preBriefingGuardianSave.battle,
    guardian: true,
    guardianPhase: 1,
    guardianAbilityTimerMs: 999_999,
    guardianPowerId: "shellReprisal",
    activeTimeMs: 0,
  },
});
const preBriefingSaveFile = JSON.parse(localStorage.getItem("lexicon_labyrinth_castle_runs_v1"));
delete preBriefingSaveFile.mechanics.run.battle.guardianBriefingPending;
delete preBriefingSaveFile.mechanics.run.battle.guardianAbilityTimerMs;
localStorage.setItem("lexicon_labyrinth_castle_runs_v1", JSON.stringify(preBriefingSaveFile));
assert.equal(loadCastleRun("mechanics").battle.guardianBriefingPending, true, "an untouched legacy guardian should recover with its safety briefing pending");
assert.equal(loadCastleRun("mechanics").battle.guardianAbilityTimerMs, 8_000, "a legacy guardian should recover with a fully telegraphed first signature");
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
assert.equal(progressionProfile.unlockedUpgradeIds.includes("mendletEgg"), true, "the fourth guardian should add Mendlet Egg to future mutation drafts");
assert.deepEqual(getNewCastleKeepsakeIds(progressionProfile, { ...progressionRun, phase: "reward", battlesWon: 3 }), ["nurseryBell"], "the fourth guardian should celebrate only Nursery Bell");

for (let guardianIndex = 0; guardianIndex < 2; guardianIndex += 1) {
  clearCastleRun("mechanics");
  progressionRun = freshRun();
  saveCastleRun("mechanics", progressionRun);
  progressionProfile = saveCastleRun("mechanics", { ...progressionRun, battlesWon: 3 });
}
assert.equal(progressionProfile.guardianClears, 6, "guardian progression should continue through Mendlet's mutation branch");
assert.equal(progressionProfile.unlockedUpgradeIds.includes("dewSatchel"), true, "the fifth guardian should discover Bottomless Dew Satchel");
assert.equal(progressionProfile.unlockedUpgradeIds.includes("pollenPuff"), true, "the sixth guardian should discover Pollen Puff");

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
  "Lose 8 HP; no new mutation remains, so gain 3 Goo.",
  "an exhausted mutation event should disclose its Goo fallback before the player chooses",
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

const guardianEntry = chooseCastleRoute({
  ...routeDraft,
  region: 1,
  battleInRegion: 2,
  targetRegions: 3,
  phase: "route",
  routeChoices: ["battle"],
}, "battle");
assert.equal(guardianEntry.battle.guardian, true, "the third castle in a region should be a guardian");
assert.equal(guardianEntry.battle.guardianBriefingPending, true, "a new guardian should require a briefing before combat begins");
const guardianEntryResumedEarly = resumeCastleBattle(guardianEntry);
assert.equal(guardianEntryResumedEarly.battle.mode, "command", "resume must not bypass an unread guardian briefing");
const guardianEntryTickedEarly = tickCastleRun(guardianEntryResumedEarly, 1_000, 1);
assert.equal(guardianEntryTickedEarly.battle.activeTimeMs, 0, "guardian briefing time must not advance combat");
const guardianEntryAcknowledged = acknowledgeCastleGuardianBriefing(guardianEntry);
assert.equal(guardianEntryAcknowledged.battle.guardianBriefingPending, false, "acknowledging the briefing should unlock the guardian battle");
assert.equal(resumeCastleBattle(guardianEntryAcknowledged).battle.mode, "study", "combat may begin after the guardian briefing is acknowledged");
assert.equal(acknowledgeCastleGuardianBriefing(guardianEntryAcknowledged), guardianEntryAcknowledged, "acknowledgment should be idempotent");

let guardian = freshRun();
guardian = {
  ...guardian,
  battleInRegion: 3,
  battle: {
    ...guardian.battle,
    guardian: true,
    guardianPhase: 1,
    guardianAbilityTimerMs: 999_999,
    mode: "study",
    combatBeatRemainingMs: 4_000,
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
assert.equal(getCastleBattleProgress(endlessStart), "Moon Ascension 1 · Castle 1/3", "endless HUD progress should use its ascension name instead of an impossible region fraction");
assert.equal(getCastleBattleProgress({ ...freshRun(), targetRegions: 1, region: 2 }), "Deep run · Region 2 · Castle 1/3", "continuing beyond a short contract should label the deeper named region clearly");
assert.equal(getCastleGuardianPower(4).id, "rootQuake", "the first endless region should introduce the Root Quake guardian stance");
assert.equal(getCastleGuardianPower(5).id, "broodCall", "the second endless region should introduce the Brood Call guardian stance");
for (let region = 1; region <= 5; region += 1) {
  const guardianIdentity = getCastleGuardianPower(region);
  assert.match(guardianIdentity.epithet, /^Mallow, /, "every guardian stance should have a named Mallow form");
  assert.ok(guardianIdentity.counterplay.length >= 40, "every guardian briefing should teach concrete counterplay");
}

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
assert.equal(getCastleEnemyAffix(0, 1), null, "named regions should never create Moon Marks");
assert.equal(getCastleEnemyAffix(1, 1), "armored", "Moon Ascension 1 should introduce Shell-marked waves");
assert.equal(getCastleEnemyAffix(2, 3), "frenzied", "Moon Ascension 2 should introduce Rush-marked waves");
assert.equal(getCastleEnemyAffix(3, 5), "giant", "Moon Ascension 3 should introduce Crown-marked waves");
assert.match(CASTLE_ENEMY_AFFIX_DEFS.frenzied.description, /22% faster/, "Moon Mark rules should disclose their exact combat effect");

function spawnedAffixUnit(tier, spawnIndex, kind = "nibbleImp") {
  const base = freshRun();
  const spawned = tickCastleRun({
    ...base,
    region: 3 + tier,
    battle: {
      ...base.battle,
      enemyThreatTier: tier,
      enemySpawnCount: spawnIndex,
      mode: "study",
      enemySpawnTimerMs: 0,
      nextEnemyKind: kind,
      afterNextEnemyKind: kind,
      autoSpawnTimerMs: 999_999,
      playerTurretTimerMs: 999_999,
      enemyTurretTimerMs: 999_999,
    },
  }, 100, 1);
  return spawned.battle.units.find(unit => unit.side === "enemy");
}

const armoredElite = spawnedAffixUnit(1, 1);
assert.equal(armoredElite.affix, "armored", "the previewed Shell mark should be attached to the spawned enemy");
assert.equal(armoredElite.shield, 6, "Shell-marked enemies should arrive with six extra barrier");
const frenziedElite = spawnedAffixUnit(2, 3);
assert.equal(frenziedElite.affix, "frenzied", "the previewed Rush mark should be attached to the spawned enemy");
assert.equal(frenziedElite.damageBonus, 2, "Rush-marked enemies should stack one bonus damage with ascension damage");
const giantElite = spawnedAffixUnit(3, 5);
assert.equal(giantElite.affix, "giant", "the previewed Crown mark should be attached to the spawned enemy");
assert.equal(giantElite.maxHp, 15, "Crown-marked Nibble Imps should stack 35% health with Ascension 3 health");

let affixTimingRun = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [testUnit("nibbleImp", "enemy", "rush-timing", { affix: "frenzied", position: 2, attackCooldownMs: 0 })],
  },
};
affixTimingRun = tickCastleRun(affixTimingRun, 100, 1);
assert.equal(affixTimingRun.battle.units.find(unit => unit.id === "rush-timing").attackCooldownMs, CASTLE_UNIT_DEFS.nibbleImp.attackMs * 0.78, "Rush-marked enemies should recover attacks 22% faster");

let giantMovementRun = {
  ...freshRun(),
  battle: {
    ...freshRun().battle,
    mode: "study",
    autoSpawnTimerMs: 999_999,
    enemySpawnTimerMs: 999_999,
    playerTurretTimerMs: 999_999,
    enemyTurretTimerMs: 999_999,
    units: [testUnit("nibbleImp", "enemy", "giant-movement", { affix: "giant", position: 80 })],
  },
};
giantMovementRun = tickCastleRun(giantMovementRun, 250, 1);
assert.ok(giantMovementRun.battle.units.find(unit => unit.id === "giant-movement").position > 78.5, "Crown-marked enemies should move 22% slower than ordinary Nibble Imps");

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
      guardianAbilityTimerMs: 999_999,
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

const shellStance = tickCastleRun({
  ...guardianAtThreat(0, 1, 60),
  battle: { ...guardianAtThreat(0, 1, 60).battle, guardianPowerId: "shellReprisal" },
}, 100, 1);
const reprisalShell = shellStance.battle.units.find(unit => unit.kind === "shellSlime");
assert.equal(reprisalShell.shield, 11, "Shell Reprisal should add five visible barrier to the phase-two defender");
assert.match(shellStance.battle.notice, /Shell Reprisal gave every enemy 5 barrier/, "Shell Reprisal should explain its phase effect");

const sporeStanceBase = guardianAtThreat(0, 1, 60);
const sporeStance = tickCastleRun({
  ...sporeStanceBase,
  battle: {
    ...sporeStanceBase.battle,
    guardianPowerId: "sporeWeather",
    units: [testUnit("piplet", "player", "stance-piplet", { slowMs: 0 })],
  },
}, 100, 1);
assert.equal(sporeStance.battle.units.find(unit => unit.id === "stance-piplet").slowMs, 3_000, "Spore Weather should visibly slow the friendly formation for three seconds");

const moonStanceBase = guardianAtThreat(0, 1, 60);
const moonStance = tickCastleRun({
  ...moonStanceBase,
  battle: { ...moonStanceBase.battle, guardianPowerId: "moonTax", energy: 2 },
}, 100, 1);
assert.equal(moonStance.battle.energy, 1, "Moon Tax should drain one stored energy at a phase change");
assert.match(moonStance.battle.notice, /Moon Tax drained 1 Goo/, "Moon Tax should explain the exact Goo loss");

const quakeStanceBase = guardianAtThreat(1, 1, 60);
const quakeStance = tickCastleRun({
  ...quakeStanceBase,
  battle: {
    ...quakeStanceBase.battle,
    guardianPowerId: "rootQuake",
    units: [
      testUnit("piplet", "player", "quake-shielded", { shield: 3 }),
      testUnit("piplet", "player", "quake-open", { shield: 0 }),
    ],
  },
}, 100, 1);
assert.equal(quakeStance.battle.units.find(unit => unit.id === "quake-shielded").hp, CASTLE_UNIT_DEFS.piplet.hp - 1, "Root Quake should let unit shields absorb damage first");
assert.equal(quakeStance.battle.units.find(unit => unit.id === "quake-open").hp, CASTLE_UNIT_DEFS.piplet.hp - 4, "Root Quake should damage each unshielded friendly unit");
assert.match(quakeStance.battle.notice, /Root Quake struck 2 friendly units for 4 damage/, "Root Quake should explain its exact formation damage");

const broodStanceBase = guardianAtThreat(1, 1, 60);
const broodStance = tickCastleRun({
  ...broodStanceBase,
  battle: { ...broodStanceBase.battle, guardianPowerId: "broodCall" },
}, 100, 1);
assert.equal(broodStance.battle.units.filter(unit => unit.kind === "nibbleImp").length, 1, "Brood Call should add a Nibble Imp at phase two");
assert.match(broodStance.battle.notice, /Brood Call released a rushing Nibble Imp/, "Brood Call should announce its bonus attacker");

const finalBroodStanceBase = guardianAtThreat(2, 2, 30);
const finalBroodStance = tickCastleRun({
  ...finalBroodStanceBase,
  battle: { ...finalBroodStanceBase.battle, guardianPowerId: "broodCall" },
}, 100, 1);
assert.ok(finalBroodStance.battle.units.some(unit => unit.kind === "shellSlime"), "Brood Call should add an armored Shell Slime at phase three");

function triggerSignature(powerId, units = [], energy = 2, phase = 1) {
  const base = guardianAtThreat(0, phase, 100);
  return tickCastleRun({
    ...base,
    battle: {
      ...base.battle,
      guardianPowerId: powerId,
      guardianAbilityTimerMs: 0,
      energy,
      units,
    },
  }, 100, 1);
}

const chorusTarget = testUnit("shellSlime", "enemy", "chorus-target", { shield: 1 });
const chorusSignature = triggerSignature("shellReprisal", [chorusTarget]);
assert.equal(chorusSignature.battle.units.find(unit => unit.id === "chorus-target").shield, 3, "Shell Chorus should grant two recurring barrier");
assert.match(chorusSignature.battle.notice, /Shell Chorus/, "Shell Chorus should announce its target count");

const squallTarget = testUnit("piplet", "player", "squall-target");
const squallSignature = triggerSignature("sporeWeather", [squallTarget]);
assert.equal(squallSignature.battle.units.find(unit => unit.id === "squall-target").slowMs, 2_500, "Spore Squall should slow the formation for 2.5 seconds");

const titheSignature = triggerSignature("moonTax", [], 2);
assert.equal(titheSignature.battle.energy, 1.5, "Moon Tithe should drain half a stored Goo");

const tremorTarget = testUnit("piplet", "player", "tremor-target", { shield: 1 });
const tremorSignature = triggerSignature("rootQuake", [tremorTarget]);
assert.equal(tremorSignature.battle.units.find(unit => unit.id === "tremor-target").hp, CASTLE_UNIT_DEFS.piplet.hp - 1, "Root Tremor damage should be shieldable");

const drumSignature = triggerSignature("broodCall");
assert.equal(drumSignature.battle.units.some(unit => unit.kind === "nibbleImp"), true, "Brood Drum should hatch a recurring attacker");
assert.ok(drumSignature.battle.guardianAbilityTimerMs >= 8_500, "every guardian signature should reset to a visible planning interval");

const markedBroodBase = guardianAtThreat(3, 1, 100);
const unmarkedBroodBonus = tickCastleRun({
  ...markedBroodBase,
  battle: {
    ...markedBroodBase.battle,
    guardianPowerId: "broodCall",
    guardianAbilityTimerMs: 0,
    enemySpawnCount: 1,
  },
}, 100, 1);
assert.equal(unmarkedBroodBonus.battle.units.find(unit => unit.kind === "nibbleImp").affix, null, "unpreviewed guardian bonus summons should never inherit a Moon Mark");

process.stdout.write("Castle mechanics assertions passed.\n");
