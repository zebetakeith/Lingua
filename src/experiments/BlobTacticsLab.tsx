import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  CircleDot,
  Droplets,
  Heart,
  HelpCircle,
  Move,
  RefreshCcw,
  Shield,
  Sparkles,
  Swords,
  Target,
  X,
} from "lucide-react";
import {
  BLOB_BOARD_COLS,
  BLOB_BOARD_ROWS,
  STICKER_INFO,
  applyFakeStudyResult,
  createInitialBlobTacticsState,
  endBlobTacticsTurn,
  getBlobletAt,
  getBoardTileKey,
  getEnemyIntent,
  getStickerDisabledReason,
  getTileEffectAt,
  getValidTargetKeys,
  isEnemyAt,
  isPipploAt,
  selectSticker,
  tapBoardTile,
  type BlobPosition,
  type BlobSticker,
  type BlobStickerType,
  type BlobStudyGrade,
} from "./blobTactics";
import "./BlobTacticsLab.css";

interface BlobTacticsLabProps {
  onExit: () => void;
}

const STICKER_ICONS: Record<BlobStickerType, ReactNode> = {
  move: <Move />,
  slap: <Swords />,
  stretch: <ArrowRight />,
  split: <CircleDot />,
  rejoin: <Droplets />,
  spit: <Target />,
  goo: <Droplets />,
  bubble: <Shield />,
  sourSplit: <CircleDot />,
};

const STUDY_GRADES: Array<{
  grade: BlobStudyGrade;
  title: string;
  detail: string;
  accent: string;
}> = [
  { grade: "bad", title: "Messy", detail: "2 stickers + sour", accent: "#d982ba" },
  { grade: "good", title: "Good", detail: "3 stickers + Mass", accent: "#54bfb4" },
  { grade: "great", title: "Great", detail: "4 stickers + upgrade", accent: "#ff866c" },
];

function getStickerPrompt(type: BlobStickerType, hasSource: boolean): string {
  if (type === "slap") return hasSource ? "Tap Shell Slime" : "Tap Pipplo or an adjacent bloblet";
  if (type === "spit") return hasSource ? "Tap Shell Slime" : "Tap a bloblet to sacrifice";
  if (type === "goo") return hasSource ? "Tap a neighboring empty tile" : "Tap a bloblet";
  if (type === "rejoin") return "Tap an adjacent bloblet";
  if (type === "split" || type === "bubble" || type === "sourSplit") return "Tap an empty tile beside Pipplo";
  if (type === "stretch") return "Tap Shell Slime";
  return "Tap a highlighted tile";
}

function StickerCard({
  sticker,
  selected,
  disabledReason,
  onClick,
}: {
  sticker: BlobSticker;
  selected: boolean;
  disabledReason: string | null;
  onClick: () => void;
}) {
  const info = STICKER_INFO[sticker.type];
  return (
    <button
      type="button"
      className={`blob-lab-sticker ${selected ? "is-selected" : ""} ${sticker.sour ? "is-sour" : ""}`}
      style={{ "--sticker-accent": info.accent } as React.CSSProperties}
      disabled={Boolean(disabledReason)}
      onClick={onClick}
      title={disabledReason || info.description}
    >
      <span className="blob-lab-sticker-icon">{STICKER_ICONS[sticker.type]}</span>
      <span className="blob-lab-sticker-label">{info.shortName}</span>
      {info.massCost > 0 && <span className="blob-lab-sticker-cost">{info.massCost} Mass</span>}
      {sticker.upgraded && <span className="blob-lab-sticker-upgrade">+</span>}
    </button>
  );
}

