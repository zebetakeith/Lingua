import type { EnemyDef } from "../data/enemies";

export interface EnemyLike {
  def: EnemyDef;
  hp?: number;
  maxHp?: number;
  currentDamage: number;
  attackCharge: number;
  phase: number;
  shield?: number;
  maxShield?: number;
}

export interface EnemyIntentDetail {
  label: string;
  counterplay: string;
  severity: "low" | "medium" | "high";
  actions: EnemyActionPreview[];
}

export interface EnemyPlanContext {
  actionPointsSpentThisWindow?: number;
  healedOrDefendedThisWindow?: boolean;
  nextStudyShuffle?: boolean;
  skillCharge?: number;
}

export interface EnemyActionPreview {
  id: string;
  name: string;
  apCost: number;
  damage: number;
  description: string;
  counterplay: string;
  severity: "low" | "medium" | "high";
}

export function getEnemyApForTurn(enemy: EnemyLike): number {
  if (enemy.def.isBoss) return 3;
  if (enemy.def.special) return 2;
  return 1;
}

export function getEnemySpecialText(special: string | null): string {
  if (special === "shuffle_answers") return "scrambles answers";
  if (special === "freeze_timer") return "chills the next study timer";
  if (special === "sequential") return "strikes faster after a hit";
  if (special === "self_heal") return "heals after attacking";
  if (special === "timer_drain") return "drains Focus and AP";
  if (special === "randomize_positions") return "delays a party member";
  if (special === "low_combo_punish") return "punishes low AP spend";
  if (special === "healing_check") return "tests healing or defense";
  if (special === "three_phase") return "disrupts study in later phases";
  if (special === "enrage_at_50") return "enrages below half HP";
  return "";
}

function getEnemyStrikeName(enemy: EnemyLike): string {
  if (enemy.def.special === "sequential") return "Accelerating Strike";
  if (enemy.def.special === "enrage_at_50" && enemy.phase >= 2) return "Enraged Strike";
  if (enemy.def.isBoss) return "Boss Strike";
  return "Strike";
}

function getEnemySpecialAction(enemy: EnemyLike, context: EnemyPlanContext): EnemyActionPreview | null {
  const special = enemy.def.special;
  const missingHp = Math.max(0, (enemy.maxHp || 0) - (enemy.hp || enemy.maxHp || 0));

  if (special === "shuffle_answers" && !context.nextStudyShuffle) {
    return {
      id: "scramble_answers",
      name: "Scramble Answers",
      apCost: 1,
      damage: 0,
      description: "Shuffles answer order during the next study rush.",
      counterplay: "Act before it reaches the front, or prepare for mixed answer positions.",
      severity: "medium",
    };
  }

  if (special === "freeze_timer") {
    return {
      id: "chill_timer",
      name: "Chill Timer",
      apCost: 1,
      damage: 0,
      description: "Shortens the next study rush timer.",
      counterplay: "Ward the hit or keep enough HP to survive the shorter study window.",
      severity: "medium",
    };
  }

  if (special === "timer_drain") {
    return {
      id: "drain_focus",
      name: "Drain Focus",
      apCost: 1,
      damage: 0,
      description: "Drains Focus and reduces the first AP gained next rush.",
      counterplay: "Spend AP before it acts, or use Ward to block the disruption.",
      severity: "high",
    };
  }

  if (special === "randomize_positions") {
    return {
      id: "delay_actor",
      name: "Delay Actor",
      apCost: 1,
      damage: 0,
      description: "Pushes one party member back on the timeline.",
      counterplay: "Use key character actions before it reaches the front.",
      severity: "medium",
    };
  }

  if (special === "self_heal" && missingHp > 0) {
    return {
      id: "self_repair",
      name: "Self Repair",
      apCost: 1,
      damage: 0,
      description: "Restores HP after striking.",
      counterplay: "Burst it down, break shields, or deny it a long fight.",
      severity: "medium",
    };
  }

  if (special === "low_combo_punish" && (context.actionPointsSpentThisWindow || 0) < 3) {
    const damage = Math.max(4, Math.floor(enemy.currentDamage * 0.45));
    return {
      id: "exploit_hesitation",
      name: "Exploit Hesitation",
      apCost: 1,
      damage,
      description: `Deals +${damage} damage if you spent fewer than 3 AP.`,
      counterplay: "Spend at least 3 AP before it acts.",
      severity: "high",
    };
  }

  if (special === "healing_check" && !context.healedOrDefendedThisWindow) {
    const damage = Math.max(5, Math.floor(enemy.currentDamage * 0.35));
    return {
      id: "punish_neglect",
      name: "Punish Neglect",
      apCost: 1,
      damage,
      description: `Deals +${damage} damage if you did not heal or defend.`,
      counterplay: "Heal or defend before its turn.",
      severity: "high",
    };
  }

  if (special === "three_phase") {
    return {
      id: "boss_protocol",
      name: "Boss Protocol",
      apCost: 1,
      damage: 0,
      description: "Chills the next study rush and reduces early AP gain.",
      counterplay: "Save burst commands for phase shifts and keep Ward ready.",
      severity: "high",
    };
  }

  return null;
}

