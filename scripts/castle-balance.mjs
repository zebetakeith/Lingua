import {
  acknowledgeCastleGuardianBriefing,
  applyCastleStudyOutcome,
  activateCastlePower,
  chooseCastleRoute,
  claimCastleUpgrade,
  claimCastleMorsel,
  continueCastleRun,
  createInitialCastleRun,
  getCastleEnemyAffix,
  hatchCastlePiplet,
  retireCastleRun,
  summonCastleUnit,
  tickCastleRun,
} from "../src/experiments/castleBattle.ts";
import {
  createDirectionStudyProgress,
  getCorrectAnswerCombatReward,
} from "../src/game/study.ts";

const curves = ["current", "quadratic", "steep"];
const masteries = [0.15, 0.35, 0.6, 0.9];

function rewardFor(curve, mastery, questionType = "multiple_choice") {
  const progress = {
    ...createDirectionStudyProgress(mastery),
    mastery,
    dueAt: 0,
  };
  return getCorrectAnswerCombatReward(progress, questionType, curve, 10_000);
}

function spendEnergy(run) {
  const priorities = ["bigChonk", "spitlet", "bubbleBud", "dartlet"];
  let next = run;
  if (next.battle.hatchCharges > 0) next = hatchCastlePiplet(next);
  for (let action = 0; action < 10; action += 1) {
    if (next.battle.playerCastleHp / next.battle.playerCastleMaxHp < 0.85 && next.battle.energy >= 3) {
      const defended = activateCastlePower(next, "bubbleGate");
      if (defended !== next) {
        next = defended;
        continue;
      }
    }
    if (next.battle.energy >= 4 && !next.battle.units.some(unit => unit.side === "player" && unit.kind === "mendlet")) {
      const supported = summonCastleUnit(next, "mendlet");
      if (supported !== next) {
        next = supported;
        continue;
      }
    }
    if (next.battle.energy < 3.5) {
      const dartlet = summonCastleUnit(next, "dartlet");
      if (dartlet !== next) {
        next = dartlet;
        continue;
      }
      if (next.nurseryInstinctId === "devourer" && !next.battle.units.some(unit => unit.side === "enemy")) {
        const slingshot = activateCastlePower(next, "slingshot");
        if (slingshot !== next) {
          next = slingshot;
          continue;
        }
      }
      break;
    }
    let spent = false;
    for (const kind of priorities) {
      const candidate = summonCastleUnit(next, kind);
      if (candidate !== next) {
        next = candidate;
        spent = true;
        break;
      }
    }
    if (!spent) break;
  }
  return next;
}

function simulate(curve, mastery) {
  let run = createInitialCastleRun(`balance-${curve}-${mastery}`, "quick", curve, undefined, undefined, "balanced", "starBuckle");
  const reward = rewardFor(curve, mastery);
  let reviews = 0;
  let elapsedMs = 0;
  while (run.phase === "battle" && elapsedMs < 180_000 && reviews < 80) {
    run = applyCastleStudyOutcome(run, {
      isCorrect: true,
      wasUnseen: false,
      reward,
      progressKey: `card-${reviews}::term_to_definition`,
      responseMs: 3_500,
      selfGraded: false,
      due: true,
    });
    run = spendEnergy(run);
    for (let step = 0; step < 35 && run.phase === "battle"; step += 1) {
      run = tickCastleRun(run, 100, 1);
      elapsedMs += 100;
    }
    reviews += 1;
  }
  return {
    curve,
    mastery,
    reward,
    result: run.phase,
    reviews,
    activeSeconds: Math.round(elapsedMs / 100) / 10,
    playerCastleHp: Math.round(run.battle.playerCastleHp),
    enemyCastleHp: Math.round(run.battle.enemyCastleHp),
    energyEarned: run.battle.telemetry.energyEarned,
    energySpent: run.battle.telemetry.energySpent,
    summons: run.battle.telemetry.summons,
    friendlyUnits: run.battle.units.filter(unit => unit.side === "player").length,
    enemyUnits: run.battle.units.filter(unit => unit.side === "enemy").length,
    friendlyFront: Math.round(Math.max(0, ...run.battle.units.filter(unit => unit.side === "player").map(unit => unit.position))),
    enemyFront: Math.round(Math.min(100, ...run.battle.units.filter(unit => unit.side === "enemy").map(unit => unit.position))),
  };
}

