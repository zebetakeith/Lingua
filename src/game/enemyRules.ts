import type { EnemyDef } from "../data/enemies";

export interface EnemyLike {
  def: EnemyDef;
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

export function getEnemyCounterplayText(enemy: EnemyLike): string {
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

export function getEnemyIntent(enemy: EnemyLike): string {
  const specialText = getEnemySpecialText(enemy.def.special);
  const shieldText = enemy.shield && enemy.shield > 0 ? `Shield ${enemy.shield}. ` : "";
  return `${shieldText}Intent: ${enemy.currentDamage} damage${specialText ? ` + ${specialText}` : ""}`;
}

export function getEnemyIntentDetail(enemy: EnemyLike): EnemyIntentDetail {
  const label = getEnemyIntent(enemy);
  const urgent = enemy.attackCharge <= 1;
  const hasShield = Boolean(enemy.shield && enemy.shield > 0);
  const severity = urgent ? "high" : hasShield || enemy.def.special ? "medium" : "low";

  return {
    label,
    counterplay: getEnemyCounterplayText(enemy),
    severity,
  };
}
