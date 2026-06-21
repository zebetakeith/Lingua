import {
  applyCastleStudyOutcome,
  createInitialCastleRun,
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
  let run = createInitialCastleRun(`balance-${curve}-${mastery}`, "quick", curve);
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

process.stdout.write(`${JSON.stringify({ curveRanges, scenarios: report }, null, 2)}\n`);
