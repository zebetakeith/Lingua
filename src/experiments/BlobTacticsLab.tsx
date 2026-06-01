import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Beaker,
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
  Wrench,
  X,
} from "lucide-react";
import {
  BLOB_BOARD_COLS,
  BLOB_BOARD_ROWS,
  BLOB_MAP_NODES,
  BLOB_RUN_ROOMS,
  MUTATION_DEFS,
  ACTION_TILE_INFO,
  applyFakeStudyResult,
  claimBlobMutation,
  claimWorkshopTile,
  chooseBlobMapNode,
  createInitialBlobTacticsState,
  endBlobTacticsTurn,
  getBlobletAt,
  getBoardTileKey,
  getEnemyIntent,
  getEnemyPreview,
  getActionTileDisabledReason,
  getTileEffectAt,
  getValidTargetKeys,
  isEnemyAt,
  isPipploAt,
  selectActionTile,
  tapBoardTile,
  type BlobPosition,
  type BlobMutationId,
  type BlobMapNodeId,
  type BlobActionTile,
  type BlobActionTileType,
  type BlobStudyGrade,
} from "./blobTactics";
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

const STUDY_GRADES: Array<{
  grade: BlobStudyGrade;
  title: string;
  detail: string;
  accent: string;
}> = [
  { grade: "bad", title: "Messy", detail: "3 tiles + sour", accent: "#d982ba" },
  { grade: "good", title: "Good", detail: "4 tiles + Mass", accent: "#54bfb4" },
  { grade: "great", title: "Great", detail: "5 tiles + upgrade", accent: "#ff866c" },
];

function getActionTilePrompt(type: BlobActionTileType, hasSource: boolean, enemyName: string): string {
  if (type === "slap") return hasSource ? `Tap ${enemyName}` : "Tap Pipplo or an adjacent bloblet";
  if (type === "spit") return hasSource ? `Tap ${enemyName}` : "Tap a bloblet to sacrifice";
  if (type === "goo") return hasSource ? "Tap a neighboring empty tile" : "Tap a bloblet";
  if (type === "rejoin") return "Tap an adjacent bloblet";
  if (type === "split" || type === "bubble" || type === "sourSplit") return "Tap an empty tile beside Pipplo";
  if (type === "stretch" || type === "bellyFlop" || type === "bump") return `Tap ${enemyName}`;
  return "Tap a highlighted tile";
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
      className={`blob-lab-action-tile ${selected ? "is-selected" : ""} ${tile.sour ? "is-sour" : ""}`}
      style={{ "--tile-accent": info.accent } as React.CSSProperties}
      disabled={Boolean(disabledReason)}
      onClick={onClick}
      title={disabledReason || info.description}
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

function MapNodeIcon({ kind }: { kind: "encounter" | "rest" | "workshop" | "guardian" }) {
  if (kind === "rest") return <Coffee />;
  if (kind === "workshop") return <Wrench />;
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
  const [traitsOpen, setTraitsOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const validTargetKeys = useMemo(() => getValidTargetKeys(state), [state]);
  const selectedTile = state.hand.find(tile => tile.id === state.selectedActionTileId) || null;
  const enemyIntent = getEnemyIntent(state);
  const enemyPreview = useMemo(() => getEnemyPreview(state), [state]);
  const chainStep = state.tilesPlayedThisTurn % 3;

  useEffect(() => {
    if (state.animation === "idle") return;
    const timeout = window.setTimeout(() => {
      setState(current => ({ ...current, animation: "idle" }));
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [state.animation, state.notice.id]);

  const reset = () => setState(createInitialBlobTacticsState());
  const chooseStudyGrade = (grade: BlobStudyGrade) => setState(current => applyFakeStudyResult(current, grade));
  const chooseActionTile = (tile: BlobActionTile) => setState(current => selectActionTile(current, tile.id));
  const tapTile = (position: BlobPosition) => setState(current => tapBoardTile(current, position));
  const claimMutation = (mutationId: BlobMutationId) => setState(current => claimBlobMutation(current, mutationId));
  const chooseMapNode = (nodeId: BlobMapNodeId) => setState(current => chooseBlobMapNode(current, nodeId));
  const chooseWorkshopTile = (type: BlobActionTileType) => setState(current => claimWorkshopTile(current, type));
  const bagCounts = state.tileBag.reduce<Partial<Record<BlobActionTileType, number>>>((counts, type) => {
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

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

      <section className="blob-lab-route" aria-label="Micro-run route">
        <span>Run</span>
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
          {state.enemy.enraged && <span className="blob-lab-enraged">Furious</span>}
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

      {state.phase === "study" && <StudySimulator onChoose={chooseStudyGrade} />}

      {state.phase === "player" && (
        <section className="blob-lab-command-tray" aria-label="Tile hand">
          <div className="blob-lab-tray-heading">
            <div>
              <p className="blob-lab-eyebrow">Tile hand</p>
              <strong>{selectedTile ? getActionTilePrompt(selectedTile.type, Boolean(state.actionSourceId), state.enemy.name) : "Pick a tile, then tap highlighted tiles"}</strong>
              <div className="blob-lab-chain" title="Every third tile restores Mass">
                <span>Bounce chain</span>
                {[0, 1, 2].map(index => <i key={index} className={index < chainStep ? "is-filled" : ""} />)}
                <b className={state.tilesPlayedThisTurn > 0 && chainStep === 0 ? "is-popped" : ""}>
                  {state.tilesPlayedThisTurn > 0 && chainStep === 0 ? "Mass popped!" : `${state.mutations.includes("rhythmJelly") ? "+2" : "+1"} Mass`}
                </b>
              </div>
            </div>
            <button type="button" className="blob-lab-end-button" onClick={() => setState(endBlobTacticsTurn)}>
              End Turn
              <ArrowRight />
            </button>
          </div>
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
            <p>Fight for more mutations, recover before danger, or tune the tile bag.</p>
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

      {(state.phase === "won" || state.phase === "lost") && (
        <section className={`blob-lab-result is-${state.phase}`}>
          <Sparkles />
          <p className="blob-lab-eyebrow">{state.phase === "won" ? "Micro-run cleared" : "Experiment over"}</p>
          <h2>{state.phase === "won" ? "Root Lump absorbed!" : "Pipplo needs another try"}</h2>
          <p>{state.phase === "won"
            ? `Pipplo reached Root Sanctum with ${state.mutations.length} body mutations and ${state.tileBag.length} tiles in the bag.`
            : `Pipplo reached Room ${state.room}. Try splitting helpers to block danger and reclaiming survivors for Mass.`}</p>
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
            <p>Study creates temporary tiles. Tiles move Pipplo, crack Shell, or bud off little helpers. Every third tile played restores Mass.</p>
            <p>Bloblets protect Pipplo because nearby enemies pop helpers before slamming the main body. Rejoin survivors to recover Mass.</p>
            <p>The board previews enemy paths, attacks, and hazards before the turn ends. Between fights, choose routes for mutations, recovery, or Tile Tinker bag upgrades.</p>
          </section>
        </aside>
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
