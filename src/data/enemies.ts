import type { TileKind } from "../game/runes";

export interface EnemyDef {
  id: string;
  name: string;
  element: TileKind;
  weakTo: TileKind[];
  resists?: TileKind[];
  hpBase: number;
  damage: number;
  attackFrequency: number; // attacks every N player turns
  special: string | null;
  sprite: string;
  floors: number[];
  isBoss: boolean;
  shieldBase?: number;
  phases?: { threshold: number; damageMult: number; timerMod: number; attackFreq?: number }[];
}

export const ENEMIES: EnemyDef[] = [
  {
    id: "slime",
    name: "Bloop Slime",
    element: "tide",
    weakTo: ["leaf", "light"],
    resists: ["flame"],
    hpBase: 78,
    damage: 6,
    attackFrequency: 3,
    special: "heavy_attack",
    sprite: "/enemy_slime_blob.svg",
    floors: [1],
    isBoss: false,
  },
  {
    id: "goblin",
    name: "Nibble Imp",
    element: "flame",
    weakTo: ["tide"],
    resists: ["leaf"],
    hpBase: 60,
    damage: 10,
    attackFrequency: 2,
    special: "shuffle_answers",
    sprite: "/enemy_scrap_imp_blob.svg",
    floors: [2],
    isBoss: false,
  },
  {
    id: "orc_guard",
    name: "Root Lump",
    element: "leaf",
    weakTo: ["flame", "shadow"],
    resists: ["tide", "leaf"],
    hpBase: 120,
    damage: 15,
    attackFrequency: 2,
    special: "enrage_at_50",
    sprite: "/enemy_root_warden_blob.svg",
    floors: [5],
    isBoss: true,
    shieldBase: 28,
    phases: [
      { threshold: 1.0, damageMult: 1.0, timerMod: 0 },
      { threshold: 0.5, damageMult: 1.5, timerMod: 0 },
    ],
  },
  {
    id: "combo_hunter",
    name: "Doodle Dragon",
    element: "shadow",
    weakTo: ["light"],
    resists: ["shadow"],
    hpBase: 66,
    damage: 11,
    attackFrequency: 2,
    special: "low_combo_punish",
    sprite: "/enemy_lexicon_dragon_blob.svg",
    floors: [3],
    isBoss: false,
  },
  {
    id: "book_wisp",
    name: "Page Wisp",
    element: "light",
    weakTo: ["shadow"],
    resists: ["light"],
    hpBase: 64,
    damage: 12,
    attackFrequency: 3,
    special: "randomize_positions",
    sprite: "/enemy_archive_wisp_blob.svg",
    floors: [4],
    isBoss: false,
    shieldBase: 12,
  },
  {
    id: "lich_scribe",
    name: "Nap Wisp",
    element: "shadow",
    weakTo: ["light", "flame"],
    resists: ["shadow", "heart"],
    hpBase: 80,
    damage: 18,
    attackFrequency: 2,
    special: "freeze_timer",
    sprite: "/enemy_archive_wisp_blob.svg",
    floors: [6],
    isBoss: false,
  },
  {
    id: "thorn_priest",
    name: "Sprout Grump",
    element: "leaf",
    weakTo: ["flame"],
    resists: ["tide", "leaf"],
    hpBase: 86,
    damage: 14,
    attackFrequency: 2,
    special: "healing_check",
    sprite: "/enemy_root_warden_blob.svg",
    floors: [7],
    isBoss: false,
  },
  {
    id: "shadow",
    name: "Dusk Puff",
    element: "shadow",
    weakTo: ["light"],
    resists: ["shadow"],
    hpBase: 70,
    damage: 13,
    attackFrequency: 2,
    special: "sequential",
    sprite: "/enemy_lexicon_dragon_blob.svg",
    floors: [8],
    isBoss: false,
  },
  {
    id: "vampire",
    name: "Nibbly Bat",
    element: "shadow",
    weakTo: ["light", "flame"],
    resists: ["shadow"],
    hpBase: 100,
    damage: 14,
    attackFrequency: 3,
    special: "self_heal",
    sprite: "/enemy_hemophage_blob.svg",
    floors: [9],
    isBoss: false,
    shieldBase: 18,
  },
  {
    id: "aegis_mimic",
    name: "Bubble Mimic",
    element: "tide",
    weakTo: ["leaf", "shadow"],
    resists: ["tide", "flame"],
    hpBase: 82,
    damage: 13,
    attackFrequency: 3,
    special: "self_heal",
    sprite: "/enemy_slime_blob.svg",
    floors: [12],
    isBoss: false,
    shieldBase: 28,
  },
  {
    id: "quiz_fiend",
    name: "Quiz Imp",
    element: "flame",
    weakTo: ["tide", "light"],
    resists: ["flame"],
    hpBase: 92,
    damage: 16,
    attackFrequency: 2,
    special: "timer_drain",
    sprite: "/enemy_scrap_imp_blob.svg",
    floors: [13],
    isBoss: false,
    shieldBase: 10,
  },
  {
    id: "heart_eater",
    name: "Heart Nibbler",
    element: "leaf",
    weakTo: ["flame", "shadow"],
    resists: ["leaf", "heart"],
    hpBase: 88,
    damage: 16,
    attackFrequency: 2,
    special: "healing_check",
    sprite: "/enemy_hemophage_blob.svg",
    floors: [14],
    isBoss: false,
  },
  {
    id: "abyssal_knight",
    name: "Dusk Knight",
    element: "shadow",
    weakTo: ["light", "flame"],
    resists: ["shadow", "tide"],
    hpBase: 70,
    damage: 22,
    attackFrequency: 2,
    special: "timer_drain",
    sprite: "/enemy_lexicon_dragon_blob.svg",
    floors: [11],
    isBoss: false,
    shieldBase: 22,
  },
  {
    id: "archmage",
    name: "Cloud Mage",
    element: "light",
    weakTo: ["shadow", "tide"],
    resists: ["light", "flame"],
    hpBase: 150,
    damage: 20,
    attackFrequency: 2,
    special: "randomize_positions",
    sprite: "/enemy_archive_wisp_blob.svg",
    floors: [15],
    isBoss: true,
    shieldBase: 36,
  },
  {
    id: "lexicon_dragon",
    name: "Word Dragon",
    element: "flame",
    weakTo: ["tide", "light"],
    resists: ["flame", "leaf", "shadow"],
    hpBase: 300,
    damage: 25,
    attackFrequency: 2,
    special: "three_phase",
    sprite: "/enemy_lexicon_dragon_blob.svg",
    floors: [10],
    isBoss: true,
    shieldBase: 54,
    phases: [
      { threshold: 1.0, damageMult: 1.0, timerMod: 0 },
      { threshold: 0.7, damageMult: 1.0, timerMod: -2 },
      { threshold: 0.4, damageMult: 1.5, timerMod: 0, attackFreq: 1 },
    ],
  },
];

export function getEnemiesForFloor(floor: number): EnemyDef[] {
  const exact = ENEMIES.filter(e => e.floors.includes(floor));
  if (exact.length > 0) return exact;

  if (floor % 10 === 0) {
    return ENEMIES.filter(e => e.id === "lexicon_dragon");
  }

  if (floor % 5 === 0) {
    const bossPool = ENEMIES.filter(e => e.isBoss && e.id !== "lexicon_dragon");
    return [bossPool[(Math.floor(floor / 5) - 1) % bossPool.length]];
  }

  const regularEnemies = ENEMIES.filter(e => !e.isBoss);
  return [regularEnemies[(floor - 1) % regularEnemies.length]];
}

export function getHpMultiplier(floor: number): number {
  if (floor <= 2) return 1.0;
  if (floor <= 4) return 1.5;
  if (floor <= 6) return 2.0;
  if (floor <= 8) return 2.8;
  if (floor <= 10) return 4.0;
  return 4.0 + (floor - 10) * 0.5;
}

export function getTimerForFloor(floor: number): number {
  const base = 10;
  const decrease = Math.min(floor * 0.3, 6);
  return Math.max(base - decrease, 4);
}
