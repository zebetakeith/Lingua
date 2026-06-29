import {
  ALL_CASTLE_UPGRADE_IDS,
  ALL_CASTLE_KEEPSAKE_IDS,
  CASTLE_CONTRACTS,
  CASTLE_EVENT_DEFS,
  CASTLE_KEEPSAKE_DEFS,
  CASTLE_RUN_VERSION,
  CASTLE_UNIT_DEFS,
  STARTER_CASTLE_KEEPSAKE_IDS,
  STARTER_CASTLE_UPGRADE_IDS,
  createInitialCastleRun,
  normalizeCastleRunStudySummary,
  type CastleContractId,
  type CastleEventId,
  type CastleKeepsakeId,
  type CastleRouteChoice,
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
const CASTLE_PHASES: CastleRunState["phase"][] = ["battle", "reward", "route", "event", "retire", "complete", "lost"];
const CASTLE_ROUTES: CastleRouteChoice[] = ["battle", "rest", "workshop", "event"];

function normalizeCastleRun(deckId: string, saved: CastleRunState): CastleRunState | null {
  if (saved.version !== CASTLE_RUN_VERSION || !saved.battle) return null;
  const contractId: CastleContractId = saved.contractId in CASTLE_CONTRACTS ? saved.contractId : "regular";
  const rewardCurve = ["current", "quadratic", "steep"].includes(saved.rewardCurve) ? saved.rewardCurve : "quadratic";
  const recallMode = saved.recallMode === "deck" ? "deck" : "balanced";
  const keepsakeId = saved.keepsakeId && ALL_CASTLE_KEEPSAKE_IDS.includes(saved.keepsakeId) ? saved.keepsakeId : null;
  const upgrades = Array.isArray(saved.upgrades) ? saved.upgrades.filter(id => ALL_CASTLE_UPGRADE_IDS.includes(id)) : [];
  const draftPoolIds = Array.isArray(saved.draftPoolIds)
    ? saved.draftPoolIds.filter(id => ALL_CASTLE_UPGRADE_IDS.includes(id))
    : STARTER_CASTLE_UPGRADE_IDS;
  const base = createInitialCastleRun(
    deckId,
    contractId,
    rewardCurve,
    draftPoolIds,
    Number.isFinite(saved.rngState) ? saved.rngState : undefined,
    recallMode,
    keepsakeId,
  );
  const battle = saved.battle;
  const telemetry = battle.telemetry || base.battle.telemetry;
  const eventIds = Object.keys(CASTLE_EVENT_DEFS) as CastleEventId[];
  const nextEnemyKind = battle.nextEnemyKind in CASTLE_UNIT_DEFS ? battle.nextEnemyKind : base.battle.nextEnemyKind;
  const afterNextEnemyKind = battle.afterNextEnemyKind in CASTLE_UNIT_DEFS ? battle.afterNextEnemyKind : nextEnemyKind;
  const encounteredEnemyKinds = Array.from(new Set([
    ...(Array.isArray(battle.encounteredEnemyKinds) ? battle.encounteredEnemyKinds : []),
    ...(Array.isArray(battle.units) ? battle.units.filter(unit => unit?.side === "enemy").map(unit => unit.kind) : []),
  ].filter(kind => kind in CASTLE_UNIT_DEFS))) as CastleUnitKind[];
  return {
    ...base,
    ...saved,
    version: CASTLE_RUN_VERSION,
    deckId,
    contractId,
    rewardCurve,
    recallMode,
    keepsakeId,
    phase: CASTLE_PHASES.includes(saved.phase) ? saved.phase : "battle",
    upgrades,
    draftPoolIds: Array.from(new Set([...STARTER_CASTLE_UPGRADE_IDS, ...draftPoolIds])),
    rewardChoices: Array.isArray(saved.rewardChoices) ? saved.rewardChoices.filter(id => ALL_CASTLE_UPGRADE_IDS.includes(id)) : [],
    routeChoices: Array.isArray(saved.routeChoices) ? saved.routeChoices.filter(route => CASTLE_ROUTES.includes(route)) : [],
    pendingEventId: saved.pendingEventId && eventIds.includes(saved.pendingEventId) ? saved.pendingEventId : null,
    eventHistory: Array.isArray(saved.eventHistory) ? saved.eventHistory.filter(id => eventIds.includes(id)) : [],
    studySummary: normalizeCastleRunStudySummary(saved.studySummary),
    battle: {
      ...base.battle,
      ...battle,
      guardianPhase: battle.guardianPhase || (battle.guardian ? 1 : 0),
      nextEnemyKind,
      afterNextEnemyKind,
      recallBoltCharge: battle.recallBoltCharge || 0,
      missedDirectionKeys: Array.isArray(battle.missedDirectionKeys) ? battle.missedDirectionKeys : [],
      recalledDirectionKeys: Array.isArray(battle.recalledDirectionKeys) ? battle.recalledDirectionKeys : [],
      enemyThreatTier: Number.isFinite(battle.enemyThreatTier)
        ? Math.max(0, Math.floor(battle.enemyThreatTier))
        : base.battle.enemyThreatTier,
      encounteredEnemyKinds,
      units: Array.isArray(battle.units)
        ? battle.units.filter(unit => unit && unit.kind in CASTLE_UNIT_DEFS && (unit.side === "player" || unit.side === "enemy"))
        : [],
      fxEvents: Array.isArray(battle.fxEvents) ? battle.fxEvents : [],
      nextFxId: battle.nextFxId || 1,
      telemetry: {
        ...base.battle.telemetry,
        ...telemetry,
        responseMs: Array.isArray(telemetry.responseMs)
          ? telemetry.responseMs.filter(value => Number.isFinite(value) && value >= 0).slice(-200)
          : [],
      },
    },
  };
}

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
    ...(saved.unlockedKeepsakeIds || []).filter(id => ALL_CASTLE_KEEPSAKE_IDS.includes(id)),
    ...unlockedKeepsakesForProgress(guardianClears, runsCompleted),
  ]));
  return {
    ...base,
    ...saved,
    deckId,
    unlockedUpgradeIds: Array.from(new Set([
      ...STARTER_CASTLE_UPGRADE_IDS,
      ...(saved.unlockedUpgradeIds || []).filter(id => ALL_CASTLE_UPGRADE_IDS.includes(id)),
    ])),
    unlockedKeepsakeIds,
    selectedKeepsakeId: unlockedKeepsakeIds.includes(saved.selectedKeepsakeId) ? saved.selectedKeepsakeId : "starBuckle",
    discoveredEnemyKinds: Array.from(new Set((saved.discoveredEnemyKinds || []).filter(kind => kind in CASTLE_UNIT_DEFS))),
  };
}

