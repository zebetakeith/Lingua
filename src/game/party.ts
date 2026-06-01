import type { MatchResult, TileKind } from "./runes";
import { createRuneCountMap, TILE_KINDS } from "./runes";
import type { CombatVisualPreset, MotionPreset } from "./presentation";

export interface CharacterDef {
  id: string;
  name: string;
  element: TileKind;
  sprite: string;
  motionPreset: MotionPreset;
  battleScale?: number;
  hp: number;
  attack: number;
  recovery: number;
  speed: number;
  passive: string;
  skillId: string;
  ultimateId: string;
  unlockHint: string;
}

export interface SkillDef {
  id: string;
  name: string;
  element: TileKind;
  cost: number;
  description: string;
  visualPreset: CombatVisualPreset;
}

export interface UltimateDef {
  id: string;
  name: string;
  element: TileKind;
  focusCost: number;
  description: string;
  visualPreset: CombatVisualPreset;
}

export interface RelicDef {
  id: string;
  name: string;
  element: TileKind;
  rarity: "common" | "uncommon" | "rare";
  description: string;
}

export interface PartyAttackSummary {
  total: number;
  byElement: Record<TileKind, number>;
  attackers: string[];
}

export const SKILL_DEFS: SkillDef[] = [
  { id: "steady_hand", name: "Sticky Tag", element: "light", cost: 2, description: "Flick a bright tag that leaves the target Wobbly for the next weakness hit.", visualPreset: "glossary-star" },
  { id: "convert_flame", name: "Comet Bonk", element: "flame", cost: 3, description: "A speedy coral bonk; stronger after a 4+ correct study set.", visualPreset: "flame-script" },
  { id: "ward_word", name: "Bubble Up", element: "tide", cost: 2, description: "Blow a Bubble that sharply reduces the next enemy hit.", visualPreset: "ward-word" },
  { id: "verdant_shift", name: "Sprout Snack", element: "leaf", cost: 3, description: "Share a leafy snack to heal the blob and gently bop the enemy.", visualPreset: "verdant-shift" },
  { id: "umbra_surge", name: "Wink Hole", element: "shadow", cost: 4, description: "A heavy odd little void pop, stronger against Wobbly or shielded enemies.", visualPreset: "umbra-surge" },
];

export const ULTIMATE_DEFS: UltimateDef[] = [
  { id: "glossary_star", name: "Big Sticker", element: "light", focusCost: 12, description: "A giant sparkly tag that leaves two Wobbly weakness hits.", visualPreset: "glossary-star" },
  { id: "meteor_script", name: "Zoomie Crash", element: "flame", focusCost: 12, description: "A huge coral bonk, boosted after a 4+ correct study set.", visualPreset: "meteor-script" },
  { id: "perfect_recall", name: "Bubble Bath", element: "tide", focusCost: 12, description: "Raise a Bubble and delay the next enemy timeline action.", visualPreset: "perfect-recall" },
  { id: "bloom_chorus", name: "Picnic Burst", element: "leaf", focusCost: 12, description: "Restore a large amount of HP and raise a Bubble.", visualPreset: "bloom-chorus" },
  { id: "black_margin", name: "Pocket Void", element: "shadow", focusCost: 12, description: "A heavy shadowy pop, boosted against Wobbly or shielded enemies.", visualPreset: "black-margin" },
];

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: "linguist", name: "Pip", element: "light", sprite: "/cute/char_linguist_blob.png", motionPreset: "bounce", battleScale: 1.02, hp: 100, attack: 18, recovery: 8, speed: 100, passive: "Your curious little blob. It grows by eating whatever it defeats.", skillId: "steady_hand", ultimateId: "glossary_star", unlockHint: "The protagonist of every deck-world." },
  { id: "speedreader", name: "Zip Sprig", element: "flame", sprite: "/cute/char_speedreader_blob.png", motionPreset: "dart", battleScale: 1.08, hp: 32, attack: 22, recovery: 4, speed: 125, passive: "A zippy sidekick whose bonks reward strong study sets.", skillId: "convert_flame", ultimateId: "meteor_script", unlockHint: "Befriend it after the Floor 5 guardian." },
  { id: "scholar", name: "Bubble Bell", element: "tide", sprite: "/cute/char_scholar_blob.png", motionPreset: "float", battleScale: 1.02, hp: 34, attack: 12, recovery: 13, speed: 92, passive: "A sleepy helper that keeps trouble inside a friendly bubble.", skillId: "ward_word", ultimateId: "perfect_recall", unlockHint: "Answer 50 cards correctly in this deck-world." },
  { id: "botanist", name: "Mosskin", element: "leaf", sprite: "/cute/char_botanist_blob.png", motionPreset: "sway", battleScale: 1.04, hp: 38, attack: 14, recovery: 17, speed: 88, passive: "A snack-loving helper that turns setup turns into survival.", skillId: "verdant_shift", ultimateId: "bloom_chorus", unlockHint: "Reach Floor 8 in this deck-world." },
  { id: "duskblade", name: "Dusk Dot", element: "shadow", sprite: "/cute/char_duskblade_blob.png", motionPreset: "hover", battleScale: 1.03, hp: 30, attack: 20, recovery: 5, speed: 112, passive: "A weird little helper that turns Gusto into risky burst damage.", skillId: "umbra_surge", ultimateId: "black_margin", unlockHint: "Clear two guardians in this deck-world." },
];