function StudySimulator({ onChoose }: { onChoose: (grade: BlobStudyGrade) => void }) {
  return (
    <section className="blob-lab-study-sheet" aria-label="Fake study result generator">
      <div>
        <p className="blob-lab-eyebrow">Study simulator</p>
        <h2>How did that flashcard hand go?</h2>
        <p>This is temporary. The real study engine can plug in after the combat feels good.</p>
      </div>
      <div className="blob-lab-study-buttons">
        {STUDY_GRADES.map(option => (
          <button
            key={option.grade}
            type="button"
            style={{ "--grade-accent": option.accent } as React.CSSProperties}
            onClick={() => onChoose(option.grade)}
          >
            <strong>{option.title}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function BlobTacticsLab({ onExit }: BlobTacticsLabProps) {
  const [state, setState] = useState(createInitialBlobTacticsState);
  const [helpOpen, setHelpOpen] = useState(false);
  const validTargetKeys = useMemo(() => getValidTargetKeys(state), [state]);
  const selectedSticker = state.hand.find(sticker => sticker.id === state.selectedStickerId) || null;
  const enemyIntent = getEnemyIntent(state);

  useEffect(() => {
    if (state.animation === "idle") return;
    const timeout = window.setTimeout(() => {
      setState(current => ({ ...current, animation: "idle" }));
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [state.animation, state.notice.id]);

  const reset = () => setState(createInitialBlobTacticsState());
  const chooseStudyGrade = (grade: BlobStudyGrade) => setState(current => applyFakeStudyResult(current, grade));
  const chooseSticker = (sticker: BlobSticker) => setState(current => selectSticker(current, sticker.id));
  const tapTile = (position: BlobPosition) => setState(current => tapBoardTile(current, position));

  const boardTiles = Array.from({ length: BLOB_BOARD_ROWS * BLOB_BOARD_COLS }, (_, index) => ({
    row: Math.floor(index / BLOB_BOARD_COLS),
    col: index % BLOB_BOARD_COLS,
  }));

  return (
    <main className="blob-lab-shell">
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
        <button type="button" className="blob-lab-icon-button" onClick={() => setHelpOpen(true)} aria-label="How to play">
          <HelpCircle />
        </button>
      </header>

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
          <span>Room</span>
          <strong>{state.room}</strong>
        </div>
      </section>

      <section className="blob-lab-enemy-strip" aria-label="Enemy status">
        <div className="blob-lab-enemy-copy">
          <strong>Shell Slime</strong>
          <span>{state.enemy.hp}/{state.enemy.maxHp} HP</span>
          <span>{state.enemy.shell}/{state.enemy.maxShell} Shell</span>
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
            const isSource = Boolean(bloblet && bloblet.id === state.actionSourceId) || (pipplo && state.actionSourceId === "pipplo");
            return (
              <button
                key={tileKey}
                type="button"
                className={`blob-lab-tile ${valid ? "is-valid" : ""} ${isSource ? "is-source" : ""}`}
                onClick={() => tapTile(position)}
                aria-label={`Tile ${position.row + 1}, ${position.col + 1}${pipplo ? ", Pipplo" : ""}${enemy ? ", Shell Slime" : ""}${bloblet ? `, ${bloblet.kind} bloblet` : ""}`}
              >
                {tileEffect && <span className="blob-lab-goo" />}
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
                  <span className="blob-lab-shell-slime" aria-hidden="true">
                    <i className="blob-lab-shell-plate" />
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
      </section>

      <section className={`blob-lab-notice is-${state.notice.tone}`} aria-live="polite">
        <strong>{state.notice.title}</strong>
        <span>{state.notice.detail}</span>
      </section>

      {state.phase === "study" && <StudySimulator onChoose={chooseStudyGrade} />}

      {state.phase === "player" && (
        <section className="blob-lab-command-tray" aria-label="Sticker hand">
          <div className="blob-lab-tray-heading">
            <div>
              <p className="blob-lab-eyebrow">Sticker hand</p>
              <strong>{selectedSticker ? getStickerPrompt(selectedSticker.type, Boolean(state.actionSourceId)) : "Pick a sticker, then tap highlighted tiles"}</strong>
            </div>
            <button type="button" className="blob-lab-end-button" onClick={() => setState(endBlobTacticsTurn)}>
              End Turn
              <ArrowRight />
            </button>
          </div>
          <div className="blob-lab-sticker-row">
            {state.hand.map(sticker => (
              <StickerCard
                key={sticker.id}
                sticker={sticker}
                selected={state.selectedStickerId === sticker.id}
                disabledReason={getStickerDisabledReason(state, sticker)}
                onClick={() => chooseSticker(sticker)}
              />
            ))}
            {state.hand.length === 0 && <p className="blob-lab-empty-hand">No stickers left. End the turn when you are ready.</p>}
          </div>
        </section>
      )}

      {(state.phase === "won" || state.phase === "lost") && (
        <section className={`blob-lab-result is-${state.phase}`}>
          <Sparkles />
          <p className="blob-lab-eyebrow">{state.phase === "won" ? "Room cleared" : "Experiment over"}</p>
          <h2>{state.phase === "won" ? "Shell Slime absorbed!" : "Pipplo needs another try"}</h2>
          <p>{state.phase === "won"
            ? "This is where Pipplo could bounce into the next room with whatever Mass and body tricks survived."
            : "Try using bloblets as disposable shields while you crack its Shell."}</p>
          <div>
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
            <p>Study creates temporary Stickers. Stickers move Pipplo, crack Shell, or bud off little helpers.</p>
            <p>Bloblets protect Pipplo because Shell Slime pops adjacent helpers before slamming the main body. Rejoin surviving helpers to recover Mass.</p>
            <p>This room is intentionally small. The next version can connect several rooms into one expedition map.</p>
          </section>
        </aside>
      )}
    </main>
  );
}
