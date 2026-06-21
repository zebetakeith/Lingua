import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  drawStudyQuestion,
  getSelectedStudyDeckId,
  getStudyDecks,
  getStudyQuestionKey,
  introduceStudyCards,
  selectStudyDeck,
  type StudyAnswerResult,
  type StudyDeckSummary,
  type StudyQuestion,
} from "../game/studyBridge";
import type { StudyRewardCurve } from "../game/study";
import {
  CASTLE_CONTRACTS,
  CASTLE_POWER_DEFS,
  CASTLE_RECALL_BOLT_LIMIT,
  CASTLE_RALLY_LIMIT,
  CASTLE_UNIT_DEFS,
  CASTLE_UPGRADE_DEFS,
  applyCastleStudyOutcome,
  activateCastlePower,
  chooseCastleRoute,
  claimCastleUpgrade,
  continueCastleRun,
  createInitialCastleRun,
  formatCastleEnergy,
  getAvailableCastlePowers,
  getCastleBattleProgress,
  getPlayerSummonKinds,
  pauseCastleBattle,
  recordCastleIntroductions,
  resumeCastleBattle,
  retireCastleRun,
  summonCastleUnit,
  tickCastleRun,
  type CastleContractId,
  type CastlePowerId,
  type CastleRouteChoice,
  type CastleRunState,
  type CastleUnitKind,
} from "./castleBattle";
import {
  clearCastleRun,
  exportCastleBalanceData,
  loadCastleProfile,
  loadCastleRun,
  saveCastleRun,
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
}

type CastlePanelMode = "study" | "army";

const REWARD_CURVE_LABELS: Record<StudyRewardCurve, string> = {
  current: "Classic",
  quadratic: "Curved",
  steep: "Steep",
};
const CASTLE_SOUND_KEY = "lexicon_labyrinth_castle_sound";

function CastleHealth({ current, max, enemy = false }: { current: number; max: number; enemy?: boolean }) {
  const percent = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div className={`castle-health ${enemy ? "is-enemy" : ""}`}>
      <span>{enemy ? "Rival Keep" : "Pipplo's Keep"}</span>
      <div><i style={{ width: `${percent}%` }} /></div>
      <b>{Math.ceil(current)}/{max}</b>
    </div>
  );
}

function SlimeFace({ kind, side }: { kind: CastleUnitKind; side: "player" | "enemy" }) {
  return (
    <span className={`castle-unit-face kind-${kind} side-${side}`} aria-hidden="true">
      <i /><i />
      <b />
    </span>
  );
}

