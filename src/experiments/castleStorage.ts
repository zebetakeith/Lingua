import {
  ALL_CASTLE_UPGRADE_IDS,
  CASTLE_RUN_VERSION,
  STARTER_CASTLE_UPGRADE_IDS,
  type CastleRunState,
  type CastleUnitKind,
  type CastleUpgradeId,
} from "./castleBattle";

const CASTLE_SAVE_KEY = "lexicon_labyrinth_castle_runs_v1";

export interface CastleDeckProfile {
  version: 1;
  deckId: string;
  unlockedUpgradeIds: CastleUpgradeId[];
  discoveredEnemyKinds: CastleUnitKind[];
  runsCompleted: number;
  guardianClears: number;
  bestRegion: number;
  totalReviews: number;
}

interface CastleDeckRecord {
  profile: CastleDeckProfile;
  run: CastleRunState | null;
}

type CastleSaveFile = Record<string, CastleDeckRecord>;

function loadAll(): CastleSaveFile {
  try {
    const raw = localStorage.getItem(CASTLE_SAVE_KEY);
    return raw ? JSON.parse(raw) as CastleSaveFile : {};
  } catch {
    return {};
  }
}

function saveAll(save: CastleSaveFile) {
  localStorage.setItem(CASTLE_SAVE_KEY, JSON.stringify(save));
}

export function createCastleProfile(deckId: string): CastleDeckProfile {
  return {
    version: 1,
    deckId,
    unlockedUpgradeIds: [...STARTER_CASTLE_UPGRADE_IDS],
    discoveredEnemyKinds: ["shellSlime", "nibbleImp", "sporeBud"],
    runsCompleted: 0,
    guardianClears: 0,
    bestRegion: 1,
    totalReviews: 0,
  };
}

export function loadCastleProfile(deckId: string): CastleDeckProfile {
  const saved = loadAll()[deckId]?.profile;
  if (!saved) return createCastleProfile(deckId);
  return {
    ...createCastleProfile(deckId),
    ...saved,
    deckId,
    unlockedUpgradeIds: Array.from(new Set([...STARTER_CASTLE_UPGRADE_IDS, ...(saved.unlockedUpgradeIds || [])])),
    discoveredEnemyKinds: Array.from(new Set(saved.discoveredEnemyKinds || [])),
  };
}

export function loadCastleRun(deckId: string): CastleRunState | null {
  try {
    const run = loadAll()[deckId]?.run;
    return run?.version === CASTLE_RUN_VERSION
      ? {
          ...run,
          battle: {
            ...run.battle,
            afterNextEnemyKind: run.battle.afterNextEnemyKind || run.battle.nextEnemyKind,
          },
        }
      : null;
  } catch {
    return null;
  }
}

function unlockedForGuardianCount(guardianClears: number): CastleUpgradeId[] {
  const locked = ALL_CASTLE_UPGRADE_IDS.filter(id => !STARTER_CASTLE_UPGRADE_IDS.includes(id));
  return locked.slice(0, Math.max(0, guardianClears));
}

export function saveCastleRun(deckId: string, run: CastleRunState): CastleDeckProfile {
  const all = loadAll();
  const previousProfile = loadCastleProfile(deckId);
  const guardianClears = Math.max(previousProfile.guardianClears, Math.floor(run.battlesWon / 3));
  const profile: CastleDeckProfile = {
    ...previousProfile,
    guardianClears,
    bestRegion: Math.max(previousProfile.bestRegion, run.bestRegion),
    totalReviews: Math.max(previousProfile.totalReviews, run.reviews),
    runsCompleted: previousProfile.runsCompleted + (run.phase === "complete" && all[deckId]?.run?.phase !== "complete" ? 1 : 0),
    unlockedUpgradeIds: Array.from(new Set([
      ...previousProfile.unlockedUpgradeIds,
      ...unlockedForGuardianCount(guardianClears),
    ])),
    discoveredEnemyKinds: Array.from(new Set([
      ...previousProfile.discoveredEnemyKinds,
      ...run.battle.units.filter(unit => unit.side === "enemy").map(unit => unit.kind),
    ])),
  };
  saveAll({ ...all, [deckId]: { profile, run } });
  return profile;
}

export function clearCastleRun(deckId: string) {
  const all = loadAll();
  const profile = loadCastleProfile(deckId);
  saveAll({ ...all, [deckId]: { profile, run: null } });
}

export function exportCastleBalanceData(deckId: string): string {
  const record = loadAll()[deckId];
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    deckId,
    profile: record?.profile || createCastleProfile(deckId),
    run: record?.run || null,
  }, null, 2);
}
