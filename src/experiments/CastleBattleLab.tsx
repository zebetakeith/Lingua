import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  ArrowLeft,
  BookOpen,
  Castle,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  FlaskConical,
  Heart,
  LogOut,
  Pause,
  Play,
  RefreshCcw,
  Route,
  Settings,
  Shield,
  Sparkles,
  Swords,
  X,
  Zap,
} from "lucide-react";
import {
  answerStudyQuestion,
  completeStudyExposure,
  getSelectedStudyDeckId,
  getStudyDecks,
  getStudyDirectionLabel,
  getStudyQuestionKey,
  introduceStudyCards,
  isStudyQuestionUnavailableError,
  selectStudyDeck,
  tryDrawStudyQuestion,
  type StudyAnswerResult,
  type StudyDeckSummary,
  type StudyExposureRating,
  type StudyQuestion,
} from "../game/studyBridge";
import { getActiveStudyResponseMs, type StudyRecallMode, type StudyRewardCurve } from "../game/study";
import { splitJapaneseWrittenForm, type JapaneseStudyTile } from "../game/japaneseTiles";
import {
  CASTLE_CONTRACTS,
  CASTLE_ARMY_CAPACITY,
  CASTLE_DIFFICULTIES,
  CASTLE_ENEMY_AFFIX_DEFS,
  CASTLE_EVENT_DEFS,
  CASTLE_GUARDIAN_POWER_DEFS,
  CASTLE_KEEPSAKE_DEFS,
  CASTLE_MELEE_ENGAGEMENT_SLOTS,
  CASTLE_POWER_DEFS,
  CASTLE_RANGED_ENGAGEMENT_SLOTS,
  CASTLE_RECALL_BOLT_LIMIT,
  CASTLE_RALLY_LIMIT,
  CASTLE_SYNERGY_DEFS,
  CASTLE_UNIT_DEFS,
  CASTLE_UPGRADE_DEFS,
  acknowledgeCastleGuardianBriefing,
  applyCastleStudyOutcome,
  activateCastlePower,
  canChooseCastleEvent,
  chooseCastleRoute,
  claimCastleUpgrade,
  continueCastleRun,
  createInitialCastleRun,
  formatCastleEnergy,
  getAvailableCastlePowers,
  getActiveCastleSynergies,
  getCastleBattleProgress,
  getCastleArmyPopulation,
  getCastleBattleLesson,
  getCastleEventChoiceEffect,
  getCastleEndlessThreat,
  getCastleEnemyAffix,
  getCastleRegionDef,
  getCastleStudyReport,
  getCastleSynergyProgress,
  getPlayerSummonKinds,
  pauseCastleBattle,
  recordCastleIntroductions,
  refreshCastleCommandHand,
  resolveCastleEvent,
  resumeCastleBattle,
  retireCastleRun,
  summonCastleUnit,
  tickCastleRun,
  type CastleContractId,
  type CastleDifficultyId,
  type CastleEventId,
  type CastleKeepsakeId,
  type CastlePowerId,
  type CastleRouteChoice,
  type CastleRunState,
  type CastleUnitKind,
} from "./castleBattle";
import {
  clearCastleRun,
  completeCastleTutorial,
  exportCastleBalanceData,
  getNewCastleKeepsakeIds,
  loadCastleProfile,
  loadCastleRun,
  saveCastleRun,
  selectCastleKeepsake,
  type CastleDeckProfile,
} from "./castleStorage";
import { playCastleSound } from "./castleAudio";
import "./CastleBattleLab.css";

interface CastleBattleLabProps {
  onExit: () => void;
}

interface ReviewFeedback {
  correct: boolean;
  answer: string;
  reward: number;
  wasUnseen: boolean;
  masteryEvent: string;
  bonusEvent?: string;
  requiresCorrection?: boolean;
}

type CastlePanelMode = "study" | "army";
type PipploAnimationName = "idle" | "cast" | "hurt" | "cheer";
type MallowAnimationName = "idle" | "cast" | "hurt" | "cheer";

interface PipploAnimationState {
  name: PipploAnimationName;
  serial: number;
}