function CastleScene({ run }: { run: CastleRunState }) {
  const battle = run.battle;
  const playerCastleHit = battle.fxEvents.some(event => event.kind === "hit" && event.position <= 3);
  const enemyCastleHit = battle.fxEvents.some(event => event.kind === "hit" && event.position >= 97);
  const friendlyUnits = battle.units.filter(unit => unit.side === "player").length;
  const enemyUnits = battle.units.length - friendlyUnits;
  return (
    <section
      className={`castle-scene ${battle.mode === "study" ? "is-live" : "is-paused"}`}
      aria-label={`Castle battlefield. Pipplo's Keep ${Math.ceil(battle.playerCastleHp)} health, Rival Keep ${Math.ceil(battle.enemyCastleHp)} health. ${friendlyUnits} friendly and ${enemyUnits} enemy units in the lane.`}
    >
      <div className="castle-sky-orb" />
      <div className="castle-scene-status">
        <CastleHealth current={battle.playerCastleHp} max={battle.playerCastleMaxHp} />
        <div className="castle-region-chip">
          <span>{getCastleBattleProgress(run)}</span>
          <b>{battle.guardian ? "Guardian" : "Lane battle"}</b>
        </div>
        <CastleHealth current={battle.enemyCastleHp} max={battle.enemyCastleMaxHp} enemy />
      </div>

      <div className="castle-lane">
        <div className={`castle-home is-player ${playerCastleHit ? "is-hit" : ""}`}>
          <div className="pipplo-keeper"><i /><i /><b /><em /></div>
          <div className="castle-tower"><span /><span /><span /></div>
          {battle.playerBarrier > 0 && <div className="castle-barrier"><Shield />{Math.ceil(battle.playerBarrier)}</div>}
        </div>
        <div className="castle-road">
          <div className="castle-mid-flag"><i /><span /></div>
          {battle.units.map(unit => (
            <div
              key={unit.id}
              className={`castle-lane-unit side-${unit.side} ${unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs - 180 ? "is-attacking" : ""}`}
              style={{ "--unit-x": `${unit.position}%`, "--unit-accent": CASTLE_UNIT_DEFS[unit.kind].accent } as CSSProperties}
              title={`${CASTLE_UNIT_DEFS[unit.kind].name}: ${Math.ceil(unit.hp)}/${unit.maxHp} HP`}
            >
              {unit.shield > 0 && <span className="castle-unit-shield" />}
              <SlimeFace kind={unit.kind} side={unit.side} />
              <span className="castle-unit-hp"><i style={{ width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%` }} /></span>
            </div>
          ))}
          {battle.fxEvents.map(event => (
            <span
              key={event.id}
              className={`castle-battle-fx fx-${event.kind} side-${event.side}`}
              style={{ "--fx-x": `${event.position}%` } as CSSProperties}
              aria-hidden="true"
            >
              <i />
              {event.label && <b>{event.label}</b>}
            </span>
          ))}
        </div>
        <div className={`castle-home is-enemy ${enemyCastleHit ? "is-hit" : ""}`}>
          <div className="castle-tower"><span /><span /><span /></div>
          <div className="enemy-keeper"><i /><i /><b /></div>
        </div>
      </div>

      <div className="castle-battle-strip">
        <span className="castle-energy"><Sparkles />{formatCastleEnergy(battle.energy)} energy</span>
        <span className="castle-recall-bolt" title="Five correct seen-card recalls fire an 8-damage castle bolt">
          Recall Bolt
          {Array.from({ length: CASTLE_RECALL_BOLT_LIMIT }, (_, index) => <i key={index} className={index < battle.recallBoltCharge ? "is-filled" : ""} />)}
        </span>
        <span className="castle-rally">
          Enemy Rally
          {Array.from({ length: CASTLE_RALLY_LIMIT }, (_, index) => <i key={index} className={index < battle.rally ? "is-filled" : ""} />)}
        </span>
        <span className="castle-wave">
          Next: <SlimeFace kind={battle.nextEnemyKind} side="enemy" /> {CASTLE_UNIT_DEFS[battle.nextEnemyKind].name}
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
        <small>Combat keeps moving while this tray is open.</small>
      </div>
      <div className="castle-command-scroll">
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
  onReveal,
  onSelfGrade,
  onResume,
}: {
  question: StudyQuestion;
  reveal: boolean;
  combatLive: boolean;
  interrupted: boolean;
  onOption: (option: string) => void;
  onReveal: () => void;
  onSelfGrade: (correct: boolean) => void;
  onResume: () => void;
}) {
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
        <Sparkles />Worth {formatCastleEnergy(question.reward)}
      </div>
      <h2>{question.prompt}</h2>
      {interrupted ? (
        <button className="castle-resume-card" onClick={onResume}><Play />Resume this prompt</button>
      ) : question.questionType === "multiple_choice" ? (
        <div className="castle-answer-grid">
          {question.options.map(option => <button key={option} onClick={() => onOption(option)}>{option}</button>)}
        </div>
      ) : reveal ? (
        <div className="castle-self-grade">
          <strong>{question.answer}</strong>
          <span>Did you recall it before revealing?</span>
          <div>
            <button onClick={() => onSelfGrade(false)}>Not yet</button>
            <button className="is-correct" onClick={() => onSelfGrade(true)}>Got it</button>
          </div>
        </div>
      ) : (
        <button className="castle-flip-card" onClick={onReveal}>Reveal answer</button>
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
      {onContinue && <button onClick={onContinue}>Continue learning</button>}
    </div>
  );
}

function DeckSetup({
  decks,
  selectedDeckId,
  contractId,
  rewardCurve,
  profile,
  onDeck,
  onContract,
  onCurve,
  onStart,
  onExit,
}: {
  decks: StudyDeckSummary[];
  selectedDeckId: string;
  contractId: CastleContractId;
  rewardCurve: StudyRewardCurve;
  profile: CastleDeckProfile;
  onDeck: (id: string) => void;
  onContract: (id: CastleContractId) => void;
  onCurve: (curve: StudyRewardCurve) => void;
  onStart: () => void;
  onExit: () => void;
}) {
  return (
    <main className="castle-setup-shell">
      <button className="castle-setup-exit" onClick={onExit}><ArrowLeft />Main menu</button>
      <section className="castle-setup-card">
        <div className="castle-setup-pipplo"><i /><i /><b /><em /></div>
        <p className="castle-eyebrow">Combat Lab · rebuilt</p>
        <h1>Pipplo's Goo Keep</h1>
        <p>Recall words, hatch a wobbling army, and push across the lane before the rival keep overwhelms yours.</p>

        <label className="castle-setup-label">Study world</label>
        <div className="castle-deck-grid">
          {decks.map(deck => (
            <button key={deck.id} className={selectedDeckId === deck.id ? "is-selected" : ""} onClick={() => onDeck(deck.id)}>
              <BookOpen />
              <strong>{deck.name}</strong>
              <span>{deck.introducedCount} active · {deck.reviewCount} reviews</span>
            </button>
          ))}
        </div>

        <label className="castle-setup-label">Expedition contract</label>
        <div className="castle-contract-grid">
          {(Object.keys(CASTLE_CONTRACTS) as CastleContractId[]).map(id => {
            const contract = CASTLE_CONTRACTS[id];
            return (
              <button key={id} className={contractId === id ? "is-selected" : ""} onClick={() => onContract(id)}>
                <strong>{contract.name}</strong>
                <span>{contract.regions} region{contract.regions === 1 ? "" : "s"} · about {contract.minutes} min</span>
                <small>Up to {contract.newCards} new cards</small>
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
          </label>
          <div><Sparkles /><b>{profile.unlockedUpgradeIds.length}</b><span>discoveries unlocked</span></div>
        </div>
        <button className="castle-start-run" onClick={onStart}><Castle />Begin castle run<ChevronRight /></button>
      </section>
    </main>
  );
}

const ROUTE_INFO: Record<CastleRouteChoice, { name: string; description: string; icon: typeof Swords }> = {
  battle: { name: "Straight Road", description: "Press onward with no bargain.", icon: Swords },
  rest: { name: "Soft Nest", description: "Repair 28 castle health.", icon: Heart },
  workshop: { name: "Goo Workshop", description: "Begin with 1.5 extra energy.", icon: FlaskConical },
  event: { name: "Humming Well", description: "Trade 5 castle health for 3 energy.", icon: Sparkles },
};

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
  const [question, setQuestion] = useState<StudyQuestion | null>(null);
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
  const [reveal, setReveal] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [panelMode, setPanelMode] = useState<CastlePanelMode>("study");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(CASTLE_SOUND_KEY) !== "off");
  const questionStartedAt = useRef(0);
  const lastSaveAt = useRef(0);
  const previousPhase = useRef<CastleRunState["phase"] | null>(initial.run?.phase || null);

  const selectedDeck = useMemo(() => decks.find(deck => deck.id === selectedDeckId), [decks, selectedDeckId]);
  const simulationReady = Boolean(
    run
    && !interrupted
    && run.phase === "battle"
    && run.battle.mode === "study",
  );

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
    if (!feedback || feedback.wasUnseen) return;
    const timer = window.setTimeout(() => setFeedback(null), 2_800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

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
    if (!helpOpen && !settingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHelpOpen(false);
      setSettingsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [helpOpen, settingsOpen]);

  const pauseForInterruption = useCallback(() => {
    if (!question) return;
    setInterrupted(true);
    setRun(current => current ? pauseCastleBattle(current, "Combat paused after an interruption.") : current);
  }, [question]);

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
    setDecks(getStudyDecks());
  };

  const startRun = () => {
    selectStudyDeck(selectedDeckId);
    const contract = CASTLE_CONTRACTS[contractId];
    const introduced = introduceStudyCards(selectedDeckId, contract.newCards);
    const next = recordCastleIntroductions(
      createInitialCastleRun(selectedDeckId, contractId, rewardCurve, profile.unlockedUpgradeIds),
      introduced.length,
    );
    const nextQuestion = drawStudyQuestion(selectedDeckId, next.rewardCurve);
    clearCastleRun(selectedDeckId);
    setQuestion(nextQuestion);
    setFeedback(null);
    setReveal(false);
    setInterrupted(false);
    setPanelMode("study");
    questionStartedAt.current = Date.now();
    setRun(nextQuestion.seenBefore
      ? resumeCastleBattle(next)
      : pauseCastleBattle(next, "First exposure protected: combat remains paused while you learn this direction."));
    setDecks(getStudyDecks());
  };

  const beginQuestion = (baseRun = run, previousKeyOverride?: string | null) => {
    if (!baseRun || baseRun.phase !== "battle") return;
    const previousKey = previousKeyOverride === null
      ? undefined
      : previousKeyOverride ?? (question ? getStudyQuestionKey(question) : undefined);
    const nextQuestion = drawStudyQuestion(selectedDeckId, baseRun.rewardCurve, previousKey);
    setQuestion(nextQuestion);
    setFeedback(null);
    setReveal(false);
    setInterrupted(false);
    setPanelMode("study");
    questionStartedAt.current = Date.now();
    setRun(nextQuestion.seenBefore
      ? resumeCastleBattle(baseRun)
      : pauseCastleBattle(baseRun, "First exposure protected: combat remains paused while you learn this direction."));
  };

  const resumeInterruptedQuestion = () => {
    if (!question) return;
    setInterrupted(false);
    questionStartedAt.current = Date.now();
    setRun(current => current
      ? question.seenBefore
        ? resumeCastleBattle(current)
        : pauseCastleBattle(current, "First exposure protected: combat remains paused.")
      : current);
  };

  const finishReview = (correct: boolean) => {
    if (!question || !run || feedback?.wasUnseen) return;
    const firesRecallBolt = correct && question.seenBefore && run.battle.recallBoltCharge === CASTLE_RECALL_BOLT_LIMIT - 1;
    playCastleSound(firesRecallBolt ? "bolt" : correct ? "correct" : "wrong", soundEnabled);
    const result: StudyAnswerResult = answerStudyQuestion(selectedDeckId, question, correct);
    const responseMs = Math.max(0, Date.now() - questionStartedAt.current);
    const outcome = {
      isCorrect: correct,
      wasUnseen: result.wasUnseen,
      reward: correct ? question.reward : 0,
      progressKey: result.progressKey,
      responseMs,
      selfGraded: question.questionType === "self_grade",
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
    } else {
      const previousKey = getStudyQuestionKey(question);
      const nextQuestion = drawStudyQuestion(selectedDeckId, run.rewardCurve, previousKey);
      setQuestion(nextQuestion);
      setFeedback(nextFeedback);
      setReveal(false);
      setInterrupted(false);
      setPanelMode("study");
      questionStartedAt.current = Date.now();
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

  const summonUnit = (kind: CastleUnitKind) => {
    if (!run || run.phase !== "battle" || run.battle.energy < CASTLE_UNIT_DEFS[kind].cost) return;
    playCastleSound("summon", soundEnabled);
    setRun(current => current ? summonCastleUnit(current, kind) : current);
  };

  const usePower = (id: CastlePowerId) => {
    const power = CASTLE_POWER_DEFS[id];
    if (!run || run.phase !== "battle" || run.battle.energy < power.cost) return;
    playCastleSound("power", soundEnabled);
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
        profile={profile}
        onDeck={chooseDeck}
        onContract={setContractId}
        onCurve={setRewardCurve}
        onStart={startRun}
        onExit={onExit}
      />
    );
  }

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

      <CastleScene run={run} />

      <section className="castle-notice" aria-live="polite">
        <b>{run.battle.mode === "study" ? "Combat live" : question && !question.seenBefore ? "New card pause" : "Paused"}</b>
        <span>{run.battle.notice || run.notice}</span>
      </section>

      {run.phase === "battle" && (
        <nav className="castle-mode-switch" aria-label="Battle panel">
          <button aria-pressed={panelMode === "study"} className={panelMode === "study" ? "is-active" : ""} onClick={() => setPanelMode("study")}><BookOpen />Flashcards</button>
          <button aria-pressed={panelMode === "army"} className={panelMode === "army" ? "is-active" : ""} onClick={() => setPanelMode("army")}><Swords />Army & powers <b>{formatCastleEnergy(run.battle.energy)}</b></button>
        </nav>
      )}

      {feedback && !feedback.wasUnseen && <div className="castle-feedback-toast" role="status" aria-live="polite"><ReviewResult feedback={feedback} /></div>}

      {run.phase === "battle" && panelMode === "study" && feedback?.wasUnseen && (
        <section className="castle-protected-result" role="status" aria-live="polite">
          <p className="castle-eyebrow">First exposure complete · combat remains paused</p>
          <ReviewResult feedback={feedback} onContinue={() => beginQuestion(run, question ? getStudyQuestionKey(question) : undefined)} />
        </section>
      )}

      {run.phase === "battle" && panelMode === "study" && question && !feedback?.wasUnseen && (
        <StudyCard
          question={question}
          reveal={reveal}
          combatLive={simulationReady}
          interrupted={interrupted}
          onOption={option => finishReview(option === question.answer)}
          onReveal={revealAnswer}
          onSelfGrade={finishReview}
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
          </div>
          <CommandTray
            run={run}
            onSummon={summonUnit}
            onPower={usePower}
          />
          <button className="castle-back-to-study" onClick={() => setPanelMode("study")}><BookOpen />Back to flashcards</button>
        </section>
      )}

      {run.phase === "reward" && (
        <aside className="castle-overlay">
          <section className="castle-reward-sheet" role="dialog" aria-modal="true" aria-label="Choose a run upgrade">
            <Sparkles />
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
          <section className="castle-route-sheet" role="dialog" aria-modal="true" aria-label="Choose the next route">
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
                  const nextRun = chooseCastleRoute(run, choice);
                  if (nextRun.phase === "battle") beginQuestion(nextRun, null);
                  else setRun(nextRun);
                }}><Icon /><strong>{info.name}</strong><span>{info.description}</span></button>;
              })}
            </div>
          </section>
        </aside>
      )}

      {run.phase === "retire" && (
        <aside className="castle-overlay">
          <section className="castle-result-sheet is-win" role="dialog" aria-modal="true" aria-label="Study contract complete">
            <Castle />
            <p className="castle-eyebrow">Contract complete</p>
            <h2>Pipplo can head home—or wobble deeper</h2>
            <p>{run.reviews} reviews · {run.correct} correct · {run.wrong} missed · {run.battlesWon} castles defeated</p>
            <div>
              <button onClick={() => setRun(current => current ? retireCastleRun(current) : current)}>Retire successfully</button>
              <button onClick={() => {
                setQuestion(null);
                setFeedback(null);
                setReveal(false);
                setPanelMode("study");
                const nextRun = continueCastleRun(run);
                if (nextRun.phase === "battle") beginQuestion(nextRun, null);
                else setRun(nextRun);
              }}>Continue endlessly</button>
            </div>
          </section>
        </aside>
      )}

      {(run.phase === "complete" || run.phase === "lost") && (
        <aside className="castle-overlay">
          <section className={`castle-result-sheet ${run.phase === "complete" ? "is-win" : "is-loss"}`} role="dialog" aria-modal="true" aria-label={run.phase === "complete" ? "Expedition complete" : "Expedition lost"}>
            {run.phase === "complete" ? <Sparkles /> : <Heart />}
            <p className="castle-eyebrow">{run.phase === "complete" ? "Expedition complete" : "Pipplo needs a nap"}</p>
            <h2>{run.phase === "complete" ? "The deck-world grew" : "The castle fell; the learning stayed"}</h2>
            <p>{run.reviews} reviews · {run.correct} correct · {run.wrong} missed · best region {run.bestRegion}</p>
            <div className="castle-result-stats">
              <span><b>{run.introducedThisRun}</b>introduced</span>
              <span><b>{run.upgrades.length}</b>run traits</span>
              <span><b>{profile.unlockedUpgradeIds.length}</b>discoveries</span>
            </div>
            <button onClick={resetRun}><RefreshCcw />Start another run</button>
          </section>
        </aside>
      )}

      {helpOpen && (
        <aside className="castle-drawer-backdrop" onClick={() => setHelpOpen(false)}>
          <section className="castle-drawer" role="dialog" aria-modal="true" aria-labelledby="castle-help-title" onClick={event => event.stopPropagation()}>
            <button className="castle-drawer-close" onClick={() => setHelpOpen(false)}><X /></button>
            <p className="castle-eyebrow">How Goo Keep works</p>
            <h2 id="castle-help-title">Recall powers the nursery</h2>
            <p>The first appearance of each card direction safely pauses combat. Once that direction has been seen, the lane stays live while you answer it.</p>
            <p>Correct recall earns energy, and every five correct seen-card recalls fire a Recall Bolt at the rival keep. Misses fill Enemy Rally, but recalling the missed direction later removes a Rally pip before it triggers.</p>
            <p>Flashcards continue automatically after every seen answer. Switch to Army &amp; Powers whenever you want to summon or cast; the battle keeps moving while that panel is open.</p>
            <p>Opening help, settings, or leaving the window pauses the current prompt so an interruption never costs your castle.</p>
            <p>Your flashcard progress always survives. Run mutations disappear on defeat; deck-world discoveries remain.</p>
          </section>
        </aside>
      )}

      {settingsOpen && (
        <aside className="castle-drawer-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="castle-drawer" role="dialog" aria-modal="true" aria-labelledby="castle-settings-title" onClick={event => event.stopPropagation()}>
            <button className="castle-drawer-close" onClick={() => setSettingsOpen(false)}><X /></button>
            <p className="castle-eyebrow">Balance lab</p>
            <h2 id="castle-settings-title">Pressure and telemetry</h2>
            <label>Reward curve<select value={run.rewardCurve} onChange={event => setRun(current => current ? { ...current, rewardCurve: event.target.value as StudyRewardCurve } : current)}>{(Object.keys(REWARD_CURVE_LABELS) as StudyRewardCurve[]).map(curve => <option key={curve} value={curve}>{REWARD_CURVE_LABELS[curve]}</option>)}</select></label>
            <label className="castle-sound-toggle"><input type="checkbox" checked={soundEnabled} onChange={event => setSoundEnabled(event.target.checked)} />Sound cues</label>
            <div className="castle-telemetry-grid">
              <span><b>{formatCastleEnergy(run.battle.telemetry.energyEarned)}</b>energy earned</span>
              <span><b>{formatCastleEnergy(run.battle.telemetry.energySpent)}</b>energy spent</span>
              <span><b>{run.battle.telemetry.rallyTriggered}</b>enemy rallies</span>
              <span><b>{Math.round(run.battle.telemetry.activeCombatMs / 1_000)}s</b>live combat</span>
            </div>
            <button className="castle-download" onClick={downloadBalance}><Download />Export local balance data</button>
            <button className="castle-pause-button" onClick={() => { pauseForInterruption(); setSettingsOpen(false); }}><Pause />Pause current prompt</button>
          </section>
        </aside>
      )}
    </main>
  );
}
