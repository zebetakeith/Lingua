import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
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
  drawStudyQuestion,
  getSelectedStudyDeckId,
  getStudyDecks,
  getStudyQuestionKey,
  introduceStudyCards,
  isTypedStudyAnswerCorrect,
  selectStudyDeck,
  type StudyAnswerResult,
  type StudyDeckSummary,
  type StudyQuestion,
} from "../game/studyBridge";
import { getActiveStudyResponseMs, type StudyRecallMode, type StudyRewardCurve } from "../game/study";
import {
  CASTLE_CONTRACTS,
  CASTLE_EVENT_DEFS,
  CASTLE_KEEPSAKE_DEFS,
  CASTLE_POWER_DEFS,
  CASTLE_RECALL_BOLT_LIMIT,
  CASTLE_RALLY_LIMIT,
  CASTLE_UNIT_DEFS,
  CASTLE_UPGRADE_DEFS,
  applyCastleStudyOutcome,
  activateCastlePower,
  canChooseCastleEvent,
  chooseCastleRoute,
  claimCastleUpgrade,
  continueCastleRun,
  createInitialCastleRun,
  formatCastleEnergy,
  getAvailableCastlePowers,
  getCastleBattleProgress,
  getCastleRegionDef,
  getCastleStudyReport,
  getPlayerSummonKinds,
  pauseCastleBattle,
  recordCastleIntroductions,
  resolveCastleEvent,
  resumeCastleBattle,
  retireCastleRun,
  summonCastleUnit,
  tickCastleRun,
  type CastleContractId,
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
  typed: "Type every answer",
};
const RECALL_MODE_HELP: Record<StudyRecallMode, string> = {
  balanced: "Recommended: recognition first, then typed foreign-term recall as mastery grows.",
  deck: "Use the multiple-choice and self-grade rules already saved with this deck.",
  typed: "Type every seen answer for maximum production practice.",
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
  spitlet: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/spitlet/seed-v1.png`,
  bigChonk: `${import.meta.env.BASE_URL}assets/goo-keep/units/friendly/bigChonk/seed-v1.png`,
};
const ENEMY_UNIT_ART: Partial<Record<CastleUnitKind, string>> = {
  shellSlime: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/shellSlime/seed-v1.png`,
  nibbleImp: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/nibbleImp/seed-v1.png`,
  sporeBud: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/sporeBud/seed-v1.png`,
  echoMoth: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/echoMoth/seed-v1.png`,
  rootLump: `${import.meta.env.BASE_URL}assets/goo-keep/units/enemy/rootLump/seed-v1.png`,
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
}: {
  kind: CastleUnitKind;
  side: "player" | "enemy";
  attacking?: boolean;
}) {
  const art = side === "player" ? FRIENDLY_UNIT_ART[kind] : ENEMY_UNIT_ART[kind];
  const attackFrames = attacking
    ? side === "player"
      ? FRIENDLY_UNIT_ATTACK_FRAMES[kind]
      : ENEMY_UNIT_ATTACK_FRAMES[kind]
    : undefined;
  const attackFrameMs = (
    side === "player" ? FRIENDLY_UNIT_ATTACK_FRAME_MS[kind] : ENEMY_UNIT_ATTACK_FRAME_MS[kind]
  ) || 45;
  if (art) {
    return (
      <span
        className={`castle-unit-face is-production-art ${attackFrames ? "is-unit-action" : ""} kind-${kind} side-${side}`}
        data-unit-animation={attackFrames ? "attack" : "idle"}
        aria-hidden="true"
      >
        {(attackFrames || [art]).map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            style={{
              "--unit-art-duration": `${attackFrameMs}ms`,
              "--unit-art-delay": `${index * attackFrameMs}ms`,
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
  const playerCastleHitEvent = battle.fxEvents.slice().reverse().find(event => (event.kind === "hit" || event.kind === "projectile") && event.position <= 3);
  const playerCastleHit = Boolean(playerCastleHitEvent);
  const enemyCastleHitEvent = battle.fxEvents.slice().reverse().find(event => (event.kind === "hit" || event.kind === "projectile") && event.position >= 97);
  const enemyCastleHit = Boolean(enemyCastleHitEvent);
  const enemyCastEvent = battle.fxEvents.slice().reverse().find(event => event.kind === "spawn" && event.side === "enemy");
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
      className={`castle-scene ${battle.mode === "study" ? "is-live" : "is-paused"} ${battle.guardian ? `is-guardian phase-${battle.guardianPhase}` : ""}`}
      style={{
        "--region-sky-top": region.skyTop,
        "--region-sky-bottom": region.skyBottom,
        "--region-hill-far": region.hillFar,
        "--region-hill-near": region.hillNear,
        "--region-ground": region.ground,
        "--region-road-top": region.roadTop,
        "--region-road-bottom": region.roadBottom,
        "--region-sun": region.sun,
      } as CSSProperties}
      aria-label={`${region.name} castle battlefield. Pipplo's Keep ${Math.ceil(battle.playerCastleHp)} health, Mallow's Keep ${Math.ceil(battle.enemyCastleHp)} health. ${friendlyUnits} friendly and ${enemyUnits} enemy units in the lane.`}
    >
      <div className="castle-sky-orb" />
      <div className="castle-scene-status">
        <CastleHealth current={battle.playerCastleHp} max={battle.playerCastleMaxHp} />
        <div className="castle-region-chip" title={region.enemyTheme}>
          <span>{getCastleBattleProgress(run)}</span>
          <b>{region.shortName}</b>
          <small>{battle.guardian ? `Guardian phase ${battle.guardianPhase}/3` : "Lane battle"}</small>
        </div>
        <CastleHealth current={battle.enemyCastleHp} max={battle.enemyCastleMaxHp} enemy />
      </div>

      <div className="castle-lane">
        <div className={`castle-home is-player ${playerCastleHit ? "is-hit" : ""}`}>
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
          {battle.units.map(unit => {
            const productionAttackFrameMs = unit.side === "player"
              ? FRIENDLY_UNIT_ATTACK_FRAME_MS[unit.kind]
              : ENEMY_UNIT_ATTACK_FRAME_MS[unit.kind];
            const attackAnimationMs = productionAttackFrameMs ? productionAttackFrameMs * 4 : 180;
            const attacking = unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs - attackAnimationMs;
            return (
            <div
              key={unit.id}
              className={`castle-lane-unit side-${unit.side} ${attacking ? "is-attacking" : ""}`}
              style={{ "--unit-x": `${unit.position}%`, "--unit-accent": CASTLE_UNIT_DEFS[unit.kind].accent } as CSSProperties}
              title={`${CASTLE_UNIT_DEFS[unit.kind].name}: ${Math.ceil(unit.hp)}/${unit.maxHp} HP`}
            >
              {unit.shield > 0 && <span className="castle-unit-shield" />}
              <SlimeFace kind={unit.kind} side={unit.side} attacking={attacking} />
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
        <div className={`castle-home is-enemy ${enemyCastleHit ? "is-hit" : ""}`}>
          <div className="castle-tower"><span /><span /><span /></div>
          <MallowSprite key={`${activeMallowAnimation}-${activeMallowSerial}`} className="mallow-keeper" animation={activeMallowAnimation} />
        </div>
      </div>

      <div className="castle-battle-strip">
        <span className="castle-energy"><Sparkles />{formatCastleEnergy(battle.energy)} energy</span>
        <span
          className="castle-recall-bolt"
          title="Five correct seen-card recalls fire an 8-damage castle bolt"
          role="progressbar"
          aria-label="Recall Bolt charge"
          aria-valuemin={0}
          aria-valuemax={CASTLE_RECALL_BOLT_LIMIT}
          aria-valuenow={battle.recallBoltCharge}
        >
          Recall Bolt
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
          className="castle-wave"
          title={`Next enemy wave: ${CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}`}
          aria-label={`Next enemy wave in ${Math.max(0, Math.ceil(battle.enemySpawnTimerMs / 1_000))} seconds: ${CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}`}
        >
          <b className="castle-wave-countdown">{Math.max(0, Math.ceil(battle.enemySpawnTimerMs / 1_000))}s</b> <SlimeFace kind={battle.nextEnemyKind} side="enemy" /> {CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}
          {run.upgrades.includes("mothEars") && <> · then {CASTLE_UNIT_DEFS[battle.afterNextEnemyKind].name}</>}
        </span>
      </div>
    </section>
  );
}

function CommandTray({
  run,
  onSummon,
  onPower,
}: {
  run: CastleRunState;
  onSummon: (kind: CastleUnitKind) => void;
  onPower: (id: CastlePowerId) => void;
}) {
  const powers = getAvailableCastlePowers(run.upgrades);
  return (
    <div className="castle-command-tray">
      <div className="castle-command-heading">
        <span><Sparkles />Spend or bank {formatCastleEnergy(run.battle.energy)} energy</span>
        <small>Combat keeps moving; command time never counts as recall time.</small>
      </div>
      <div className="castle-command-scroll" role="group" aria-label="Summons and castle powers">
        {getPlayerSummonKinds().map(kind => {
          const unit = CASTLE_UNIT_DEFS[kind];
          return (
            <button key={kind} disabled={run.battle.energy < unit.cost} onClick={() => onSummon(kind)}>
              <SlimeFace kind={kind} side="player" />
              <strong>{unit.name}</strong>
              <span>{unit.role}</span>
              <b>{unit.cost}</b>
            </button>
          );
        })}
        {powers.map(power => (
          <button key={power.id} className="is-power" disabled={run.battle.energy < power.cost} onClick={() => onPower(power.id)}>
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

function StudyCard({
  question,
  reveal,
  combatLive,
  interrupted,
  onOption,
  onTyped,
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
  onTyped: (answer: string) => void;
  onReveal: () => void;
  onSelfGrade: (correct: boolean) => void;
  onExpose: () => void;
  onResume: () => void;
}) {
  const [typedAnswer, setTypedAnswer] = useState("");
  const promptRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    if (question.seenBefore && question.questionType === "typed" && !interrupted) return;
    const focusFrame = window.requestAnimationFrame(() => promptRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(focusFrame);
  }, [interrupted, question.cardId, question.direction, question.questionType, question.seenBefore, reveal]);
  useEffect(() => {
    if (!question.seenBefore || interrupted || question.questionType !== "multiple_choice") return;
    const answerByNumber = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      const answerIndex = Number(event.key) - 1;
      const option = question.options[answerIndex];
      if (!option || answerIndex < 0 || answerIndex > 3) return;
      event.preventDefault();
      onOption(option);
    };
    window.addEventListener("keydown", answerByNumber);
    return () => window.removeEventListener("keydown", answerByNumber);
  }, [interrupted, onOption, question.options, question.questionType, question.seenBefore]);
  const status = !question.seenBefore
    ? "First exposure · combat safely paused"
    : interrupted
      ? "Interrupted · combat paused"
      : `Combat live · ${question.pressure.combatSpeed}×`;
  return (
    <section className={`castle-study-card ${combatLive ? "is-live" : ""} ${!question.seenBefore ? "is-new" : ""}`}>
      <div className="castle-study-meta">
        <span>{question.direction === "term_to_definition" ? "Term → definition" : "Definition → term"}</span>
        <span>{question.masteryLabel}</span>
        <span className="castle-study-pressure"><Clock3 />{status}</span>
      </div>
      <div className="castle-study-reward">
        <Sparkles />{question.seenBefore ? "Worth" : "Learning bonus"} {formatCastleEnergy(question.reward)}
      </div>
      {!question.seenBefore ? (
        <div className="castle-first-exposure">
          <span>New direction</span>
          <small>{question.direction === "term_to_definition" ? "Term" : "Meaning"}</small>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <i aria-hidden="true">↓</i>
          <small>{question.direction === "term_to_definition" ? "Meaning" : "Term"}</small>
          <strong>{question.answer}</strong>
          <p>This is a lesson, not a test. Combat is completely paused until you have read both sides.</p>
          <button onClick={onExpose}><BookOpen />I’ve read both sides<ChevronRight /></button>
        </div>
      ) : interrupted ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <button className="castle-resume-card" onClick={onResume}><Play />Resume this prompt</button>
        </>
      ) : question.questionType === "typed" ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <form className="castle-typed-answer" onSubmit={event => {
            event.preventDefault();
            if (typedAnswer.trim()) onTyped(typedAnswer);
          }}>
            <label htmlFor={`castle-typed-${question.cardId}`}>Type the {question.direction === "definition_to_term" ? "term" : "meaning"}</label>
            <input
              id={`castle-typed-${question.cardId}`}
              value={typedAnswer}
              onChange={event => setTypedAnswer(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              autoFocus
            />
            <small>Case and punctuation are ignored. Answers separated by / or ; are accepted.</small>
            <button type="submit" disabled={!typedAnswer.trim()}><ChevronRight />Check recall</button>
          </form>
        </>
      ) : question.questionType === "multiple_choice" ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <div className="castle-answer-grid" role="group" aria-label="Answer choices">
            {question.options.map((option, index) => <button key={option} onClick={() => onOption(option)}><kbd aria-hidden="true">{index + 1}</kbd><span>{option}</span></button>)}
          </div>
        </>
      ) : reveal ? (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <div className="castle-self-grade">
            <strong>{question.answer}</strong>
            <span>Did you recall it before revealing?</span>
            <div>
              <button onClick={() => onSelfGrade(false)}>Not yet</button>
              <button className="is-correct" onClick={() => onSelfGrade(true)}>Got it</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 ref={promptRef} tabIndex={-1}>{question.prompt}</h2>
          <button className="castle-flip-card" onClick={onReveal}>Reveal answer</button>
        </>
      )}
    </section>
  );
}

function ReviewResult({ feedback, onContinue }: { feedback: ReviewFeedback; onContinue?: () => void }) {
  return (
    <div className={`castle-review-result ${feedback.correct ? "is-correct" : "is-wrong"}`}>
      <div>
        <b>{feedback.correct ? `+${formatCastleEnergy(feedback.reward)} energy` : feedback.wasUnseen ? "Safe first exposure" : "Enemy Rally increased"}</b>
        <span>{feedback.correct ? "Recall recorded." : `Correct answer: ${feedback.answer}`}</span>
      </div>
      {feedback.masteryEvent && <small>{feedback.masteryEvent}</small>}
      {feedback.requiresCorrection && <small>Read the correction before returning to the next card. Combat is still moving; recalling this direction later clears one Rally pip.</small>}
      {onContinue && <button autoFocus onClick={onContinue}>{feedback.requiresCorrection ? "I’ve got it — next card" : "Continue learning"}</button>}
    </div>
  );
}

function DeckSetup({
  decks,
  selectedDeckId,
  contractId,
  rewardCurve,
  recallMode,
  profile,
  onDeck,
  onContract,
  onCurve,
  onRecallMode,
  onKeepsake,
  onStart,
  onExit,
}: {
  decks: StudyDeckSummary[];
  selectedDeckId: string;
  contractId: CastleContractId;
  rewardCurve: StudyRewardCurve;
  recallMode: StudyRecallMode;
  profile: CastleDeckProfile;
  onDeck: (id: string) => void;
  onContract: (id: CastleContractId) => void;
  onCurve: (curve: StudyRewardCurve) => void;
  onRecallMode: (mode: StudyRecallMode) => void;
  onKeepsake: (id: CastleKeepsakeId) => void;
  onStart: () => void;
  onExit: () => void;
}) {
  const nextKeepsake = Object.values(CASTLE_KEEPSAKE_DEFS).find(keepsake => !profile.unlockedKeepsakeIds.includes(keepsake.id));
  return (
    <main className="castle-setup-shell">
      <button className="castle-setup-exit" onClick={onExit}><ArrowLeft />Main menu</button>
      <section className="castle-setup-card">
        <PipploSprite className="castle-setup-pipplo" />
        <p className="castle-eyebrow">Combat Lab · rebuilt</p>
        <h1>Pipplo's Goo Keep</h1>
        <p>Recall words, hatch a wobbling army, and push across the lane before the rival keep overwhelms yours.</p>

        <div className="castle-setup-loop" aria-label="How a run works">
          <div><BookOpen /><span><b>1. Study</b>New directions teach first and pause safely.</span></div>
          <div><Swords /><span><b>2. Command</b>Switch panels to spend recall energy.</span></div>
          <div><Castle /><span><b>3. Conquer</b>Break keeps and evolve your run build.</span></div>
        </div>

        <section className="castle-profile-summary" aria-label="Keeper chronicle">
          <header><FlaskConical /><div><span>Keeper chronicle</span><b>This deck-world remembers every expedition</b></div></header>
          <div className="castle-profile-metrics">
            <span><b>{profile.runsCompleted}</b><small>runs completed</small></span>
            <span><b>{profile.guardianClears}</b><small>guardians cleared</small></span>
            <span><b>{profile.totalReviews}</b><small>reviews recorded</small></span>
            <span><b>{profile.bestRegion}</b><small>deepest region</small></span>
          </div>
          {nextKeepsake
            ? <p><Sparkles /><span><b>Next keepsake: {nextKeepsake.name}</b>{nextKeepsake.unlockHint}</span></p>
            : <p><Sparkles /><span><b>All keepsakes discovered</b>Mallow has no more trinkets to hide.</span></p>}
        </section>

        <h2 className="castle-setup-label" id="castle-deck-label">Study world</h2>
        <div className="castle-deck-grid" role="group" aria-labelledby="castle-deck-label">
          {decks.map(deck => (
            <button key={deck.id} aria-pressed={selectedDeckId === deck.id} className={selectedDeckId === deck.id ? "is-selected" : ""} onClick={() => onDeck(deck.id)}>
              <BookOpen />
              <strong>{deck.name}</strong>
              <span>{deck.introducedCount} active · {deck.reviewCount} reviews</span>
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
        <button className="castle-start-run" onClick={onStart}><Castle />Begin castle run<ChevronRight /></button>
      </section>
    </main>
  );
}

const ROUTE_INFO: Record<CastleRouteChoice, { name: string; description: string; icon: typeof Swords }> = {
  battle: { name: "Straight Road", description: "Start with a scouting Piplet and +0.5 energy.", icon: Swords },
  rest: { name: "Soft Nest", description: "Repair 28 keep HP; Moss Coat also banks 2 energy.", icon: Heart },
  workshop: { name: "Goo Workshop", description: "Start with +1.5 energy and 8 barrier.", icon: FlaskConical },
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
  spitlet: "Attacks from long range and deals 3 bonus damage when cracking a shield.",
  bigChonk: "A slow, durable siege unit. Bank energy for one when the lane needs a lasting frontline.",
  shellSlime: "Arrives with 6 shield and stalls light attackers.",
  nibbleImp: "A fragile but dangerous sprinter that punishes an undefended lane.",
  sporeBud: "Lobs ranged spores that slow the friendly unit it hits.",
  echoMoth: "Attacks from range and siphons 0.15 energy whenever it reaches Pipplo’s keep.",
  rootLump: "A guardian siege beast with armor, heavy attacks, and enough health to anchor an enemy wave.",
};

const ENEMY_GUIDE_KINDS: CastleUnitKind[] = ["shellSlime", "nibbleImp", "sporeBud", "echoMoth", "rootLump"];

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
    title: "Seen cards keep the battle moving",
    copy: "Once taught, combat continues while you answer. Balanced recall asks familiar foreign terms by typing; harder cards pay more energy and misses advance Enemy Rally.",
  },
  {
    icon: Swords,
    eyebrow: "Army command",
    title: "Switch panels whenever you choose",
    copy: "Open Army & Powers to summon units or cast from Pipplo’s keep. Seen-card combat remains live, but command time is excluded from your recall record.",
  },
  {
    icon: Castle,
    eyebrow: "Run strategy",
    title: "Break keeps and build a run",
    copy: "Every five correct recalls fires a Recall Bolt. After each keep, choose a mutation and one of three drafted routes; story events reveal every consequence before you commit.",
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
  const [pipploAnimation, setPipploAnimation] = useState<PipploAnimationState>({ name: "idle", serial: 0 });
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(CASTLE_SOUND_KEY) !== "off");
  const questionStartedAt = useRef(0);
  const questionCommandMs = useRef(0);
  const questionCommandStartedAt = useRef<number | null>(null);
  const lastSaveAt = useRef(0);
  const previousPhase = useRef<CastleRunState["phase"] | null>(initial.run?.phase || null);
  const pipploAnimationTimer = useRef<number | null>(null);
  const activeDialogRef = useRef<HTMLElement | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);

  const selectedDeck = useMemo(() => decks.find(deck => deck.id === selectedDeckId), [decks, selectedDeckId]);
  const activeDialogKey = tutorialOpen
    ? "tutorial"
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
    setProfile(saveCastleRun(selectedDeckId, run));
  }, [run, selectedDeckId]);

  useEffect(() => {
    if (!simulationReady) return;
    const calmMultiplier = run?.upgrades.includes("calmBell") && run.battle.playerCastleHp / run.battle.playerCastleMaxHp < 0.25 ? 0.75 : 1;
    const timer = window.setInterval(() => {
      setRun(current => current ? tickCastleRun(current, 100, (question?.pressure.combatSpeed || 1) * calmMultiplier) : current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [simulationReady, question, run?.upgrades, run?.battle.playerCastleHp, run?.battle.playerCastleMaxHp]);

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

  const chooseDeck = (deckId: string) => {
    selectStudyDeck(deckId);
    setSelectedDeckId(deckId);
    setProfile(loadCastleProfile(deckId));
    const restored = loadCastleRun(deckId);
    setRun(restored ? pauseCastleBattle(restored, "Saved run restored. Resume when ready.") : null);
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
    selectStudyDeck(selectedDeckId);
    const next = introduceForBattle(createInitialCastleRun(
      selectedDeckId,
      contractId,
      rewardCurve,
      profile.unlockedUpgradeIds,
      undefined,
      recallMode,
      profile.selectedKeepsakeId,
    ));
    const nextQuestion = drawStudyQuestion(selectedDeckId, next.rewardCurve, undefined, next.recallMode);
    clearCastleRun(selectedDeckId);
    setQuestion(nextQuestion);
    setFeedback(null);
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
    const nextQuestion = drawStudyQuestion(selectedDeckId, baseRun.rewardCurve, previousKey, baseRun.recallMode);
    setQuestion(nextQuestion);
    setFeedback(null);
    setReveal(false);
    setInterrupted(false);
    setPanelMode("study");
    startQuestionTimer();
    setRun(nextQuestion.seenBefore
      ? resumeCastleBattle(baseRun)
      : pauseCastleBattle(baseRun, "First exposure protected: combat remains paused while you learn this direction."));
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
    const result: StudyAnswerResult = answerStudyQuestion(selectedDeckId, question, correct);
    const responseMs = getQuestionResponseMs();
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
    const nextFeedback: ReviewFeedback = {
      correct,
      answer: result.answer,
      reward: correct ? question.reward : 0,
      wasUnseen: result.wasUnseen,
      masteryEvent: result.masteryEvent,
    };
    if (result.wasUnseen) {
      setRun(current => current ? pauseCastleBattle(
        applyCastleStudyOutcome(current, outcome),
        "First exposure complete. Review the answer before continuing.",
      ) : current);
      setFeedback(nextFeedback);
    } else if (!correct) {
      setFeedback({ ...nextFeedback, requiresCorrection: true });
      setReveal(false);
      setRun(current => current ? resumeCastleBattle(applyCastleStudyOutcome(current, outcome)) : current);
    } else {
      const previousKey = getStudyQuestionKey(question);
      const nextQuestion = drawStudyQuestion(selectedDeckId, run.rewardCurve, previousKey, run.recallMode);
      setQuestion(nextQuestion);
      setFeedback(nextFeedback);
      setReveal(false);
      setInterrupted(false);
      setPanelMode("study");
      startQuestionTimer();
      setRun(current => {
        if (!current) return current;
        const resolved = applyCastleStudyOutcome(current, outcome);
        return nextQuestion.seenBefore
          ? resumeCastleBattle(resolved)
          : pauseCastleBattle(resolved, "First exposure protected: combat remains paused while you learn this direction.");
      });
    }
    setDecks(getStudyDecks());
  };

  const finishExposure = () => {
    if (!question || !run || question.seenBefore) return;
    playCastleSound("correct", soundEnabled);
    const result = completeStudyExposure(selectedDeckId, question);
    const previousKey = getStudyQuestionKey(question);
    const outcome = {
      isCorrect: true,
      isExposure: true,
      wasUnseen: true,
      reward: question.reward,
      progressKey: result.progressKey,
      responseMs: getQuestionResponseMs(),
      selfGraded: false,
      questionType: question.questionType,
      due: true,
    };
    const nextQuestion = drawStudyQuestion(selectedDeckId, run.rewardCurve, previousKey, run.recallMode);
    setQuestion(nextQuestion);
    setFeedback(null);
    setReveal(false);
    setInterrupted(false);
    setPanelMode("study");
    startQuestionTimer();
    setRun(current => {
      if (!current) return current;
      const resolved = applyCastleStudyOutcome(current, outcome);
      return nextQuestion.seenBefore
        ? resumeCastleBattle(resolved)
        : pauseCastleBattle(resolved, "New direction: combat remains paused while you learn both sides.");
    });
    setDecks(getStudyDecks());
  };

  const revealAnswer = () => {
    setReveal(true);
  };

  const resetRun = () => {
    clearCastleRun(selectedDeckId);
    setRun(null);
    setQuestion(null);
    setFeedback(null);
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

  const downloadBalance = () => {
    const blob = new Blob([exportCastleBalanceData(selectedDeckId)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `goo-keep-balance-${selectedDeckId}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  if (!run) {
    return (
      <DeckSetup
        decks={decks}
        selectedDeckId={selectedDeckId}
        contractId={contractId}
        rewardCurve={rewardCurve}
        recallMode={recallMode}
        profile={profile}
        onDeck={chooseDeck}
        onContract={setContractId}
        onCurve={setRewardCurve}
        onRecallMode={setRecallMode}
        onKeepsake={id => setProfile(selectCastleKeepsake(selectedDeckId, id))}
        onStart={startRun}
        onExit={onExit}
      />
    );
  }

  const activeEvent = run.pendingEventId ? CASTLE_EVENT_DEFS[run.pendingEventId] : null;
  const studyReport = getCastleStudyReport(run);

  return (
    <main className="castle-lab-shell">
      <header className="castle-lab-header">
        <button onClick={onExit} aria-label="Exit Combat Lab"><ArrowLeft /></button>
        <div>
          <span>{selectedDeck?.name || "Study world"}</span>
          <b>Pipplo's Goo Keep</b>
        </div>
        <span className="castle-header-stats"><BookOpen />{run.reviews} <Swords />{run.battlesWon}</span>
        <button onClick={() => { pauseForInterruption(); setHelpOpen(true); }} aria-label="How to play"><CircleHelp /></button>
        <button onClick={() => { pauseForInterruption(); setSettingsOpen(true); }} aria-label="Settings and balance"><Settings /></button>
      </header>

      <CastleScene run={run} pipploAnimation={pipploAnimation} />

      <section className="castle-notice" aria-live="polite">
        <b>{tutorialOpen ? "Tutorial pause" : run.battle.mode === "study" ? "Combat live" : question && !question.seenBefore ? "New card pause" : "Paused"}</b>
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
          key={getStudyQuestionKey(question)}
          question={question}
          reveal={reveal}
          combatLive={simulationReady}
          interrupted={interrupted}
          onOption={option => finishReview(option === question.answer)}
          onTyped={answer => finishReview(isTypedStudyAnswerCorrect(answer, question.answer, question.direction))}
          onReveal={revealAnswer}
          onSelfGrade={finishReview}
          onExpose={finishExposure}
          onResume={resumeInterruptedQuestion}
        />
      )}

      {run.phase === "battle" && panelMode === "study" && !question && (
        <section className="castle-study-launch">
          <div className="castle-ready-copy">
            <BookOpen />
            <div>
              <b>{run.reviews === 0 ? "The lane is ready" : "Resume continuous study"}</b>
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
              <b>{simulationReady ? "The lane is still fighting" : question && !question.seenBefore ? "An unseen direction is protecting the lane" : "Combat is manually paused"}</b>
              <span>{question ? `Waiting flashcard: ${question.prompt}` : "Start flashcards when your army is ready."}</span>
            </div>
            <button className="castle-guide-button" onClick={() => { pauseForInterruption(); setGuideOpen(true); }}><CircleHelp />Field guide<small>safe pause</small></button>
          </div>
          <CommandTray
            run={run}
            onSummon={summonUnit}
            onPower={usePower}
          />
          <button className="castle-back-to-study" onClick={() => changePanelMode("study")}><BookOpen />Back to flashcards</button>
        </section>
      )}

      {run.phase === "reward" && (
        <aside className="castle-overlay">
          <section ref={activeDialogRef} tabIndex={-1} className="castle-reward-sheet" role="dialog" aria-modal="true" aria-label="Choose a run upgrade">
            <PipploSprite className="castle-celebration-pipplo" animation="cheer" loop />
            <p className="castle-eyebrow">Castle absorbed</p>
            <h2>What should Pipplo digest?</h2>
            <p>Choose one transformation for the rest of this run.</p>
            <div className="castle-reward-grid">
              {run.rewardChoices.map(id => {
                const reward = CASTLE_UPGRADE_DEFS[id];
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
                <span><Sparkles />{formatCastleEnergy(run.carriedEnergy)} energy</span>
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
                      <b>{choice.effect}</b>
                      {!available && choice.requiresEnergy && <small>Need {choice.requiresEnergy} energy</small>}
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
            <p>{run.reviews} reviews · {run.correct} correct · {run.wrong} missed · {run.battlesWon} castles defeated</p>
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
              }}>Continue endlessly</button>
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
                <span><b>{studyReport.typedReviews}</b><small>typed recalls</small></span>
                <span><b>{studyReport.difficultRecalls}</b><small>difficult wins</small></span>
              </div>
              <p>{studyReport.exposures} safe first exposure{studyReport.exposures === 1 ? "" : "s"} · {studyReport.dueReviews} due prompt{studyReport.dueReviews === 1 ? "" : "s"} practiced</p>
              <aside><Sparkles /><div><b>Next expedition</b><span>{studyReport.recommendation}</span></div></aside>
            </section>
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
              <span><Sparkles /><b>Energy</b><small>Correct recalls fund summons and castle powers.</small></span>
              <span><Zap /><b>Recall Bolt</b><small>Five correct seen recalls deal 8 damage directly to the rival keep.</small></span>
              <span><Swords /><b>Enemy Rally</b><small>A miss adds a pip. Recall that direction later to clear one; three uncleared pips summon a bonus squad.</small></span>
              <span><Clock3 /><b>Next wave</b><small>The HUD previews the next enemy so you can choose what to buy.</small></span>
              <span><Castle /><b>Guardian phases</b><small>At 66% and 33% HP, guardians telegraph reinforcements and attack faster.</small></span>
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
              {getPlayerSummonKinds().map(kind => {
                const unit = CASTLE_UNIT_DEFS[kind];
                return <article key={kind}><SlimeFace kind={kind} side="player" /><div><b>{unit.name}</b><span>{CASTLE_UNIT_GUIDE[kind]}</span><small>{unit.cost} energy · {unit.hp} HP · {unit.damage} attack · {unit.range >= 10 ? "ranged" : unit.speed >= 7 ? "fast" : "melee"}</small></div></article>;
              })}
            </div>

            <h3>Castle powers</h3>
            <div className="castle-guide-list is-powers">
              {Object.values(CASTLE_POWER_DEFS).map(power => {
                const unlocked = !power.requiredUpgradeId || run.upgrades.includes(power.requiredUpgradeId);
                return <article key={power.id}><Zap /><div><b>{power.name}</b><span>{power.description}</span><small>{power.cost} energy · {unlocked ? "available this battle" : `requires ${CASTLE_UPGRADE_DEFS[power.requiredUpgradeId!].name}`}</small></div></article>;
              })}
            </div>

            <h3>Enemy families <small>{ENEMY_GUIDE_KINDS.filter(kind => profile.discoveredEnemyKinds.includes(kind)).length}/{ENEMY_GUIDE_KINDS.length} discovered</small></h3>
            <div className="castle-guide-list">
              {ENEMY_GUIDE_KINDS.map(kind => {
                const discovered = profile.discoveredEnemyKinds.includes(kind) || run.battle.units.some(unit => unit.side === "enemy" && unit.kind === kind);
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
            <p>A new card direction is shown as an ungraded lesson with both sides visible, and combat freezes completely. Once taught, that direction becomes a live recall prompt.</p>
            <p>Correct recall earns energy, and every five correct seen-card recalls fire a Recall Bolt at the rival keep. A miss keeps combat live, requires a correction step, and fills Enemy Rally; recalling that missed direction later clears one pip before it triggers.</p>
            <p>Balanced Recall uses recognition while a direction is fragile, then asks you to type familiar foreign terms. Case and punctuation are ignored; multiple-choice prompts also accept keys 1–4. Deck Default and Type Every Answer remain available in settings.</p>
            <p>Flashcards continue automatically after every seen answer. Switch to Army &amp; Powers whenever you want to summon or cast; battle keeps moving, but command time never counts as flashcard response time.</p>
            <p>Opening help, settings, or leaving the window pauses the current prompt so an interruption never costs your castle.</p>
            <p>After each victory you draft one mutation, then choose from three routes. Detours open a story event with three visible outcomes; unaffordable bargains are disabled before you choose.</p>
            <p>Each region has its own enemy mix and colors. Guardian keeps change at 66% and 33% HP; the center banner names the phase before the new squad arrives.</p>
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
            <label>Reward curve<select value={run.rewardCurve} onChange={event => setRun(current => current ? { ...current, rewardCurve: event.target.value as StudyRewardCurve } : current)}>{(Object.keys(REWARD_CURVE_LABELS) as StudyRewardCurve[]).map(curve => <option key={curve} value={curve}>{REWARD_CURVE_LABELS[curve]}</option>)}</select><small>{REWARD_CURVE_HELP[run.rewardCurve]}</small></label>
            <label>Recall style<select value={run.recallMode} onChange={event => {
              const mode = event.target.value as StudyRecallMode;
              setRecallMode(mode);
              setRun(current => current ? { ...current, recallMode: mode } : current);
            }}>{(Object.keys(RECALL_MODE_LABELS) as StudyRecallMode[]).map(mode => <option key={mode} value={mode}>{RECALL_MODE_LABELS[mode]}</option>)}</select><small>{RECALL_MODE_HELP[run.recallMode]}</small></label>
            <label className="castle-sound-toggle"><input type="checkbox" checked={soundEnabled} onChange={event => setSoundEnabled(event.target.checked)} />Sound cues</label>
            <div className="castle-telemetry-grid">
              <span><b>{formatCastleEnergy(run.battle.telemetry.energyEarned)}</b>energy earned</span>
              <span><b>{formatCastleEnergy(run.battle.telemetry.energySpent)}</b>energy spent</span>
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
