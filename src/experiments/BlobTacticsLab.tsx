import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Beaker,
  BookOpen,
  CircleDot,
  Coffee,
  Dna,
  Droplets,
  Footprints,
  Heart,
  HelpCircle,
  Map,
  Move,
  Package,
  RefreshCcw,
  Shield,
  Sparkles,
  Swords,
  Target,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from "lucide-react";
import {
  BLOB_BOARD_COLS,
  BLOB_BOARD_ROWS,
  BLOB_EVENT_CHOICES,
  BLOB_MAP_NODES,
  BLOB_RUN_ROOMS,
  MUTATION_DEFS,
  ACTION_TILE_INFO,
  applyBlobStudyResult,
  claimBlobEventChoice,
  claimBlobMutation,
  claimWorkshopTile,
  chooseBlobMapNode,
  createInitialBlobTacticsState,
  endBlobTacticsTurn,
  getBlobletAt,
  getBoardTileKey,
  getBlobRoomObjective,
  getEnemyIntent,
  getEnemyPreview,
  getBlobRegion,
  getActionTileDisabledReason,
  getTileEffectAt,
  getValidTargetKeys,
  isEnemyAt,
  isPipploAt,
  selectActionTile,
  selectBlobImproviseMode,
  tapBoardTile,
  type BlobPosition,
  type BlobMutationId,
  type BlobMapNodeId,
  type BlobActionTile,
  type BlobActionTileType,
  type BlobEventChoiceId,
  type BlobStudyResult,
} from "./blobTactics";
import {
  answerBlobStudyQuestion,
  clearBlobTacticsRun,
  drawBlobStudyQuestion,
  getBlobStudyDecks,
  getSelectedBlobStudyDeckId,
  loadBlobTacticsRun,
  saveBlobTacticsRun,
  selectBlobStudyDeck,
  type BlobStudyDeckSummary,
  type BlobStudyQuestion,
} from "./blobStudyBridge";
import "./BlobTacticsLab.css";

interface BlobTacticsLabProps {
  onExit: () => void;
}

const ACTION_TILE_ICONS: Record<BlobActionTileType, ReactNode> = {
  move: <Move />,
  hop: <Move />,
  bump: <ArrowRight />,
  slap: <Swords />,
  stretch: <ArrowRight />,
  bellyFlop: <CircleDot />,
  split: <CircleDot />,
  rejoin: <Droplets />,
  spit: <Target />,
  goo: <Droplets />,
  bubble: <Shield />,
  sourSplit: <CircleDot />,
};

const BLOB_STUDY_CORRECT_TARGET = 4;
const BLOB_STUDY_REVIEW_CAP = 6;

interface LabStudySession {
  reviewed: number;
  correct: number;
  wrong: number;
  upgraded: number;
  masteryEvents: string[];
  previousKey?: string;
}

const createLabStudySession = (): LabStudySession => ({
  reviewed: 0,
  correct: 0,
  wrong: 0,
  upgraded: 0,
  masteryEvents: [],
});

const isLabStudySessionComplete = (session: LabStudySession) => (
  session.correct >= BLOB_STUDY_CORRECT_TARGET || session.reviewed >= BLOB_STUDY_REVIEW_CAP
);

const createBlobStudyResult = (session: LabStudySession): BlobStudyResult => ({
  grade: session.correct >= BLOB_STUDY_CORRECT_TARGET && session.wrong === 0
    ? "great"
    : session.correct >= 3
      ? "good"
      : "bad",
  tileCount: Math.min(6, Math.max(1, session.correct + (session.correct >= 3 ? 1 : 0))),
  massGain: session.correct >= 3 ? 1 : 0,
  upgradedCount: Math.min(3, session.upgraded + (session.correct >= BLOB_STUDY_CORRECT_TARGET && session.wrong === 0 ? 1 : 0)),
  sourCount: session.wrong,
});

function getActionTilePrompt(type: BlobActionTileType, hasSource: boolean, enemyName: string): string {
  if (type === "slap") return hasSource ? `Tap ${enemyName}` : "Tap Pipplo or an adjacent bloblet";
  if (type === "spit") return hasSource ? `Tap ${enemyName}` : "Tap a bloblet to sacrifice";
  if (type === "goo") return hasSource ? "Tap a neighboring empty tile" : "Tap a bloblet";
  if (type === "rejoin") return "Tap an adjacent bloblet";
  if (type === "split" || type === "bubble" || type === "sourSplit") return "Tap an empty tile beside Pipplo";
  if (type === "stretch" || type === "bellyFlop" || type === "bump") return `Tap ${enemyName}`;
  return "Tap a highlighted tile";
}

function getActionTileComboHint(previousType: BlobActionTileType | null, currentType: BlobActionTileType | undefined): string | null {
  if (!previousType || !currentType) return null;
  if ((previousType === "split" || previousType === "bubble" || previousType === "sourSplit") && currentType === "rejoin") {
    return "Combo: quick Rejoin squeezes out +1 Mass.";
  }
  if (previousType === "hop" && currentType === "bellyFlop") {
    return "Combo: Hop-Flop Slam hits harder.";
  }
  if (previousType === "goo" && currentType === "bump") {
    return "Combo: Goo Bumper cracks harder and slides farther.";
  }
  return null;
}

