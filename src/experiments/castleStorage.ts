import {
  ALL_CASTLE_UPGRADE_IDS,
  ALL_CASTLE_KEEPSAKE_IDS,
  CASTLE_KEEPSAKE_DEFS,
  CASTLE_RUN_VERSION,
  STARTER_CASTLE_KEEPSAKE_IDS,
  STARTER_CASTLE_UPGRADE_IDS,
  type CastleKeepsakeId,
  type CastleRunState,
  type CastleUnitKind,
  type CastleUpgradeId,
} from "./castleBattle.ts";

const CASTLE_SAVE_KEY = "lexicon_labyrinth_castle_runs_v1";

export interface CastleDeckProfile {
  version: 1;
  deckId: string;
  unlockedUpgradeIds: CastleUpgradeId[];
  unlockedKeepsakeIds: CastleKeepsakeId[];
  selectedKeepsakeId: CastleKeepsakeId;
  discoveredEnemyKinds: CastleUnitKind[];
  runsCompleted: number;
  guardianClears: number;
  bestRegion: number;
  totalReviews: number;
  tutorialComplete: boolean;
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
    unlockedKeepsakeIds: [...STARTER_CASTLE_KEEPSAKE_IDS],
    selectedKeepsakeId: "starBuckle",
    discoveredEnemyKinds: ["shellSlime", "nibbleImp", "sporeBud"],
    runsCompleted: 0,
    guardianClears: 0,
    bestRegion: 1,
    totalReviews: 0,
    tutorialComplete: false,
  };
}

export function loadCastleProfile(deckId: string): CastleDeckProfile {
  const saved = loadAll()[deckId]?.profile;
  if (!saved) return createCastleProfile(deckId);
  const base = createCastleProfile(deckId);
  const guardianClears = saved.guardianClears || 0;
  const runsCompleted = saved.runsCompleted || 0;
  const unlockedKeepsakeIds = Array.from(new Set([
    ...STARTER_CASTLE_KEEPSAKE_IDS,
    ...(saved.unlockedKeepsakeIds || []),
    ...unlockedKeepsakesForProgress(guardianClears, runsCompleted),
  ]));
  return {
    ...base,
    ...saved,
    deckId,
    unlockedUpgradeIds: Array.from(new Set([...STARTER_CASTLE_UPGRADE_IDS, ...(saved.unlockedUpgradeIds || [])])),
    unlockedKeepsakeIds,
    selectedKeepsakeId: unlockedKeepsakeIds.includes(saved.selectedKeepsakeId) ? saved.selectedKeepsakeId : "starBuckle",
    discoveredEnemyKinds: Array.from(new Set(saved.discoveredEnemyKinds || [])),
  };
}

export function loadCastleRun(deckId: string): CastleRunState | null {
  try {
    const run = loadAll()[deckId]?.run;
    return run?.version === CASTLE_RUN_VERSION
      ? {
          ...run,
          recallMode: run.recallMode || "balanced",
          keepsakeId: run.keepsakeId || null,
          pendingEventId: run.pendingEventId || null,
          eventHistory: run.eventHistory || [],
          battle: {
            ...run.battle,
            guardianPhase: run.battle.guardianPhase || (run.battle.guardian ? 1 : 0),
            afterNextEnemyKind: run.battle.afterNextEnemyKind || run.battle.nextEnemyKind,
            recallBoltCharge: run.battle.recallBoltCharge || 0,
            fxEvents: run.battle.fxEvents || [],
            nextFxId: run.battle.nextFxId || 1,
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

function unlockedKeepsakesForProgress(guardianClears: number, runsCompleted: number): CastleKeepsakeId[] {
  return ALL_CASTLE_KEEPSAKE_IDS.filter(id => {
    const keepsake = CASTLE_KEEPSAKE_DEFS[id];
    return guardianClears >= (keepsake.guardianRequirement || 0)
      && runsCompleted >= (keepsake.runRequirement || 0);
  });
}

export function saveCastleRun(deckId: string, run: CastleRunState): CastleDeckProfile {
  const all = loadAll();
  const previousProfile = loadCastleProfile(deckId);
  const previousRun = all[deckId]?.run;
  const previousGuardianMilestones = previousRun ? Math.floor(previousRun.battlesWon / 3) : 0;
  const currentGuardianMilestones = Math.floor(run.battlesWon / 3);
  const guardianClears = previousProfile.guardianClears + Math.max(0, currentGuardianMilestones - previousGuardianMilestones);
  const completedRun = run.phase === "complete" && all[deckId]?.run?.phase !== "complete";
  const runsCompleted = previousProfile.runsCompleted + (completedRun ? 1 : 0);
  const unlockedKeepsakeIds = Array.from(new Set([
    ...previousProfile.unlockedKeepsakeIds,
    ...unlockedKeepsakesForProgress(guardianClears, runsCompleted),
  ]));
  const profile: CastleDeckProfile = {
    ...previousProfile,
    guardianClears,
    bestRegion: Math.max(previousProfile.bestRegion, run.bestRegion),
    totalReviews: Math.max(previousProfile.totalReviews, run.reviews),
    runsCompleted,
    unlockedKeepsakeIds,
    selectedKeepsakeId: unlockedKeepsakeIds.includes(previousProfile.selectedKeepsakeId)
      ? previousProfile.selectedKeepsakeId
      : "starBuckle",
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

export function completeCastleTutorial(deckId: string): CastleDeckProfile {
  const all = loadAll();
  const profile = { ...loadCastleProfile(deckId), tutorialComplete: true };
  saveAll({ ...all, [deckId]: { profile, run: all[deckId]?.run || null } });
  return profile;
}

export function selectCastleKeepsake(deckId: string, keepsakeId: CastleKeepsakeId): CastleDeckProfile {
  const all = loadAll();
  const profile = loadCastleProfile(deckId);
  if (!profile.unlockedKeepsakeIds.includes(keepsakeId)) return profile;
  const next = { ...profile, selectedKeepsakeId: keepsakeId };
  saveAll({ ...all, [deckId]: { profile: next, run: all[deckId]?.run || null } });
  return next;
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
