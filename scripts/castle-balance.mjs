import {
  applyCastleStudyOutcome,
  activateCastlePower,
  chooseCastleRoute,
  claimCastleUpgrade,
  createInitialCastleRun,
  retireCastleRun,
  resumeCastleBattle,
  summonCastleUnit,
  tickCastleRun,
} from "../src/experiments/castleBattle.ts";
import {
  createDirectionStudyProgress,
  getCorrectAnswerReward,
} from "../src/game/study.ts";

const curves = ["current", "quadratic", "steep"];
const masteries = [0.15, 0.35, 0.6, 0.9];

function rewardFor(curve, mastery) {
  const progress = {
    ...createDirectionStudyProgress(mastery),
    mastery,
    dueAt: 0,
  };
  return getCorrectAnswerReward(progress, "multiple_choice", curve, 10_000);
}

function spendEnergy(run) {
  const priorities = ["bigChonk", "spitlet", "bubbleBud", "dartlet"];
  let next = run;
  for (let action = 0; action < 10; action += 1) {
    if (next.battle.playerCastleHp / next.battle.playerCastleMaxHp < 0.85 && next.battle.energy >= 3) {
      const defended = activateCastlePower(next, "bubbleGate");
      if (defended !== next) {
        next = defended;
        continue;
      }
    }
    if (next.battle.energy < 3.5) break;
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
    run = resumeCastleBattle(run);
    for (let step = 0; step < 35 && run.phase === "battle"; step += 1) {
      run = tickCastleRun(run, 100, mastery < 0.22 ? 0.75 : mastery < 0.48 ? 0.9 : 1);
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

function simulateFullRun(contractId, mastery, correctRate = 0.9, seedOffset = 0) {
  const seed = Math.round((mastery * 10_000) + ({ quick: 100, regular: 200, long: 300 }[contractId] || 0) + (seedOffset * 997));
  let run = createInitialCastleRun(`full-${contractId}-${mastery}`, contractId, "quadratic", undefined, seed, "balanced", "starBuckle");
  const reward = rewardFor("quadratic", mastery);
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
      run = claimCastleUpgrade(run, run.rewardChoices[0]);
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
      run = retireCastleRun(run);
      continue;
    }
    if (run.phase !== "battle") break;
    const cycle = Math.max(2, Math.round(1 / Math.max(0.01, 1 - correctRate)));
    const isCorrect = reviews % cycle !== cycle - 1;
    run = applyCastleStudyOutcome(run, {
      isCorrect,
      wasUnseen: false,
      reward: isCorrect ? reward : 0,
      progressKey: `full-card-${reviews % 12}::term_to_definition`,
      responseMs: answerMs,
      selfGraded: false,
      due: true,
    });
    run = spendEnergy(run);
    run = resumeCastleBattle(run);
    for (let step = 0; step < Math.round(answerMs / 100) && run.phase === "battle"; step += 1) {
      run = tickCastleRun(run, 100, mastery < 0.22 ? 0.75 : mastery < 0.48 ? 0.9 : 1);
      minimumCastleHp = Math.min(minimumCastleHp, run.battle.playerCastleHp);
      elapsedMs += 100;
    }
    reviews += 1;
  }
  captureBattle();
  return {
    contractId,
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
const validation = {
  unresolvedFirstBattles: report.filter(row => row.result === "battle").length,
  incompleteFullRuns: fullRuns.filter(row => row.result !== "complete").length,
  pressureWins: pressureRuns.filter(row => row.result === "complete").length,
  pressureLosses: pressureRuns.filter(row => row.result === "lost").length,
};

if (process.argv.includes("--quiet")) {
  process.stdout.write(`Castle balance assertions passed (${fullRuns.length} full runs, ${pressureRuns.length} pressure runs).\n`);
} else {
  process.stdout.write(`${JSON.stringify({ curveRanges, scenarios: report, fullRuns, pressureRuns, validation }, null, 2)}\n`);
}
if (
  validation.unresolvedFirstBattles > 0
  || validation.incompleteFullRuns > 0
  || validation.pressureWins === 0
  || validation.pressureLosses === 0
) process.exitCode = 1;