export const RELIC_DEFS: RelicDef[] = [
  { id: "steady_grip", name: "First Bite", element: "light", rarity: "common", description: "The first correct card each study set gives +1 AP." },
  { id: "ember_primer", name: "Pepper Puff", element: "flame", rarity: "uncommon", description: "A perfect study set discounts the next coral action by 1 AP." },
  { id: "heart_ward", name: "Cozy Pulp", element: "heart", rarity: "uncommon", description: "The first heal each fight also raises a Bubble." },
  { id: "deep_focus", name: "Big Feelings", element: "shadow", rarity: "rare", description: "Correct answers charge Gusto faster." },
  { id: "tidal_memory", name: "Puddle Memory", element: "tide", rarity: "common", description: "The first wrong answer each study set still charges +1 Gusto." },
  { id: "leaf_bloom", name: "Leafy Belly", element: "leaf", rarity: "rare", description: "Healing tricks restore extra HP after strong study sets." },
  { id: "combo_spark", name: "Happy Wiggle", element: "flame", rarity: "uncommon", description: "4+ correct in one study set grants extra Gusto." },
  { id: "linebreaker", name: "Pointy Mood", element: "light", rarity: "rare", description: "Weakness hits deal bonus damage." },
  { id: "warded_notes", name: "Bubble Thoughts", element: "tide", rarity: "uncommon", description: "A perfect study set also raises a Bubble." },
  { id: "hard_edge", name: "Crunchy Questions", element: "shadow", rarity: "common", description: "Correct hard-rated cards give +1 AP before the study goal and +1 Gusto." },
  { id: "greenhouse", name: "Snack Pocket", element: "leaf", rarity: "common", description: "Sprout Snack restores extra HP." },
  { id: "shadow_bargain", name: "Bruise Juice", element: "shadow", rarity: "rare", description: "Taking enemy damage charges Gusto." },
  { id: "elemental_index", name: "Taste Test", element: "light", rarity: "uncommon", description: "Hitting an enemy weakness charges +1 Gusto." },
  { id: "fracture_notes", name: "Crackle Teeth", element: "flame", rarity: "rare", description: "Breaking a shield spills bonus damage into HP and charges extra Gusto." },
  { id: "clean_margin", name: "Soap Film", element: "tide", rarity: "rare", description: "Breaking a shield also raises a Bubble if you do not already have one." },
  { id: "clarity_lens", name: "Wobbly Sticker", element: "light", rarity: "uncommon", description: "A perfect study set makes the enemy Wobbly." },
  { id: "blood_quill", name: "Sour Berry", element: "shadow", rarity: "uncommon", description: "Wrong answers charge +2 Gusto but make the next hit hurt more." },
  { id: "combo_aegis", name: "Victory Bubble", element: "heart", rarity: "rare", description: "4+ correct in one study set raises a Bubble once per floor." },
  { id: "runic_tumbler", name: "Tumble Toes", element: "shadow", rarity: "rare", description: "Bracing can delay one enemy action on the timeline." },
];

