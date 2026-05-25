export type EncounterType = "normal" | "elite" | "boss";

export interface EncounterInfo {
  type: EncounterType;
  title: string;
  rewardLabel: string;
  isBoss: boolean;
  isElite: boolean;
  offersRelic: boolean;
  modifierLabel: string;
  modifierDescription: string;
  startingCurses: number;
  hpMultiplier: number;
  shieldMultiplier: number;
  damageMultiplier: number;
}

export function getEncounterForFloor(floor: number): EncounterInfo {
  if (floor % 10 === 0) {
    return {
      type: "boss",
      title: "Boss Room",
      rewardLabel: "Boss reward",
      isBoss: true,
      isElite: false,
      offersRelic: true,
      modifierLabel: "Boss Sigil",
      modifierDescription: "The enemy has more HP, stronger shields, heavier hits, and stronger study disruption.",
      startingCurses: 4,
      hpMultiplier: 1.16,
      shieldMultiplier: 1.8,
      damageMultiplier: 1.18,
    };
  }

  if (floor % 5 === 0) {
    return {
      type: "boss",
      title: "Boss Room",
      rewardLabel: "Boss reward",
      isBoss: true,
      isElite: false,
      offersRelic: true,
      modifierLabel: "Boss Sigil",
      modifierDescription: "The enemy has more HP, stronger shields, heavier hits, and stronger study disruption.",
      startingCurses: 3,
      hpMultiplier: 1.1,
      shieldMultiplier: 1.55,
      damageMultiplier: 1.12,
    };
  }

  if (floor % 4 === 0) {
    return {
      type: "elite",
      title: "Elite Room",
      rewardLabel: "Elite reward",
      isBoss: false,
      isElite: true,
      offersRelic: true,
      modifierLabel: "Elite Pressure",
      modifierDescription: "The enemy gains a stronger shield and applies more timeline pressure.",
      startingCurses: 2,
      hpMultiplier: 1.04,
      shieldMultiplier: 1.35,
      damageMultiplier: 1.08,
    };
  }

  return {
    type: "normal",
    title: "Normal Room",
    rewardLabel: "Card reward",
    isBoss: false,
    isElite: false,
    offersRelic: floor % 3 === 0,
    modifierLabel: "Standard",
    modifierDescription: "No room modifier.",
    startingCurses: 0,
    hpMultiplier: 1,
    shieldMultiplier: 1,
    damageMultiplier: 1,
  };
}