const REWARD_CURVE_LABELS: Record<StudyRewardCurve, string> = {
  current: "Classic",
  quadratic: "Curved",
  steep: "Steep",
};
const REWARD_CURVE_HELP: Record<StudyRewardCurve, string> = {
  current: "Smooth rewards with a gentler gap between hard and mastered cards.",
  quadratic: "Recommended: difficult recalls pay about four times as much as mastered ones.",
  steep: "The sharpest struggle bonus and the leanest rewards for fluent cards.",
};
const RECALL_MODE_LABELS: Record<StudyRecallMode, string> = {
  balanced: "Balanced recall",
  deck: "Deck default",
};
const RECALL_MODE_HELP: Record<StudyRecallMode, string> = {
  balanced: "Recommended: meaning choices, kana-to-written tile building, then reveal and self-grade with an optional Japanese handwriting pad.",
  deck: "Use the multiple-choice and self-grade rules saved with this deck. Typing stays disabled.",
};
const CASTLE_SOUND_KEY = "lexicon_labyrinth_castle_sound";
const PIPPLO_ANIMATION_FRAMES: Record<PipploAnimationName, string[]> = Object.fromEntries(
  (["idle", "cast", "hurt", "cheer"] as const).map(animation => [
    animation,
    Array.from(
      { length: 4 },
      (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/characters/pipplo/${animation}/0${index + 1}.png`,
    ),
  ]),
) as Record<PipploAnimationName, string[]>;
const MALLOW_ANIMATION_FRAMES: Record<MallowAnimationName, string[]> = Object.fromEntries(
  (["idle", "cast", "hurt", "cheer"] as const).map(animation => [
    animation,
    Array.from(
      { length: 4 },
      (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/characters/mallow/${animation}/0${index + 1}.png`,
    ),
  ]),
) as Record<MallowAnimationName, string[]>;
const FRIENDLY_UNIT_ART: Partial<Record<CastleUnitKind, string>> = {
  piplet: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/piplet/seed-v1.png`,
  dartlet: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/dartlet/seed-v1.png`,
  bubbleBud: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bubbleBud/seed-v1.png`,
  mendlet: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/mendlet/seed-v1.png`,
  spitlet: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/spitlet/seed-v1.png`,
  bigChonk: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bigChonk/seed-v2.png`,
};
const ENEMY_UNIT_ART: Partial<Record<CastleUnitKind, string>> = {
  shellSlime: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/shellSlime/seed-v1.png`,
  nibbleImp: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/nibbleImp/seed-v1.png`,
  sporeBud: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/sporeBud/seed-v2.png`,
  boomcap: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/boomcap/seed-v1.png`,
  echoMoth: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/echoMoth/seed-v2.png`,
  rootLump: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/rootLump/seed-v2.png`,
};
const FRIENDLY_UNIT_WALK_FRAMES: Partial<Record<CastleUnitKind, string[]>> = {
  piplet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/piplet/walk/0${index + 1}.png`,
  ),
  dartlet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/dartlet/walk/0${index + 1}.png`,
  ),
  bubbleBud: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bubbleBud/walk/0${index + 1}.png`,
  ),
  mendlet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/mendlet/walk/0${index + 1}.png`,
  ),
  spitlet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/spitlet/walk/0${index + 1}.png`,
  ),
  bigChonk: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bigChonk/walk/0${index + 1}.png`,
  ),
};
const FRIENDLY_UNIT_WALK_FRAME_MS: Partial<Record<CastleUnitKind, number>> = {
  piplet: 140,
  dartlet: 95,
  bubbleBud: 180,
  mendlet: 170,
  spitlet: 155,
  bigChonk: 240,
};
const ENEMY_UNIT_WALK_FRAMES: Partial<Record<CastleUnitKind, string[]>> = {
  shellSlime: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/shellSlime/walk/0${index + 1}.png`,
  ),
  nibbleImp: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/nibbleImp/walk/0${index + 1}.png`,
  ),
  sporeBud: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/sporeBud/walk/0${index + 1}.png`,
  ),
  boomcap: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/boomcap/walk/0${index + 1}.png`,
  ),
  echoMoth: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/echoMoth/walk/0${index + 1}.png`,
  ),
  rootLump: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/rootLump/walk/0${index + 1}.png`,
  ),
};
const ENEMY_UNIT_WALK_FRAME_MS: Partial<Record<CastleUnitKind, number>> = {
  shellSlime: 210,
  nibbleImp: 90,
  sporeBud: 190,
  boomcap: 175,
  echoMoth: 115,
  rootLump: 260,
};
const FRIENDLY_UNIT_ATTACK_FRAMES: Partial<Record<CastleUnitKind, string[]>> = {
  piplet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/piplet/attack/0${index + 1}.png`,
  ),
  dartlet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/dartlet/attack/0${index + 1}.png`,
  ),
  bubbleBud: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bubbleBud/attack/0${index + 1}.png`,
  ),
  mendlet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/mendlet/attack/0${index + 1}.png`,
  ),
  spitlet: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/spitlet/attack/0${index + 1}.png`,
  ),
  bigChonk: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bigChonk/attack/0${index + 1}.png`,
  ),
};
const FRIENDLY_UNIT_ATTACK_FRAME_MS: Partial<Record<CastleUnitKind, number>> = {
  piplet: 50,
  dartlet: 45,
  bubbleBud: 55,
  mendlet: 70,
  spitlet: 55,
  bigChonk: 75,
};
const ENEMY_UNIT_ATTACK_FRAMES: Partial<Record<CastleUnitKind, string[]>> = {
  shellSlime: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/shellSlime/attack/0${index + 1}.png`,
  ),
  nibbleImp: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/nibbleImp/attack/0${index + 1}.png`,
  ),
  sporeBud: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/sporeBud/attack/0${index + 1}.png`,
  ),
  boomcap: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/boomcap/attack/0${index + 1}.png`,
  ),
  echoMoth: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/echoMoth/attack/0${index + 1}.png`,
  ),
  rootLump: Array.from(
    { length: 4 },
    (_, index) => `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/rootLump/attack/0${index + 1}.png`,
  ),
};
const ENEMY_UNIT_ATTACK_FRAME_MS: Partial<Record<CastleUnitKind, number>> = {
  shellSlime: 60,
  nibbleImp: 45,
  sporeBud: 65,
  boomcap: 65,
  echoMoth: 55,
  rootLump: 90,
};

function PipploSprite({
  className = "",
  animation = "idle",
  animated = true,
  loop,
}: {
  className?: string;
  animation?: PipploAnimationName;
  animated?: boolean;
  loop?: boolean;
}) {
  const animationClass = animated ? (loop ?? animation === "idle") ? "is-looping" : "is-action" : "";
  return (
    <div className={`goo-keeper-sprite goo-pipplo-sprite ${animationClass} ${className}`.trim()} data-animation={animation} aria-hidden="true">
      {PIPPLO_ANIMATION_FRAMES[animation].map((src, index) => (
        <img key={src} src={src} alt="" style={{ "--pipplo-frame": index } as CSSProperties} />
      ))}
    </div>
  );
}

function MallowSprite({
  className = "",
  animation = "idle",
}: {
  className?: string;
  animation?: MallowAnimationName;
}) {
  const animationClass = animation === "idle" ? "is-looping" : "is-action";
  return (
    <div className={`goo-keeper-sprite goo-mallow-sprite ${animationClass} ${className}`.trim()} data-animation={animation} aria-hidden="true">
      {MALLOW_ANIMATION_FRAMES[animation].map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          style={{
            "--pipplo-frame": index,
            "--keeper-action-duration": "115ms",
            "--keeper-action-delay": `${index * 110}ms`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function CastleHealth({ current, max, enemy = false }: { current: number; max: number; enemy?: boolean }) {
  const percent = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div
      className={`castle-health ${enemy ? "is-enemy" : ""}`}
      role="progressbar"
      aria-label={`${enemy ? "Mallow's" : "Pipplo's"} Keep health`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.ceil(current)}
    >
      <span>{enemy ? "Mallow's Keep" : "Pipplo's Keep"}</span>
      <div><i style={{ width: `${percent}%` }} /></div>
      <b>{Math.ceil(current)}/{max}</b>
    </div>
  );
}

function SlimeFace({
  kind,
  side,
  attacking = false,
  walking = false,
}: {
  kind: CastleUnitKind;
  side: "player" | "enemy";
  attacking?: boolean;
  walking?: boolean;
}) {
  const art = side === "player" ? FRIENDLY_UNIT_ART[kind] : ENEMY_UNIT_ART[kind];
  const attackFrames = attacking
    ? side === "player"
      ? FRIENDLY_UNIT_ATTACK_FRAMES[kind]
      : ENEMY_UNIT_ATTACK_FRAMES[kind]
    : undefined;
  const walkFrames = walking
    ? side === "player" ? FRIENDLY_UNIT_WALK_FRAMES[kind] : ENEMY_UNIT_WALK_FRAMES[kind]
    : undefined;
  const animationFrames = attackFrames || walkFrames;
  const animationName = attackFrames ? "attack" : walkFrames ? "walk" : "idle";
  const animationFrameMs = attackFrames
    ? (side === "player" ? FRIENDLY_UNIT_ATTACK_FRAME_MS[kind] : ENEMY_UNIT_ATTACK_FRAME_MS[kind]) || 45
    : (side === "player" ? FRIENDLY_UNIT_WALK_FRAME_MS[kind] : ENEMY_UNIT_WALK_FRAME_MS[kind]) || 140;
  if (art) {
    return (
      <span
        className={`castle-unit-face is-production-art ${attackFrames ? "is-unit-action" : ""} ${walkFrames ? "is-unit-walk" : ""} kind-${kind} side-${side}`}
        data-unit-animation={animationName}
        aria-hidden="true"
      >
        {(animationFrames || [art]).map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            style={{
              "--unit-art-duration": `${animationFrameMs}ms`,
              "--unit-art-cycle": `${animationFrameMs * (animationFrames?.length || 1)}ms`,
              "--unit-art-delay": `${index * animationFrameMs}ms`,
            } as CSSProperties}
          />
        ))}
      </span>
    );
  }
  return (
    <span className={`castle-unit-face kind-${kind} side-${side}`} aria-hidden="true">
      <i /><i />
      <b />
    </span>
  );
}

function CastleScene({ run, pipploAnimation }: { run: CastleRunState; pipploAnimation: PipploAnimationState }) {
  const battle = run.battle;
  const region = getCastleRegionDef(run.region);
  const difficulty = CASTLE_DIFFICULTIES[run.difficultyId];
  const endlessThreat = getCastleEndlessThreat(run.region);
  const guardianPower = battle.guardianPowerId ? CASTLE_GUARDIAN_POWER_DEFS[battle.guardianPowerId] : null;
  const activeSynergyIds = new Set(getActiveCastleSynergies(run.upgrades).map(synergy => synergy.id));
  const nextEnemyAffix = getCastleEnemyAffix(battle.enemyThreatTier, battle.enemySpawnCount);
  const afterNextEnemyAffix = getCastleEnemyAffix(battle.enemyThreatTier, battle.enemySpawnCount + 1);
  const playerCastleHitEvent = battle.fxEvents.slice().reverse().find(event => (event.kind === "hit" || event.kind === "projectile") && event.position <= 3);
  const playerCastleHit = Boolean(playerCastleHitEvent);
  const enemyCastleHitEvent = battle.fxEvents.slice().reverse().find(event => (event.kind === "hit" || event.kind === "projectile") && event.position >= 97);
  const enemyCastleHit = Boolean(enemyCastleHitEvent);
  const enemyCastEvent = battle.fxEvents.slice().reverse().find(event => event.side === "enemy" && (event.kind === "spawn" || event.kind === "power" || event.kind === "shield"));
  const celebrating = run.phase === "reward" || run.phase === "retire" || run.phase === "complete";
  const activePipploAnimation: PipploAnimationName = playerCastleHitEvent ? "hurt" : celebrating ? "cheer" : pipploAnimation.name;
  const activePipploSerial = playerCastleHitEvent
    ? `hit-${playerCastleHitEvent.id}`
    : celebrating
      ? `celebrate-${run.phase}-${battle.battleNumber}`
      : pipploAnimation.serial;
  const activeMallowAnimation: MallowAnimationName = enemyCastleHitEvent
    ? "hurt"
    : enemyCastEvent
      ? "cast"
      : playerCastleHitEvent
        ? "cheer"
        : "idle";
  const activeMallowSerial = enemyCastleHitEvent
    ? `hurt-${enemyCastleHitEvent.id}`
    : enemyCastEvent
      ? `cast-${enemyCastEvent.id}`
      : playerCastleHitEvent
        ? `cheer-${playerCastleHitEvent.id}`
        : `idle-${battle.battleNumber}`;
  const friendlyUnits = battle.units.filter(unit => unit.side === "player").length;
  const enemyUnits = battle.units.length - friendlyUnits;
  return (
    <section
      className={`castle-scene ${battle.mode === "study" ? "is-live" : "is-paused"} ${battle.playerCastleHp <= battle.playerCastleMaxHp * 0.3 ? "is-low-health" : ""} ${battle.enemySpawnTimerMs <= 3_000 ? "is-wave-imminent" : ""} ${battle.guardian ? `is-guardian phase-${battle.guardianPhase}` : ""}`}
      style={{
        "--region-sky-top": region.skyTop,
        "--region-sky-bottom": region.skyBottom,
        "--region-hill-far": region.hillFar,
        "--region-hill-near": region.hillNear,
        "--region-ground": region.ground,
        "--region-road-top": region.roadTop,
        "--region-road-bottom": region.roadBottom,
        "--region-sun": region.sun,
        "--guardian-accent": guardianPower?.accent || "#9d83dc",
      } as CSSProperties}
      aria-label={`${region.name} castle battlefield. Pipplo's Keep ${Math.ceil(battle.playerCastleHp)} health, ${guardianPower?.epithet || "Mallow's Keep"} ${Math.ceil(battle.enemyCastleHp)} health. ${friendlyUnits} friendly and ${enemyUnits} enemy units in the lane.`}
    >
      <div className="castle-sky-orb" />
      <div className="castle-scenery" aria-hidden="true">
        <i className="is-left-tree" /><i className="is-right-tree" />
        <i className="is-left-mushroom" /><i className="is-right-mushroom" />
        <i className="is-grass-one" /><i className="is-grass-two" /><i className="is-grass-three" />
      </div>
      {battle.mode === "study" && (
        <div className="castle-beat-banner" aria-hidden="true">
          <span>Battle live</span>
          <b>●</b>
        </div>
      )}
      <div className="castle-scene-status">
        <CastleHealth current={battle.playerCastleHp} max={battle.playerCastleMaxHp} />
        <div className="castle-region-chip" title={`${difficulty.name}: ${difficulty.description} ${region.enemyTheme}. ${endlessThreat.description}${guardianPower ? ` ${guardianPower.name}: ${guardianPower.description} ${guardianPower.signature}` : ""}`}>
          <span>{getCastleBattleProgress(run)}</span>
          <b>{region.shortName}{endlessThreat.tier > 0 ? ` · A${endlessThreat.tier}` : ""}</b>
          <small>{difficulty.shortName} · {battle.guardian ? `Phase ${battle.guardianPhase}/3 · ${guardianPower?.name || "Guardian"}` : "Lane battle"}</small>
          {battle.guardian && guardianPower && <em className={battle.guardianAbilityTimerMs <= 4_000 ? "is-imminent" : ""}>{battle.guardianBriefingPending ? "Signature paused" : `${guardianPower.signatureName} · ${Math.max(0, Math.ceil(battle.guardianAbilityTimerMs / 1_000))}s`}</em>}
        </div>
        <CastleHealth current={battle.enemyCastleHp} max={battle.enemyCastleMaxHp} enemy />
      </div>

      <div className="castle-lane">
        <div className={`castle-home is-player ${playerCastleHit ? "is-hit" : ""} ${activeSynergyIds.has("nurseryEngine") ? "is-nursery-evolved" : ""}`}>
          <PipploSprite
            key={`${activePipploAnimation}-${activePipploSerial}`}
            className="pipplo-keeper"
            animation={activePipploAnimation}
            loop={activePipploAnimation === "idle" || activePipploAnimation === "cheer"}
          />
          <div className="castle-tower"><span /><span /><span /></div>
          {battle.playerBarrier > 0 && <div className="castle-barrier"><Shield />{Math.ceil(battle.playerBarrier)}</div>}
        </div>
        <div className="castle-road">
          <div className="castle-mid-flag"><i /><span /></div>
          {battle.units.map((unit, unitIndex) => {
            const productionAttackFrameMs = unit.side === "player"
              ? FRIENDLY_UNIT_ATTACK_FRAME_MS[unit.kind]
              : ENEMY_UNIT_ATTACK_FRAME_MS[unit.kind];
            const attackAnimationMs = productionAttackFrameMs ? productionAttackFrameMs * 4 : 180;
            const attacking = unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs - attackAnimationMs;
            const takingHit = battle.fxEvents.some(event =>
              (event.kind === "hit" || event.kind === "projectile")
              && Math.abs(event.position - unit.position) <= 1.5,
            );
            const affix = unit.affix ? CASTLE_ENEMY_AFFIX_DEFS[unit.affix] : null;
            const statusText = [
              affix ? affix.name : "",
              unit.shield > 0 ? `${Math.ceil(unit.shield)} shield` : "",
              unit.slowMs > 0 ? "slowed to half speed" : "",
            ].filter(Boolean).join(", ");
            return (
            <div
              key={unit.id}
              className={`castle-lane-unit side-${unit.side} ${attacking ? "is-attacking" : ""} ${takingHit ? "is-hit" : ""} ${unit.slowMs > 0 ? "is-slowed" : ""} ${unit.affix ? `affix-${unit.affix}` : ""} ${unit.side === "player" && activeSynergyIds.has("broodHeart") ? "is-brood-evolved" : ""} ${unit.side === "player" && activeSynergyIds.has("keeperInstinct") ? "is-instinct-evolved" : ""}`}
              data-kind={unit.kind}
              style={{
                "--unit-x": `${unit.position}%`,
                "--unit-y": `${(unitIndex % 3) * 5}px`,
                "--unit-accent": CASTLE_UNIT_DEFS[unit.kind].accent,
              } as CSSProperties}
              title={`${CASTLE_UNIT_DEFS[unit.kind].name}: ${Math.ceil(unit.hp)}/${unit.maxHp} HP${statusText ? ` · ${statusText}` : ""} · ${CASTLE_UNIT_DEFS[unit.kind].role}`}
            >
              {unit.shield > 0 && <span className="castle-unit-shield" aria-hidden="true"><b>{Math.ceil(unit.shield)}</b></span>}
              {affix && <span className="castle-unit-affix" style={{ "--affix-accent": affix.accent } as CSSProperties} aria-hidden="true">{affix.name.slice(0, 1)}</span>}
              <SlimeFace kind={unit.kind} side={unit.side} attacking={attacking} walking={!attacking && battle.mode === "study"} />
              <span className="castle-unit-hp"><i style={{ width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%` }} /></span>
            </div>
            );
          })}
          {battle.fxEvents.map(event => {
            const fromPosition = event.fromPosition ?? event.position;
            return (
              <span
                key={event.id}
                className={`castle-battle-fx fx-${event.kind} side-${event.side}`}
                style={{
                  "--fx-x": `${event.position}%`,
                  "--fx-left": `${Math.min(fromPosition, event.position)}%`,
                  "--fx-width": `${Math.max(1, Math.abs(event.position - fromPosition))}%`,
                } as CSSProperties}
                aria-hidden="true"
              >
                <i />
                {event.label && <b>{event.label}</b>}
              </span>
            );
          })}
        </div>
        <div className={`castle-home is-enemy ${enemyCastleHit ? "is-hit" : ""} ${battle.guardian ? "is-guardian-keep" : ""}`}>
          <div className="castle-tower"><span /><span /><span /></div>
          {battle.guardian && guardianPower && (
            <div className="castle-guardian-crest" title={guardianPower.epithet} aria-hidden="true">
              <Sparkles />
              <span>{Array.from({ length: 3 }, (_, index) => <i key={index} className={index < battle.guardianPhase ? "is-filled" : ""} />)}</span>
            </div>
          )}
          <MallowSprite key={`${activeMallowAnimation}-${activeMallowSerial}`} className={`mallow-keeper ${guardianPower ? `guardian-form-${guardianPower.id}` : ""}`} animation={activeMallowAnimation} />
        </div>
      </div>

      <div className="castle-battle-strip">
        <span className="castle-energy"><Sparkles />{formatCastleEnergy(battle.energy)} Goo</span>
        <span
          className="castle-recall-bolt"
          title="Five correct seen-card recalls grant one bonus Goo"
          role="progressbar"
          aria-label="Focus bonus charge"
          aria-valuemin={0}
          aria-valuemax={CASTLE_RECALL_BOLT_LIMIT}
          aria-valuenow={battle.recallBoltCharge}
        >
          Focus bonus
          {Array.from({ length: CASTLE_RECALL_BOLT_LIMIT }, (_, index) => <i key={index} className={index < battle.recallBoltCharge ? "is-filled" : ""} />)}
        </span>
        <span
          className="castle-rally"
          role="progressbar"
          aria-label="Enemy Rally charge"
          aria-valuemin={0}
          aria-valuemax={CASTLE_RALLY_LIMIT}
          aria-valuenow={battle.rally}
        >
          Enemy Rally
          {Array.from({ length: CASTLE_RALLY_LIMIT }, (_, index) => <i key={index} className={index < battle.rally ? "is-filled" : ""} />)}
        </span>
        <span
          className={`castle-wave ${battle.enemySpawnTimerMs <= 3_000 ? "is-imminent" : ""}`}
          title={`Next enemy wave: ${nextEnemyAffix ? `${CASTLE_ENEMY_AFFIX_DEFS[nextEnemyAffix].name} ` : ""}${CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}`}
          aria-label={`Next enemy wave in ${Math.max(0, Math.ceil(battle.enemySpawnTimerMs / 1_000))} seconds: ${nextEnemyAffix ? `${CASTLE_ENEMY_AFFIX_DEFS[nextEnemyAffix].name} ` : ""}${CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}`}
        >
          <b className="castle-wave-countdown">{Math.max(0, Math.ceil(battle.enemySpawnTimerMs / 1_000))}s</b> <SlimeFace kind={battle.nextEnemyKind} side="enemy" />
          {nextEnemyAffix && <em className={`castle-wave-affix is-${nextEnemyAffix}`}>{CASTLE_ENEMY_AFFIX_DEFS[nextEnemyAffix].name.replace("-marked", "")}</em>} {CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}
          {run.upgrades.includes("mothEars") && <> · then {afterNextEnemyAffix ? `${CASTLE_ENEMY_AFFIX_DEFS[afterNextEnemyAffix].name} ` : ""}{CASTLE_UNIT_DEFS[battle.afterNextEnemyKind].name}</>}
        </span>
      </div>
    </section>
  );
}

function CommandTray({
  run,
  onSummon,
  onPower,
  onRefresh,
}: {
  run: CastleRunState;
  onSummon: (kind: CastleUnitKind) => void;
  onPower: (id: CastlePowerId) => void;
  onRefresh: () => void;
}) {
  const powers = getAvailableCastlePowers(run.upgrades).filter(power => run.battle.commandHand.includes(power.id));
  const summons = getPlayerSummonKinds(run.upgrades).filter(kind => run.battle.commandHand.includes(kind));
  const population = getCastleArmyPopulation(run.battle);
  return (
    <div className="castle-command-tray">
      <div className="castle-command-heading">
        <span><Sparkles />Command with {formatCastleEnergy(run.battle.energy)} Goo</span>
        <div>
          <small>Hand {run.battle.commandHand.length}/4 · draw {run.battle.commandDrawPile.length} · army {population}/{CASTLE_ARMY_CAPACITY}</small>
          <button
            disabled={run.battle.commandRefreshUsedThisWindow || run.battle.summonPlayedThisWindow || run.battle.powerPlayedThisWindow || !run.battle.commandWindowReady}
            onClick={onRefresh}
            title="Replace all four command cards once before playing a card"
          ><RefreshCcw />{run.battle.commandRefreshUsedThisWindow ? "Refreshed" : "Refresh hand"}</button>
        </div>
      </div>
      <div className="castle-command-scroll" role="group" aria-label="Summons and castle powers">
        {summons.map(kind => {
          const unit = CASTLE_UNIT_DEFS[kind];
          const actionText = kind === "mendlet" ? `${run.upgrades.includes("dewSatchel") ? 6 : 4} HEAL` : `${unit.damage} ATK`;
          return (
            <button
              key={kind}
              disabled={run.battle.energy < unit.cost || run.battle.summonPlayedThisWindow || population + unit.population > CASTLE_ARMY_CAPACITY || !run.battle.commandWindowReady}
              onClick={() => onSummon(kind)}
              title={`${unit.name}: ${unit.role}. ${unit.hp} HP, ${actionText}, costs ${unit.cost} Goo.`}
              aria-label={`Summon ${unit.name}. ${unit.role}. ${unit.hp} HP, ${actionText}, costs ${unit.cost} Goo.`}
            >
              <SlimeFace kind={kind} side="player" />
              <strong>{unit.name}</strong>
              <span>{unit.role} · {unit.hp} HP · {actionText}</span>
              <b>{unit.cost}</b>
            </button>
          );
        })}
        {powers.map(power => (
          <button
            key={power.id}
            className="is-power"
              disabled={run.battle.energy < power.cost || run.battle.powerPlayedThisWindow || !run.battle.commandWindowReady}
            onClick={() => onPower(power.id)}
            title={`${power.name}: ${power.description} Costs ${power.cost} Goo.`}
            aria-label={`Use ${power.name}. ${power.description} Costs ${power.cost} Goo.`}
          >
            <Zap />
            <strong>{power.name}</strong>
            <span>{power.description}</span>
            <b>{power.cost}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function JapaneseScratchpad({ revealed }: { revealed: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context?.setTransform(scale, 0, 0, scale, 0, 0);
    if (context) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 5;
      context.strokeStyle = "#235f63";
    }
    setHasInk(false);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    drawing.current = false;
    previousPoint.current = null;
    setHasInk(false);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(sizeCanvas);
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [sizeCanvas]);

  const pointFor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    previousPoint.current = pointFor(event);
  };
  const drawStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !previousPoint.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    const point = pointFor(event);
    if (context) {
      context.beginPath();
      context.moveTo(previousPoint.current.x, previousPoint.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      setHasInk(true);
    }
    previousPoint.current = point;
  };
  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drawing.current = false;
    previousPoint.current = null;
  };

  return (
    <section className={`castle-handwriting-pad ${revealed ? "is-revealed" : ""}`} aria-label="Optional Japanese handwriting scratchpad">
      <header><span>{revealed ? "Your handwriting" : "Write before revealing"}</span><small>Optional scratchpad · you grade yourself</small><button type="button" onClick={clear} disabled={!hasInk}>Clear</button></header>
      <canvas
        ref={canvasRef}
        aria-label="Draw the Japanese answer here with a mouse, pen, or finger"
        onPointerDown={beginStroke}
        onPointerMove={drawStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      />
    </section>
  );
}

function StudyCard({
  question,
  reveal,
  combatLive,
  interrupted,
  onOption,
  onReveal,
  onSelfGrade,
  onExpose,
  onResume,
}: {
  question: StudyQuestion;
  reveal: boolean;
  combatLive: boolean;
  interrupted: boolean;
  onOption: (option: string) => void;
  onReveal: () => void;
  onSelfGrade: (correct: boolean) => void;
  onExpose: (rating: StudyExposureRating) => void;
  onResume: () => void;
}) {
  const promptRef = useRef<HTMLHeadingElement | null>(null);
  const onOptionRef = useRef(onOption);
  const onRevealRef = useRef(onReveal);
  const onSelfGradeRef = useRef(onSelfGrade);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  useEffect(() => {
    onOptionRef.current = onOption;
    onRevealRef.current = onReveal;
    onSelfGradeRef.current = onSelfGrade;
  }, [onOption, onReveal, onSelfGrade]);
  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => promptRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(focusFrame);
  }, [interrupted, question.cardId, question.direction, question.questionType, question.seenBefore, reveal]);
  useEffect(() => {
    if (!question.seenBefore || interrupted) return;
    const answerByKeyboard = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
      if (question.questionType === "multiple_choice") {
        const answerIndex = Number(event.key) - 1;
        const option = question.options[answerIndex];
        if (!option || answerIndex < 0 || answerIndex > 3) return;
        event.preventDefault();
        onOptionRef.current(option);
        return;
      }
      if (!reveal && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        onRevealRef.current();
        return;
      }
      if (reveal && (event.key === "1" || event.key === "2")) {
        event.preventDefault();
        onSelfGradeRef.current(event.key === "2");
      }
    };
    window.addEventListener("keydown", answerByKeyboard);
    return () => window.removeEventListener("keydown", answerByKeyboard);
  }, [interrupted, question.options, question.questionType, question.seenBefore, reveal]);
  const status = !question.seenBefore
    ? "Ungraded first exposure · combat safely paused"
    : interrupted
      ? "Interrupted · combat paused"
      : "Live recall · battle keeps moving";
  const directionLabel = question.direction === "term_to_definition"
    ? "Term → Meaning"
    : question.direction === "reading_to_term"
      ? "Reading → Written Japanese"
      : "Meaning → Term";
  const promptField = question.direction === "term_to_definition" ? "Term" : question.direction === "reading_to_term" ? "Reading" : "Meaning";
  const answerField = question.direction === "term_to_definition" ? "Meaning" : question.direction === "reading_to_term" ? "Written Japanese" : "Term";
  const selectedTiles = selectedTileIds
    .map(id => question.tiles.find(tile => tile.id === id))
    .filter((tile): tile is JapaneseStudyTile => Boolean(tile));
  const builtAnswer = selectedTiles.map(tile => tile.text).join("");
  const writtenLength = splitJapaneseWrittenForm(question.answer).length;
  const isJapaneseAnswer = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(question.answer);
  return (
    <section className={`castle-study-card ${combatLive ? "is-live" : ""} ${!question.seenBefore ? "is-new" : ""}`}>
      <div className="castle-study-meta">
        <span>{directionLabel}</span>
        <span>{question.masteryLabel} · {question.due ? "due now" : "bonus review"}</span>
        <span className="castle-study-pressure"><Clock3 />{status}</span>
      </div>
      <div className="castle-study-reward">
        <Sparkles />{question.seenBefore ? `Worth ${formatCastleEnergy(question.reward)} Goo` : "Reference lesson · no battle reward"}
      </div>
      {!question.seenBefore ? (
        <div className="castle-first-exposure">
          <span>New direction</span>
          <small>{promptField}</small>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <i aria-hidden="true">↓</i>
          <small>{answerField}</small>
          <strong>{question.answer}</strong>
          {question.referenceSide && (
            <aside className="castle-reference-side" aria-label={`${question.referenceSide.label}, reference only`}>
              <small>{question.referenceSide.label}</small>
              <b>{question.referenceSide.value}</b>
              <span>Reference only · not tested in this direction</span>
            </aside>
          )}
          <p>This is an ungraded lesson, not a test. Read both sides, then tell Pipplo how this card feels. Combat stays completely paused and your rating sets its starting difficulty.</p>
          <div className="castle-exposure-ratings" role="group" aria-label="Rate this new card">
            <button className="is-hard" onClick={() => onExpose("hard")}><b>Hard</b><span>I don’t know it</span></button>
            <button className="is-learning" onClick={() => onExpose("medium")}><b>Learning</b><span>A little familiar</span></button>
            <button className="is-familiar" onClick={() => onExpose("easy")}><b>Familiar</b><span>Nearly know it</span></button>
            <button className="is-known" onClick={() => onExpose("known")}><b>Already know</b><span>Skip this card</span></button>
          </div>
        </div>
      ) : interrupted ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <button className="castle-resume-card" onClick={onResume}><Play />Resume this prompt</button>
        </>
      ) : question.questionType === "tile_builder" ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <p className="castle-recall-instruction">Build the <b>written Japanese</b>. Tap kanji and kana in order; distractors may be visually similar or come from earlier cards.</p>
          <div className="castle-tile-answer" aria-label="Built written answer">
            {Array.from({ length: writtenLength }, (_, index) => {
              const tile = selectedTiles[index];
              return tile
                ? <button key={tile.id} onClick={() => setSelectedTileIds(ids => ids.filter(id => id !== tile.id))}>{tile.text}</button>
                : <i key={`blank-${index}`} aria-hidden="true" />;
            })}
          </div>
          <div className="castle-tile-bank" role="group" aria-label="Japanese answer tiles">
            {question.tiles.map(tile => (
              <button key={tile.id} disabled={selectedTileIds.includes(tile.id) || selectedTileIds.length >= writtenLength} onClick={() => setSelectedTileIds(ids => [...ids, tile.id])}>{tile.text}</button>
            ))}
          </div>
          <div className="castle-tile-actions">
            <button onClick={() => setSelectedTileIds([])} disabled={selectedTileIds.length === 0}>Clear</button>
            <button className="is-submit" onClick={() => onOption(builtAnswer)} disabled={selectedTileIds.length !== writtenLength}>Check answer</button>
          </div>
        </>
      ) : question.questionType === "multiple_choice" ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <div className="castle-answer-grid" role="group" aria-label="Answer choices">
            {question.options.map((option, index) => <button key={option} onClick={() => onOption(option)}><kbd aria-hidden="true">{index + 1}</kbd><span>{option}</span></button>)}
          </div>
        </>
      ) : (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          {isJapaneseAnswer && <JapaneseScratchpad key={`${question.cardId}:${question.direction}`} revealed={reveal} />}
          {reveal ? (
            <div className="castle-self-grade" role="status" aria-live="polite">
              <strong>{question.answer}</strong>
              <span>Compare with what you recalled from this card’s {answerField} field.</span>
              <small>The scratchpad is never recognized or scored automatically. The lane stays frozen while you grade honestly.</small>
              <div>
                <button aria-keyshortcuts="1" onClick={() => onSelfGrade(false)}><kbd aria-hidden="true">1</kbd>Not yet</button>
                <button aria-keyshortcuts="2" className="is-correct" onClick={() => onSelfGrade(true)}><kbd aria-hidden="true">2</kbd>Got it</button>
              </div>
            </div>
          ) : (
            <>
              <p className="castle-recall-instruction">Recall what is saved in this card’s <b>{answerField}</b> field. A reading only counts when it is saved there. No typing required.</p>
              <button className="castle-flip-card" aria-keyshortcuts="Space Enter" onClick={onReveal}><kbd aria-hidden="true">Space</kbd>Reveal answer</button>
            </>
          )}
        </>
      )}
    </section>
  );
}

function ReviewResult({ feedback, onContinue }: { feedback: ReviewFeedback; onContinue?: () => void }) {
  return (
    <div className={`castle-review-result ${feedback.correct ? "is-correct" : "is-wrong"}`}>
      <div>
        <b>{feedback.correct ? `+${formatCastleEnergy(feedback.reward)} Goo` : feedback.wasUnseen ? "Safe first exposure" : "Enemy Rally increased"}</b>
        <span>{feedback.correct ? "Recall recorded." : `Correct answer: ${feedback.answer}`}</span>
      </div>
      {feedback.masteryEvent && <small>{feedback.masteryEvent}</small>}
      {feedback.bonusEvent && <small>{feedback.bonusEvent}</small>}
      {feedback.requiresCorrection && <small>Read the correction before returning to the next card. Combat is still moving; recalling this direction later clears one Rally pip.</small>}
      {onContinue && <button autoFocus onClick={onContinue}>{feedback.requiresCorrection ? "I’ve got it — next card" : "Continue learning"}</button>}
    </div>
  );
}

function DeckSetup({
  decks,
  selectedDeckId,
  contractId,
  difficultyId,
  rewardCurve,
  recallMode,
  profile,
  onDeck,
  onContract,
  onDifficulty,
  onCurve,
  onRecallMode,
  onKeepsake,
  onStart,
  onExit,
}: {
  decks: StudyDeckSummary[];
  selectedDeckId: string;
  contractId: CastleContractId;
  difficultyId: CastleDifficultyId;
  rewardCurve: StudyRewardCurve;
  recallMode: StudyRecallMode;
  profile: CastleDeckProfile;
  onDeck: (id: string) => void;
  onContract: (id: CastleContractId) => void;
  onDifficulty: (id: CastleDifficultyId) => void;
  onCurve: (curve: StudyRewardCurve) => void;
  onRecallMode: (mode: StudyRecallMode) => void;
  onKeepsake: (id: CastleKeepsakeId) => void;
  onStart: () => void;
  onExit: () => void;
}) {
  const lockedKeepsakes = Object.values(CASTLE_KEEPSAKE_DEFS).filter(keepsake => !profile.unlockedKeepsakeIds.includes(keepsake.id));
  const nextGuardianKeepsake = lockedKeepsakes
    .filter(keepsake => keepsake.guardianRequirement)
    .sort((a, b) => a.guardianRequirement! - b.guardianRequirement!)[0];
  const nextRunKeepsake = lockedKeepsakes
    .filter(keepsake => keepsake.runRequirement)
    .sort((a, b) => a.runRequirement! - b.runRequirement!)[0];
  const selectedDeck = decks.find(deck => deck.id === selectedDeckId);
  const canStart = Boolean(selectedDeck && selectedDeck.activeCount > 0);
  return (
    <main className="castle-setup-shell">
      <button className="castle-setup-exit" onClick={onExit}><ArrowLeft />Main menu</button>
      <section className="castle-setup-card">
        <PipploSprite className="castle-setup-pipplo" />
        <p className="castle-eyebrow">Castle expedition</p>
        <h1>Pipplo's Goo Keep</h1>
        <p>Recall words, hatch a wobbling army, and push across the lane before the rival keep overwhelms yours.</p>

        <div className="castle-setup-loop" aria-label="How a run works">
          <div><BookOpen /><span><b>1. Study</b>New directions teach first and pause safely.</span></div>
          <div><Swords /><span><b>2. Command</b>Choose from four cards, then spend Goo on one summon and one power.</span></div>
          <div><Castle /><span><b>3. Conquer</b>Break keeps and evolve your run build.</span></div>
        </div>

        <section className="castle-profile-summary" aria-label="Keeper chronicle">
          <header><Castle /><div><span>Keeper chronicle</span><b>This deck-world remembers every expedition</b></div></header>
          <div className="castle-profile-metrics">
            <span><b>{profile.runsCompleted}</b><small>runs completed</small></span>
            <span><b>{profile.guardianClears}</b><small>guardians cleared</small></span>
            <span><b>{profile.totalReviews}</b><small>reviews recorded</small></span>
            <span><b>{profile.bestRegion}</b><small>deepest region</small></span>
          </div>
          {nextGuardianKeepsake && (
            <p><Shield /><span><b>Guardian trail: {nextGuardianKeepsake.name}</b>Clear {Math.max(0, nextGuardianKeepsake.guardianRequirement! - profile.guardianClears)} more guardian{nextGuardianKeepsake.guardianRequirement! - profile.guardianClears === 1 ? "" : "s"} · {profile.guardianClears}/{nextGuardianKeepsake.guardianRequirement}</span></p>
          )}
          {nextRunKeepsake && (
            <p><Route /><span><b>Expedition trail: {nextRunKeepsake.name}</b>Complete {Math.max(0, nextRunKeepsake.runRequirement! - profile.runsCompleted)} more expedition{nextRunKeepsake.runRequirement! - profile.runsCompleted === 1 ? "" : "s"} · {profile.runsCompleted}/{nextRunKeepsake.runRequirement}</span></p>
          )}
          {!nextGuardianKeepsake && !nextRunKeepsake && <p><Sparkles /><span><b>All keepsakes discovered</b>Mallow has no more trinkets to hide.</span></p>}
        </section>

        <h2 className="castle-setup-label" id="castle-deck-label">Study world</h2>
        <div className="castle-deck-grid" role="group" aria-labelledby="castle-deck-label">
          {decks.map(deck => (
            <button key={deck.id} aria-pressed={selectedDeckId === deck.id} className={selectedDeckId === deck.id ? "is-selected" : ""} onClick={() => onDeck(deck.id)}>
              <BookOpen />
              <strong>{deck.name}</strong>
              <span>{deck.introducedCount} introduced · {deck.activeCount} available · {deck.reviewCount} reviews</span>
            </button>
          ))}
        </div>

        <h2 className="castle-setup-label" id="castle-contract-label">Expedition contract</h2>
        <div className="castle-contract-grid" role="group" aria-labelledby="castle-contract-label">
          {(Object.keys(CASTLE_CONTRACTS) as CastleContractId[]).map(id => {
            const contract = CASTLE_CONTRACTS[id];
            return (
              <button key={id} aria-pressed={contractId === id} className={contractId === id ? "is-selected" : ""} onClick={() => onContract(id)}>
                <strong>{contract.name}</strong>
                <span>{contract.regions} region{contract.regions === 1 ? "" : "s"} · about {contract.minutes} min</span>
                <small>Up to {contract.newCards} new cards, introduced gradually</small>
              </button>
            );
          })}
        </div>

        <h2 className="castle-setup-label" id="castle-difficulty-label">Battle pressure <small>Study grading never changes</small></h2>
        <div className="castle-difficulty-grid" role="group" aria-labelledby="castle-difficulty-label">
          {(Object.keys(CASTLE_DIFFICULTIES) as CastleDifficultyId[]).map(id => {
            const difficulty = CASTLE_DIFFICULTIES[id];
            return (
              <button key={id} aria-pressed={difficultyId === id} className={difficultyId === id ? "is-selected" : ""} onClick={() => onDifficulty(id)}>
                <strong>{difficulty.name}</strong>
                <span>{difficulty.description}</span>
                <small>{id === "study" ? "−15% enemy health · slower pressure" : id === "siege" ? "+1 enemy damage · faster pressure" : "Intended combat balance"}</small>
              </button>
            );
          })}
        </div>

        <h2 className="castle-setup-label" id="castle-keepsake-label">Keeper keepsake <small>Choose one persistent starting rule</small></h2>
        <div className="castle-keepsake-grid" role="group" aria-labelledby="castle-keepsake-label">
          {Object.values(CASTLE_KEEPSAKE_DEFS).map(keepsake => {
            const unlocked = profile.unlockedKeepsakeIds.includes(keepsake.id);
            const selected = profile.selectedKeepsakeId === keepsake.id;
            return (
              <button
                key={keepsake.id}
                className={selected ? "is-selected" : ""}
                disabled={!unlocked}
                onClick={() => onKeepsake(keepsake.id)}
                style={{ "--keepsake-accent": keepsake.accent } as CSSProperties}
                aria-pressed={selected}
              >
                <Sparkles />
                <strong>{keepsake.name}</strong>
                <span>{keepsake.description}</span>
                <small>{unlocked ? selected ? "Equipped for the next run" : "Unlocked" : keepsake.unlockHint}</small>
              </button>
            );
          })}
        </div>

        <div className="castle-setup-bottom">
          <label>
            Balance curve
            <select value={rewardCurve} onChange={event => onCurve(event.target.value as StudyRewardCurve)}>
              {(Object.keys(REWARD_CURVE_LABELS) as StudyRewardCurve[]).map(curve => <option key={curve} value={curve}>{REWARD_CURVE_LABELS[curve]}</option>)}
            </select>
            <small>{REWARD_CURVE_HELP[rewardCurve]}</small>
          </label>
          <label>
            Recall style
            <select value={recallMode} onChange={event => onRecallMode(event.target.value as StudyRecallMode)}>
              {(Object.keys(RECALL_MODE_LABELS) as StudyRecallMode[]).map(mode => <option key={mode} value={mode}>{RECALL_MODE_LABELS[mode]}</option>)}
            </select>
            <small>{RECALL_MODE_HELP[recallMode]}</small>
          </label>
          <div><Sparkles /><b>{profile.unlockedKeepsakeIds.length}/{Object.keys(CASTLE_KEEPSAKE_DEFS).length}</b><span>keepsakes / {profile.unlockedUpgradeIds.length} discoveries</span></div>
        </div>
        {!canStart && <div className="castle-setup-warning" role="alert"><BookOpen /><span><b>This study world has no active cards.</b>Add a card or change at least one “known” rating before beginning a run.</span></div>}
        <button className="castle-start-run" disabled={!canStart} onClick={onStart}><Castle />Begin castle run<ChevronRight /></button>
      </section>
    </main>
  );
}

const ROUTE_INFO: Record<CastleRouteChoice, { name: string; description: string; icon: typeof Swords }> = {
  battle: { name: "Straight Road", description: "Start with a scouting Piplet and +0.5 Goo.", icon: Swords },
  rest: { name: "Soft Nest", description: "Repair 28 keep HP; Moss Coat also banks 2 Goo.", icon: Heart },
  workshop: { name: "Goo Workshop", description: "Start with +1.5 Goo and 8 barrier.", icon: FlaskConical },
  event: { name: "Wobbling Detour", description: "Reveal a three-choice story event with exact consequences.", icon: Sparkles },
};

const CASTLE_EVENT_ICONS: Record<CastleEventId, typeof Sparkles> = {
  starwell: Sparkles,
  hatchling: Heart,
  wobbleMarket: FlaskConical,
  rootOracle: Route,
};

const CASTLE_UNIT_GUIDE: Partial<Record<CastleUnitKind, string>> = {
  dartlet: "Cheap and very fast. Best for quick pressure, but fragile in a long fight.",
  bubbleBud: "Periodically gives a nearby ally 3 shield, up to 18. It supports instead of attacking when an ally is close.",
  mendlet: "Heals the most wounded nearby ally for 4 HP every 1.4 seconds. It never occupies an attack slot.",
  spitlet: "Attacks from long range and deals 3 bonus damage when cracking a shield.",
  bigChonk: "A slow, durable siege unit. Bank Goo for one when the lane needs a lasting frontline.",
  shellSlime: "Arrives with 6 shield and stalls light attackers.",
  nibbleImp: "A fragile but dangerous sprinter that punishes an undefended lane.",
  sporeBud: "Lobs ranged spores that slow the friendly unit it hits.",
  boomcap: "Bursts for 3 damage against every friendly unit within 8 lane spaces when defeated. Shields absorb the blast.",
  echoMoth: "Attacks from range and siphons 0.15 Goo whenever it reaches Pipplo’s keep.",
  rootLump: "A guardian siege beast with armor, heavy attacks, and enough health to anchor an enemy wave.",
};

const ENEMY_GUIDE_KINDS: CastleUnitKind[] = ["shellSlime", "nibbleImp", "sporeBud", "boomcap", "echoMoth", "rootLump"];

const CASTLE_TUTORIAL_STEPS = [
  {
    icon: BookOpen,
    eyebrow: "Study safety",
    title: "New directions are lessons first",
    copy: "The first time either direction appears, the lane freezes completely and both sides are shown together. It is not graded.",
  },
  {
    icon: Clock3,
    eyebrow: "Live recall",
    title: "The battle moves while you remember",
    copy: "Seen cards never stop the lane. Correct recalls earn Goo and refresh your command allowance, while harder cards still pay much more.",
  },
  {
    icon: Swords,
    eyebrow: "Army command",
    title: "Build from a rotating hand",
    copy: `Choose from four command cards. Before playing one, you may refresh the whole hand once. You may play one summon and one keep power per answer, and your army has ${CASTLE_ARMY_CAPACITY} spaces.`,
  },
  {
    icon: Castle,
    eyebrow: "Run strategy",
    title: "Break keeps and build a run",
    copy: "Every five correct recalls grants bonus Goo. After each keep, choose a mutation and one of three drafted routes; story events reveal every consequence before you commit.",
  },
] as const;

function CastleTutorial({
  step,
  dialogRef,
  onStep,
  onComplete,
}: {
  step: number;
  dialogRef: RefObject<HTMLElement | null>;
  onStep: (step: number) => void;
  onComplete: () => void;
}) {
  const current = CASTLE_TUTORIAL_STEPS[step] || CASTLE_TUTORIAL_STEPS[0];
  const Icon = current.icon;
  const finalStep = step === CASTLE_TUTORIAL_STEPS.length - 1;
  return (
    <aside className="castle-overlay castle-tutorial-overlay">
      <section ref={dialogRef} tabIndex={-1} className="castle-tutorial-sheet" role="dialog" aria-modal="true" aria-labelledby="castle-tutorial-title">
        <div className="castle-tutorial-art"><Icon /><PipploSprite className="castle-tutorial-pipplo" /></div>
        <p className="castle-eyebrow">{current.eyebrow}</p>
        <h2 id="castle-tutorial-title">{current.title}</h2>
        <p>{current.copy}</p>
        <div className="castle-tutorial-dots" aria-label={`Tutorial step ${step + 1} of ${CASTLE_TUTORIAL_STEPS.length}`}>
          {CASTLE_TUTORIAL_STEPS.map((item, index) => <i key={item.title} aria-hidden="true" className={index === step ? "is-active" : ""} />)}
        </div>
        <div className="castle-tutorial-actions">
          <button className="is-quiet" onClick={onComplete}>Skip</button>
          <button onClick={() => finalStep ? onComplete() : onStep(step + 1)}>{finalStep ? "Start the run" : "Next"}<ChevronRight /></button>
        </div>
      </section>
    </aside>
  );
}

export default function CastleBattleLab({ onExit }: CastleBattleLabProps) {
  const [initial] = useState(() => {
    const deckId = getSelectedStudyDeckId();
    const restored = loadCastleRun(deckId);
    return {
      deckId,
      run: restored ? pauseCastleBattle(restored, "Saved run restored. Resume when ready.") : null,
      profile: loadCastleProfile(deckId),
    };
  });
  const [selectedDeckId, setSelectedDeckId] = useState(initial.deckId);
  const [decks, setDecks] = useState<StudyDeckSummary[]>(getStudyDecks);
  const [profile, setProfile] = useState(initial.profile);
  const [run, setRun] = useState<CastleRunState | null>(initial.run);
  const [contractId, setContractId] = useState<CastleContractId>("regular");
  const [difficultyId, setDifficultyId] = useState<CastleDifficultyId>(initial.run?.difficultyId || "standard");
  const [rewardCurve, setRewardCurve] = useState<StudyRewardCurve>(initial.run?.rewardCurve || "quadratic");
  const [recallMode, setRecallMode] = useState<StudyRecallMode>(initial.run?.recallMode || "balanced");
  const [question, setQuestion] = useState<StudyQuestion | null>(null);
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
  const [reveal, setReveal] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [panelMode, setPanelMode] = useState<CastlePanelMode>("study");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [abandonConfirmOpen, setAbandonConfirmOpen] = useState(false);
  const [studyBlocked, setStudyBlocked] = useState(false);
  const [pipploAnimation, setPipploAnimation] = useState<PipploAnimationState>({ name: "idle", serial: 0 });
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(CASTLE_SOUND_KEY) !== "off");
  const questionStartedAt = useRef(0);
  const questionCommandMs = useRef(0);
  const questionCommandStartedAt = useRef<number | null>(null);
  const questionRevealedAt = useRef<number | null>(null);
  const questionResponseAtRevealMs = useRef<number | null>(null);
  const lastSaveAt = useRef(0);
  const latestRun = useRef<CastleRunState | null>(initial.run);
  const previousPhase = useRef<CastleRunState["phase"] | null>(initial.run?.phase || null);
  const pipploAnimationTimer = useRef<number | null>(null);
  const activeDialogRef = useRef<HTMLElement | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);

  const selectedDeck = useMemo(() => decks.find(deck => deck.id === selectedDeckId), [decks, selectedDeckId]);
  const discoveredEnemyKinds = useMemo(() => new Set([
    ...profile.discoveredEnemyKinds,
    ...(run?.battle.encounteredEnemyKinds || []),
  ]), [profile.discoveredEnemyKinds, run?.battle.encounteredEnemyKinds]);
  const activeDialogKey = tutorialOpen
    ? "tutorial"
    : run?.phase === "battle" && run.battle.guardianBriefingPending
      ? "guardian-briefing"
    : guideOpen
      ? "guide"
      : helpOpen
        ? "help"
        : settingsOpen
          ? "settings"
          : run && ["reward", "route", "event", "retire", "complete", "lost"].includes(run.phase)
            ? run.phase
            : null;
  const simulationReady = Boolean(
    run
    && !interrupted
    && run.phase === "battle"
    && run.battle.mode === "study",
  );
  const runActive = Boolean(run);

  useEffect(() => {
    latestRun.current = run;
  }, [run]);

  useEffect(() => {
    const preloadedImages = [
      ...PIPPLO_ANIMATION_FRAMES.idle,
      ...MALLOW_ANIMATION_FRAMES.idle,
      ...Object.values(FRIENDLY_UNIT_ART),
      ...Object.values(ENEMY_UNIT_ART),
    ].map(src => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      return image;
    });
    return () => preloadedImages.forEach(image => { image.src = ""; });
  }, []);

  useEffect(() => {
    if (!runActive) return;
    const preloadedImages: HTMLImageElement[] = [];
    const preloadTimer = window.setTimeout(() => {
      [
      ...Object.entries(PIPPLO_ANIMATION_FRAMES).filter(([name]) => name !== "idle").flatMap(([, frames]) => frames),
      ...Object.entries(MALLOW_ANIMATION_FRAMES).filter(([name]) => name !== "idle").flatMap(([, frames]) => frames),
      ...Object.values(FRIENDLY_UNIT_ATTACK_FRAMES).flat(),
      ...Object.values(ENEMY_UNIT_ATTACK_FRAMES).flat(),
      ...Object.values(FRIENDLY_UNIT_WALK_FRAMES).flat(),
      ...Object.values(ENEMY_UNIT_WALK_FRAMES).flat(),
      ].forEach(src => {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        preloadedImages.push(image);
      });
    }, 250);
    return () => {
      window.clearTimeout(preloadTimer);
      preloadedImages.forEach(image => { image.src = ""; });
    };
  }, [runActive]);

  useEffect(() => {
    if (!run) return;
    const now = Date.now();
    const important = run.phase !== "battle" || run.battle.mode === "command";
    if (!important && now - lastSaveAt.current < 1_000) return;
    lastSaveAt.current = now;
    const savedProfile = saveCastleRun(selectedDeckId, run);
    const syncProfile = window.setTimeout(() => setProfile(savedProfile), 0);
    return () => window.clearTimeout(syncProfile);
  }, [run, selectedDeckId]);

  useEffect(() => {
    const saveBeforePageLeaves = () => {
      const current = latestRun.current;
      if (current) saveCastleRun(selectedDeckId, pauseCastleBattle(current, "Run saved safely before leaving Goo Keep."));
    };
    window.addEventListener("pagehide", saveBeforePageLeaves);
    return () => window.removeEventListener("pagehide", saveBeforePageLeaves);
  }, [selectedDeckId]);

  useEffect(() => {
    if (!simulationReady) return;
    const timer = window.setInterval(() => {
      setRun(current => current ? tickCastleRun(current, 100, 1) : current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [simulationReady]);

  useEffect(() => {
    if (!feedback || feedback.wasUnseen || feedback.requiresCorrection) return;
    const timer = window.setTimeout(() => setFeedback(null), 2_800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => () => {
    if (pipploAnimationTimer.current !== null) window.clearTimeout(pipploAnimationTimer.current);
  }, []);

  useEffect(() => {
    localStorage.setItem(CASTLE_SOUND_KEY, soundEnabled ? "on" : "off");
  }, [soundEnabled]);

  useEffect(() => {
    if (!run) return;
    const before = previousPhase.current;
    previousPhase.current = run.phase;
    if (before === run.phase) return;
    if (run.phase === "reward" || run.phase === "complete") playCastleSound("victory", soundEnabled);
    if (run.phase === "lost") playCastleSound("defeat", soundEnabled);
  }, [run, soundEnabled]);

  useEffect(() => {
    if (!helpOpen && !settingsOpen && !guideOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHelpOpen(false);
      setSettingsOpen(false);
      setAbandonConfirmOpen(false);
      setGuideOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [helpOpen, settingsOpen, guideOpen]);

  useEffect(() => {
    if (!activeDialogKey) {
      const returnTarget = dialogReturnFocus.current;
      dialogReturnFocus.current = null;
      if (returnTarget?.isConnected) returnTarget.focus();
      return;
    }

    const dialog = activeDialogRef.current;
    if (!dialog) return;
    if (!dialogReturnFocus.current) {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && !dialog.contains(focused)) dialogReturnFocus.current = focused;
    }

    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>([
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(","))).filter(element => element.offsetParent !== null);
    const focusFrame = window.requestAnimationFrame(() => (getFocusable()[0] || dialog).focus());
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || !dialog.contains(focused))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (focused === last || !dialog.contains(focused))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", trapFocus);
    };
  }, [activeDialogKey]);

  const pauseForInterruption = useCallback(() => {
    if (!question) return;
    setInterrupted(true);
    setRun(current => current ? pauseCastleBattle(current, "Combat paused after an interruption.") : current);
  }, [question]);

  const triggerPipploAnimation = useCallback((name: Exclude<PipploAnimationName, "idle">) => {
    if (pipploAnimationTimer.current !== null) window.clearTimeout(pipploAnimationTimer.current);
    setPipploAnimation(current => ({ name, serial: current.serial + 1 }));
    pipploAnimationTimer.current = window.setTimeout(() => {
      setPipploAnimation(current => ({ name: "idle", serial: current.serial + 1 }));
      pipploAnimationTimer.current = null;
    }, 650);
  }, []);

  const startQuestionTimer = useCallback(() => {
    questionStartedAt.current = Date.now();
    questionCommandMs.current = 0;
    questionCommandStartedAt.current = null;
    questionRevealedAt.current = null;
    questionResponseAtRevealMs.current = null;
  }, []);

  const getQuestionResponseMs = useCallback(() => {
    const now = Date.now();
    return getActiveStudyResponseMs(
      questionStartedAt.current,
      now,
      questionCommandMs.current,
      questionCommandStartedAt.current,
    );
  }, []);

  const changePanelMode = useCallback((nextMode: CastlePanelMode) => {
    if (nextMode === panelMode) return;
    const now = Date.now();
    if (nextMode === "army" && question) questionCommandStartedAt.current = now;
    if (nextMode === "study" && questionCommandStartedAt.current !== null) {
      questionCommandMs.current += now - questionCommandStartedAt.current;
      questionCommandStartedAt.current = null;
    }
    setPanelMode(nextMode);
  }, [panelMode, question]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pauseForInterruption();
    };
    window.addEventListener("blur", pauseForInterruption);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", pauseForInterruption);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pauseForInterruption]);

  useEffect(() => {
    if (activeDialogKey || !question || interrupted) return;
    const pauseOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      pauseForInterruption();
    };
    window.addEventListener("keydown", pauseOnEscape);
    return () => window.removeEventListener("keydown", pauseOnEscape);
  }, [activeDialogKey, interrupted, pauseForInterruption, question]);

  const chooseDeck = (deckId: string) => {
    selectStudyDeck(deckId);
    setSelectedDeckId(deckId);
    setProfile(loadCastleProfile(deckId));
    const restored = loadCastleRun(deckId);
    setRun(restored ? pauseCastleBattle(restored, "Saved run restored. Resume when ready.") : null);
    setStudyBlocked(false);
    setDifficultyId(restored?.difficultyId || "standard");
    setRewardCurve(restored?.rewardCurve || "quadratic");
    setRecallMode(restored?.recallMode || "balanced");
    setDecks(getStudyDecks());
  };

  const introduceForBattle = (baseRun: CastleRunState): CastleRunState => {
    const contract = CASTLE_CONTRACTS[baseRun.contractId];
    const remaining = Math.max(0, contract.newCards - baseRun.introducedThisRun);
    if (remaining === 0) return baseRun;
    const perBattle = Math.max(1, Math.ceil(contract.newCards / Math.max(1, contract.regions * 3)));
    const introduced = introduceStudyCards(selectedDeckId, Math.min(remaining, perBattle));
    return recordCastleIntroductions(baseRun, introduced.length);
  };

  const startRun = () => {
    if (!selectedDeck || selectedDeck.activeCount <= 0) return;
    selectStudyDeck(selectedDeckId);
    const next = introduceForBattle(createInitialCastleRun(
      selectedDeckId,
      contractId,
      rewardCurve,
      profile.unlockedUpgradeIds,
      undefined,
      recallMode,
      profile.selectedKeepsakeId,
      difficultyId,
    ));
    const nextQuestion = tryDrawStudyQuestion(selectedDeckId, next.rewardCurve, undefined, next.recallMode);
    if (!nextQuestion) {
      clearCastleRun(selectedDeckId);
      setRun(null);
      setQuestion(null);
      setStudyBlocked(false);
      setDecks(getStudyDecks());
      return;
    }
    clearCastleRun(selectedDeckId);
    setQuestion(nextQuestion);
    setFeedback(null);
    setStudyBlocked(false);
    setReveal(false);
    const showTutorial = !profile.tutorialComplete;
    setTutorialOpen(showTutorial);
    setTutorialStep(0);
    setInterrupted(showTutorial);
    setPanelMode("study");
    startQuestionTimer();
    setRun(showTutorial
      ? pauseCastleBattle(next, "Welcome to Goo Keep. Combat is paused during the tutorial.")
      : nextQuestion.seenBefore
        ? resumeCastleBattle(next)
        : pauseCastleBattle(next, "First exposure protected: combat remains paused while you learn this direction."));
    setDecks(getStudyDecks());
  };

  const beginQuestion = (baseRun = run, previousKeyOverride?: string | null) => {
    if (!baseRun || baseRun.phase !== "battle") return;
    const previousKey = previousKeyOverride === null
      ? undefined
      : previousKeyOverride ?? (question ? getStudyQuestionKey(question) : undefined);
    const nextQuestion = tryDrawStudyQuestion(selectedDeckId, baseRun.rewardCurve, previousKey, baseRun.recallMode);
    if (!nextQuestion) {
      setQuestion(null);
      setFeedback(null);
      setReveal(false);
      setInterrupted(false);
      setStudyBlocked(true);
      setPanelMode("study");
      setRun(pauseCastleBattle(baseRun, "No active cards remain. Your reviews are safe; return to setup to choose a study world."));
      setDecks(getStudyDecks());
      return;
    }
    setQuestion(nextQuestion);
    setFeedback(null);
    setStudyBlocked(false);
    setReveal(false);
    setInterrupted(false);
    setPanelMode("study");
    startQuestionTimer();
    setRun(nextQuestion.seenBefore
      ? resumeCastleBattle(baseRun)
      : pauseCastleBattle(baseRun, "First exposure protected: combat remains paused while you learn this direction."));
  };

  const beginGuardianBattle = () => {
    if (!run || run.phase !== "battle" || !run.battle.guardianBriefingPending) return;
    const prepared = acknowledgeCastleGuardianBriefing(run);
    setInterrupted(false);
    setPanelMode("study");
    if (!question) {
      beginQuestion(prepared, null);
      return;
    }
    startQuestionTimer();
    setRun(question.seenBefore
      ? resumeCastleBattle(prepared)
      : pauseCastleBattle(prepared, "First exposure protected: combat remains paused while you learn this direction."));
  };

  const resumeInterruptedQuestion = () => {
    if (!question) return;
    setInterrupted(false);
    startQuestionTimer();
    setRun(current => current
      ? question.seenBefore
        ? resumeCastleBattle(current)
        : pauseCastleBattle(current, "First exposure protected: combat remains paused.")
      : current);
  };

  const finishReview = (correct: boolean) => {
    if (!question || !run || feedback?.wasUnseen || feedback?.requiresCorrection) return;
    const firesRecallBolt = correct && question.seenBefore && run.battle.recallBoltCharge === CASTLE_RECALL_BOLT_LIMIT - 1;
    playCastleSound(firesRecallBolt ? "bolt" : correct ? "correct" : "wrong", soundEnabled);
    if (correct && question.seenBefore) triggerPipploAnimation("cast");
    let result: StudyAnswerResult;
    try {
      result = answerStudyQuestion(selectedDeckId, question, correct);
    } catch (error) {
      if (!isStudyQuestionUnavailableError(error)) throw error;
      beginQuestion(
        pauseCastleBattle(run, "That prompt was already completed or changed, so it was safely skipped."),
        getStudyQuestionKey(question),
      );
      setDecks(getStudyDecks());
      return;
    }
    const responseMs = question.questionType === "self_grade" && questionResponseAtRevealMs.current !== null
      ? questionResponseAtRevealMs.current
      : getQuestionResponseMs();
    const outcome = {
      isCorrect: correct,
      wasUnseen: result.wasUnseen,
      reward: correct ? question.reward : 0,
      progressKey: result.progressKey,
      responseMs,
      selfGraded: question.questionType === "self_grade",
      questionType: question.questionType,
      due: question.due,
    };
    const previewRun = result.wasUnseen ? run : applyCastleStudyOutcome(run, outcome);
    const displayedReward = correct
      ? Math.round((previewRun.battle.telemetry.energyEarned - run.battle.telemetry.energyEarned) * 100) / 100
      : 0;
    const bonusReward = correct ? Math.round(Math.max(0, displayedReward - question.reward) * 100) / 100 : 0;
    const nextFeedback: ReviewFeedback = {
      correct,
      answer: result.answer,
      reward: displayedReward,
      wasUnseen: result.wasUnseen,
      masteryEvent: result.masteryEvent,
      bonusEvent: bonusReward > 0
        ? `${firesRecallBolt ? "Focus" : "Run"} bonus added +${formatCastleEnergy(bonusReward)} Goo.`
        : undefined,
    };
    if (result.wasUnseen) {
      setRun(current => current ? pauseCastleBattle(
        applyCastleStudyOutcome(current, outcome),
        "First exposure complete. Review the answer before continuing.",
      ) : current);
      setFeedback(nextFeedback);
    } else {
      const previousKey = getStudyQuestionKey(question);
      const nextQuestion = tryDrawStudyQuestion(selectedDeckId, run.rewardCurve, previousKey, run.recallMode);
      setFeedback(nextFeedback);
      setQuestion(nextQuestion);
      setReveal(false);
      setInterrupted(false);
      setPanelMode("study");
      setStudyBlocked(!nextQuestion);
      if (nextQuestion) startQuestionTimer();
      setRun(current => {
        if (!current) return current;
        const resolved = applyCastleStudyOutcome(current, outcome);
        if (!nextQuestion) {
          return pauseCastleBattle(resolved, "No active cards remain. Your reviews are safe; return to setup to choose a study world.");
        }
        return nextQuestion.seenBefore
          ? resumeCastleBattle(resolved)
          : pauseCastleBattle(resolved, "First exposure protected: combat remains paused while you learn this direction.");
      });
    }
    setDecks(getStudyDecks());
  };

  const finishExposure = (rating: StudyExposureRating) => {
    if (!question || !run || question.seenBefore) return;
    playCastleSound("correct", soundEnabled);
    let result: StudyAnswerResult;
    try {
      result = completeStudyExposure(selectedDeckId, question, rating);
    } catch (error) {
      if (!isStudyQuestionUnavailableError(error)) throw error;
      beginQuestion(
        pauseCastleBattle(run, "That lesson was already completed or changed, so it was safely skipped."),
        getStudyQuestionKey(question),
      );
      setDecks(getStudyDecks());
      return;
    }
    const previousKey = getStudyQuestionKey(question);
    const outcome = {
      isCorrect: true,
      isExposure: true,
      wasUnseen: true,
      reward: 0,
      progressKey: result.progressKey,
      responseMs: getQuestionResponseMs(),
      selfGraded: false,
      questionType: question.questionType,
      due: true,
    };
    const nextQuestion = tryDrawStudyQuestion(selectedDeckId, run.rewardCurve, previousKey, run.recallMode);
    setQuestion(nextQuestion);
    setFeedback(null);
    setReveal(false);
    setInterrupted(false);
    setPanelMode("study");
    setStudyBlocked(!nextQuestion);
    if (nextQuestion) startQuestionTimer();
    setRun(current => {
      if (!current) return current;
      const resolved = applyCastleStudyOutcome(current, outcome);
      if (!nextQuestion) return pauseCastleBattle(resolved, "No active cards remain. Your reviews are safe; return to setup to choose a study world.");
      return nextQuestion.seenBefore
        ? resumeCastleBattle(resolved)
        : pauseCastleBattle(resolved, "New direction: combat remains paused while you learn both sides.");
    });
    setDecks(getStudyDecks());
  };

  const revealAnswer = () => {
    if (questionRevealedAt.current === null) {
      questionRevealedAt.current = Date.now();
      questionResponseAtRevealMs.current = getQuestionResponseMs();
    }
    setReveal(true);
  };

  const resetRun = () => {
    clearCastleRun(selectedDeckId);
    setRun(null);
    setQuestion(null);
    setFeedback(null);
    setStudyBlocked(false);
    setPanelMode("study");
    setProfile(loadCastleProfile(selectedDeckId));
  };

  const abandonRun = () => {
    setSettingsOpen(false);
    setAbandonConfirmOpen(false);
    resetRun();
  };

  const finishTutorial = () => {
    setProfile(completeCastleTutorial(selectedDeckId));
    setTutorialOpen(false);
    setInterrupted(false);
    startQuestionTimer();
    setRun(current => current
      ? question?.seenBefore
        ? resumeCastleBattle(current)
        : pauseCastleBattle(current, "New direction: combat remains paused while you learn both sides.")
      : current);
  };

  const summonUnit = (kind: CastleUnitKind) => {
    if (!run || run.phase !== "battle" || run.battle.energy < CASTLE_UNIT_DEFS[kind].cost) return;
    playCastleSound("summon", soundEnabled);
    setRun(current => current ? summonCastleUnit(current, kind) : current);
  };

  const usePower = (id: CastlePowerId) => {
    const power = CASTLE_POWER_DEFS[id];
    if (!run || run.phase !== "battle" || run.battle.energy < power.cost) return;
    playCastleSound("power", soundEnabled);
    triggerPipploAnimation("cast");
    setRun(current => current ? activateCastlePower(current, id) : current);
  };

  const refreshCommandHand = () => {
    if (!run || run.phase !== "battle") return;
    playCastleSound("summon", soundEnabled);
    setRun(current => current ? refreshCastleCommandHand(current) : current);
  };

  const downloadBalance = () => {
    const blob = new Blob([exportCastleBalanceData(selectedDeckId)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `goo-keep-balance-${selectedDeckId}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const exitToMenu = () => {
    const current = latestRun.current;
    if (current) saveCastleRun(selectedDeckId, pauseCastleBattle(current, "Run saved safely. Resume whenever you are ready."));
    onExit();
  };

  if (!run) {
    return (
      <DeckSetup
        decks={decks}
        selectedDeckId={selectedDeckId}
        contractId={contractId}
        difficultyId={difficultyId}
        rewardCurve={rewardCurve}
        recallMode={recallMode}
        profile={profile}
        onDeck={chooseDeck}
        onContract={setContractId}
        onDifficulty={setDifficultyId}
        onCurve={setRewardCurve}
        onRecallMode={setRecallMode}
        onKeepsake={id => setProfile(selectCastleKeepsake(selectedDeckId, id))}
        onStart={startRun}
        onExit={onExit}
      />
    );
  }

  const activeEvent = run.pendingEventId ? CASTLE_EVENT_DEFS[run.pendingEventId] : null;
  const guardianPower = run.battle.guardianPowerId ? CASTLE_GUARDIAN_POWER_DEFS[run.battle.guardianPowerId] : null;
  const guardianRegion = getCastleRegionDef(run.region);
  const guardianThreat = getCastleEndlessThreat(run.region);
  const studyReport = getCastleStudyReport(run);
  const battleLesson = getCastleBattleLesson(run);
  const synergyProgress = getCastleSynergyProgress(run.upgrades);
  const activeSynergies = getActiveCastleSynergies(run.upgrades);
  const latestUpgrade = run.upgrades.length > 0 ? CASTLE_UPGRADE_DEFS[run.upgrades[run.upgrades.length - 1]] : null;
  const newlyEvolvedSynergy = run.phase === "route" && latestUpgrade
    ? activeSynergies.find(synergy => synergy.category === latestUpgrade.category && synergyProgress[synergy.category] === synergy.threshold)
    : null;
  const studyFocus = studyReport.focusDirections.flatMap(item => {
    const label = getStudyDirectionLabel(selectedDeckId, item.key);
    return label ? [{ ...item, ...label }] : [];
  });
  const newPermanentDiscoveries = profile.unlockedUpgradeIds
    .filter(id => !run.draftPoolIds.includes(id))
    .map(id => CASTLE_UPGRADE_DEFS[id]);
  const newKeepsakeDiscoveries = getNewCastleKeepsakeIds(profile, run).map(id => CASTLE_KEEPSAKE_DEFS[id]);
  const permanentDiscoveryNames = [
    ...newPermanentDiscoveries.map(discovery => discovery.name),
    ...newKeepsakeDiscoveries.map(keepsake => `${keepsake.name} keepsake`),
  ];

  return (
    <main className="castle-lab-shell">
      <header className="castle-lab-header">
        <button onClick={exitToMenu} aria-label="Save run and return to main menu" title="Save & main menu"><ArrowLeft /></button>
        <div>
          <span>{selectedDeck?.name || "Study world"}</span>
          <b>Pipplo's Goo Keep</b>
        </div>
        <span className="castle-header-stats"><BookOpen />{run.reviews} <Swords />{run.battlesWon} <span title={`${activeSynergies.length} active build evolutions`}><Sparkles />{activeSynergies.length}</span></span>
        <button disabled={!question || interrupted} onClick={pauseForInterruption} aria-label="Pause current prompt" title="Pause current prompt (Esc)"><Pause /></button>
        <button onClick={() => { pauseForInterruption(); setHelpOpen(true); }} aria-label="How to play"><CircleHelp /></button>
        <button onClick={() => { pauseForInterruption(); setSettingsOpen(true); }} aria-label="Settings and balance"><Settings /></button>
      </header>

      <CastleScene run={run} pipploAnimation={pipploAnimation} />

      <section className="castle-notice" aria-live="polite">
        <b>{tutorialOpen
          ? "Tutorial pause"
          : run.battle.guardianBriefingPending
            ? "Guardian briefing"
            : run.battle.mode === "study"
              ? "Battle live"
              : question && !question.seenBefore ? "New card pause" : "Paused"}</b>
        <span>{run.battle.notice || run.notice}</span>
      </section>

      {run.phase === "battle" && (
        <nav className="castle-mode-switch" aria-label="Battle panel">
          <button aria-pressed={panelMode === "study"} className={panelMode === "study" ? "is-active" : ""} onClick={() => changePanelMode("study")}><BookOpen />Flashcards</button>
          <button aria-pressed={panelMode === "army"} className={panelMode === "army" ? "is-active" : ""} onClick={() => changePanelMode("army")}><Swords />Army & powers <b>{formatCastleEnergy(run.battle.energy)}</b></button>
        </nav>
      )}

      {feedback && !feedback.wasUnseen && !feedback.requiresCorrection && <div className="castle-feedback-toast" role="status" aria-live="polite"><ReviewResult feedback={feedback} /></div>}

      {run.phase === "battle" && panelMode === "study" && feedback?.wasUnseen && (
        <section className="castle-protected-result" role="status" aria-live="polite">
          <p className="castle-eyebrow">First exposure complete · combat remains paused</p>
          <ReviewResult feedback={feedback} onContinue={() => beginQuestion(run, question ? getStudyQuestionKey(question) : undefined)} />
        </section>
      )}

      {run.phase === "battle" && panelMode === "study" && question && feedback?.requiresCorrection && (
        <section className="castle-correction-panel" role="status" aria-live="polite">
          <p className="castle-eyebrow">Correction step · combat stays live</p>
          <h2>{question.prompt}</h2>
          <ReviewResult feedback={feedback} onContinue={() => beginQuestion(run, getStudyQuestionKey(question))} />
        </section>
      )}

      {run.phase === "battle" && panelMode === "study" && question && !feedback?.wasUnseen && !feedback?.requiresCorrection && (
        <StudyCard
          key={question.instanceId}
          question={question}
          reveal={reveal}
          combatLive={simulationReady}
          interrupted={interrupted}
          onOption={option => finishReview(option === question.answer)}
          onReveal={revealAnswer}
          onSelfGrade={finishReview}
          onExpose={finishExposure}
          onResume={resumeInterruptedQuestion}
        />
      )}

      {run.phase === "battle" && panelMode === "study" && !question && studyBlocked && (
        <section className="castle-study-blocked" role="status">
          <BookOpen />
          <div><b>No active cards remain</b><span>Every review and permanent discovery is saved. You can keep this run while managing the deck, or end its temporary build and return to setup.</span></div>
          <div className="castle-study-blocked-actions">
            <button onClick={exitToMenu}><BookOpen />Save run &amp; manage deck</button>
            <button className="is-quiet" onClick={resetRun}><ArrowLeft />End run &amp; return to setup</button>
          </div>
        </section>
      )}

      {run.phase === "battle" && panelMode === "study" && !question && !studyBlocked && (
        <section className="castle-study-launch">
          <div className="castle-ready-copy">
            <BookOpen />
            <div>
              <b>{run.reviews === 0 ? "The lane is ready" : "Resume study"}</b>
              <span>Once started, seen cards flow automatically. Switch to Army only when you want to summon.</span>
            </div>
          </div>
          <button className="castle-next-card" onClick={() => beginQuestion()}><Play />Start flashcards</button>
        </section>
      )}

      {run.phase === "battle" && panelMode === "army" && (
        <section className="castle-army-panel">
          <div className="castle-army-status">
            <Swords />
            <div>
              <b>{simulationReady ? "Battle is live" : question && !question.seenBefore ? "An unseen direction is protecting the lane" : "The lane is paused"}</b>
              <span>{simulationReady
                ? run.battle.commandWindowReady
                  ? "Your latest answer unlocked one summon and one keep power. Both armies keep moving."
                  : question ? "Recall while both armies fight. Switch panels whenever you need to command." : "Start the next card whenever you are ready; combat keeps moving."
                : question ? `Protected lesson: ${question.prompt}` : "Combat resumes with the next familiar card."}</span>
            </div>
            <button className="castle-guide-button" onClick={() => { pauseForInterruption(); setGuideOpen(true); }}><CircleHelp />Field guide<small>safe pause</small></button>
          </div>
          <CommandTray
            run={run}
            onSummon={summonUnit}
            onPower={usePower}
            onRefresh={refreshCommandHand}
          />
          {question ? (
            <button className="castle-back-to-study" onClick={() => changePanelMode("study")}><BookOpen />Back to flashcard</button>
          ) : (
            <button className="castle-march-button" onClick={() => beginQuestion(run)}><BookOpen />Continue studying<small>Combat stays live</small></button>
          )}
        </section>
      )}

      {run.phase === "battle" && run.battle.guardianBriefingPending && guardianPower && (
        <aside className="castle-overlay castle-guardian-briefing-overlay">
          <section ref={activeDialogRef} tabIndex={-1} className="castle-guardian-briefing" role="dialog" aria-modal="true" aria-labelledby="castle-guardian-briefing-title">
            <MallowSprite className={`castle-guardian-mallow guardian-form-${guardianPower.id}`} animation="idle" />
            <p className="castle-eyebrow">Guardian briefing · {guardianRegion.name}</p>
            <h2 id="castle-guardian-briefing-title">{guardianPower.epithet}</h2>
            <p>Mallow has changed forms for this gate. Combat and response timing are paused until you understand the new rules.</p>
            <div className="castle-guardian-rule" style={{ "--guardian-accent": guardianPower.accent } as CSSProperties}>
              <Castle />
              <div><span>Regional stance</span><b>{guardianPower.name}</b><small>{guardianPower.description}<strong>Recurring: {guardianPower.signature}</strong><em>Counterplay: {guardianPower.counterplay}</em></small></div>
            </div>
            <div className="castle-guardian-difficulty">
              <Swords />
              <div><span>Battle pressure</span><b>{CASTLE_DIFFICULTIES[run.difficultyId].name}</b><small>{CASTLE_DIFFICULTIES[run.difficultyId].description}</small></div>
            </div>
            <div className="castle-guardian-phase-preview">
              <span><b>66% HP</b><small>Rootwall defender{guardianThreat.tier >= 1 ? " + Echo Moth escort" : ""}</small></span>
              <span><b>33% HP</b><small>Siege beast{guardianThreat.tier >= 2 ? " + Spore Bud" : ""}{guardianThreat.tier >= 3 ? ` + ${Math.min(8, 2 + guardianThreat.tier)}-damage Moon Pulse` : ""}</small></span>
            </div>
            {guardianThreat.tier > 0 && (
              <p className="castle-guardian-ascension"><Sparkles /><span><b>{guardianThreat.label}</b>{guardianThreat.description}</span></p>
            )}
            <button onClick={beginGuardianBattle}><Swords />Face the guardian</button>
          </section>
        </aside>
      )}

      {run.phase === "reward" && (
        <aside className="castle-overlay">
          <section ref={activeDialogRef} tabIndex={-1} className="castle-reward-sheet" role="dialog" aria-modal="true" aria-label="Choose a run upgrade">
            <PipploSprite className="castle-celebration-pipplo" animation="cheer" loop />
            <p className="castle-eyebrow">Castle absorbed</p>
            <h2>What should Pipplo digest?</h2>
            <p>Choose one transformation for the rest of this run. Reach 2/3 in a category and future drafts guarantee a compatible evolution finisher.</p>
            {permanentDiscoveryNames.length > 0 && (
              <div className="castle-discovery-banner" role="status">
                <Sparkles />
                <div><b>Keeper Chronicle discovery</b><span>{permanentDiscoveryNames.join(", ")} {permanentDiscoveryNames.length === 1 ? "has" : "have"} joined future expeditions.</span></div>
              </div>
            )}
            <div className="castle-synergy-track" aria-label="Build evolution progress">
              {Object.values(CASTLE_SYNERGY_DEFS).map(synergy => {
                const count = Math.min(synergy.threshold, synergyProgress[synergy.category]);
                return <span key={synergy.id} className={count >= synergy.threshold ? "is-active" : ""} style={{ "--synergy-accent": synergy.accent } as CSSProperties}><b>{synergy.name}</b><small>{synergy.category} {count}/{synergy.threshold}</small></span>;
              })}
            </div>
            <div className="castle-reward-grid">
              {run.rewardChoices.map(id => {
                const reward = CASTLE_UPGRADE_DEFS[id];
                const synergy = Object.values(CASTLE_SYNERGY_DEFS).find(candidate => candidate.category === reward.category)!;
                const previewCount = Math.min(synergy.threshold, getCastleSynergyProgress([...run.upgrades, id])[reward.category]);
                return (
                  <button key={id} style={{ "--reward-accent": reward.accent } as CSSProperties} onClick={() => {
                    setQuestion(null);
                    setFeedback(null);
                    setReveal(false);
                    setPanelMode("study");
                    setRun(claimCastleUpgrade(run, id));
                  }}>
                    <span>{reward.category} · {reward.rarity}</span>
                    <strong>{reward.name}</strong>
                    <small>{reward.description}</small>
                    <em className={previewCount >= synergy.threshold && synergyProgress[reward.category] < synergy.threshold ? "will-evolve" : ""}>Evolution: {previewCount}/{synergy.threshold} · {synergy.name}{previewCount >= synergy.threshold && synergyProgress[reward.category] < synergy.threshold ? " unlocks" : ""}</em>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      )}

      {run.phase === "route" && (
        <aside className="castle-overlay">
          <section ref={activeDialogRef} tabIndex={-1} className="castle-route-sheet" role="dialog" aria-modal="true" aria-label="Choose the next route">
            <Route />
            <p className="castle-eyebrow">Choose the next stop</p>
            <h2>The road forks around a humming puddle</h2>
            {newlyEvolvedSynergy && (
              <div className="castle-evolution-unlocked" style={{ "--synergy-accent": newlyEvolvedSynergy.accent } as CSSProperties} role="status">
                <Sparkles />
                <div><b>{newlyEvolvedSynergy.name} evolved!</b><span>{newlyEvolvedSynergy.description}</span></div>
              </div>
            )}
            <div className="castle-route-grid">
              {run.routeChoices.map(choice => {
                const info = ROUTE_INFO[choice];
                const Icon = info.icon;
                return <button key={choice} onClick={() => {
                  setQuestion(null);
                  setFeedback(null);
                  setReveal(false);
                  setPanelMode("study");
                  const routedRun = chooseCastleRoute(run, choice);
                  const nextRun = routedRun.phase === "battle" ? introduceForBattle(routedRun) : routedRun;
                  if (nextRun.phase === "battle") beginQuestion(nextRun, null);
                  else setRun(nextRun);
                }}><Icon /><strong>{info.name}</strong><span>{info.description}</span></button>;
              })}
            </div>
          </section>
        </aside>
      )}

      {run.phase === "event" && activeEvent && (() => {
        const EventIcon = CASTLE_EVENT_ICONS[activeEvent.id];
        return (
          <aside className="castle-overlay">
            <section ref={activeDialogRef} tabIndex={-1} className="castle-event-sheet" role="dialog" aria-modal="true" aria-label={activeEvent.title}>
              <EventIcon />
              <p className="castle-eyebrow">{activeEvent.eyebrow}</p>
              <h2>{activeEvent.title}</h2>
              <p>{activeEvent.story}</p>
              <div className="castle-event-resources">
                <span><Heart />{Math.ceil(run.carriedCastleHp)} keep HP</span>
                <span><Sparkles />{formatCastleEnergy(run.carriedEnergy)} Goo</span>
              </div>
              <div className="castle-event-choice-grid">
                {activeEvent.choices.map(choice => {
                  const available = canChooseCastleEvent(run, choice.id);
                  return (
                    <button key={choice.id} disabled={!available} onClick={() => {
                      playCastleSound("power", soundEnabled);
                      setQuestion(null);
                      setFeedback(null);
                      setReveal(false);
                      setInterrupted(false);
                      setPanelMode("study");
                      const resolved = resolveCastleEvent(run, choice.id);
                      const nextRun = resolved.phase === "battle" ? introduceForBattle(resolved) : resolved;
                      setRun(nextRun);
                    }}>
                      <strong>{choice.name}</strong>
                      <span>{choice.story}</span>
                      <b>{getCastleEventChoiceEffect(run, choice.id)}</b>
                      {!available && choice.requiresEnergy && <small>Need {choice.requiresEnergy} Goo</small>}
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        );
      })()}

      {run.phase === "retire" && (
        <aside className="castle-overlay">
          <section ref={activeDialogRef} tabIndex={-1} className="castle-result-sheet is-win" role="dialog" aria-modal="true" aria-label="Study contract complete">
            <PipploSprite className="castle-celebration-pipplo" animation="cheer" loop />
            <p className="castle-eyebrow">Contract complete</p>
            <h2>Pipplo can head home—or wobble deeper</h2>
            <p className="castle-result-story">Mallow lowers her wand and rolls the moon gate open. The promised study road is clear, but she is already grinning about a rematch.</p>
            <div className="castle-result-stats">
              <span><b>{run.reviews}</b>reviews</span>
              <span><b>{run.correct + run.wrong > 0 ? Math.round((run.correct / (run.correct + run.wrong)) * 100) : 0}%</b>graded accuracy</span>
              <span><b>{run.upgrades.length}</b>mutations</span>
              <span><b>{activeSynergies.length}</b>evolutions</span>
            </div>
            <div className="castle-checkpoint-build" aria-label="Current endless build">
              <strong>Build crossing the moon gate</strong>
              {activeSynergies.length > 0
                ? activeSynergies.map(synergy => <span key={synergy.id} style={{ "--synergy-accent": synergy.accent } as CSSProperties}><b>{synergy.name}</b><small>{synergy.description}</small></span>)
                : <p>No category has evolved yet. Your {run.upgrades.length} mutations still continue with you.</p>}
            </div>
            <p><b>Next road:</b> {getCastleEndlessThreat(run.region + 1).tier > 0
              ? `${getCastleEndlessThreat(run.region + 1).label}. ${getCastleEndlessThreat(run.region + 1).description}`
              : `${getCastleRegionDef(run.region + 1).name}. Clear the remaining named regions before Moon Ascensions begin.`} A new retire checkpoint waits after its guardian.</p>
            <div className="castle-checkpoint-stakes">
              <span><b>Bank the run</b><small>Record a completed expedition now. Reviews and discoveries are already safe.</small></span>
              <span><b>Push deeper</b><small>Keep every mutation for the next region. Defeat still ends this temporary build.</small></span>
            </div>
            <div>
              <button onClick={() => setRun(current => current ? retireCastleRun(current) : current)}>Retire successfully</button>
              <button onClick={() => {
                setQuestion(null);
                setFeedback(null);
                setReveal(false);
                setPanelMode("study");
                const continuedRun = continueCastleRun(run);
                const nextRun = continuedRun.phase === "battle" ? introduceForBattle(continuedRun) : continuedRun;
                if (nextRun.phase === "battle") beginQuestion(nextRun, null);
                else setRun(nextRun);
              }}>Continue deeper · {getCastleEndlessThreat(run.region + 1).tier > 0
                ? getCastleEndlessThreat(run.region + 1).label
                : getCastleRegionDef(run.region + 1).shortName}</button>
            </div>
          </section>
        </aside>
      )}

      {(run.phase === "complete" || run.phase === "lost") && (
        <aside className="castle-overlay">
          <section ref={activeDialogRef} tabIndex={-1} className={`castle-result-sheet ${run.phase === "complete" ? "is-win" : "is-loss"}`} role="dialog" aria-modal="true" aria-label={run.phase === "complete" ? "Expedition complete" : "Expedition lost"}>
            {run.phase === "complete" ? <PipploSprite className="castle-celebration-pipplo" animation="cheer" loop /> : <Heart />}
            <p className="castle-eyebrow">{run.phase === "complete" ? "Expedition complete" : "Pipplo needs a nap"}</p>
            <h2>{run.phase === "complete" ? "The deck-world grew" : "The castle fell; the learning stayed"}</h2>
            <p className="castle-result-story">{run.phase === "complete"
              ? run.contractId === "long"
                ? "Mallow pins a crescent ribbon beside Pipplo's star. The whole three-region road now remembers this expedition."
                : "Mallow taps her crescent badge in salute. New discoveries are waiting on the next road."
              : "Mallow leaves the moon gate glowing for a rematch. Every review from this attempt is already safe."}</p>
            <p>{run.reviews} reviews · {run.correct} correct · {run.wrong} missed · best region {run.bestRegion}</p>
            <div className="castle-result-stats">
              <span><b>{run.introducedThisRun}</b>introduced</span>
              <span><b>{run.upgrades.length}</b>run traits</span>
              <span><b>{profile.unlockedUpgradeIds.length}</b>discoveries</span>
              <span><b>{profile.unlockedKeepsakeIds.length}</b>keepsakes</span>
            </div>
            <section className="castle-learning-report" aria-label="Learning report">
              <header><BookOpen /><div><span>Learning report</span><b>What this expedition strengthened</b></div></header>
              <div className="castle-learning-metrics">
                <span><b>{Math.round(studyReport.accuracy * 100)}%</b><small>graded accuracy</small></span>
                <span><b>{studyReport.averageResponseMs > 0 ? `${Math.round(studyReport.averageResponseMs / 100) / 10}s` : "—"}</b><small>active recall pace</small></span>
                <span><b>{studyReport.gradedReviews}</b><small>graded recalls</small></span>
                <span><b>{studyReport.difficultRecalls}</b><small>difficult wins</small></span>
              </div>
              <p>{studyReport.exposures} safe first exposure{studyReport.exposures === 1 ? "" : "s"} · {studyReport.dueReviews} due prompt{studyReport.dueReviews === 1 ? "" : "s"} practiced</p>
              {studyFocus.length > 0 && (
                <div className="castle-learning-focus">
                  <b>Practice next</b>
                  {studyFocus.map(item => <span key={item.key}><strong>{item.prompt}</strong><i>→</i>{item.answer}<small>{item.misses} miss{item.misses === 1 ? "" : "es"}</small></span>)}
                </div>
              )}
              <aside><Sparkles /><div><b>Next expedition</b><span>{studyReport.recommendation}</span></div></aside>
              <aside className="is-battle-lesson"><Swords /><div><b>Battle lesson</b><span>{battleLesson}</span></div></aside>
            </section>
            {permanentDiscoveryNames.length > 0 && (
              <div className="castle-discovery-banner is-result">
                <Sparkles />
                <div><b>Permanent discoveries earned</b><span>{permanentDiscoveryNames.join(", ")}</span></div>
              </div>
            )}
            {run.keepsakeId && <p className="castle-result-keepsake"><Sparkles /><b>{CASTLE_KEEPSAKE_DEFS[run.keepsakeId].name}</b><span>keepsake carried through this expedition</span></p>}
            <button onClick={resetRun}><RefreshCcw />Start another run</button>
          </section>
        </aside>
      )}

      {tutorialOpen && <CastleTutorial step={tutorialStep} dialogRef={activeDialogRef} onStep={setTutorialStep} onComplete={finishTutorial} />}

      {guideOpen && (
        <aside className="castle-drawer-backdrop" onClick={() => setGuideOpen(false)}>
          <section ref={activeDialogRef} tabIndex={-1} className="castle-drawer castle-field-guide" role="dialog" aria-modal="true" aria-labelledby="castle-guide-title" onClick={event => event.stopPropagation()}>
            <button className="castle-drawer-close" aria-label="Close field guide" onClick={() => setGuideOpen(false)}><X /></button>
            <p className="castle-eyebrow">Pipplo’s field guide</p>
            <h2 id="castle-guide-title">What everything does</h2>

            <h3>Battle rhythm</h3>
            <div className="castle-guide-meter-grid">
              <span><Sparkles /><b>Goo</b><small>Correct recalls fund summons and keep powers; difficult cards pay more.</small></span>
              <span><Zap /><b>Focus bonus</b><small>Five correct seen recalls grant one extra Goo instead of automatic damage.</small></span>
              <span><Swords /><b>Enemy Rally</b><small>A miss pulls the next wave closer and adds a pip. Recall that direction later to clear one; three pips fire a 3-damage Moon Volley and summon a bonus squad.</small></span>
              <span><Clock3 /><b>Live recall</b><small>Familiar cards keep the lane moving. Only a first-time lesson freezes combat.</small></span>
              <span><Route /><b>Formation lanes</b><small>Up to {CASTLE_MELEE_ENGAGEMENT_SLOTS} melee and {CASTLE_RANGED_ENGAGEMENT_SLOTS} ranged units strike one target at once. Extra units queue as reserves.</small></span>
              <span><Castle /><b>Guardian phases</b><small>A pre-fight briefing freezes combat and response timing. At 66% and 33% HP, guardians telegraph reinforcements and attack faster.</small></span>
              <span><Sparkles /><b>Moon Ascension</b><small>After the three named regions, enemy stats climb, scheduled waves gain previewed Moon Marks, and guardians add new escorts and Moon Pulse.</small></span>
            </div>
            <details className="castle-handwriting-demo">
              <summary>Try the Japanese handwriting pad</summary>
              <p>Free-recall Japanese prompts offer this same private scratch space. Nothing tries to recognize your handwriting; reveal the card and grade yourself.</p>
              <JapaneseScratchpad revealed={false} />
            </details>

            <h3>Guardian stances</h3>
            <div className="castle-guide-list is-powers">
              {Object.values(CASTLE_GUARDIAN_POWER_DEFS).map(power => (
                <article key={power.id}><MallowSprite className={`castle-guide-guardian guardian-form-${power.id}`} animation="idle" /><div><b>{power.epithet}</b><span><strong>{power.name}.</strong> {power.description} {power.signature}</span><small>{power.counterplay} · {run.battle.guardianPowerId === power.id ? "Current guardian rule" : "Rotates by region"}</small></div></article>
              ))}
            </div>

            {run.keepsakeId && (() => {
              const keepsake = CASTLE_KEEPSAKE_DEFS[run.keepsakeId];
              return (
                <div className="castle-guide-keepsake" style={{ "--keepsake-accent": keepsake.accent } as CSSProperties}>
                  <Sparkles />
                  <div><b>Equipped: {keepsake.name}</b><span>{keepsake.description}</span></div>
                </div>
              );
            })()}

            <h3>Your summons</h3>
            <div className="castle-guide-list">
              {getPlayerSummonKinds(run.upgrades).map(kind => {
                const unit = CASTLE_UNIT_DEFS[kind];
                const mendletHealing = run.upgrades.includes("dewSatchel") ? 6 : 4;
                const actionText = kind === "mendlet" ? `${mendletHealing} healing` : `${unit.damage} attack`;
                const roleText = kind === "mendlet" ? "support" : unit.range >= 10 ? "ranged" : unit.speed >= 7 ? "fast" : "melee";
                const guideText = kind === "mendlet"
                  ? `Heals the most wounded nearby ally for ${mendletHealing} HP every 1.4 seconds${run.upgrades.includes("pollenPuff") ? " and grants 2 shield" : ""}. It never occupies an attack slot.`
                  : CASTLE_UNIT_GUIDE[kind];
                return <article key={kind}><SlimeFace kind={kind} side="player" /><div><b>{unit.name}</b><span>{guideText}</span><small>{unit.cost} Goo · {unit.hp} HP · {actionText} · {roleText}</small></div></article>;
              })}
              {!run.upgrades.includes("mendletEgg") ? <article className="is-locked"><SlimeFace kind="mendlet" side="player" /><div><b>Mendlet</b><span>Clear four guardians to discover Mendlet Egg, then choose it during a run to hatch this nearby ally healer. Later discoveries evolve her dew healing and add pollen shields.</span><small>Locked mutation summon · branching evolutions</small></div></article> : null}
            </div>

            <h3>Castle powers</h3>
            <div className="castle-guide-list is-powers">
              {Object.values(CASTLE_POWER_DEFS).map(power => {
                const unlocked = !power.requiredUpgradeId || run.upgrades.includes(power.requiredUpgradeId);
                return <article key={power.id}><Zap /><div><b>{power.name}</b><span>{power.description}</span><small>{power.cost} Goo · {unlocked ? "available this battle" : `requires ${CASTLE_UPGRADE_DEFS[power.requiredUpgradeId!].name}`}</small></div></article>;
              })}
            </div>

            <h3>Moon Marks <small>Endless elite mutations</small></h3>
            <div className="castle-guide-list is-affixes">
              {Object.values(CASTLE_ENEMY_AFFIX_DEFS).map(affix => (
                <article key={affix.id} style={{ "--affix-accent": affix.accent } as CSSProperties}>
                  <span className={`castle-affix-guide-icon is-${affix.id}`} aria-hidden="true">{affix.name.slice(0, 1)}</span>
                  <div><b>{affix.name}</b><span>{affix.description}</span><small>Appears from Moon Ascension {affix.id === "armored" ? 1 : affix.id === "frenzied" ? 2 : 3}</small></div>
                </article>
              ))}
            </div>

            <h3>Enemy families <small>{ENEMY_GUIDE_KINDS.filter(kind => discoveredEnemyKinds.has(kind)).length}/{ENEMY_GUIDE_KINDS.length} discovered</small></h3>
            <div className="castle-guide-list">
              {ENEMY_GUIDE_KINDS.map(kind => {
                const discovered = discoveredEnemyKinds.has(kind);
                if (!discovered) {
                  return <article key={kind} className="is-undiscovered"><span className="castle-unit-unknown" aria-hidden="true">?</span><div><b>Unknown rival</b><span>Meet this family in the lane to reveal its role and battle stats.</span><small>Undiscovered</small></div></article>;
                }
                const unit = CASTLE_UNIT_DEFS[kind];
                return <article key={kind}><SlimeFace kind={kind} side="enemy" /><div><b>{unit.name}</b><span>{CASTLE_UNIT_GUIDE[kind]}</span><small>{unit.hp} HP · {unit.damage} attack · {unit.range >= 10 ? "ranged" : unit.speed >= 7 ? "fast" : "melee"}</small></div></article>;
              })}
            </div>

            <h3>Between battles</h3>
            <div className="castle-guide-list is-routes">
              {(Object.keys(ROUTE_INFO) as CastleRouteChoice[]).map(choice => {
                const route = ROUTE_INFO[choice];
                const Icon = route.icon;
                return <article key={choice}><Icon /><div><b>{route.name}</b><span>{route.description}</span></div></article>;
              })}
            </div>

            <h3>Current run build</h3>
            <div className="castle-guide-synergies">
              {Object.values(CASTLE_SYNERGY_DEFS).map(synergy => {
                const count = Math.min(synergy.threshold, synergyProgress[synergy.category]);
                return <article key={synergy.id} className={count >= synergy.threshold ? "is-active" : ""} style={{ "--synergy-accent": synergy.accent } as CSSProperties}><Sparkles /><div><b>{synergy.name}</b><span>{synergy.description}</span><small>{synergy.category} mutations · {count}/{synergy.threshold}{count >= synergy.threshold ? " · evolved" : ""}</small></div></article>;
              })}
            </div>
            <div className="castle-guide-build">
              {run.upgrades.length > 0 ? run.upgrades.map(id => <span key={id}><b>{CASTLE_UPGRADE_DEFS[id].name}</b>{CASTLE_UPGRADE_DEFS[id].description}</span>) : <p>Defeat the first castle to choose your first mutation.</p>}
            </div>
          </section>
        </aside>
      )}

      {helpOpen && (
        <aside className="castle-drawer-backdrop" onClick={() => setHelpOpen(false)}>
          <section ref={activeDialogRef} tabIndex={-1} className="castle-drawer" role="dialog" aria-modal="true" aria-labelledby="castle-help-title" onClick={event => event.stopPropagation()}>
            <button className="castle-drawer-close" aria-label="Close how to play" onClick={() => setHelpOpen(false)}><X /></button>
            <p className="castle-eyebrow">How Goo Keep works</p>
            <h2 id="castle-help-title">Recall powers the nursery</h2>
            <p>A new direction is an ungraded lesson. Its prompt and answer are dominant; an optional third panel is visibly marked as reference only and is not tested in that direction.</p>
            <p>Seen cards keep combat live while you recall. Every correct answer includes a small command stipend, difficult cards earn much more, and every five correct recalls grant one bonus Goo. A miss fills Enemy Surge; three pips strengthen the enemy pressure.</p>
            <p>Balanced Recall uses multiple choice for meaning recognition, kana-to-written tile building for three-sided Japanese cards, then reveal and self-grade for free recall. Japanese self-grade prompts include an optional mouse, pen, or finger scratchpad that never attempts handwriting recognition. Choices accept 1–4; self-grade accepts Space or Enter to reveal, then 1 for Not yet or 2 for Got it. Typing stays disabled.</p>
            <p>Every seen answer refreshes a command allowance for the rotating four-card hand. Before playing a card, you may refresh the whole hand once, then play at most one summon and one keep power. The battle never waits for those choices.</p>
            <p>Battle pressure is chosen before a run. Study First, Standard Siege, and Moonstorm change only enemy combat strength and pacing; card grading, rewards, and protected first exposures remain identical.</p>
            <p>Your army has {CASTLE_ARMY_CAPACITY} spaces. Small units use one, specialists use two, and tanks use three. Formation space still limits each target to {CASTLE_MELEE_ENGAGEMENT_SLOTS} melee and {CASTLE_RANGED_ENGAGEMENT_SLOTS} ranged attackers.</p>
            <p>Opening help, settings, or leaving the window pauses the current prompt so an interruption never costs your castle.</p>
            <p>After each victory you draft one mutation, then choose from three routes. Detours open a story event with three visible outcomes; unaffordable bargains are disabled before you choose.</p>
            <p>Drafting three mutations from one category evolves the run: Minion drafts unlock Brood Heart, Castle drafts unlock Nursery Engine, Trait drafts unlock Keeper Instinct, and Study drafts unlock Memory Bloom. Draft cards preview their evolution progress before you commit.</p>
            <p>Each region has its own enemy mix and colors. Before a guardian, a required briefing freezes both combat and response timing and previews every phase. Guardian keeps change at 66% and 33% HP, while a visible countdown telegraphs recurring signature moves. Shell Reprisal grants enemy barrier, Spore Weather slows your formation, Moon Tax drains stored Goo, Root Quake punishes exposed formations, and Brood Call adds bonus attackers.</p>
            <p>After the three named regions, endless Moon Ascensions add 10% enemy HP per tier and +1 attack every two tiers. Previewed Moon Marks begin mutating individual waves: Shell-marked enemies arrive armored, Rush-marked enemies attack faster, and Crown-marked enemies become slow heavyweights. Ascension guardians also add an Echo Moth in phase 2, a Spore Bud from tier 2, and a barrier-aware Moon Pulse from tier 3.</p>
            <p>Your flashcard progress always survives. Run mutations disappear on defeat; deck-world discoveries and unlocked keepsakes remain.</p>
            <button className="castle-tutorial-replay" onClick={() => { setHelpOpen(false); setTutorialStep(0); setTutorialOpen(true); }}><Play />Replay tutorial</button>
          </section>
        </aside>
      )}

      {settingsOpen && (
        <aside className="castle-drawer-backdrop" onClick={() => { setSettingsOpen(false); setAbandonConfirmOpen(false); }}>
          <section ref={activeDialogRef} tabIndex={-1} className="castle-drawer" role="dialog" aria-modal="true" aria-labelledby="castle-settings-title" onClick={event => event.stopPropagation()}>
            <button className="castle-drawer-close" aria-label="Close settings" onClick={() => { setSettingsOpen(false); setAbandonConfirmOpen(false); }}><X /></button>
            <p className="castle-eyebrow">Balance lab</p>
            <h2 id="castle-settings-title">Pressure and telemetry</h2>
            <div className="castle-current-difficulty"><Swords /><span><b>{CASTLE_DIFFICULTIES[run.difficultyId].name}</b><small>{CASTLE_DIFFICULTIES[run.difficultyId].description} Difficulty is locked for this expedition.</small></span></div>
            <label>Reward curve<select value={run.rewardCurve} onChange={event => {
              const curve = event.target.value as StudyRewardCurve;
              setRewardCurve(curve);
              setRun(current => current ? { ...current, rewardCurve: curve } : current);
            }}>{(Object.keys(REWARD_CURVE_LABELS) as StudyRewardCurve[]).map(curve => <option key={curve} value={curve}>{REWARD_CURVE_LABELS[curve]}</option>)}</select><small>{REWARD_CURVE_HELP[run.rewardCurve]}</small></label>
            <label>Recall style<select value={run.recallMode} onChange={event => {
              const mode = event.target.value as StudyRecallMode;
              setRecallMode(mode);
              setRun(current => current ? { ...current, recallMode: mode } : current);
            }}>{(Object.keys(RECALL_MODE_LABELS) as StudyRecallMode[]).map(mode => <option key={mode} value={mode}>{RECALL_MODE_LABELS[mode]}</option>)}</select><small>{RECALL_MODE_HELP[run.recallMode]}</small></label>
            <label className="castle-sound-toggle"><input type="checkbox" checked={soundEnabled} onChange={event => setSoundEnabled(event.target.checked)} />Sound cues</label>
            <div className="castle-telemetry-grid">
              <span><b>{formatCastleEnergy(run.battle.telemetry.energyEarned)}</b>Goo earned</span>
              <span><b>{formatCastleEnergy(run.battle.telemetry.energySpent)}</b>Goo spent</span>
              <span><b>{run.battle.telemetry.rallyTriggered}</b>enemy rallies</span>
              <span><b>{Math.round(run.battle.telemetry.activeCombatMs / 1_000)}s</b>live combat</span>
            </div>
            <button className="castle-download" onClick={downloadBalance}><Download />Export local balance data</button>
            <button className="castle-pause-button" onClick={() => { pauseForInterruption(); setSettingsOpen(false); setAbandonConfirmOpen(false); }}><Pause />Pause current prompt</button>
            {!abandonConfirmOpen ? (
              <button className="castle-abandon-button" onClick={() => setAbandonConfirmOpen(true)}><LogOut />End this expedition</button>
            ) : (
              <section className="castle-abandon-confirm" aria-label="Confirm ending expedition">
                <p><b>Return to run setup?</b>Your reviews and permanent discoveries stay saved. Only this unfinished run and its temporary mutations are cleared.</p>
                <div>
                  <button autoFocus onClick={() => setAbandonConfirmOpen(false)}>Keep playing</button>
                  <button className="is-danger" onClick={abandonRun}>End run</button>
                </div>
              </section>
            )}
          </section>
        </aside>
      )}
    </main>
  );
}
