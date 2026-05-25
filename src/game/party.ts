import type { MatchResult, TileKind } from "./runes";
import { createRuneCountMap, TILE_KINDS } from "./runes";

export interface CharacterDef {
  id: string;
  name: string;
  element: TileKind;
  sprite: string;
  hp: number;
  attack: number;
  recovery: number;
  speed: number;
  passive: string;
  skillId: string;
  unlockHint: string;
}

export interface SkillDef {
  id: string;
  name: string;
  element: TileKind;
  cost: number;
  description: string;
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
  { id: "steady_hand", name: "Syntax Mark", element: "light", cost: 2, description: "Light damage and Exposed, boosting the next weakness hit." },
  { id: "convert_flame", name: "Flame Script", element: "flame", cost: 3, description: "Flame burst; stronger after a 4+ correct study rush." },
  { id: "ward_word", name: "Ward Word", element: "tide", cost: 2, description: "Raise a Ward that sharply reduces the next enemy hit." },
  { id: "verdant_shift", name: "Verdant Shift", element: "leaf", cost: 3, description: "Heal the party and deal small Leaf damage." },
  { id: "umbra_surge", name: "Umbra Surge", element: "shadow", cost: 4, description: "Heavy Shadow damage with bonus against Exposed or shielded enemies." },
];

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: "linguist", name: "Linguist", element: "light", sprite: "/char_linguist_occult.webp", hp: 100, attack: 18, recovery: 8, speed: 100, passive: "Balanced stats and steady study rewards.", skillId: "steady_hand", unlockHint: "Starter character for every deck." },
  { id: "speedreader", name: "Speedreader", element: "flame", sprite: "/char_speedreader_occult.webp", hp: 82, attack: 26, recovery: 4, speed: 125, passive: "Flame attacks scale with fast answers.", skillId: "convert_flame", unlockHint: "Reach Floor 5 on this deck." },
  { id: "scholar", name: "Scholar", element: "tide", sprite: "/char_scholar_occult.webp", hp: 92, attack: 15, recovery: 13, speed: 92, passive: "Better control and defensive study tools.", skillId: "ward_word", unlockHint: "Answer 50 cards correctly on this deck." },
  { id: "botanist", name: "Botanist", element: "leaf", sprite: "/char_botanist_occult.webp", hp: 96, attack: 17, recovery: 17, speed: 88, passive: "Recovery specialist who turns setup turns into survival.", skillId: "verdant_shift", unlockHint: "Reach Floor 8 on this deck." },
  { id: "duskblade", name: "Duskblade", element: "shadow", sprite: "/char_duskblade_occult.webp", hp: 88, attack: 24, recovery: 5, speed: 112, passive: "Risky attacker who turns Focus into burst damage.", skillId: "umbra_surge", unlockHint: "Clear a boss on this deck." },
];

export const RELIC_DEFS: RelicDef[] = [
  { id: "steady_grip", name: "Steady Grip", element: "light", rarity: "common", description: "The first correct card each study rush gives +1 AP." },
  { id: "ember_primer", name: "Ember Primer", element: "flame", rarity: "uncommon", description: "A perfect study rush discounts the next Flame action by 1 AP." },
  { id: "heart_ward", name: "Heart Ward", element: "heart", rarity: "uncommon", description: "The first heal each fight also grants Ward." },
  { id: "deep_focus", name: "Deep Focus", element: "shadow", rarity: "rare", description: "Correct answers charge Focus faster." },
  { id: "tidal_memory", name: "Tidal Memory", element: "tide", rarity: "common", description: "Wrong answers reduce less study time." },
  { id: "leaf_bloom", name: "Leaf Bloom", element: "leaf", rarity: "rare", description: "Healing commands restore extra HP after strong study rushes." },
  { id: "combo_spark", name: "Rush Spark", element: "flame", rarity: "uncommon", description: "4+ correct in one rush grants extra Focus." },
  { id: "linebreaker", name: "Linebreaker", element: "light", rarity: "rare", description: "Weakness hits deal bonus damage." },
  { id: "warded_notes", name: "Warded Notes", element: "tide", rarity: "uncommon", description: "A perfect study rush also raises a Ward." },
  { id: "hard_edge", name: "Hard Edge", element: "shadow", rarity: "common", description: "Correct hard-rated cards give +1 AP before the rush cap and +1 Focus." },
  { id: "greenhouse", name: "Greenhouse", element: "leaf", rarity: "common", description: "Verdant Shift restores extra HP." },
  { id: "shadow_bargain", name: "Shadow Bargain", element: "shadow", rarity: "rare", description: "Taking enemy damage charges Focus." },
  { id: "elemental_index", name: "Elemental Index", element: "light", rarity: "uncommon", description: "Hitting an enemy weakness charges +1 Focus when combat resolves." },
  { id: "fracture_notes", name: "Fracture Notes", element: "flame", rarity: "rare", description: "Breaking a shield spills bonus damage into HP and charges extra Focus." },
  { id: "clean_margin", name: "Clean Margin", element: "tide", rarity: "rare", description: "Breaking a shield also raises a Ward if you do not already have one." },
  { id: "clarity_lens", name: "Clarity Lens", element: "light", rarity: "uncommon", description: "A perfect study rush applies Exposed to the enemy." },
  { id: "blood_quill", name: "Blood Quill", element: "shadow", rarity: "uncommon", description: "Wrong answers grant +1 AP but apply a fragile self-debuff." },
  { id: "combo_aegis", name: "Rush Aegis", element: "heart", rarity: "rare", description: "4+ correct in one rush raises a Ward once per floor." },
  { id: "runic_tumbler", name: "Runic Tumbler", element: "shadow", rarity: "rare", description: "Defending can delay one enemy action on the timeline." },
];

export function getSkillById(id: string): SkillDef | undefined {
  return SKILL_DEFS.find(skill => skill.id === id);
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