export function getEnemyActionPlan(enemy: EnemyLike, context: EnemyPlanContext = {}): EnemyActionPreview[] {
  const budget = getEnemyApForTurn(enemy);
  const actions: EnemyActionPreview[] = [
    {
      id: "strike",
      name: getEnemyStrikeName(enemy),
      apCost: 1,
      damage: enemy.currentDamage,
      description: `Deals ${enemy.currentDamage} damage.`,
      counterplay: enemy.shield && enemy.shield > 0 ? "Break shields with weakness hits, or defend before impact." : "Defend, Ward, heal, or finish it before it acts.",
      severity: enemy.attackCharge <= 1 ? "high" : "low",
    },
  ];

  const specialAction = getEnemySpecialAction(enemy, context);
  const spentWithSpecial = actions.reduce((total, action) => total + action.apCost, 0) + (specialAction?.apCost || 0);
  if (specialAction && spentWithSpecial <= budget) {
    actions.push(specialAction);
  }

  const spent = actions.reduce((total, action) => total + action.apCost, 0);
  if (enemy.def.isBoss && spent < budget) {
    const damage = Math.max(3, Math.floor(enemy.currentDamage * 0.25));
    actions.push({
      id: "boss_pressure",
      name: "Boss Pressure",
      apCost: 1,
      damage,
      description: `Spends extra AP for +${damage} pressure damage.`,
      counterplay: "Expect bosses to spend spare AP on extra pressure.",
      severity: "high",
    });
  }

  return actions;
}

export function getEnemyCounterplayText(enemy: EnemyLike, context: EnemyPlanContext = {}): string {
  const planned = getEnemyActionPlan(enemy, context);
  const mostSevere = [...planned].sort((a, b) => {
    const severityScore = { low: 0, medium: 1, high: 2 };
    return severityScore[b.severity] - severityScore[a.severity];
  })[0];
  if (mostSevere) return mostSevere.counterplay;
  if (enemy.def.special === "low_combo_punish") return "Spend at least 3 AP before it acts.";
  if (enemy.def.special === "healing_check") return "Heal or defend before its turn.";
  if (enemy.def.special === "self_heal") return "Burst it down or break shield before it heals.";
  if (enemy.def.special === "timer_drain") return "Ward the hit or spend AP before Focus is drained.";
  if (enemy.def.special === "freeze_timer") return "Ward the hit or prepare for a shorter study rush.";
  if (enemy.def.special === "randomize_positions") return "Act with key party members before it delays them.";
  if (enemy.def.special === "three_phase") return "Save burst commands for phase shifts.";
  if (enemy.def.special === "enrage_at_50") return "Hold burst until you can push through half HP.";
  if (enemy.def.special === "shuffle_answers") return "Expect the next study answers to be shuffled.";
  if (enemy.def.special === "sequential") return "Expect shorter attack windows after it connects.";
  if (enemy.shield && enemy.shield > 0) return "Hit weaknesses to break the shield and charge Focus.";
  return "Earn AP, spend commands, heal or defend before enemy turns.";
}

export function getEnemyAttackFrequency(enemy: EnemyLike): number {
  const phaseDef = enemy.def.phases?.[Math.max(0, enemy.phase - 1)];
  return phaseDef?.attackFreq || enemy.def.attackFrequency;
}

export function getEnemyIntent(enemy: EnemyLike, context: EnemyPlanContext = {}): string {
  const plan = getEnemyActionPlan(enemy, context);
  const shieldText = enemy.shield && enemy.shield > 0 ? `Shield ${enemy.shield}. ` : "";
  const actionText = plan.map(action => action.name).join(" + ");
  const totalDamage = plan.reduce((total, action) => total + action.damage, 0);
  const apText = `${plan.reduce((total, action) => total + action.apCost, 0)}/${getEnemyApForTurn(enemy)} AP`;
  return `${shieldText}Intent: ${actionText} (${totalDamage} damage, ${apText})`;
}

export function getEnemyIntentDetail(enemy: EnemyLike, context: EnemyPlanContext = {}): EnemyIntentDetail {
  const actions = getEnemyActionPlan(enemy, context);
  const label = getEnemyIntent(enemy, context);
  const urgent = enemy.attackCharge <= 1;
  const hasShield = Boolean(enemy.shield && enemy.shield > 0);
  const hasHighAction = actions.some(action => action.severity === "high");
  const severity = urgent || hasHighAction ? "high" : hasShield || actions.length > 1 || enemy.def.special ? "medium" : "low";

  return {
    label,
    counterplay: getEnemyCounterplayText(enemy, context),
    severity,
    actions,
  };
}