function ActionTile({
  tile,
  selected,
  disabledReason,
  onClick,
}: {
  tile: BlobActionTile;
  selected: boolean;
  disabledReason: string | null;
  onClick: () => void;
}) {
  const info = ACTION_TILE_INFO[tile.type];
  return (
    <button
      type="button"
      className={`blob-lab-action-tile ${selected ? "is-selected" : ""} ${tile.sour ? "is-sour" : ""} ${disabledReason ? "is-native-disabled" : ""}`}
      style={{ "--tile-accent": info.accent } as React.CSSProperties}
      onClick={onClick}
      title={disabledReason ? `${disabledReason} This tile can still be burned for an improvised action.` : info.description}
    >
      <span className="blob-lab-action-tile-face">
        <span className="blob-lab-action-tile-top">
          <span className="blob-lab-action-tile-icon">{ACTION_TILE_ICONS[tile.type]}</span>
        </span>
        <span className="blob-lab-action-tile-divider" />
        <span className="blob-lab-action-tile-bottom">
          <span className="blob-lab-action-tile-label">{info.shortName}</span>
          <span className="blob-lab-action-tile-pips" aria-hidden="true">
            {Array.from({ length: Math.max(1, info.massCost) }, (_, index) => <i key={index} />)}
          </span>
          <span className="blob-lab-action-tile-cost">{info.massCost > 0 ? `${info.massCost} Mass` : "Free"}</span>
        </span>
      </span>
      {tile.upgraded && <span className="blob-lab-action-tile-upgrade">+</span>}
    </button>
  );
}

function MapNodeIcon({ kind }: { kind: "encounter" | "rest" | "workshop" | "event" | "guardian" }) {
  if (kind === "rest") return <Coffee />;
  if (kind === "workshop") return <Wrench />;
  if (kind === "event") return <Sparkles />;
  if (kind === "guardian") return <Award />;
  return <Footprints />;
}

function WorkshopTileOption({ type, onClick }: { type: BlobActionTileType; onClick: () => void }) {
  const info = ACTION_TILE_INFO[type];
  return (
    <button
      type="button"
      className="blob-lab-workshop-tile"
      style={{ "--tile-accent": info.accent } as React.CSSProperties}
      onClick={onClick}
    >
      <span className="blob-lab-action-tile-icon">{ACTION_TILE_ICONS[type]}</span>
      <strong>{info.name}</strong>
      <span>{info.description}</span>
    </button>
  );
}