function simulateFullRun(contractId, mastery, correctRate = 0.9, seedOffset = 0, targetEndlessRegion = 0, difficultyId = "standard", nurseryInstinctId = "handHatch") {
  const seed = Math.round((mastery * 10_000) + ({ quick: 100, regular: 200, long: 300 }[contractId] || 0) + (seedOffset * 997));
  let run = createInitialCastleRun(`full-${contractId}-${mastery}-${difficultyId}-${nurseryInstinctId}`, contractId, "quadratic", undefined, seed, "balanced", "starBuckle", difficultyId, nurseryInstinctId);
  const multipleChoiceReward = rewardFor("quadratic", mastery, "multiple_choice");
  const selfGradeReward = rewardFor("quadratic", mastery, "self_grade");
  let reviews = 0;
  let elapsedMs = 0;
  const answerMs = mastery >= 0.85 ? 1_800 : mastery >= 0.5 ? 3_000 : 4_500;
  let safety = 0;
  let reviewsAtLastWin = 0;
  const battleReviews = [];
  const countedBattles = new Set();
  let damageTaken = 0;
  let rallies = 0;
  let minimumCastleHp = run.battle.playerCastleHp;
  const captureBattle = () => {
    const key = run.battle.battleNumber;
    if (countedBattles.has(key)) return;
    countedBattles.add(key);
    damageTaken += run.battle.telemetry.damageTaken;
    rallies += run.battle.telemetry.rallyTriggered;
  };
  while (!["complete", "lost"].includes(run.phase) && safety < 2_000) {
    safety += 1;
    if (run.phase === "reward") {
      captureBattle();
      battleReviews.push(reviews - reviewsAtLastWin);
      reviewsAtLastWin = reviews;
      run = run.rewardMorselChoices.length > 0
        ? claimCastleMorsel(run, run.rewardMorselChoices[0])
        : claimCastleUpgrade(run, run.rewardChoices[0]);
      continue;
    }
    if (run.phase === "route") {
      const route = (run.battleInRegion === 2 || run.carriedCastleHp < 65) && run.routeChoices.includes("rest")
        ? "rest"
        : run.routeChoices.includes("workshop") ? "workshop" : run.routeChoices[0];
      run = chooseCastleRoute(run, route);
      continue;
    }
    if (run.phase === "retire") {
      run = targetEndlessRegion > 0 && run.region < targetEndlessRegion
        ? continueCastleRun(run)
        : retireCastleRun(run);
      continue;
    }
    if (run.phase !== "battle") break;
    if (run.battle.guardianBriefingPending) run = acknowledgeCastleGuardianBriefing(run);
    const cycle = Math.max(2, Math.round(1 / Math.max(0.01, 1 - correctRate)));
    const isCorrect = reviews % cycle !== cycle - 1;
    const selfGraded = mastery >= 0.76 || (mastery >= 0.42 && reviews % 2 === 0);
    run = applyCastleStudyOutcome(run, {
      isCorrect,
      wasUnseen: false,
      reward: isCorrect ? selfGraded ? selfGradeReward : multipleChoiceReward : 0,
      progressKey: `full-card-${reviews % 12}::term_to_definition`,
      responseMs: answerMs,
      selfGraded,
      due: true,
    });
    run = spendEnergy(run);
    for (let step = 0; step < Math.ceil(answerMs / 100) && run.phase === "battle"; step += 1) {
      run = tickCastleRun(run, 100, 1);
      minimumCastleHp = Math.min(minimumCastleHp, run.battle.playerCastleHp);
      elapsedMs += 100;
    }
    reviews += 1;
  }
  captureBattle();
  return {
    contractId,
    difficultyId,
    nurseryInstinctId,
    mastery,
    correctRate,
    seedOffset,
    result: run.phase,
    regionsReached: run.bestRegion,
    battlesWon: run.battlesWon,
    reviews,
    activeMinutes: Math.round(elapsedMs / 6_000) / 10,
    upgrades: run.upgrades.length,
    playerCastleHp: Math.round(run.battle.playerCastleHp),
    minimumCastleHp: Math.round(minimumCastleHp),
    damageTaken: Math.round(damageTaken),
    rallies,
    enemyCastleHp: Math.round(run.battle.enemyCastleHp),
    battleReviews,
    peakAscension: Math.max(0, run.bestRegion - 3),
  };
}

function simulateIdlePrompt(difficultyId) {
  let run = createInitialCastleRun(`idle-prompt-${difficultyId}`, "quick", "quadratic", undefined, 1_234, "balanced", "starBuckle", difficultyId);
  let elapsedMs = 0;
  while (run.phase === "battle" && elapsedMs < 180_000) {
    run = tickCastleRun(run, 100, 1);
    elapsedMs += 100;
  }
  return {
    difficultyId,
    result: run.phase,
    elapsedMs,
    damageTaken: run.battle.telemetry.damageTaken,
  };
}

