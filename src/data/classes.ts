export interface ClassDef {
  id: string;
  name: string;
  description: string;
  sprite: string;
  abilityName: string;
  abilityDescription: string;
  abilityCooldown: number; // combats between uses
  passiveDescription: string;
  unlockRequirement: string | null;
  unlockCost: number;
}

export const CLASSES: ClassDef[] = [
  {
    id: "linguist",
    name: "Linguist",
    description: "A balanced scholar who excels at all wordcraft. Good for beginners.",
    sprite: "/char_linguist_blob.svg",
    abilityName: "Head Start",
    abilityDescription: "Begin the next study set with +1 AP already prepared.",
    abilityCooldown: 3,
    passiveDescription: "No bonuses or penalties. Pure skill.",
    unlockRequirement: null,
    unlockCost: 0,
  },
  {
    id: "speedreader",
    name: "Speedreader",
    description: "A swift rogue who strikes fast and hard. Rewards quick thinking.",
    sprite: "/char_speedreader_blob.svg",
    abilityName: "Quickened Script",
    abilityDescription: "Prime the next command window with faster Flame pressure.",
    abilityCooldown: 4,
    passiveDescription: "Fast turns and Flame skills reward strong study sets.",
    unlockRequirement: "Reach Floor 5",
    unlockCost: 100,
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "A wise mage who controls the battlefield with knowledge.",
    sprite: "/char_scholar_blob.svg",
    abilityName: "Reveal Truth",
    abilityDescription: "Eliminate 1 wrong answer for the next 5 cards.",
    abilityCooldown: 4,
    passiveDescription: "Reveal tools help stabilize hard study sets.",
    unlockRequirement: "Learn 50 words",
    unlockCost: 200,
  },
];

export function getClassById(id: string): ClassDef | undefined {
  return CLASSES.find(c => c.id === id);
}
