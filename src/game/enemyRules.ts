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
  if (special === "shuffle_answers") return "scrambles runes";
  if (special === "freeze_timer") return "chills the next study timer";
  if (special === "sequential") return "strikes faster after a hit";
  if (special === "self_heal") return "heals after attacking";
  if (special === "timer_drain") return "drains Focus and study time";
  if (special === "randomize_positions") return "randomizes rune positions";
  if (special === "low_combo_punish") return "punishes weak combos";
  if (special === "healing_check") return "tests your healing";
  if (special === "three_phase") return "curses the board in later phases";
  if (special === "enrage_at_50") return "enrages below half HP";
  return "";
}

export function getEnemyCounterplayText(enemy: EnemyLike): string {
  if (enemy.def.special === "low_combo_punish") return "Make 3+ combos to avoid the punishment.";
  if (enemy.def.special === "healing_check") return "Match Hearts before the counterattack.";
  if (enemy.def.special === "self_heal") return "Burst it down or break shield before it heals.";
  if (enemy.def.special === "timer_drain") return "Break shield or raise Ward to preserve Focus.";
  if (enemy.def.special === "freeze_timer") return "Use Ward or cleanse cursed runes after the hit.";
  if (enemy.def.special === "randomize_positions") return "Spend setup skills before it scatters runes.";
  if (enemy.def.special === "three_phase") return "Save Light/Tide burst for phase shifts.";
  if (enemy.def.special === "enrage_at_50") return "Hold burst until you can push through half HP.";
  if (enemy.def.special === "shuffle_answers") return "Use the board now; it will scramble runes.";
  if (enemy.def.special === "sequential") return "Expect shorter attack windows after it connects.";
  if (enemy.shield && enemy.shield > 0) return "Hit weaknesses to break the shield and delay the counter.";
  return "Build damage, heal if needed, and watch the attack timer.";
}

export function getEnemyAttackFrequency(enemy: EnemyLike): number {
  const phaseDef = enemy.def.phases?.[Math.max(0, enemy.phase - 1)];
  return phaseDef?.attackFreq || enemy.def.attackFrequency;
}

export function getEnemyIntent(enemy: EnemyLike): string {
  const specialText = getEnemySpecialText(enemy.def.special);
  const shieldText = enemy.shield && enemy.shield > 0 ? `Shield ${enemy.shield}. ` : "";
  if (enemy.attackCharge <= 1) {
    return `${shieldText}Incoming: ${enemy.currentDamage} damage${specialText ? ` + ${specialText}` : ""}`;
  }

  return `${shieldText}Charging: ${enemy.attackCharge} turns${specialText ? `, then ${specialText}` : ""}`;
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