const report = curves.flatMap(curve => masteries.map(mastery => simulate(curve, mastery)));
const curveRanges = curves.map(curve => {
  const rows = report.filter(row => row.curve === curve);
  return {
    curve,
    strugglingReward: rows[0].reward,
    masteredReward: rows[rows.length - 1].reward,
    ratio: Math.round((rows[0].reward / rows[rows.length - 1].reward) * 10) / 10,
  };
});
const fullRuns = ["quick", "regular", "long"].flatMap(contractId => [0, 1, 2].flatMap(seedOffset => [
  simulateFullRun(contractId, 0.35, 0.82, seedOffset),
  simulateFullRun(contractId, 0.6, 0.9, seedOffset),
  simulateFullRun(contractId, 0.9, 0.96, seedOffset),
]));
const pressureRuns = [0.55, 0.65, 0.72].flatMap(correctRate => [0, 1, 2].map(seedOffset => (
  simulateFullRun("quick", 0.35, correctRate, seedOffset)
)));
const endlessRuns = [0, 1, 2].map(seedOffset => simulateFullRun("long", 0.9, 0.96, seedOffset, 6));
const difficultyRuns = ["study", "standard", "siege"].flatMap(difficultyId => [0, 1, 2].map(seedOffset => (
  simulateFullRun("regular", 0.6, 0.9, seedOffset, 0, difficultyId)
)));
const instinctRuns = ["wildBrood", "handHatch", "devourer"].flatMap(nurseryInstinctId => [0, 1, 2].map(seedOffset => (
  simulateFullRun("quick", 0.6, 0.9, seedOffset, 0, "standard", nurseryInstinctId)
)));
const idlePrompts = ["study", "standard", "siege"].map(simulateIdlePrompt);
const averageReviews = difficultyId => {
  const rows = difficultyRuns.filter(row => row.difficultyId === difficultyId);
  return rows.reduce((total, row) => total + row.reviews, 0) / rows.length;
};
const instinctAverageReviews = Object.fromEntries(["wildBrood", "handHatch", "devourer"].map(id => {
  const rows = instinctRuns.filter(row => row.nurseryInstinctId === id);
  return [id, rows.reduce((total, row) => total + row.reviews, 0) / Math.max(1, rows.length)];
}));
const instinctReviewValues = Object.values(instinctAverageReviews);
const validation = {
  unresolvedFirstBattles: report.filter(row => row.result === "battle").length,
  incompleteFullRuns: fullRuns.filter(row => row.result !== "complete").length,
  pressureWins: pressureRuns.filter(row => row.result === "complete").length,
  pressureLosses: pressureRuns.filter(row => row.result === "lost").length,
  pressuredMidRuns: pressureRuns.filter(row => row.correctRate === 0.65 && row.result === "complete" && row.damageTaken > 0).length,
  endlessEntries: endlessRuns.filter(row => row.peakAscension >= 1).length,
  endlessDeepRuns: endlessRuns.filter(row => row.peakAscension >= 2).length,
  eliteAffixProgression: getCastleEnemyAffix(0, 1) === null
    && getCastleEnemyAffix(1, 1) === "armored"
    && getCastleEnemyAffix(2, 3) === "frenzied"
    && getCastleEnemyAffix(3, 5) === "giant",
  studyDifficultyLosses: difficultyRuns.filter(row => row.difficultyId === "study" && row.result === "lost").length,
  siegeDifficultyWins: difficultyRuns.filter(row => row.difficultyId === "siege" && row.result === "complete").length,
  siegeDifficultyPressure: difficultyRuns.filter(row => row.difficultyId === "siege" && (row.damageTaken > 0 || row.result === "lost" || row.reviews > averageReviews("standard") * 1.15)).length,
  difficultyReviewOrdering: averageReviews("study") < averageReviews("standard") && averageReviews("standard") < averageReviews("siege"),
  idlePromptStaysSafe: idlePrompts.every(row => row.result === "battle" && row.damageTaken === 0),
  instinctWins: Object.fromEntries(["wildBrood", "handHatch", "devourer"].map(id => [id, instinctRuns.filter(row => row.nurseryInstinctId === id && row.result === "complete").length])),
  instinctReviewSpread: (Math.max(...instinctReviewValues) - Math.min(...instinctReviewValues)) / Math.max(1, Math.min(...instinctReviewValues)),
};

if (process.argv.includes("--quiet")) {
  process.stdout.write(`Castle balance assertions passed (${fullRuns.length} full runs, ${pressureRuns.length} pressure runs, ${endlessRuns.length} endless runs, ${difficultyRuns.length} difficulty runs, ${instinctRuns.length} instinct runs).\n`);
} else {
  process.stdout.write(`${JSON.stringify({ curveRanges, scenarios: report, fullRuns, pressureRuns, endlessRuns, difficultyRuns, instinctRuns, idlePrompts, validation }, null, 2)}\n`);
}
if (
  validation.unresolvedFirstBattles > 0
  || validation.incompleteFullRuns > 3
  || validation.pressureWins === 0
  || validation.pressureLosses === 0
  || validation.pressuredMidRuns === 0
  || validation.endlessEntries === 0
  || validation.endlessDeepRuns === 0
  || !validation.eliteAffixProgression
  || validation.studyDifficultyLosses > 0
  || validation.siegeDifficultyWins === 0
  || validation.siegeDifficultyPressure === 0
  || !validation.difficultyReviewOrdering
  || !validation.idlePromptStaysSafe
  || Object.values(validation.instinctWins).some(wins => wins === 0)
) process.exitCode = 1;
