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
  const step = floor % 10;
  if (floor % 10 === 0) {
    return {
      type: "boss",
      title: "Region Guardian",
      rewardLabel: "guardian meal",
      isBoss: true,
      isElite: false,
      offersRelic: true,
      modifierLabel: "Big Appetite",
      modifierDescription: "A region guardian arrives with extra bulk, a sturdy shell, and stronger study disruption.",
      startingCurses: 4,
      hpMultiplier: 1.16,
      shieldMultiplier: 1.8,
      damageMultiplier: 1.18,
    };
  }

  if (floor % 5 === 0) {
    return {
      type: "boss",
      title: "Midway Guardian",
      rewardLabel: "guardian meal",
      isBoss: true,
      isElite: false,
      offersRelic: true,
      modifierLabel: "Big Appetite",
      modifierDescription: "A guardian arrives with extra bulk, a sturdy shell, and stronger study disruption.",
      startingCurses: 3,
      hpMultiplier: 1.1,
      shieldMultiplier: 1.55,
      damageMultiplier: 1.12,
    };
  }

  if (step === 9) {
    return {
      type: "elite",
      title: "Oddball Encounter",
      rewardLabel: "oddball reward",
      isBoss: false,
      isElite: true,
      offersRelic: true,
      modifierLabel: "Extra Wiggly",
      modifierDescription: "This oddball has a stronger shell and applies more timeline pressure.",
      startingCurses: 2,
      hpMultiplier: 1.04,
      shieldMultiplier: 1.35,
      damageMultiplier: 1.08,
    };
  }

  return {
    type: "normal",
    title: "Wandering Encounter",
    rewardLabel: "travel reward",
    isBoss: false,
    isElite: false,
    offersRelic: floor % 3 === 0,
    modifierLabel: "Standard",
    modifierDescription: "A regular stretch of the expedition.",
    startingCurses: 0,
    hpMultiplier: 1,
    shieldMultiplier: 1,
    damageMultiplier: 1,
  };
}