export function loadCastleRun(deckId: string): CastleRunState | null {
  try {
    const run = loadAll()[deckId]?.run;
    return run ? normalizeCastleRun(deckId, run) : null;
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
  const newReviews = Math.max(0, run.reviews - (previousRun?.reviews || 0));
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
    totalReviews: previousProfile.totalReviews + newReviews,
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
      ...run.battle.encounteredEnemyKinds,
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

export function getNewCastleKeepsakeIds(profile: CastleDeckProfile, run: CastleRunState): CastleKeepsakeId[] {
  const justClearedGuardian = run.phase === "reward" && run.battlesWon > 0 && run.battlesWon % 3 === 0;
  const justCompletedRun = run.phase === "complete";
  const previousGuardianClears = Math.max(0, profile.guardianClears - (justClearedGuardian ? 1 : 0));
  const previousRunsCompleted = Math.max(0, profile.runsCompleted - (justCompletedRun ? 1 : 0));
  return profile.unlockedKeepsakeIds.filter(id => {
    const keepsake = CASTLE_KEEPSAKE_DEFS[id];
    const crossedGuardianMilestone = justClearedGuardian
      && Boolean(keepsake.guardianRequirement)
      && previousGuardianClears < keepsake.guardianRequirement!
      && profile.guardianClears >= keepsake.guardianRequirement!;
    const crossedRunMilestone = justCompletedRun
      && Boolean(keepsake.runRequirement)
      && previousRunsCompleted < keepsake.runRequirement!
      && profile.runsCompleted >= keepsake.runRequirement!;
    return crossedGuardianMilestone || crossedRunMilestone;
  });
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
