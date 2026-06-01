import type { EnemyDef } from "../data/enemies";

export interface BlobStats {
  bulk: number;
  bop: number;
  bounce: number;
  gusto: number;
}

export interface StudyContract {
  targetNewCards: number;
  targetStudyMinutes: number;
  introducedThisContract: number;
  studiedSeconds: number;
}

export interface MealSummary {
  enemyNames: string[];
  growth: BlobStats;
}

export interface CurioDef {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare";
}

export interface SnackDef {
  id: string;
  name: string;
  description: string;
  heal: number;
}

export interface ExpeditionSnapshot<TCombat = unknown> {
  version: 1;
  savedAt: number;
  screen: "combat" | "reward";
  floor: number;
  region: number;
  seed: string;
  combat: TCombat;
}

export const DEFAULT_CONTRACT_NEW_CARDS = 15;
export const DEFAULT_CONTRACT_MINUTES = 25;
export const MAX_CONTRACT_NEW_CARDS = 100;
export const MAX_CONTRACT_MINUTES = 120;

export const CURIO_DEFS: CurioDef[] = [
  { id: "pocket_pebble", name: "Pocket Pebble", description: "Meals grant +1 extra Bop.", rarity: "common" },
  { id: "springy_spoon", name: "Springy Spoon", description: "Your blob's actions move slightly faster on the timeline.", rarity: "common" },
  { id: "bubble_cup", name: "Bubble Cup", description: "Brace also raises a Bubble once per floor.", rarity: "uncommon" },
  { id: "jammy_compass", name: "Jammy Compass", description: "The first correct answer in each study set gives +0.5 AP.", rarity: "uncommon" },
  { id: "mossy_button", name: "Mossy Button", description: "Recover 8 extra HP while traveling to the next floor.", rarity: "common" },
  { id: "lucky_fork", name: "Lucky Fork", description: "Meals grant +1 extra Gusto.", rarity: "rare" },
];

export const SNACK_DEFS: SnackDef[] = [
  { id: "berry_pop", name: "Berry Pop", description: "Restore 28 HP during a command window.", heal: 28 },
  { id: "bubble_bun", name: "Bubble Bun", description: "Restore 18 HP and raise a Bubble.", heal: 18 },
];

export function createBlobStats(): BlobStats {
  return { bulk: 0, bop: 0, bounce: 0, gusto: 0 };
}

export function createStudyContract(targetNewCards = DEFAULT_CONTRACT_NEW_CARDS, targetStudyMinutes = DEFAULT_CONTRACT_MINUTES): StudyContract {
  return {
    targetNewCards: clampWhole(targetNewCards, 0, MAX_CONTRACT_NEW_CARDS),
    targetStudyMinutes: clampWhole(targetStudyMinutes, 5, MAX_CONTRACT_MINUTES),
    introducedThisContract: 0,
    studiedSeconds: 0,
  };
}

export function normalizeStudyContract(contract?: Partial<StudyContract> | null): StudyContract {
  const fallback = createStudyContract();
  return {
    targetNewCards: clampWhole(contract?.targetNewCards ?? fallback.targetNewCards, 0, MAX_CONTRACT_NEW_CARDS),
    targetStudyMinutes: clampWhole(contract?.targetStudyMinutes ?? fallback.targetStudyMinutes, 5, MAX_CONTRACT_MINUTES),
    introducedThisContract: Math.max(0, Number(contract?.introducedThisContract) || 0),
    studiedSeconds: Math.max(0, Number(contract?.studiedSeconds) || 0),
  };
}

export function getRegionForFloor(floor: number): number {
  return Math.max(1, Math.floor((Math.max(1, floor) - 1) / 10) + 1);
}

export function isCampFloor(floor: number): boolean {
  return floor % 5 === 0;
}

export function getVocabularyPicksForFloor(contract: StudyContract, floor: number, availableCards: number): number {
  const remaining = Math.max(0, contract.targetNewCards - contract.introducedThisContract);
  if (remaining <= 0 || availableCards <= 0) return 0;
  const step = floor % 5;
  if (step === 2 || step === 4) return 1;
  if (step === 0) return Math.min(10, remaining, availableCards);
  return 0;
}

export function getMealGrowth(enemies: EnemyDef[], curioIds: string[] = []): MealSummary {
  const growth = createBlobStats();
  for (const enemy of enemies) {
    if (enemy.element === "leaf") growth.bulk += enemy.isBoss ? 3 : 2;
    else if (enemy.element === "flame") growth.bop += enemy.isBoss ? 3 : 2;
    else if (enemy.element === "tide") growth.gusto += enemy.isBoss ? 2 : 1;
    else if (enemy.element === "light") growth.bounce += enemy.isBoss ? 2 : 1;
    else growth.bop += enemy.isBoss ? 2 : 1;

    if (enemy.isBoss) {
      growth.bulk += 1;
      growth.gusto += 1;
    }
  }
  if (curioIds.includes("pocket_pebble")) growth.bop += 1;
  if (curioIds.includes("lucky_fork")) growth.gusto += 1;
  return { enemyNames: enemies.map(enemy => enemy.name), growth };
}

export function applyMealGrowth(current: BlobStats, meal: MealSummary): BlobStats {
  return {
    bulk: current.bulk + meal.growth.bulk,
    bop: current.bop + meal.growth.bop,
    bounce: current.bounce + meal.growth.bounce,
    gusto: current.gusto + meal.growth.gusto,
  };
}

export function createCurioChoices(currentIds: string[], floor: number): CurioDef[] {
  if (floor % 2 !== 0 && floor % 5 !== 0) return [];
  const owned = new Set(currentIds);
  const available = CURIO_DEFS.filter(curio => !owned.has(curio.id));
  return shuffle(available).slice(0, 3);
}

export function createSnackChoices(floor: number): SnackDef[] {
  return isCampFloor(floor) ? shuffle(SNACK_DEFS).slice(0, 2) : [];
}

export function getCurioById(id: string): CurioDef | undefined {
  return CURIO_DEFS.find(curio => curio.id === id);
}

export function getSnackById(id?: string | null): SnackDef | undefined {
  return SNACK_DEFS.find(snack => snack.id === id);
}

function clampWhole(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}