export function getSkillById(id: string): SkillDef | undefined {
  return SKILL_DEFS.find(skill => skill.id === id);
}

export function getUltimateById(id: string): UltimateDef | undefined {
  return ULTIMATE_DEFS.find(ultimate => ultimate.id === id);
}

export function getRelicById(id: string): RelicDef | undefined {
  return RELIC_DEFS.find(relic => relic.id === id);
}

export function getPartyMaxHp(party: CharacterDef[], fallbackHp: number): number {
  return Math.max(fallbackHp, party.reduce((total, member) => total + member.hp, 0));
}

export function getPartyDamage(result: MatchResult, party: CharacterDef[], hasSurge: boolean, runRelics: string[]): PartyAttackSummary {
  const byElement = createRuneCountMap();
  const attackers = new Set<string>();
  const partyAttackTotal = party.reduce((total, member) => total + member.attack, 0);
  const comboMultiplier = 1 + Math.max(0, result.comboCount - 1) * 0.22;
  const surgeMultiplier = hasSurge ? 1.6 : 1;

  TILE_KINDS.forEach(kind => {
    if (kind === "heart" || result.kindCounts[kind] <= 0) return;

    const matchingMembers = party.filter(member => member.element === kind);
    const matchingAttack = matchingMembers.reduce((total, member) => total + member.attack, 0);
    const supportAttack = matchingMembers.length > 0 ? 0 : partyAttackTotal * 0.25;
    const attackPool = matchingAttack + supportAttack;
    if (attackPool <= 0) return;

    const tileMultiplier = 1 + Math.max(0, result.kindCounts[kind] - 3) * 0.18;
    const enhancedMultiplier = 1 + Math.min(0.9, result.enhancedKindCounts[kind] * 0.28);
    const linebreakerMultiplier = runRelics.includes("linebreaker") && result.kindCounts[kind] >= 5 ? 1.25 : 1;
    const damage = Math.floor(attackPool * tileMultiplier * comboMultiplier * surgeMultiplier * enhancedMultiplier * linebreakerMultiplier);
    byElement[kind] = Math.max(0, damage);

    if (matchingMembers.length > 0) {
      matchingMembers.forEach(member => attackers.add(member.name));
    } else if (damage > 0) {
      attackers.add("Team echo");
    }
  });

  return {
    total: TILE_KINDS.reduce((total, kind) => total + byElement[kind], 0),
    byElement,
    attackers: Array.from(attackers),
  };
}

export function getPartyHealing(result: MatchResult, party: CharacterDef[], playerHp: number, playerMaxHp: number, runRelics: string[]): number {
  if (result.kindCounts.heart <= 0) return 0;

  const recoveryTotal = party.reduce((total, member) => total + member.recovery, 0);
  let healAmount = result.kindCounts.heart * 2 + result.comboCount * 2 + Math.floor(recoveryTotal * 0.7);
  if (result.enhancedKindCounts.heart > 0) {
    healAmount += result.enhancedKindCounts.heart * 4;
  }
  if (runRelics.includes("greenhouse") && result.kindCounts.leaf > 0) {
    healAmount += result.kindCounts.leaf * 2;
  }
  if (runRelics.includes("leaf_bloom") && result.comboCount >= 4) {
    healAmount += result.comboCount * 3;
  }

  return Math.min(playerMaxHp - playerHp, Math.max(0, healAmount));
}