function DeckPicker({
  decks,
  selectedDeckId,
  onChoose,
}: {
  decks: BlobStudyDeckSummary[];
  selectedDeckId: string;
  onChoose: (deckId: string) => void;
}) {
  return (
    <aside className="blob-lab-map-backdrop">
      <section className="blob-lab-map-sheet blob-lab-deck-sheet">
        <BookOpen />
        <p className="blob-lab-eyebrow">Choose a study world</p>
        <h2>Which deck should Pipplo explore?</h2>
        <p>Reviews update the same saved deck progress used by the main game.</p>
        <div className="blob-lab-deck-grid">
          {decks.map(deck => (
            <button
              key={deck.id}
              type="button"
              className={deck.id === selectedDeckId ? "is-selected" : ""}
              onClick={() => onChoose(deck.id)}
            >
              <BookOpen />
              <strong>{deck.name}</strong>
              <span>{deck.cardCount} cards</span>
              <small>{deck.introducedCount || "Starter"} active · {deck.reviewCount} reviews</small>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function StudyReadySheet({ deckName, onBegin }: { deckName: string; onBegin: () => void }) {
  return (
    <section className="blob-lab-study-sheet">
      <div>
        <p className="blob-lab-eyebrow">Study hand · {deckName}</p>
        <h2>Load the next dominoes</h2>
        <p>Answer until you earn four correct reviews. Misses add Sour Splits and keep the hand going.</p>
      </div>
      <button type="button" className="blob-lab-study-start" onClick={onBegin}>
        <BookOpen />
        Begin reviews
      </button>
    </section>
  );
}

function StudyQuestionSheet({
  question,
  session,
  reveal,
  feedback,
  onOption,
  onReveal,
  onSelfGrade,
  onContinue,
}: {
  question: BlobStudyQuestion;
  session: LabStudySession;
  reveal: boolean;
  feedback: string | null;
  onOption: (option: string) => void;
  onReveal: () => void;
  onSelfGrade: (correct: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <section className="blob-lab-study-sheet blob-lab-real-study-sheet">
      <div className="blob-lab-study-progress">
        <span>{session.correct}/{BLOB_STUDY_CORRECT_TARGET} correct</span>
        <span>{session.reviewed}/{BLOB_STUDY_REVIEW_CAP} reviewed</span>
        <span>{question.masteryLabel}</span>
      </div>
      <p className="blob-lab-eyebrow">{question.direction === "term_to_definition" ? "Term → definition" : "Definition → term"}</p>
      <h2>{question.prompt}</h2>
      {feedback ? (
        <button type="button" className="blob-lab-answer-feedback" onClick={onContinue}>
          <strong>Correct answer</strong>
          <span>{question.answer}</span>
          <small>Tap to continue</small>
        </button>
      ) : question.questionType === "multiple_choice" ? (
        <div className="blob-lab-answer-grid">
          {question.options.map(option => (
            <button key={option} type="button" onClick={() => onOption(option)}>{option}</button>
          ))}
        </div>
      ) : reveal ? (
        <div className="blob-lab-self-grade">
          <strong>{question.answer}</strong>
          <span>Did you recall it before flipping?</span>
          <div>
            <button type="button" onClick={() => onSelfGrade(false)}>Not yet</button>
            <button type="button" onClick={() => onSelfGrade(true)}>Got it</button>
          </div>
        </div>
      ) : (
        <button type="button" className="blob-lab-study-start" onClick={onReveal}>
          Flip card
        </button>
      )}
    </section>
  );
}

function StudyRecapSheet({ session, onClaim }: { session: LabStudySession; onClaim: () => void }) {
  const result = createBlobStudyResult(session);
  return (
    <section className="blob-lab-study-sheet blob-lab-study-recap">
      <div>
        <p className="blob-lab-eyebrow">Study hand resolved</p>
        <h2>{session.wrong === 0 ? "Clean recall!" : "Dominoes loaded"}</h2>
        <p>{result.tileCount} action tiles / {result.upgradedCount} upgraded / {result.sourCount} Sour Split{result.sourCount === 1 ? "" : "s"}</p>
      </div>
      <div className="blob-lab-study-recap-stats">
        <span><b>{session.correct}</b> correct</span>
        <span><b>{session.wrong}</b> misses</span>
        <span><b>{session.reviewed}</b> reviews</span>
      </div>
      {session.masteryEvents.length > 0 && <small>{session.masteryEvents.join(" ")}</small>}
      <button type="button" className="blob-lab-study-start" onClick={onClaim}>
        Load dominoes
      </button>
    </section>
  );
}

export default function BlobTacticsLab({ onExit }: BlobTacticsLabProps) {
  const [initialLab] = useState(() => {
    const deckId = getSelectedBlobStudyDeckId();
    return { deckId, restored: loadBlobTacticsRun(deckId) };
  });
  const [state, setState] = useState(initialLab.restored || createInitialBlobTacticsState);
  const [selectedDeckId, setSelectedDeckId] = useState(initialLab.deckId);
  const [deckSummaries, setDeckSummaries] = useState(getBlobStudyDecks);
  const [runStarted, setRunStarted] = useState(Boolean(initialLab.restored));
  const [deckPickerOpen, setDeckPickerOpen] = useState(!initialLab.restored);
  const [studySession, setStudySession] = useState<LabStudySession | null>(null);
  const [studyQuestion, setStudyQuestion] = useState<BlobStudyQuestion | null>(null);
  const [studyFeedback, setStudyFeedback] = useState<string | null>(null);
  const [studyReveal, setStudyReveal] = useState(false);
  const [studyRecap, setStudyRecap] = useState<LabStudySession | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [traitsOpen, setTraitsOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const validTargetKeys = useMemo(() => getValidTargetKeys(state), [state]);
  const selectedTile = state.hand.find(tile => tile.id === state.selectedActionTileId) || null;
  const enemyIntent = getEnemyIntent(state);
  const roomObjective = getBlobRoomObjective(state);
  const enemyPreview = useMemo(() => getEnemyPreview(state), [state]);
  const chainStep = state.tilesPlayedThisTurn % 3;
  const comboHint = getActionTileComboHint(state.lastActionTileType, selectedTile?.type);
  const region = getBlobRegion(state.mapDepth);

  const playSound = useCallback((kind: "clack" | "study" | "pop" | "route" | "enemy") => {
    if (!soundEnabled) return;
    const AudioContextConstructor = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = audioContextRef.current || new AudioContextConstructor();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();
    const notes = kind === "clack"
      ? [185, 130]
      : kind === "study"
        ? [440, 620]
        : kind === "pop"
          ? [280, 460, 720]
          : kind === "route"
            ? [350, 520]
            : [120, 90];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + (index * 0.045);
      oscillator.type = kind === "clack" || kind === "enemy" ? "square" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "enemy" ? 0.045 : 0.032, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.09);
    });
  }, [soundEnabled]);

  useEffect(() => {
    if (state.animation === "idle") return;
    const timeout = window.setTimeout(() => {
      setState(current => ({ ...current, animation: "idle" }));
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [state.animation, state.notice.id]);

  useEffect(() => {
    if (runStarted) saveBlobTacticsRun(selectedDeckId, state);
  }, [runStarted, selectedDeckId, state]);

  const reset = () => {
    playSound("route");
    clearBlobTacticsRun(selectedDeckId);
    setState(createInitialBlobTacticsState());
    setRunStarted(true);
    setStudySession(null);
    setStudyQuestion(null);
    setStudyFeedback(null);
    setStudyRecap(null);
  };
  const chooseDeck = (deckId: string) => {
    playSound("route");
    selectBlobStudyDeck(deckId);
    const restored = loadBlobTacticsRun(deckId);
    setSelectedDeckId(deckId);
    setState(restored || createInitialBlobTacticsState());
    setRunStarted(true);
    setDeckPickerOpen(false);
    setDeckSummaries(getBlobStudyDecks());
    setStudySession(null);
    setStudyQuestion(null);
    setStudyFeedback(null);
    setStudyRecap(null);
  };
  const drawNextStudyQuestion = (session: LabStudySession) => {
    setStudyQuestion(drawBlobStudyQuestion(selectedDeckId, session.previousKey));
    setStudyReveal(false);
    setStudyFeedback(null);
  };
  const beginStudyHand = () => {
    playSound("study");
    const session = createLabStudySession();
    setStudySession(session);
    setStudyRecap(null);
    drawNextStudyQuestion(session);
  };
  const finishStudyReview = (correct: boolean) => {
    if (!studyQuestion || !studySession) return;
    const answer = answerBlobStudyQuestion(selectedDeckId, studyQuestion, correct);
    const nextSession: LabStudySession = {
      reviewed: studySession.reviewed + 1,
      correct: studySession.correct + (correct ? 1 : 0),
      wrong: studySession.wrong + (correct ? 0 : 1),
      upgraded: studySession.upgraded + (answer.upgraded ? 1 : 0),
      masteryEvents: answer.masteryEvent
        ? [...studySession.masteryEvents, answer.masteryEvent].slice(-3)
        : studySession.masteryEvents,
      previousKey: `${studyQuestion.cardId}::${studyQuestion.direction}`,
    };
    setDeckSummaries(getBlobStudyDecks());
    setStudySession(nextSession);
    if (!correct) {
      playSound("enemy");
      setStudyFeedback(answer.answer);
      return;
    }
    playSound("study");
    if (isLabStudySessionComplete(nextSession)) {
      setStudyRecap(nextSession);
      setStudyQuestion(null);
      return;
    }
    drawNextStudyQuestion(nextSession);
  };
  const continueAfterWrongAnswer = () => {
    if (!studySession) return;
    if (isLabStudySessionComplete(studySession)) {
      setStudyRecap(studySession);
      setStudyQuestion(null);
      setStudyFeedback(null);
      return;
    }
    drawNextStudyQuestion(studySession);
  };
  const claimStudyDominoes = () => {
    if (!studyRecap) return;
    playSound("pop");
    setState(current => applyBlobStudyResult(current, createBlobStudyResult(studyRecap)));
    setStudySession(null);
    setStudyQuestion(null);
    setStudyFeedback(null);
    setStudyRecap(null);
  };
  const chooseActionTile = (tile: BlobActionTile) => {
    playSound("clack");
    setState(current => selectActionTile(current, tile.id));
  };
  const chooseImprovise = (mode: "move" | "bonk") => {
    playSound("clack");
    setState(current => selectBlobImproviseMode(current, mode));
  };
  const tapTile = (position: BlobPosition) => {
    playSound("clack");
    setState(current => tapBoardTile(current, position));
  };
  const endTurn = () => {
    playSound("enemy");
    setState(endBlobTacticsTurn);
  };
  const claimMutation = (mutationId: BlobMutationId) => {
    playSound("pop");
    setState(current => claimBlobMutation(current, mutationId));
  };
  const chooseMapNode = (nodeId: BlobMapNodeId) => {
    playSound("route");
    setState(current => chooseBlobMapNode(current, nodeId));
  };
  const chooseWorkshopTile = (type: BlobActionTileType) => {
    playSound("clack");
    setState(current => claimWorkshopTile(current, type));
  };
  const chooseEvent = (choiceId: BlobEventChoiceId) => {
    playSound("pop");
    setState(current => claimBlobEventChoice(current, choiceId));
  };
  const bagCounts = state.tileBag.reduce<Partial<Record<BlobActionTileType, number>>>((counts, type) => {
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const boardTiles = Array.from({ length: BLOB_BOARD_ROWS * BLOB_BOARD_COLS }, (_, index) => ({
    row: Math.floor(index / BLOB_BOARD_COLS),
    col: index % BLOB_BOARD_COLS,
  }));

  return (
    <main className={`blob-lab-shell is-region-${region.id}`}>
      <div className="blob-lab-cloud blob-lab-cloud-one" />
      <div className="blob-lab-cloud blob-lab-cloud-two" />
      <header className="blob-lab-topbar">
        <button type="button" className="blob-lab-icon-button" onClick={onExit} aria-label="Back to main menu">
          <ArrowLeft />
        </button>
        <div className="blob-lab-title">
          <span><Beaker /> Combat Lab</span>
          <strong>Micro Blob Tactics</strong>
        </div>
        <div className="blob-lab-top-actions">
          <button type="button" className="blob-lab-icon-button" onClick={() => setDeckPickerOpen(true)} aria-label="Choose study deck">
            <BookOpen />
          </button>
          <button type="button" className="blob-lab-icon-button" onClick={() => setSoundEnabled(enabled => !enabled)} aria-label={soundEnabled ? "Mute sound effects" : "Enable sound effects"}>
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </button>
          <button type="button" className="blob-lab-icon-button" onClick={() => setHelpOpen(true)} aria-label="How to play">
            <HelpCircle />
          </button>
        </div>
      </header>

      <section className="blob-lab-route" aria-label="Micro-run route">
        <span>{region.name}</span>
        {Array.from({ length: BLOB_RUN_ROOMS }, (_, index) => (
          <i
            key={index}
            className={`${index + 1 === state.mapDepth ? "is-current" : ""} ${index + 1 < state.mapDepth ? "is-cleared" : ""} ${index + 1 === BLOB_RUN_ROOMS ? "is-guardian" : ""}`}
            aria-label={`Route layer ${index + 1}${index + 1 === BLOB_RUN_ROOMS ? ", guardian" : ""}`}
          />
        ))}
        <button type="button" className="blob-lab-trait-button" onClick={() => setTraitsOpen(true)}>
          <Dna />
          {state.mutations.length} traits
        </button>
        <button type="button" className="blob-lab-trait-button" onClick={() => setBagOpen(true)}>
          <Package />
          {state.tileBag.length} tiles
        </button>
      </section>

      <section className="blob-lab-status-row" aria-label="Battle status">
        <div className="blob-lab-status-pill blob-lab-health">
          <Heart />
          <span>HP</span>
          <strong>{state.pipploHp}/{state.pipploMaxHp}</strong>
        </div>
        <div className="blob-lab-status-pill blob-lab-mass">
          <Droplets />
          <span>Mass</span>
          <strong>{state.mass}/{state.massMax}</strong>
        </div>
        <div className="blob-lab-room-pill">
          <span>Stop</span>
          <strong>{state.room}/{BLOB_RUN_ROOMS}</strong>
        </div>
      </section>

      <section className="blob-lab-enemy-strip" aria-label="Enemy status">
        <div className="blob-lab-enemy-copy">
          <strong>{state.enemy.name}{state.enemy.boss && <b> Guardian</b>}</strong>
          <span>{state.enemy.hp}/{state.enemy.maxHp} HP</span>
          {state.enemy.maxShell > 0 && <span>{state.enemy.shell}/{state.enemy.maxShell} Shell</span>}
          {state.enemyPressure > 0 && <span className="blob-lab-pursuit">Pursuit {state.enemyPressure}</span>}
          {state.enemy.enraged && <span className="blob-lab-enraged">Furious</span>}
        </div>
        <div className={`blob-lab-objective is-${roomObjective.type}`}>
          <span>Goal</span>
          <strong>{roomObjective.title}</strong>
          <small>{roomObjective.progress}</small>
        </div>
        <div className={`blob-lab-intent is-${enemyIntent.tone}`}>
          <span>Next</span>
          <strong>{enemyIntent.label}</strong>
          <small>{enemyIntent.detail}</small>
        </div>
      </section>

      <section className="blob-lab-playfield-wrap" aria-label="Tiny tactics grid">
        <div className={`blob-lab-board animation-${state.animation}`}>
          {boardTiles.map(position => {
            const tileKey = getBoardTileKey(position);
            const bloblet = getBlobletAt(state, position);
            const tileEffect = getTileEffectAt(state, position);
            const pipplo = isPipploAt(state, position);
            const enemy = isEnemyAt(state, position);
            const valid = validTargetKeys.has(tileKey);
            const pathPreview = enemyPreview.pathKeys.has(tileKey);
            const dangerPreview = enemyPreview.dangerKeys.has(tileKey);
            const hazardPreview = enemyPreview.hazardKeys.has(tileKey);
            const isSource = Boolean(bloblet && bloblet.id === state.actionSourceId) || (pipplo && state.actionSourceId === "pipplo");
            return (
              <button
                key={tileKey}
                type="button"
                className={`blob-lab-tile ${valid ? "is-valid" : ""} ${isSource ? "is-source" : ""} ${pathPreview ? "is-threat-path" : ""} ${dangerPreview ? "is-threat-danger" : ""} ${hazardPreview ? "is-threat-hazard" : ""}`}
                onClick={() => tapTile(position)}
                aria-label={`Tile ${position.row + 1}, ${position.col + 1}${pipplo ? ", Pipplo" : ""}${enemy ? `, ${state.enemy.name}` : ""}${bloblet ? `, ${bloblet.kind} bloblet` : ""}${tileEffect ? `, ${tileEffect.type}` : ""}`}
              >
                {tileEffect && <span className={`blob-lab-tile-effect is-${tileEffect.type}`} />}
                {pathPreview && <span className="blob-lab-threat-marker is-path" aria-hidden="true" />}
                {dangerPreview && <span className="blob-lab-threat-marker is-danger" aria-hidden="true" />}
                {hazardPreview && <span className="blob-lab-threat-marker is-hazard" aria-hidden="true" />}
                {pipplo && (
                  <span className="blob-lab-pipplo" aria-hidden="true">
                    <i className="blob-lab-antenna" />
                    <i className="blob-lab-face"><b /><b /><em /></i>
                    <i className="blob-lab-hand left" />
                    <i className="blob-lab-hand right" />
                    <i className="blob-lab-foot left" />
                    <i className="blob-lab-foot right" />
                  </span>
                )}
                {enemy && (
                  <span className={`blob-lab-shell-slime is-${state.enemy.kind} ${state.enemy.enraged ? "is-enraged" : ""}`} aria-hidden="true">
                    {state.enemy.kind === "shellSlime" && <i className="blob-lab-shell-plate" />}
                    {state.enemy.kind === "nibbleImp" && <><i className="blob-lab-imp-horn left" /><i className="blob-lab-imp-horn right" /></>}
                    {state.enemy.kind === "sporeBud" && <i className="blob-lab-spore-cap" />}
                    {state.enemy.kind === "bubbleCrab" && <><i className="blob-lab-crab-claw left" /><i className="blob-lab-crab-claw right" /><i className="blob-lab-crab-bubble" /></>}
                    {state.enemy.kind === "echoMoth" && <><i className="blob-lab-moth-wing left" /><i className="blob-lab-moth-wing right" /><i className="blob-lab-moth-dot" /></>}
                    {state.enemy.kind === "rootLump" && <><i className="blob-lab-root-horn left" /><i className="blob-lab-root-horn right" /></>}
                    <i className="blob-lab-slime-face"><b /><b /><em /></i>
                  </span>
                )}
                {bloblet && (
                  <span className={`blob-lab-bloblet is-${bloblet.kind}`} aria-hidden="true">
                    <i className="blob-lab-bloblet-face"><b /><b /></i>
                    <small>{bloblet.turnsLeft}</small>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="blob-lab-board-legend" aria-label="Enemy preview legend">
          <span><i className="is-path" /> enemy path</span>
          <span><i className="is-danger" /> danger</span>
          <span><i className="is-hazard" /> hazard</span>
        </div>
      </section>

      <section className={`blob-lab-notice is-${state.notice.tone}`} aria-live="polite">
        <strong>{state.notice.title}</strong>
        <span>{state.notice.detail}</span>
      </section>

      {state.phase === "study" && !studySession && !studyRecap && (
        <StudyReadySheet
          deckName={deckSummaries.find(deck => deck.id === selectedDeckId)?.name || "Saved deck"}
          onBegin={beginStudyHand}
        />
      )}

      {state.phase === "study" && studyQuestion && studySession && (
        <StudyQuestionSheet
          question={studyQuestion}
          session={studySession}
          reveal={studyReveal}
          feedback={studyFeedback}
          onOption={option => finishStudyReview(option === studyQuestion.answer)}
          onReveal={() => setStudyReveal(true)}
          onSelfGrade={finishStudyReview}
          onContinue={continueAfterWrongAnswer}
        />
      )}

      {state.phase === "study" && studyRecap && (
        <StudyRecapSheet session={studyRecap} onClaim={claimStudyDominoes} />
      )}

      {state.phase === "player" && (
        <section className="blob-lab-command-tray" aria-label="Tile hand">
          <div className="blob-lab-tray-heading">
            <div>
              <p className="blob-lab-eyebrow">Tile hand</p>
              <strong>{selectedTile
                ? state.improviseMode === "move"
                  ? "Tap an adjacent tile for a weaker 1 Mass Scoot"
                  : state.improviseMode === "bonk"
                    ? `Tap ${state.enemy.name} for a weaker 1 Mass Bonk`
                    : getActionTilePrompt(selectedTile.type, Boolean(state.actionSourceId), state.enemy.name)
                : "Pick a tile, then tap highlighted tiles"}</strong>
              <div className="blob-lab-chain" title="Every third tile restores Mass">
                <span>Bounce chain</span>
                {[0, 1, 2].map(index => <i key={index} className={index < chainStep ? "is-filled" : ""} />)}
                <b className={state.tilesPlayedThisTurn > 0 && chainStep === 0 ? "is-popped" : ""}>
                  {state.tilesPlayedThisTurn > 0 && chainStep === 0 ? "Mass popped!" : `${state.mutations.includes("rhythmJelly") ? "+2" : "+1"} Mass`}
                </b>
              </div>
              {comboHint && <div className="blob-lab-combo-hint">{comboHint}</div>}
            </div>
            <button type="button" className="blob-lab-end-button" onClick={endTurn}>
              End Turn
              <ArrowRight />
            </button>
          </div>
          {selectedTile && (
            <div className="blob-lab-improvise-bar">
              <span>Burn selected tile: 1 Mass, no chain</span>
              <button
                type="button"
                className={state.improviseMode === "move" ? "is-active" : ""}
                disabled={state.mass < 1}
                onClick={() => chooseImprovise("move")}
              >
                <Move />
                Scoot
              </button>
              <button
                type="button"
                className={state.improviseMode === "bonk" ? "is-active" : ""}
                disabled={state.mass < 1}
                onClick={() => chooseImprovise("bonk")}
              >
                <Swords />
                Bonk
              </button>
            </div>
          )}
          <div className="blob-lab-action-tile-row">
            {state.hand.map(tile => (
              <ActionTile
                key={tile.id}
                tile={tile}
                selected={state.selectedActionTileId === tile.id}
                disabledReason={getActionTileDisabledReason(state, tile)}
                onClick={() => chooseActionTile(tile)}
              />
            ))}
            {state.hand.length === 0 && <p className="blob-lab-empty-hand">No tiles left. End the turn when you are ready.</p>}
          </div>
        </section>
      )}

      {state.phase === "reward" && (
        <aside className="blob-lab-reward-backdrop">
          <section className="blob-lab-reward-sheet">
            <Award />
            <p className="blob-lab-eyebrow">Room {state.room} absorbed</p>
            <h2>Pick one body mutation</h2>
            <p>Pipplo carries it through the remaining route stops.</p>
            <div className="blob-lab-mutation-grid">
              {state.rewardChoices.map(mutationId => {
                const mutation = MUTATION_DEFS[mutationId];
                return (
                  <button
                    key={mutationId}
                    type="button"
                    style={{ "--mutation-accent": mutation.accent } as React.CSSProperties}
                    onClick={() => claimMutation(mutationId)}
                  >
                    <strong>{mutation.name}</strong>
                    <span>{mutation.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      )}

      {state.phase === "map" && (
        <aside className="blob-lab-map-backdrop">
          <section className="blob-lab-map-sheet">
            <Map />
            <p className="blob-lab-eyebrow">Expedition route</p>
            <h2>Where should Pipplo wobble next?</h2>
            <p>{region.description}</p>
            <div className="blob-lab-map-grid">
              {state.mapChoices.map(nodeId => {
                const node = BLOB_MAP_NODES[nodeId];
                return (
                  <button
                    key={nodeId}
                    type="button"
                    className={`is-${node.kind}`}
                    style={{ "--node-accent": node.accent } as React.CSSProperties}
                    onClick={() => chooseMapNode(nodeId)}
                  >
                    <MapNodeIcon kind={node.kind} />
                    <span>{node.kind === "guardian" ? "Guardian" : node.kind}</span>
                    <strong>{node.name}</strong>
                    <small>{node.description}</small>
                  </button>
                );
              })}
            </div>
            <div className="blob-lab-map-footer">
              <span>{state.roomsCleared} fights absorbed</span>
              <span>{state.mutations.length} traits carried</span>
              <span>{state.tileBag.length} tiles in bag</span>
            </div>
          </section>
        </aside>
      )}

      {state.phase === "workshop" && (
        <aside className="blob-lab-map-backdrop">
          <section className="blob-lab-map-sheet blob-lab-workshop-sheet">
            <Wrench />
            <p className="blob-lab-eyebrow">Tile Tinker</p>
            <h2>Add one domino to Pipplo's bag</h2>
            <p>Future study hands become more likely to draw the chosen action tile.</p>
            <div className="blob-lab-workshop-grid">
              {state.workshopChoices.map(type => (
                <WorkshopTileOption key={type} type={type} onClick={() => chooseWorkshopTile(type)} />
              ))}
            </div>
          </section>
        </aside>
      )}

      {state.phase === "event" && (
        <aside className="blob-lab-map-backdrop">
          <section className="blob-lab-map-sheet blob-lab-event-sheet">
            <Sparkles />
            <p className="blob-lab-eyebrow">Rootwild curiosity</p>
            <h2>The Wobble Well hums at Pipplo</h2>
            <p>Choose one bargain. The puddle is probably trustworthy enough.</p>
            <div className="blob-lab-event-grid">
              {state.eventChoices.map(choiceId => {
                const choice = BLOB_EVENT_CHOICES[choiceId];
                return (
                  <button
                    key={choiceId}
                    type="button"
                    style={{ "--node-accent": choice.accent } as React.CSSProperties}
                    onClick={() => chooseEvent(choiceId)}
                  >
                    <Sparkles />
                    <strong>{choice.name}</strong>
                    <span>{choice.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      )}

      {(state.phase === "won" || state.phase === "lost") && (
        <section className={`blob-lab-result is-${state.phase}`}>
          <Sparkles />
          <p className="blob-lab-eyebrow">{state.phase === "won" ? "Micro-run cleared" : "Experiment over"}</p>
          <h2>{state.phase === "won" ? "Root Lump absorbed!" : "Pipplo needs another try"}</h2>
          <p>{state.phase === "won"
            ? `Pipplo crossed Dew Meadow and the Rootwild, then absorbed the guardian.`
            : `Pipplo reached Room ${state.room}. Try splitting helpers to block danger and reclaiming survivors for Mass.`}</p>
          <div className="blob-lab-result-stats">
            <span><b>{state.roomsCleared}</b> fights</span>
            <span><b>{state.mutations.length}</b> traits</span>
            <span><b>{state.tileBag.length}</b> bag tiles</span>
            <span><b>{state.eventHistory.length}</b> bargains</span>
          </div>
          <div className="blob-lab-result-actions">
            <button type="button" onClick={reset}><RefreshCcw /> Restart Lab</button>
            <button type="button" onClick={onExit}><ArrowLeft /> Main Menu</button>
          </div>
        </section>
      )}

      {helpOpen && (
        <aside className="blob-lab-help-backdrop" onClick={() => setHelpOpen(false)}>
          <section className="blob-lab-help-sheet" onClick={event => event.stopPropagation()}>
            <button type="button" className="blob-lab-close-button" onClick={() => setHelpOpen(false)} aria-label="Close help">
              <X />
            </button>
            <p className="blob-lab-eyebrow">Tiny tactics primer</p>
            <h2>Split yourself to make options</h2>
            <p>Study creates temporary tiles. Tiles move Pipplo, crack Shell, grab snacks, or bud off little helpers. Every third tile played restores Mass.</p>
            <p>Any tile can be burned for a weak 1 Mass Scoot or Bonk, but improvised actions do not advance the bounce chain. Ending a turn without hitting the enemy raises Pursuit and speeds up its next approach.</p>
            <p>Bloblets protect Pipplo, bonk nearby enemies at turn end, grab nearby snacks or puddles, wobble back toward Pipplo, and dissolve into Mass puddles.</p>
            <p>Some tile pairs now pop together: Split then Rejoin restores bonus Mass, Hop then Belly Flop hits harder, and Goo then Bump cracks and slides farther.</p>
            <p>The goal card shows what makes the room special: crack Shell, reach a snack, survive, rescue a bloblet, or absorb the enemy.</p>
            <p>The board previews enemy paths, attacks, hazards, and stolen snacks before the turn ends. Between fights, choose routes for mutations, recovery, or Tile Tinker bag upgrades.</p>
            <p>After the meadow, the Rootwild adds peculiar bargains and creatures that rebuild Shell or drain Mass when ignored.</p>
          </section>
        </aside>
      )}

      {deckPickerOpen && (
        <DeckPicker decks={deckSummaries} selectedDeckId={selectedDeckId} onChoose={chooseDeck} />
      )}

      {traitsOpen && (
        <aside className="blob-lab-help-backdrop" onClick={() => setTraitsOpen(false)}>
          <section className="blob-lab-help-sheet blob-lab-traits-sheet" onClick={event => event.stopPropagation()}>
            <button type="button" className="blob-lab-close-button" onClick={() => setTraitsOpen(false)} aria-label="Close absorbed traits">
              <X />
            </button>
            <p className="blob-lab-eyebrow">Absorbed traits</p>
            <h2>Pipplo changes as it eats</h2>
            {state.mutations.length === 0
              ? <p>Defeat the first enemy to absorb a body mutation.</p>
              : <div className="blob-lab-trait-list">
                  {state.mutations.map(mutationId => {
                    const mutation = MUTATION_DEFS[mutationId];
                    return (
                      <div key={mutationId} style={{ "--mutation-accent": mutation.accent } as React.CSSProperties}>
                        <strong>{mutation.name}</strong>
                        <span>{mutation.description}</span>
                      </div>
                    );
                  })}
                </div>}
          </section>
        </aside>
      )}

      {bagOpen && (
        <aside className="blob-lab-help-backdrop" onClick={() => setBagOpen(false)}>
          <section className="blob-lab-help-sheet blob-lab-bag-sheet" onClick={event => event.stopPropagation()}>
            <button type="button" className="blob-lab-close-button" onClick={() => setBagOpen(false)} aria-label="Close tile bag">
              <X />
            </button>
            <p className="blob-lab-eyebrow">Tile bag</p>
            <h2>What study can draw</h2>
            <p>The Tile Tinker adds duplicates, making favored moves more likely to appear.</p>
            <div className="blob-lab-bag-grid">
              {(Object.keys(bagCounts) as BlobActionTileType[]).map(type => (
                <div key={type} style={{ "--tile-accent": ACTION_TILE_INFO[type].accent } as React.CSSProperties}>
                  <span className="blob-lab-action-tile-icon">{ACTION_TILE_ICONS[type]}</span>
                  <strong>{ACTION_TILE_INFO[type].shortName}</strong>
                  <b>x{bagCounts[type]}</b>
                </div>
              ))}
            </div>
          </section>
        </aside>
      )}
    </main>
  );
}
