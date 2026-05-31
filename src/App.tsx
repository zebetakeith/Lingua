import { useState, useEffect, useRef, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Sword, Shield, Zap, BookOpen, Trophy, Lock, ChevronRight, Heart, Timer, Flame, Star, Skull, RotateCcw, Home, Volume2, VolumeX, HelpCircle, Check, Upload, Download, Trash2, Layers, FileText, Sparkles } from "lucide-react";
import VOCABULARY, { getRandomWord, generateDistractors, type VocabWord } from "./data/vocabulary";
import { getEnemiesForFloor, getHpMultiplier, getTimerForFloor, type EnemyDef } from "./data/enemies";
import { CLASSES, getClassById } from "./data/classes";
import { getEncounterForFloor, type EncounterInfo } from "./game/encounters";
import {
  getEnemyActionPlan,
  getEnemyApForTurn,
  getEnemyAttackFrequency,
  getEnemyIntent,
  getEnemyIntentDetail,
  getEnemySpecialText,
  type EnemyPlanContext,
} from "./game/enemyRules";
import {
  CHARACTER_DEFS,
  RELIC_DEFS,
  getPartyDamage,
  getPartyHealing,
  getPartyMaxHp,
  getRelicById,
  getSkillById,
  type CharacterDef,
  type RelicDef,
} from "./game/party";
import {
  BOARD_COLS,
  BOARD_ROWS,
  TILE_KINDS,
  areAdjacentTiles,
  clearRuneStatuses,
  convertRandomRunes,
  createRuneBoard,
  createTunedRuneShuffle,
  createRuneCountMap,
  getPrimaryKindFromCounts,
  getPrimaryRuneKind,
  resolveBoard,
  setRandomRuneStatus,
  shuffleRuneBoard,
  swapBoardTiles,
  type BoardTile,
  type MatchResult,
  type RuneStatus,
  type TileKind,
} from "./game/runes";

const assetUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
};

const assetBackground = (path: string): CSSProperties => ({
  backgroundImage: `url("${assetUrl(path)}")`,
});

// ─── Types ───────────────────────────────────────────────
type GameScreen = "menu" | "classSelect" | "starterDraft" | "combat" | "reward" | "gameOver" | "meta" | "howToPlay" | "flashcards";
type CardRating = "hard" | "medium" | "easy" | "known";
type PowerUpType = "surge" | "ward" | "mend" | "shuffle";
type CombatMode = "studyReady" | "study" | "commandReady" | "command" | "enemyAction" | "boardReady" | "board" | "resolveReady" | "cinematic";
type EnemyAnim = "hit" | "attack" | null;
type PlayerAnim = "hit" | "heal" | null;
type CombatActionEffectType = "shuffle" | "surge" | "ward" | "mend" | "skill";
type TurnActorKind = "party" | "enemy";
type PlayerActionId = "attack" | "defend" | "skill";

interface TurnQueueEntry {
  id: string;
  kind: TurnActorKind;
  refId: string;
  name: string;
  element: TileKind;
  speed: number;
  actionValue: number;
  avatar: string;
}

interface CardProgress {
  box: number;
  correctStreak: number;
  wrongStreak: number;
  seen: number;
  correct: number;
  wrong: number;
  dueAt: number;
}

interface DeckStats {
  totalRuns: number;
  bestFloor: number;
  bestScore: number;
  totalCorrect: number;
  totalWrong: number;
  maxCombo: number;
}

interface SavedDeck {
  id: string;
  name: string;
  cards: VocabWord[];
  cardRatings: Record<string, CardRating>;
  cardProgress: Record<string, CardProgress>;
  stats: DeckStats;
  unlockedClasses: string[];
  unlockedCharacterIds: string[];
  unlockedRelicIds: string[];
  relicHistory: string[];
  bossClears: number;
  createdAt: number;
  updatedAt: number;
}

interface SaveData {
  wisdomOrbs: number;
  unlockedClasses: string[];
  selectedClass: string;
  selectedDeckId: string;
  decks: SavedDeck[];
  importedCards: VocabWord[];
  cardRatings: Record<string, CardRating>;
  cardProgress: Record<string, CardProgress>;
  stats: DeckStats;
}

interface SaveBackupFile {
  app: typeof SAVE_BACKUP_APP_ID;
  version: typeof SAVE_BACKUP_VERSION;
  exportedAt: string;
  save: SaveData;
}

interface CombatState {
  deckId: string;
  floor: number;
  difficultyFloor: number;
  encounter: EncounterInfo;
  deck: VocabWord[];
  rewardChoices: VocabWord[];
  playerHp: number;
  playerMaxHp: number;
  combo: number;
  maxCombo: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  currentEnemyIndex: number;
  enemies: EnemyInstance[];
  mode: CombatMode;
  board: BoardTile[];
  selectedTileIndex: number | null;
  runeMoved: boolean;
  boardMovesMax: number;
  boardMovesLeft: number;
  boardTimeMax: number;
  boardTimeLeft: number;
  lastMovedTileIds: number[];
  newTileIds: number[];
  matchedTileIds: number[];
  isResolvingRunes: boolean;
  dragPointerId: number | null;
  dragPointerX: number;
  dragPointerY: number;
  dragTileId: number | null;
  dragTileKind: TileKind | null;
  dragTileStatus: RuneStatus | null;
  pendingCinematic: CombatCinematicStats | null;
  cinematic: CombatCinematic | null;
  cinematicStepIndex: number;
  relicChoices: RelicDef[];
  runRelics: string[];
  combatLog: string[];
  eventNotices: CombatNotice[];
  actionEffect: CombatActionEffect | null;
  skillCharge: number;
  powerPoints: number;
  actionPoints: number;
  actionPointsEarnedThisRush: number;
  studyApOfferedThisRush: number;
  studyApGoal: number;
  actionPointsSpentThisWindow: number;
  actionPointCarryCap: number;
  enemyActionPoints: number;
  enemyActionPointsSpentThisTurn: number;
  turnQueue: TurnQueueEntry[];
  activeActorId: string | null;
  exposedTurns: number;
  healedOrDefendedThisWindow: boolean;
  apPenaltyNextRush: number;
  nextStudyShuffle: boolean;
  flameDiscountNext: boolean;
  fragileDebuff: number;
  boardMessage: string;
  studyQuestionsTotal: number;
  studyQuestionsLeft: number;
  studyCorrectRound: number;
  studyWrongRound: number;
  studyBoardTimeBonus: number;
  currentWord: VocabWord | null;
  studyFeedback: StudyFeedback | null;
  options: string[];
  timerMax: number;
  timerLeft: number;
  phase: "answering" | "correct" | "wrong" | "transition";
  abilityUsed: boolean;
  abilityCooldown: number;
  activeBuffs: Buff[];
  damageNumbers: DamageNumber[];
  enemyAnim: EnemyAnim;
  playerAnim: PlayerAnim;
  screenShake: number;
  flashColor: string;
  showPhaseBanner: string | null;
  isPaused: boolean;
}

interface CombatCinematicStats {
  elements: TileKind[];
  runeCounts: Record<TileKind, number>;
  elementDamage: Record<TileKind, number>;
  attackers: string[];
  rawDamage: number;
  damage: number;
  shieldDamage: number;
  shieldBroken: boolean;
  heal: number;
  enemyDamage: number;
  curseDamage: number;
  enhancedRunes: number;
  cursedRunes: number;
  weaknessHits: TileKind[];
  resistedHits: TileKind[];
  comboCount: number;
  matchedCount: number;
}

interface CombatCinematic extends CombatCinematicStats {
  id: number;
  enemyName: string;
  enemySprite: string;
  enemyIsBoss: boolean;
  enemyIntent: string;
  enemyHpBefore: number;
  enemyHpAfter: number;
  shieldBefore: number;
  shieldAfter: number;
  shieldBroken: boolean;
  playerHpBefore: number;
  playerHpAfter: number;
  enemyActionLabel: string;
  roomCleared: boolean;
  wardBlocked: boolean;
  log: string[];
  nextMode: CombatMode;
  nextMessage: string;
  rewardAfter: boolean;
  gameOverAfter: boolean;
}

interface CombatCinematicDetails {
  enemyIntent: string;
  enemyHpBefore: number;
  enemyHpAfter: number;
  shieldBefore: number;
  shieldAfter: number;
  shieldBroken: boolean;
  playerHpBefore: number;
  playerHpAfter: number;
  enemyActionLabel: string;
  roomCleared: boolean;
  wardBlocked: boolean;
  log: string[];
}

interface CombatTimelineStep {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: "good" | "warn" | "bad" | "neutral";
  meta?: string;
}

interface EnemyInstance {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  currentDamage: number;
  attackCharge: number;
  phase: number;
  isDead: boolean;
}

interface EnemyDefenseResult {
  adjustedByElement: Record<TileKind, number>;
  rawDamage: number;
  adjustedDamage: number;
  hpDamage: number;
  shieldDamage: number;
  shieldBefore: number;
  shieldAfter: number;
  shieldBroken: boolean;
  weaknessHits: TileKind[];
  resistedHits: TileKind[];
  shieldBreakBonus: number;
  fractureBonus: number;
}

interface Buff {
  type: string;
  remaining: number;
}

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  color: string;
  isCrit: boolean;
}

interface CombatNotice {
  id: number;
  title: string;
  detail: string;
  tone: "good" | "warn" | "bad" | "neutral" | "relic";
}

interface CombatActionEffect {
  id: number;
  type: CombatActionEffectType;
  label: string;
  detail?: string;
  kind?: TileKind;
  color: string;
  casterSprite?: string;
  casterName?: string;
}

interface StudyFeedback {
  selected: string;
  correct: string;
  definition: string;
}

// ─── Constants ───────────────────────────────────────────
const STARTING_HP = 100;
const SAVE_KEY = "lexicon_labyrinth_save";
const SAVE_BACKUP_APP_ID = "lexicon-labyrinth";
const SAVE_BACKUP_VERSION = 1;
const DEFAULT_DECK_ID = "starter-japanese";
const MAX_DECK_CARDS = 2000;
const RUN_START_CARD_TARGET = 6;
const STARTER_DECK_SIZE = RUN_START_CARD_TARGET;
const REWARD_CARD_COUNT = 3;
const RELIC_CHOICE_COUNT = 3;
const QUESTION_TIMER_BONUS = 8;
const MIN_BOARD_MOVES = 3;
const MIN_BOARD_TIME = 3;
const MAX_BOARD_TIME = 8.5;
const BOARD_TIME_SKILL_BONUS = 1.5;
const MATCH_POP_MS = 360;
const RUNE_FALL_MS = 560;
const CASCADE_PAUSE_MS = 120;
const INLINE_COMBAT_BASE_MS = 2600;
const MAX_STUDY_AP_PER_CARD = 5;
const STUDY_RUSH_AP_CAP = 5;
const PLAYER_ACTION_DELAY = 20;
const ENEMY_ACTION_DELAY = 70;

const TILE_DEFS: Record<TileKind, { label: string; sigil: string; color: string; dark: string; glow: string }> = {
  flame: { label: "Flame", sigil: "Ignis", color: "#D66B4D", dark: "#461A13", glow: "rgba(214,107,77,0.5)" },
  tide: { label: "Tide", sigil: "Aqua", color: "#6BC5D6", dark: "#0B3A47", glow: "rgba(107,197,214,0.48)" },
  leaf: { label: "Leaf", sigil: "Terra", color: "#A2B85F", dark: "#263A1C", glow: "rgba(162,184,95,0.46)" },
  light: { label: "Lightning", sigil: "Volt", color: "#E1CA72", dark: "#4A3D18", glow: "rgba(225,202,114,0.52)" },
  shadow: { label: "Dark", sigil: "Umbra", color: "#A784DD", dark: "#201636", glow: "rgba(167,132,221,0.5)" },
  heart: { label: "Heart", sigil: "Vita", color: "#D985A5", dark: "#431A2C", glow: "rgba(217,133,165,0.48)" },
};

const POWER_UP_DEFS: Record<PowerUpType, { label: string; description: string; color: string }> = {
  surge: { label: "Surge", description: "Next match deals 60% more damage.", color: "#F39C12" },
  ward: { label: "Ward", description: "Blocks the next enemy strike.", color: "#45A9FF" },
  mend: { label: "Mend", description: "Restore 20 HP instantly.", color: "#2ECC71" },
  shuffle: { label: "Shuffle", description: "Tune the board toward likely combos.", color: "#B078FF" },
};

const POWER_UP_COSTS: Record<PowerUpType, number> = {
  mend: 3,
  shuffle: 4,
  ward: 5,
  surge: 6,
};

const CARD_RATINGS: { id: CardRating; label: string; shortLabel: string; color: string }[] = [
  { id: "hard", label: "Hard", shortLabel: "Hard", color: "#FF4757" },
  { id: "medium", label: "Medium", shortLabel: "Med", color: "#F39C12" },
  { id: "easy", label: "Easy", shortLabel: "Easy", color: "#2ECC71" },
  { id: "known", label: "I know already", shortLabel: "Known", color: "#95A5A6" },
];

const CARD_RATING_WEIGHTS: Record<CardRating, number> = {
  hard: 4,
  medium: 2,
  easy: 1,
  known: 0,
};

const CARD_POWER_POINTS: Record<CardRating, number> = {
  hard: 3,
  medium: 2,
  easy: 1,
  known: 0,
};

const LEITNER_KNOWN_BOX = 6;
const LEITNER_INTERVALS_MS = [0, 0, 5 * 60_000, 30 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000, Number.MAX_SAFE_INTEGER];

// ─── Utility ─────────────────────────────────────────────
function createDeckStats(): DeckStats {
  return { totalRuns: 0, bestFloor: 0, bestScore: 0, totalCorrect: 0, totalWrong: 0, maxCombo: 0 };
}

function createSavedDeck(name: string, cards: VocabWord[], id = `deck-${Date.now()}`): SavedDeck {
  const now = Date.now();
  return {
    id,
    name,
    cards: cards.slice(0, MAX_DECK_CARDS),
    cardRatings: {},
    cardProgress: {},
    stats: createDeckStats(),
    unlockedClasses: ["linguist"],
    unlockedCharacterIds: ["linguist"],
    unlockedRelicIds: [],
    relicHistory: [],
    bossClears: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultDeck(): SavedDeck {
  return createSavedDeck("Starter Japanese", VOCABULARY, DEFAULT_DECK_ID);
}

function normalizeDeck(deck: Partial<SavedDeck>, fallback: SavedDeck): SavedDeck {
  const now = Date.now();
  return {
    ...fallback,
    ...deck,
    id: typeof deck.id === "string" && deck.id ? deck.id : fallback.id,
    name: typeof deck.name === "string" && deck.name.trim() ? deck.name.trim() : fallback.name,
    cards: Array.isArray(deck.cards) ? deck.cards.slice(0, MAX_DECK_CARDS) : fallback.cards,
    cardRatings: deck.cardRatings && typeof deck.cardRatings === "object" ? deck.cardRatings : {},
    cardProgress: deck.cardProgress && typeof deck.cardProgress === "object" ? deck.cardProgress : {},
    unlockedClasses: Array.isArray(deck.unlockedClasses) && deck.unlockedClasses.length > 0
      ? Array.from(new Set(["linguist", ...deck.unlockedClasses]))
      : fallback.unlockedClasses,
    unlockedCharacterIds: Array.isArray(deck.unlockedCharacterIds) && deck.unlockedCharacterIds.length > 0
      ? Array.from(new Set(["linguist", ...deck.unlockedCharacterIds]))
      : fallback.unlockedCharacterIds,
    unlockedRelicIds: Array.isArray(deck.unlockedRelicIds) ? deck.unlockedRelicIds : fallback.unlockedRelicIds,
    relicHistory: Array.isArray(deck.relicHistory) ? deck.relicHistory : fallback.relicHistory,
    bossClears: typeof deck.bossClears === "number" ? deck.bossClears : fallback.bossClears,
    stats: {
      ...createDeckStats(),
      ...(deck.stats || {}),
    },
    createdAt: typeof deck.createdAt === "number" ? deck.createdAt : now,
    updatedAt: typeof deck.updatedAt === "number" ? deck.updatedAt : now,
  };
}

function createDefaultSave(): SaveData {
  const defaultDeck = createDefaultDeck();
  return {
    wisdomOrbs: 0,
    unlockedClasses: ["linguist"],
    selectedClass: "linguist",
    selectedDeckId: defaultDeck.id,
    decks: [defaultDeck],
    importedCards: [],
    cardRatings: {},
    cardProgress: {},
    stats: createDeckStats(),
  };
}

function normalizeSave(data: Partial<SaveData> | null): SaveData {
  const fallback = createDefaultSave();
  if (!data) return fallback;
  const legacyImportedCards = Array.isArray(data.importedCards) ? data.importedCards.slice(0, MAX_DECK_CARDS) : [];
  const normalizedDecks = Array.isArray(data.decks)
    ? data.decks.map((deck, index) => normalizeDeck(deck, createSavedDeck(`Deck ${index + 1}`, [], deck?.id || `deck-${index + 1}`)))
    : [];
  const migratedDecks = normalizedDecks.length > 0
    ? normalizedDecks
    : legacyImportedCards.length > 0
      ? [
          normalizeDeck({
            id: "legacy-imported",
            name: "Imported Deck",
            cards: legacyImportedCards,
            cardRatings: data.cardRatings || {},
            cardProgress: data.cardProgress || {},
            stats: data.stats || createDeckStats(),
          }, createSavedDeck("Imported Deck", legacyImportedCards, "legacy-imported")),
          createDefaultDeck(),
        ]
      : [createDefaultDeck()];
  const selectedDeckId = migratedDecks.some(deck => deck.id === data.selectedDeckId)
    ? data.selectedDeckId as string
    : migratedDecks[0].id;

  return {
    ...fallback,
    ...data,
    selectedDeckId,
    decks: migratedDecks,
    importedCards: legacyImportedCards,
    cardRatings: data.cardRatings && typeof data.cardRatings === "object" ? data.cardRatings : {},
    cardProgress: data.cardProgress && typeof data.cardProgress === "object" ? data.cardProgress : {},
    stats: {
      ...createDeckStats(),
      ...(data.stats || {}),
    },
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return normalizeSave(JSON.parse(raw));
  } catch {
    // Fall back to a fresh save if stored progress is malformed.
  }
  return createDefaultSave();
}

function saveSave(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function createSaveBackup(data: SaveData): SaveBackupFile {
  return {
    app: SAVE_BACKUP_APP_ID,
    version: SAVE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    save: normalizeSave(data),
  };
}

function sanitizeBackupFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "save";
}

function createBackupFilename(data: SaveData): string {
  const datePart = new Date().toISOString().slice(0, 10);
  const deckPart = sanitizeBackupFilenamePart(getActiveDeck(data).name);
  return `lexicon-labyrinth-${deckPart}-${datePart}.json`;
}

function parseSaveBackup(text: string): SaveData {
  const parsed = JSON.parse(text) as Partial<SaveBackupFile> | Partial<SaveData>;
  const candidate = (parsed as Partial<SaveBackupFile>).app === SAVE_BACKUP_APP_ID && (parsed as Partial<SaveBackupFile>).save
    ? (parsed as Partial<SaveBackupFile>).save
    : parsed;

  if (!candidate || typeof candidate !== "object" || (!Array.isArray((candidate as Partial<SaveData>).decks) && !Array.isArray((candidate as Partial<SaveData>).importedCards))) {
    throw new Error("This does not look like a Lexicon Labyrinth save file.");
  }

  return normalizeSave(candidate as Partial<SaveData>);
}

function getActiveDeckId(saveData: SaveData): string {
  return saveData.decks.some(deck => deck.id === saveData.selectedDeckId)
    ? saveData.selectedDeckId
    : saveData.decks[0]?.id || DEFAULT_DECK_ID;
}

function getActiveDeck(saveData: SaveData): SavedDeck {
  return saveData.decks.find(deck => deck.id === getActiveDeckId(saveData)) || saveData.decks[0] || createDefaultDeck();
}

function getDeckUnlockedClasses(deck: SavedDeck): string[] {
  return Array.from(new Set(["linguist", ...(deck.unlockedClasses || [])]));
}

function getRunParty(saveData: SaveData): CharacterDef[] {
  const activeDeck = getActiveDeck(saveData);
  const unlocked = new Set([...(activeDeck.unlockedCharacterIds || []), ...getDeckUnlockedClasses(activeDeck)]);
  return CHARACTER_DEFS.filter(character => unlocked.has(character.id));
}

function getMilestoneCharacterUnlocks(stats: DeckStats, bossClears: number): string[] {
  const unlocked = ["linguist"];
  if (stats.bestFloor >= 5) unlocked.push("speedreader");
  if (stats.totalCorrect >= 50) unlocked.push("scholar");
  if (stats.bestFloor >= 8) unlocked.push("botanist");
  if (bossClears >= 1) unlocked.push("duskblade");
  return unlocked;
}

function getPendingCharacterUnlocks(saveData: SaveData, state: CombatState | null): CharacterDef[] {
  if (!state) return [];
  const deck = saveData.decks.find(candidate => candidate.id === state.deckId) || getActiveDeck(saveData);
  const currentUnlocks = new Set([...(deck.unlockedCharacterIds || []), ...getDeckUnlockedClasses(deck)]);
  const clearedBoss = state.enemies.some(enemy => enemy.def.isBoss && enemy.isDead);
  const projectedStats: DeckStats = {
    ...deck.stats,
    bestFloor: Math.max(deck.stats.bestFloor, state.floor),
    totalCorrect: deck.stats.totalCorrect + state.correctCount,
    totalWrong: deck.stats.totalWrong + state.wrongCount,
    maxCombo: Math.max(deck.stats.maxCombo, state.maxCombo),
    bestScore: Math.max(deck.stats.bestScore, state.score),
  };
  const projectedBossClears = deck.bossClears + (clearedBoss ? 1 : 0);
  const milestoneIds = getMilestoneCharacterUnlocks(projectedStats, projectedBossClears);

  return CHARACTER_DEFS.filter(character => milestoneIds.includes(character.id) && !currentUnlocks.has(character.id));
}

function updateActiveDeck(saveData: SaveData, updater: (deck: SavedDeck) => SavedDeck): SaveData {
  const activeDeckId = getActiveDeckId(saveData);
  const decks = saveData.decks.length > 0 ? saveData.decks : [createDefaultDeck()];
  const updatedDecks = decks.map(deck => (
    deck.id === activeDeckId
      ? { ...updater(deck), updatedAt: Date.now() }
      : deck
  ));

  return {
    ...saveData,
    selectedDeckId: activeDeckId,
    decks: updatedDecks,
  };
}

function getDeckRampStride(cardCount: number): number {
  if (cardCount <= 50) return 1;
  return Math.min(8, 1 + Math.floor(Math.log2(cardCount / 50)));
}

function getDifficultyFloor(runFloor: number, saveData: SaveData): number {
  const stride = getDeckRampStride(Math.max(1, getAllCards(saveData).length));
  return 1 + Math.floor((Math.max(1, runFloor) - 1) / stride);
}

function updateRunStats(saveData: SaveData, state: CombatState, orbsEarned: number): SaveData {
  const nextGlobalStats: DeckStats = {
    ...saveData.stats,
    totalRuns: saveData.stats.totalRuns + 1,
    bestFloor: Math.max(saveData.stats.bestFloor, state.floor),
    bestScore: Math.max(saveData.stats.bestScore, state.score),
    totalCorrect: saveData.stats.totalCorrect + state.correctCount,
    totalWrong: saveData.stats.totalWrong + state.wrongCount,
    maxCombo: Math.max(saveData.stats.maxCombo, state.maxCombo),
  };

  const deckId = state.deckId || getActiveDeckId(saveData);
  const decks = saveData.decks.length > 0 ? saveData.decks : [createDefaultDeck()];
  const clearedBoss = state.enemies.some(enemy => enemy.def.isBoss && enemy.isDead);

  return {
    ...saveData,
    wisdomOrbs: saveData.wisdomOrbs + orbsEarned,
    stats: nextGlobalStats,
    decks: decks.map(deck => {
      if (deck.id !== deckId) return deck;

      const nextStats = {
        ...deck.stats,
        totalRuns: deck.stats.totalRuns + 1,
        bestFloor: Math.max(deck.stats.bestFloor, state.floor),
        bestScore: Math.max(deck.stats.bestScore, state.score),
        totalCorrect: deck.stats.totalCorrect + state.correctCount,
        totalWrong: deck.stats.totalWrong + state.wrongCount,
        maxCombo: Math.max(deck.stats.maxCombo, state.maxCombo),
      };
      const nextBossClears = deck.bossClears + (clearedBoss ? 1 : 0);

      return {
        ...deck,
        updatedAt: Date.now(),
        stats: nextStats,
        bossClears: nextBossClears,
        unlockedCharacterIds: Array.from(new Set([
          ...(deck.unlockedCharacterIds || []),
          ...getMilestoneCharacterUnlocks(nextStats, nextBossClears),
        ])),
      };
    }),
  };
}

function shuffleCards<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeCardKey(word: string, definition: string): string {
  return `${word.trim().toLocaleLowerCase()}::${definition.trim().toLocaleLowerCase()}`;
}

function getAllCards(saveData: SaveData): VocabWord[] {
  const activeDeck = getActiveDeck(saveData);
  return activeDeck.cards.length > 0 ? activeDeck.cards : VOCABULARY;
}

function getStudyLibrary(saveData: SaveData): VocabWord[] {
  return getAllCards(saveData).filter(card => !isKnownCard(card, saveData));
}

function getBoxFromRating(rating: CardRating): number {
  if (rating === "hard") return 1;
  if (rating === "medium") return 3;
  if (rating === "easy") return 4;
  return LEITNER_KNOWN_BOX;
}

function getRatingFromBox(box: number): CardRating {
  if (box >= LEITNER_KNOWN_BOX) return "known";
  if (box >= 4) return "easy";
  if (box >= 3) return "medium";
  return "hard";
}

function getInitialBox(card: VocabWord, saveData: SaveData): number {
  const activeDeck = getActiveDeck(saveData);
  const manualRating = activeDeck.cardRatings?.[card.id] || saveData.cardRatings?.[card.id];
  if (manualRating) return getBoxFromRating(manualRating);
  if (card.difficulty >= 5) return 1;
  if (card.difficulty >= 3) return 2;
  return 3;
}

function getCardProgress(card: VocabWord, saveData: SaveData): CardProgress {
  const activeDeck = getActiveDeck(saveData);
  const stored = activeDeck.cardProgress?.[card.id] || saveData.cardProgress?.[card.id];
  if (stored) return stored;
  const box = getInitialBox(card, saveData);
  return {
    box,
    correctStreak: 0,
    wrongStreak: 0,
    seen: 0,
    correct: 0,
    wrong: 0,
    dueAt: 0,
  };
}

function isKnownCard(card: VocabWord, saveData: SaveData): boolean {
  const activeDeck = getActiveDeck(saveData);
  return activeDeck.cardRatings?.[card.id] === "known" || saveData.cardRatings?.[card.id] === "known" || getCardProgress(card, saveData).box >= LEITNER_KNOWN_BOX;
}

function getCardWeight(card: VocabWord, saveData: SaveData): number {
  const progress = getCardProgress(card, saveData);
  if (progress.box >= LEITNER_KNOWN_BOX) return 0;
  const rating = getRatingFromBox(progress.box);
  const dueBoost = progress.dueAt <= Date.now() ? 1.7 : 0.7;
  return CARD_RATING_WEIGHTS[rating] * dueBoost;
}

function getPowerPointsForCard(card: VocabWord, saveData: SaveData): number {
  return CARD_POWER_POINTS[getRatingFromBox(getCardProgress(card, saveData).box)];
}

function getApForCorrectCard(card: VocabWord, saveData: SaveData): number {
  const base = getPowerPointsForCard(card, saveData);
  return Math.min(MAX_STUDY_AP_PER_CARD, base);
}

function getFocusBonusForCorrectCard(card: VocabWord): number {
  return card.difficulty >= 4 ? 1 : 0;
}

function getStudyRushApCap(_state?: CombatState | null): number {
  return _state?.studyApGoal || STUDY_RUSH_AP_CAP;
}

function getRemainingStudyRushAp(state: CombatState): number {
  return Math.max(0, getStudyRushApCap(state) - state.studyApOfferedThisRush);
}

function clampStudyRushAp(state: CombatState, rawAp: number): number {
  return Math.min(getRemainingStudyRushAp(state), Math.max(0, rawAp));
}

function getProjectedStudyCardAp(state: CombatState, saveData: SaveData): number {
  if (!state.currentWord) return 0;
  const rating = getRatingFromBox(getCardProgress(state.currentWord, saveData).box);
  const hardEdgeBonus = state.runRelics.includes("hard_edge") && rating === "hard" ? 1 : 0;
  const steadyGripBonus = state.runRelics.includes("steady_grip") && state.studyCorrectRound === 0 ? 1 : 0;
  const rawAp = Math.max(1, getApForCorrectCard(state.currentWord, saveData) + hardEdgeBonus + steadyGripBonus);
  return clampStudyRushAp(state, rawAp);
}

function getProjectedCorrectAnswerAp(state: CombatState, saveData: SaveData): number {
  const cardAp = getProjectedStudyCardAp(state, saveData);
  return Math.max(0, cardAp - Math.min(cardAp, state.apPenaltyNextRush));
}

function updateCardProgressFromAnswer(saveData: SaveData, card: VocabWord, isCorrect: boolean): SaveData {
  const now = Date.now();
  const current = getCardProgress(card, saveData);
  const nextBox = isCorrect
    ? Math.min(LEITNER_KNOWN_BOX, current.box + 1)
    : Math.max(1, current.box - (current.wrongStreak >= 1 ? 2 : 1));
  const nextProgress: CardProgress = {
    box: nextBox,
    correctStreak: isCorrect ? current.correctStreak + 1 : 0,
    wrongStreak: isCorrect ? 0 : current.wrongStreak + 1,
    seen: current.seen + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
    wrong: current.wrong + (isCorrect ? 0 : 1),
    dueAt: nextBox >= LEITNER_KNOWN_BOX ? Number.MAX_SAFE_INTEGER : now + LEITNER_INTERVALS_MS[nextBox],
  };
  const nextRating = getRatingFromBox(nextBox);

  return updateActiveDeck(saveData, deck => ({
    ...deck,
    cardProgress: {
      ...(deck.cardProgress || {}),
      [card.id]: nextProgress,
    },
    cardRatings: {
      ...(deck.cardRatings || {}),
      [card.id]: nextRating,
    },
  }));
}

function updateCardProgressFromRating(saveData: SaveData, card: VocabWord, rating: CardRating): SaveData {
  const box = getBoxFromRating(rating);
  return updateActiveDeck(saveData, deck => ({
    ...deck,
    cardRatings: {
      ...(deck.cardRatings || {}),
      [card.id]: rating,
    },
    cardProgress: {
      ...(deck.cardProgress || {}),
      [card.id]: {
        box,
        correctStreak: rating === "known" ? 3 : 0,
        wrongStreak: 0,
        seen: getCardProgress(card, saveData).seen,
        correct: getCardProgress(card, saveData).correct,
        wrong: getCardProgress(card, saveData).wrong,
        dueAt: rating === "known" ? Number.MAX_SAFE_INTEGER : Date.now() + LEITNER_INTERVALS_MS[box],
      },
    },
  }));
}

function refillDeck(deck: VocabWord[], saveData: SaveData): VocabWord[] {
  const playableDeck = deck.filter(card => !isKnownCard(card, saveData));
  const deckIds = new Set(playableDeck.map(card => card.id));
  const needed = STARTER_DECK_SIZE - playableDeck.length;
  if (needed <= 0) return playableDeck;

  const fillers = getStudyLibrary(saveData).filter(card => !deckIds.has(card.id));
  return [...playableDeck, ...shuffleCards(fillers).slice(0, needed)];
}

function drawWordFromDeck(deck: VocabWord[], saveData: SaveData, previousId?: string): VocabWord {
  const playable = deck.filter(card => getCardWeight(card, saveData) > 0);
  const withoutPrevious = playable.length > 1 ? playable.filter(card => card.id !== previousId) : playable;
  const pool = withoutPrevious.length > 0 ? withoutPrevious : playable;
  if (pool.length === 0) return shuffleCards(getStudyLibrary(saveData))[0] || getRandomWord(1);

  const totalWeight = pool.reduce((sum, card) => sum + getCardWeight(card, saveData), 0);
  let roll = Math.random() * totalWeight;

  for (const card of pool) {
    roll -= getCardWeight(card, saveData);
    if (roll <= 0) return card;
  }

  return pool[pool.length - 1];
}

function createStarterDeck(saveData: SaveData): VocabWord[] {
  const deckCards = getAllCards(saveData);
  const activeStudyCards = deckCards.filter(card => !isKnownCard(card, saveData));
  const easyCards = activeStudyCards.filter(card => card.difficulty <= 2);
  const preferredCards = easyCards.length >= Math.min(4, STARTER_DECK_SIZE) ? easyCards : activeStudyCards;
  const deck = shuffleCards(preferredCards).slice(0, STARTER_DECK_SIZE);
  const deckIds = new Set(deck.map(card => card.id));

  if (deck.length < Math.min(4, STARTER_DECK_SIZE)) {
    const fillers = shuffleCards(activeStudyCards).filter(card => !deckIds.has(card.id));
    deck.push(...fillers.slice(0, Math.min(4, STARTER_DECK_SIZE) - deck.length));
  }

  return deck.length > 0 ? deck : shuffleCards(getStudyLibrary(saveData)).slice(0, STARTER_DECK_SIZE);
}

function createRewardChoices(saveData: SaveData, deck: VocabWord[], floor: number, excludedIds = new Set<string>()): VocabWord[] {
  const deckIds = new Set(deck.map(card => card.id));
  const library = getStudyLibrary(saveData).filter(card => !deckIds.has(card.id) && !excludedIds.has(card.id));
  const floorCap = Math.min(6, Math.max(2, floor + 1));
  const defaultRewards = library.filter(card => card.id.startsWith("v") && card.difficulty <= floorCap);
  const deckRewards = library.filter(card => !card.id.startsWith("v") || card.difficulty <= floorCap);
  const primaryPool = deckRewards.length > 0 ? deckRewards : defaultRewards;
  const pool = primaryPool.length >= REWARD_CARD_COUNT ? primaryPool : library;

  return shuffleCards(pool).slice(0, REWARD_CARD_COUNT);
}

function createStarterDraftChoices(saveData: SaveData, draftDeck: VocabWord[], excludedIds = new Set<string>()): VocabWord[] {
  const draftIds = new Set(draftDeck.map(card => card.id));
  const library = getStudyLibrary(saveData).filter(card => !draftIds.has(card.id) && !excludedIds.has(card.id));
  return shuffleCards(library).slice(0, REWARD_CARD_COUNT);
}

function createRelicChoices(runRelics: string[], encounter?: EncounterInfo): RelicDef[] {
  const owned = new Set(runRelics);
  const available = RELIC_DEFS.filter(relic => !owned.has(relic.id));
  const priorityPool = encounter?.isBoss
    ? available.filter(relic => relic.rarity === "rare")
    : encounter?.isElite
      ? available.filter(relic => relic.rarity !== "common")
      : [];
  const priority = priorityPool.length > 0 ? shuffleCards(priorityPool).slice(0, 1) : [];
  const priorityIds = new Set(priority.map(relic => relic.id));
  const filler = shuffleCards(available.filter(relic => !priorityIds.has(relic.id)));

  return [...priority, ...filler].slice(0, RELIC_CHOICE_COUNT);
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseFlashcardLine(line: string): { word: string; definition: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.includes("\t")) {
    const [word, ...rest] = trimmed.split(/\t+/);
    return { word: word.trim(), definition: rest.join(" ").trim() };
  }

  const csvCells = splitCsvLine(trimmed);
  if (csvCells.length >= 2 && csvCells[0] && csvCells[1]) {
    return { word: csvCells[0].trim(), definition: csvCells.slice(1).join(", ").trim() };
  }

  const separators = [" - ", " = ", " : ", ":"];
  for (const separator of separators) {
    const index = trimmed.indexOf(separator);
    if (index > 0) {
      return {
        word: trimmed.slice(0, index).trim(),
        definition: trimmed.slice(index + separator.length).trim(),
      };
    }
  }

  return null;
}

function parseFlashcardImport(text: string, existingCards: VocabWord[]) {
  const existingKeys = new Set(existingCards.map(card => normalizeCardKey(card.word, card.definition)));
  const importedKeys = new Set<string>();
  const cards: VocabWord[] = [];
  let skipped = 0;
  let invalid = 0;
  const timestamp = Date.now();

  text.split(/\r?\n/).forEach((line, index) => {
    const parsed = parseFlashcardLine(line);
    if (!parsed || !parsed.word || !parsed.definition) {
      if (line.trim()) invalid++;
      return;
    }

    const key = normalizeCardKey(parsed.word, parsed.definition);
    if (existingKeys.has(key) || importedKeys.has(key)) {
      skipped++;
      return;
    }

    importedKeys.add(key);
    cards.push({
      id: `imported-${timestamp}-${index}`,
      word: parsed.word,
      definition: parsed.definition,
      difficulty: 2,
      options: [],
    });
  });

  return { cards, skipped, invalid };
}

function getQuestionTimerForFloor(floor: number): number {
  return getTimerForFloor(floor) + QUESTION_TIMER_BONUS;
}

function formatBoardTime(seconds: number): string {
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

function formatStudyRushResult(correct: number, answered: number): string {
  if (answered <= 0) return "No cards answered";
  return `${correct}/${answered} correct`;
}

function formatTileLabels(kinds: TileKind[]): string {
  return kinds.map(kind => TILE_DEFS[kind].label).join(", ");
}

function getEnemySpeed(enemy: EnemyInstance): number {
  const frequency = getEnemyAttackFrequency(enemy);
  const base =
    frequency <= 1 ? 118 :
    frequency === 2 ? 96 :
    78;
  return enemy.def.isBoss ? base + 8 : base;
}

function getTimelineActionDelay(speed: number, base: number, actionCost = 1): number {
  return Math.max(12, Math.round((base * Math.max(1, actionCost) * 100) / Math.max(35, speed)));
}

function sortTurnQueue(queue: TurnQueueEntry[]): TurnQueueEntry[] {
  return [...queue].sort((a, b) => a.actionValue - b.actionValue || b.speed - a.speed || a.name.localeCompare(b.name));
}

function buildTurnQueue(party: CharacterDef[], enemies: EnemyInstance[]): TurnQueueEntry[] {
  const partyEntries = party.map((member, index) => ({
    id: `party-${member.id}`,
    kind: "party" as const,
    refId: member.id,
    name: member.name,
    element: member.element,
    speed: member.speed,
    actionValue: index * 8,
    avatar: member.sprite,
  }));

  const enemyEntries = enemies
    .filter(enemy => !enemy.isDead)
    .map((enemy, index) => {
      const speed = getEnemySpeed(enemy);
      return {
        id: `enemy-${enemy.def.id}-${index}`,
        kind: "enemy" as const,
        refId: enemy.def.id,
        name: enemy.def.name,
        element: enemy.def.element,
        speed,
        actionValue: 58 + index * 18,
        avatar: enemy.def.sprite,
      };
    });

  return sortTurnQueue([...partyEntries, ...enemyEntries]);
}

function advanceTimelineByCost(queue: TurnQueueEntry[], actorId: string, actionCost = 1, extraDelay = 0): TurnQueueEntry[] {
  return sortTurnQueue(queue.map(entry => {
    if (entry.id !== actorId) return entry;
    const baseDelay = entry.kind === "enemy" ? ENEMY_ACTION_DELAY : PLAYER_ACTION_DELAY;
    return {
      ...entry,
      actionValue: entry.actionValue + getTimelineActionDelay(entry.speed, baseDelay, actionCost) + extraDelay,
    };
  }));
}

function delayPartyMember(queue: TurnQueueEntry[], amount = 45): TurnQueueEntry[] {
  const partyEntries = queue.filter(entry => entry.kind === "party");
  if (partyEntries.length === 0) return queue;
  const target = partyEntries[Math.floor(Math.random() * partyEntries.length)];
  return sortTurnQueue(queue.map(entry => entry.id === target.id ? { ...entry, actionValue: entry.actionValue + amount } : entry));
}

function removeEnemyFromQueue(queue: TurnQueueEntry[], enemy: EnemyInstance): TurnQueueEntry[] {
  return sortTurnQueue(queue.filter(entry => !(entry.kind === "enemy" && entry.refId === enemy.def.id)));
}

function getCurrentActor(state: CombatState): TurnQueueEntry | null {
  return state.turnQueue[0] || null;
}

function getActorCharacter(actor: TurnQueueEntry | null, party: CharacterDef[]): CharacterDef | null {
  if (!actor || actor.kind !== "party") return null;
  return party.find(member => member.id === actor.refId) || null;
}

function getPlayerActionCost(member: CharacterDef, action: PlayerActionId, state?: CombatState | null): number {
  if (action === "attack" || action === "defend") return 1;
  const skill = getSkillById(member.skillId);
  let cost = skill?.cost || 2;
  if (state?.flameDiscountNext && member.element === "flame") {
    cost = Math.max(1, cost - 1);
  }
  return cost;
}

function getActionLabel(member: CharacterDef, action: PlayerActionId): string {
  if (action === "attack") return "Attack";
  if (action === "defend") return "Defend";
  return getSkillById(member.skillId)?.name || "Skill";
}

function getEnemyPlanContext(state: CombatState): EnemyPlanContext {
  return {
    actionPointsSpentThisWindow: state.actionPointsSpentThisWindow,
    healedOrDefendedThisWindow: state.healedOrDefendedThisWindow,
    nextStudyShuffle: state.nextStudyShuffle,
    skillCharge: state.skillCharge,
  };
}

function getEnemyCountdownLabel(enemy: EnemyInstance): string {
  return `Speed ${getEnemySpeed(enemy)}`;
}

function getCinematicAttackKinds(cinematic?: CombatCinematic | null): TileKind[] {
  if (!cinematic) return [];
  return TILE_KINDS
    .filter(kind => kind !== "heart" && (cinematic.elementDamage[kind] || 0) > 0)
    .sort((a, b) => (cinematic.elementDamage[b] || 0) - (cinematic.elementDamage[a] || 0));
}

function getCinematicRuneStreamKinds(cinematic?: CombatCinematic | null): TileKind[] {
  if (!cinematic) return [];
  return TILE_KINDS
    .filter(kind => (cinematic.runeCounts[kind] || 0) > 0)
    .sort((a, b) => (cinematic.runeCounts[b] || 0) - (cinematic.runeCounts[a] || 0));
}

function getBattlefieldCaster(kind: TileKind, party: CharacterDef[]): CharacterDef | null {
  if (kind === "heart") return party.find(member => member.element === "leaf") || party[0] || null;
  return party.find(member => member.element === kind) || party[0] || null;
}

function getBattlefieldSource(kind: TileKind, party: CharacterDef[], fallbackIndex = 0): { x: number; y: number } {
  const caster = getBattlefieldCaster(kind, party);
  const index = caster ? Math.max(0, party.findIndex(member => member.id === caster.id)) : fallbackIndex;
  return {
    x: 13 + Math.min(index, 2) * 7,
    y: 56 + (index % 2) * 9,
  };
}

function getEnemyIntentShortLabel(enemy?: EnemyInstance | null, context?: EnemyPlanContext): string {
  if (!enemy) return "";
  if (enemy.shield > 0) return `SHIELD ${enemy.shield}`;
  const plan = getEnemyActionPlan(enemy, context);
  const specialAction = plan.find(action => action.id !== "strike");
  if (specialAction) {
    if (specialAction.id === "scramble_answers") return "SCRAMBLE";
    if (specialAction.id === "study_tax") return "STUDY TAX";
    if (specialAction.id === "drain_focus") return "DRAIN";
    if (specialAction.id === "delay_actor") return "DELAY";
    if (specialAction.id === "self_repair") return "REPAIR";
    if (specialAction.id === "exploit_hesitation") return "AP CHECK";
    if (specialAction.id === "punish_neglect") return "HEAL CHECK";
    if (specialAction.id === "boss_protocol") return "PROTOCOL";
    if (specialAction.id === "boss_pressure") return "PRESSURE";
    return specialAction.name.toUpperCase();
  }
  const totalDamage = plan.reduce((total, action) => total + action.damage, 0);
  return totalDamage > 0 ? `${totalDamage}` : "READY";
}

function getEnemyIntentIcon(enemy?: EnemyInstance | null, context?: EnemyPlanContext): "attack" | "shield" | "special" | "timer" {
  if (!enemy) return "timer";
  if (enemy.shield > 0) return "shield";
  const plan = getEnemyActionPlan(enemy, context);
  if (plan.some(action => action.id === "study_tax" || action.id === "drain_focus")) return "timer";
  if (plan.some(action => action.id !== "strike")) return "special";
  return "attack";
}

function getRuneStatusTitle(status?: RuneStatus | null): string {
  if (status === "enhanced") return "Enhanced: boosted damage or healing when cleared";
  if (status === "cursed") return "Cursed: causes recoil when cleared";
  return "";
}

function getPreferredWeakKind(enemy?: EnemyInstance | null): TileKind | null {
  return enemy?.def.weakTo.find(kind => kind !== "heart") || null;
}

function getSkillTacticalHint(skillId: string, enemy?: EnemyInstance | null): string {
  if (!enemy) return "";
  const weakKind = getPreferredWeakKind(enemy);
  const weakLabel = weakKind ? TILE_DEFS[weakKind].label : "";
  const urgent = enemy.attackCharge <= 1;
  const shielded = enemy.shield > 0;

  if (skillId === "steady_hand") {
    if (shielded && weakKind) return `Route for ${weakLabel} break`;
    return weakKind ? `More ${weakLabel} setup` : "Adds sprint time";
  }

  const skill = getSkillById(skillId);
  if (!skill) return "";
  if (skillId === "ward_word") {
    if (urgent) return enemy.def.special ? "Blocks hit + special" : "Blocks incoming";
    if (enemy.def.special === "timer_drain" || enemy.def.special === "freeze_timer") return "Prevents disruption";
    return "Defensive bank";
  }
  if (skillId === "verdant_shift") {
    if (enemy.def.special === "healing_check") return "Passes heal check";
    if (urgent) return "Heal before hit";
    return weakKind === "leaf" ? "Leaf weakness setup" : "Recovery setup";
  }
  if (enemy.def.weakTo.includes(skill.element)) return shielded ? "Weak shield break" : "Hits weakness";
  if (enemy.def.resists?.includes(skill.element)) return "Resisted here";

  return "";
}

function getEnemyPuzzleHint(enemy?: EnemyInstance | null): { label: string; text: string; tone: "good" | "warn" | "bad" | "neutral" } | null {
  if (!enemy) return null;

  if (enemy.shield > 0) {
    return {
      label: "Shield puzzle",
      text: `Break with ${formatTileLabels(enemy.def.weakTo)} commands.`,
      tone: "warn",
    };
  }

  if (enemy.def.special === "low_combo_punish") {
    return { label: "AP check", text: "Spend 3+ AP before it acts.", tone: "bad" };
  }
  if (enemy.def.special === "healing_check") {
    return { label: "Healing check", text: "Heal or defend before its turn.", tone: "good" };
  }
  if (enemy.def.special === "self_heal") {
    return { label: "Burst puzzle", text: "Finish it quickly or it heals.", tone: "warn" };
  }
  if (enemy.def.special === "timer_drain" || enemy.def.special === "freeze_timer") {
    return { label: "Disruptor", text: "Ward or shield break prevents the worst hit.", tone: "bad" };
  }
  if (enemy.def.special === "randomize_positions" || enemy.def.special === "shuffle_answers") {
    return { label: "Timeline puzzle", text: "Act before it disrupts commands or study.", tone: "warn" };
  }
  if (enemy.def.special === "three_phase" || enemy.def.special === "enrage_at_50") {
    return { label: "Boss puzzle", text: "Hold burst for phase shifts.", tone: "bad" };
  }

  return {
    label: "Element puzzle",
    text: `Aim for ${formatTileLabels(enemy.def.weakTo)} commands.`,
    tone: "neutral",
  };
}

function getRewardCardInsight(card: VocabWord, combatState?: CombatState | null): { tag: string; text: string } {
  const relics = combatState?.runRelics || [];

  if (card.difficulty >= 5) {
    return {
      tag: relics.includes("hard_edge") ? "Hard Edge pick" : "Risk pick",
      text: relics.includes("hard_edge")
        ? "Mark Hard for extra AP before the study goal and extra Focus while you learn it."
        : "Harder study, better long-term deck growth and slower scaling.",
    };
  }

  if (card.difficulty >= 3) {
    return {
      tag: "Growth pick",
      text: "A balanced add: meaningful study value without spiking the deck too hard.",
    };
  }

  if (relics.includes("clarity_lens") || relics.includes("ember_primer")) {
    return {
      tag: "Streak fuel",
      text: "Easier to perfect, so it helps trigger study-to-command relics.",
    };
  }

  return {
    tag: "Stabilizer",
    text: "Keeps the run consistent and slightly slows the infinite ramp.",
  };
}

function getRelicChoiceReason(relic: RelicDef, combatState?: CombatState | null): { tag: string; text: string } {
  const enemy = combatState?.enemies[combatState.currentEnemyIndex];
  const hasShield = Boolean(enemy && enemy.shield > 0);
  const special = enemy?.def.special;

  if (relic.id === "clarity_lens") return { tag: "Study streak build", text: "Perfect rushes Expose the enemy for a stronger weakness hit." };
  if (relic.id === "blood_quill") return { tag: "Risk economy", text: "Misses charge +2 Focus, but the next enemy hit hurts more." };
  if (relic.id === "combo_aegis") return { tag: "Rush defense", text: special === "low_combo_punish" ? "Protects strong AP windows." : "Turns excellent study into safety." };
  if (relic.id === "runic_tumbler") return { tag: "Timeline control", text: "Defend can delay enemy pressure." };
  if (relic.id === "fracture_notes" || relic.id === "clean_margin") return { tag: hasShield ? "Great now" : "Shield answer", text: "Best against shielded enemies and bosses." };
  if (relic.id === "heart_ward" || relic.id === "leaf_bloom" || relic.id === "greenhouse") return { tag: "Survival", text: special === "healing_check" ? "Strong into healing tests." : "Improves recovery turns." };
  if (relic.id === "elemental_index" || relic.id === "linebreaker") return { tag: "Weakness damage", text: enemy ? `Pairs with ${formatTileLabels(enemy.def.weakTo)} commands.` : "Rewards element planning." };
  if (relic.id === "hard_edge") return { tag: "Learning pressure", text: "Makes hard-rated cards worth fighting through." };
  if (relic.id === "tidal_memory") return { tag: "Mistake buffer", text: "Your first miss each study set still charges +1 Focus." };
  if (relic.id === "combo_spark") return { tag: "Study engine", text: "4+ correct study sets charge more Focus." };

  return { tag: "Run modifier", text: "Changes how this deck fights for the rest of the run." };
}

function createEnemyInstance(def: EnemyDef, hpMult: number, encounter: EncounterInfo): EnemyInstance {
  const maxHp = Math.floor(def.hpBase * hpMult * encounter.hpMultiplier);
  const baseShield = def.shieldBase || (encounter.isElite ? 10 : encounter.isBoss ? 18 : 0);
  const maxShield = Math.floor(baseShield * Math.max(1, Math.sqrt(hpMult)) * encounter.shieldMultiplier);

  return {
    def,
    hp: maxHp,
    maxHp,
    shield: maxShield,
    maxShield,
    currentDamage: Math.max(1, Math.floor(def.damage * encounter.damageMultiplier)),
    attackCharge: def.attackFrequency,
    phase: 1,
    isDead: false,
  };
}

function createEncounterBoard(encounter: EncounterInfo): { board: BoardTile[]; changedIds: number[] } {
  let board = createRuneBoard();
  let changedIds: number[] = [];

  if (encounter.startingCurses > 0) {
    const curse = setRandomRuneStatus(board, "cursed", encounter.startingCurses, { excludeKinds: ["heart"] });
    board = curse.board;
    changedIds = curse.changedIds;
  }

  return { board, changedIds };
}

function createEmptyCinematicStats(): CombatCinematicStats {
  return {
    elements: [],
    runeCounts: createRuneCountMap(),
    elementDamage: createRuneCountMap(),
    attackers: [],
    rawDamage: 0,
    damage: 0,
    shieldDamage: 0,
    shieldBroken: false,
    heal: 0,
    enemyDamage: 0,
    curseDamage: 0,
    enhancedRunes: 0,
    cursedRunes: 0,
    weaknessHits: [],
    resistedHits: [],
    comboCount: 0,
    matchedCount: 0,
  };
}

function createDirectActionStats(
  kind: TileKind,
  rawDamage: number,
  heal = 0,
  attackerName?: string,
  runeWeight = 3
): CombatCinematicStats {
  const stats = createEmptyCinematicStats();
  stats.elements = kind === "heart" ? [] : [kind];
  stats.runeCounts[kind] = runeWeight;
  stats.elementDamage[kind] = Math.max(0, rawDamage);
  stats.attackers = attackerName ? [attackerName] : [];
  stats.rawDamage = Math.max(0, rawDamage);
  stats.damage = Math.max(0, rawDamage);
  stats.heal = Math.max(0, heal);
  stats.comboCount = 1;
  stats.matchedCount = runeWeight;
  return stats;
}

function createActionCinematic(
  stats: CombatCinematicStats,
  enemy: EnemyInstance,
  details: CombatCinematicDetails,
  nextMode: CombatMode,
  nextMessage: string,
  rewardAfter = false,
  gameOverAfter = false
): CombatCinematic {
  return {
    id: cinematicIdCounter++,
    ...stats,
    enemyName: enemy.def.name,
    enemySprite: enemy.def.sprite,
    enemyIsBoss: enemy.def.isBoss,
    enemyIntent: details.enemyIntent,
    enemyHpBefore: details.enemyHpBefore,
    enemyHpAfter: details.enemyHpAfter,
    shieldBefore: details.shieldBefore,
    shieldAfter: details.shieldAfter,
    shieldBroken: details.shieldBroken,
    playerHpBefore: details.playerHpBefore,
    playerHpAfter: details.playerHpAfter,
    enemyActionLabel: details.enemyActionLabel,
    roomCleared: details.roomCleared,
    wardBlocked: details.wardBlocked,
    log: details.log,
    nextMode,
    nextMessage,
    rewardAfter,
    gameOverAfter,
  };
}

function resolveEnemyDefense(enemy: EnemyInstance, stats: CombatCinematicStats, runRelics: string[] = []): EnemyDefenseResult {
  const adjustedByElement = createRuneCountMap();
  const weaknessHits: TileKind[] = [];
  const resistedHits: TileKind[] = [];
  let adjustedDamage = 0;

  TILE_KINDS.forEach(kind => {
    if (kind === "heart") return;
    const raw = stats.elementDamage[kind] || 0;
    if (raw <= 0) return;

    const isWeak = enemy.def.weakTo.includes(kind);
    const isResisted = enemy.def.resists?.includes(kind) || false;
    const multiplier = isWeak ? 1.35 : isResisted ? 0.65 : 1;
    const adjusted = Math.max(0, Math.floor(raw * multiplier));

    adjustedByElement[kind] = adjusted;
    adjustedDamage += adjusted;

    if (isWeak) weaknessHits.push(kind);
    if (isResisted) resistedHits.push(kind);
  });

  const weakRuneCount = enemy.def.weakTo.reduce((total, kind) => total + (stats.runeCounts[kind] || 0), 0);
  const shieldBreakBonus = enemy.shield > 0 && weakRuneCount > 0 ? 6 + weakRuneCount * 2 : 0;
  const shieldDamage = enemy.shield > 0
    ? Math.min(enemy.shield, adjustedDamage + shieldBreakBonus)
    : 0;
  const shieldAfter = Math.max(0, enemy.shield - shieldDamage);
  const shieldBroken = enemy.shield > 0 && shieldAfter <= 0;
  const fractureBonus = shieldBroken && runRelics.includes("fracture_notes")
    ? 8 + stats.comboCount * 2
    : 0;
  const hpDamage = Math.max(0, adjustedDamage - enemy.shield) + fractureBonus;

  return {
    adjustedByElement,
    rawDamage: stats.rawDamage || stats.damage,
    adjustedDamage,
    hpDamage,
    shieldDamage,
    shieldBefore: enemy.shield,
    shieldAfter,
    shieldBroken,
    weaknessHits,
    resistedHits,
    shieldBreakBonus,
    fractureBonus,
  };
}

function buildResolvePreviewLines(
  state: CombatState,
  enemy: EnemyInstance,
  defense: EnemyDefenseResult
): { label: string; value: string; tone: "good" | "warn" | "bad" | "neutral" }[] {
  const stats = state.pendingCinematic || createEmptyCinematicStats();
  const hasWard = state.activeBuffs.some(buff => buff.type === "ward");
  const willDefeat = defense.hpDamage >= enemy.hp;
  const nextCharge = enemy.attackCharge - 1 + (defense.shieldBroken ? 1 : 0);
  const specialText = getEnemySpecialText(enemy.def.special);
  const incomingBase = enemy.currentDamage + (
    enemy.def.special === "low_combo_punish" && stats.comboCount < 3
      ? Math.max(4, Math.floor(enemy.currentDamage * 0.45))
      : enemy.def.special === "healing_check" && stats.heal <= 0
        ? Math.max(5, Math.floor(enemy.currentDamage * 0.35))
        : 0
  );
  const lines: { label: string; value: string; tone: "good" | "warn" | "bad" | "neutral" }[] = [];

  if (stats.matchedCount > 0) {
    lines.push({
      label: "Your spell",
      value: `${stats.comboCount} combo${stats.comboCount === 1 ? "" : "s"} / ${stats.matchedCount} runes`,
      tone: stats.comboCount >= 4 ? "good" : "neutral",
    });
  } else {
    lines.push({ label: "Your spell", value: "No rune matches prepared", tone: "warn" });
  }

  lines.push({
    label: "Damage",
    value: `${defense.rawDamage} raw -> ${defense.hpDamage} HP${defense.shieldDamage > 0 ? ` + ${defense.shieldDamage} shield` : ""}`,
    tone: defense.hpDamage > 0 || defense.shieldDamage > 0 ? "good" : "warn",
  });

  if (stats.heal > 0) {
    lines.push({ label: "Recovery", value: `Heal ${stats.heal} HP`, tone: "good" });
  } else if (enemy.def.special === "healing_check") {
    lines.push({ label: "Recovery", value: "No Hearts: healing test fails", tone: "bad" });
  }

  if (defense.weaknessHits.length > 0) {
    lines.push({ label: "Weakness", value: formatTileLabels(defense.weaknessHits), tone: "good" });
  }

  if (defense.resistedHits.length > 0) {
    lines.push({ label: "Resisted", value: formatTileLabels(defense.resistedHits), tone: "warn" });
  }

  if (defense.shieldBroken) {
    lines.push({ label: "Shield", value: "Breaks shield and delays counter", tone: "good" });
  } else if (enemy.shield > 0) {
    lines.push({ label: "Shield", value: `${defense.shieldAfter}/${enemy.maxShield} remains`, tone: "warn" });
  }

  if (willDefeat) {
    lines.push({ label: "Enemy action", value: `${enemy.def.name} falls before acting`, tone: "good" });
  } else if (nextCharge <= 0) {
    lines.push({
      label: "Enemy action",
      value: hasWard
        ? `Ward blocks ${enemy.def.name}'s counter`
        : `${enemy.def.name} counters for ${incomingBase}${specialText ? ` and ${specialText}` : ""}`,
      tone: hasWard ? "good" : "bad",
    });
  } else {
    lines.push({
      label: "Enemy action",
      value: `${enemy.def.name} charges: ${nextCharge} turn${nextCharge === 1 ? "" : "s"} left`,
      tone: "neutral",
    });
  }

  if (stats.curseDamage > 0) {
    lines.push({ label: "Curses", value: `${stats.curseDamage} recoil damage`, tone: "bad" });
  }

  return lines.slice(0, 7);
}

function getPrimaryCinematicKind(stats: CombatCinematicStats): TileKind {
  let bestKind: TileKind = "heart";
  let bestScore = 0;

  TILE_KINDS.forEach(kind => {
    if (kind === "heart") return;
    const score = stats.runeCounts[kind] * 1000 + stats.elementDamage[kind];
    if (score > bestScore) {
      bestScore = score;
      bestKind = kind;
    }
  });

  return bestScore > 0 ? bestKind : "heart";
}

function mergeCinematicStats(
  current: CombatCinematicStats | null,
  next: CombatCinematicStats
): CombatCinematicStats {
  const runeCounts = createRuneCountMap();
  const elementDamage = createRuneCountMap();
  TILE_KINDS.forEach(kind => {
    runeCounts[kind] = (current?.runeCounts[kind] || 0) + next.runeCounts[kind];
    elementDamage[kind] = (current?.elementDamage[kind] || 0) + next.elementDamage[kind];
  });

  return {
    elements: [...(current?.elements || []), ...next.elements].slice(-6),
    runeCounts,
    elementDamage,
    attackers: Array.from(new Set([...(current?.attackers || []), ...next.attackers])).slice(-5),
    rawDamage: (current?.rawDamage || 0) + next.rawDamage,
    damage: (current?.damage || 0) + next.damage,
    shieldDamage: (current?.shieldDamage || 0) + next.shieldDamage,
    shieldBroken: Boolean(current?.shieldBroken || next.shieldBroken),
    heal: (current?.heal || 0) + next.heal,
    enemyDamage: (current?.enemyDamage || 0) + next.enemyDamage,
    curseDamage: (current?.curseDamage || 0) + next.curseDamage,
    enhancedRunes: (current?.enhancedRunes || 0) + next.enhancedRunes,
    cursedRunes: (current?.cursedRunes || 0) + next.cursedRunes,
    weaknessHits: Array.from(new Set([...(current?.weaknessHits || []), ...next.weaknessHits])).slice(-6),
    resistedHits: Array.from(new Set([...(current?.resistedHits || []), ...next.resistedHits])).slice(-6),
    comboCount: (current?.comboCount || 0) + next.comboCount,
    matchedCount: (current?.matchedCount || 0) + next.matchedCount,
  };
}

function buildCombatLog(
  stats: CombatCinematicStats,
  enemy: EnemyInstance,
  enemyHpBefore: number,
  enemyHpAfter: number,
  playerHpBefore: number,
  playerHpAfter: number,
  enemyActionLabel: string,
  extraLines: string[] = []
): string[] {
  const lines: string[] = [
    stats.matchedCount > 0
      ? `${stats.comboCount} combo, ${stats.matchedCount} runes resolved.`
      : "No rune matches resolved.",
  ];

  TILE_KINDS.forEach(kind => {
    if (kind === "heart") return;
    const runeCount = stats.runeCounts[kind];
    const damage = stats.elementDamage[kind];
    if (runeCount > 0 || damage > 0) {
      lines.push(`${TILE_DEFS[kind].label}: ${runeCount} runes -> ${damage} damage.`);
    }
  });

  if (stats.runeCounts.heart > 0 || stats.heal > 0) {
    lines.push(`Heart: ${stats.runeCounts.heart} runes -> ${stats.heal} HP restored.`);
  }

  if (stats.enhancedRunes > 0) {
    lines.push(`${stats.enhancedRunes} enhanced rune${stats.enhancedRunes === 1 ? "" : "s"} boosted this spell.`);
  }

  if (stats.weaknessHits.length > 0) {
    lines.push(`Weakness hit: ${formatTileLabels(stats.weaknessHits)} damage was amplified.`);
  }

  if (stats.resistedHits.length > 0) {
    lines.push(`Resisted: ${formatTileLabels(stats.resistedHits)} damage was reduced.`);
  }

  if (stats.shieldDamage > 0) {
    lines.push(`Shield took ${stats.shieldDamage} damage${stats.shieldBroken ? " and broke" : ""}.`);
  }

  if (stats.cursedRunes > 0) {
    lines.push(`${stats.cursedRunes} cursed rune${stats.cursedRunes === 1 ? "" : "s"} caused ${stats.curseDamage} recoil.`);
  }

  if (stats.damage > 0) {
    lines.push(`${enemy.def.name}: ${enemyHpBefore} -> ${enemyHpAfter} HP.`);
  }

  if (stats.heal > 0 || stats.enemyDamage > 0) {
    lines.push(`You: ${playerHpBefore} -> ${playerHpAfter} HP.`);
  }

  if (enemyActionLabel) {
    lines.push(enemyActionLabel);
  }

  return [...lines, ...extraLines].filter(Boolean).slice(0, 8);
}

function getTimelineToneClasses(tone: CombatTimelineStep["tone"]): string {
  if (tone === "good") return "border-green-300/45 bg-green-500/12 text-green-50";
  if (tone === "bad") return "border-red-300/45 bg-red-500/12 text-red-50";
  if (tone === "warn") return "border-yellow-300/45 bg-yellow-500/12 text-yellow-50";
  return "border-cyan-300/35 bg-cyan-500/10 text-cyan-50";
}

function getCinematicOutcome(cinematic: CombatCinematic): { label: string; tone: CombatTimelineStep["tone"] } {
  if (cinematic.roomCleared) return { label: "Room cleared", tone: "good" };
  if (cinematic.gameOverAfter) return { label: "Defeat", tone: "bad" };
  return { label: "Next study set", tone: "neutral" };
}

function buildCombatTimeline(cinematic: CombatCinematic): CombatTimelineStep[] {
  const primaryKind = getPrimaryCinematicKind(cinematic);
  const primaryTile = TILE_DEFS[primaryKind];
  const statusParts = [
    cinematic.enhancedRunes > 0 ? `${cinematic.enhancedRunes} enhanced boosted` : "",
    cinematic.cursedRunes > 0 ? `${cinematic.cursedRunes} cursed queued recoil` : "",
  ].filter(Boolean);
  const steps: CombatTimelineStep[] = [
    {
      id: "rune-pattern",
      label: "Runes",
      title: cinematic.matchedCount > 0 ? `${cinematic.comboCount} Combo Prepared` : "No Combo Prepared",
      detail: cinematic.matchedCount > 0
        ? `${cinematic.matchedCount} runes resolved. ${primaryTile.label} carried the spell core.${statusParts.length > 0 ? ` ${statusParts.join("; ")}.` : ""}`
        : "No rune matches resolved, so the party could not prepare a damaging spell.",
      tone: cinematic.matchedCount > 0 ? "good" : "warn",
      meta: cinematic.attackers.length > 0 ? `Attackers: ${cinematic.attackers.join(", ")}` : undefined,
    },
  ];

  if (cinematic.rawDamage > 0 || cinematic.damage > 0 || cinematic.shieldDamage > 0 || cinematic.heal > 0 || cinematic.curseDamage > 0) {
    const resultParts = [
      cinematic.rawDamage > 0 ? `${cinematic.rawDamage} raw became ${cinematic.damage} HP damage` : "",
      cinematic.shieldDamage > 0 ? `${cinematic.shieldDamage} shield damage` : "",
      cinematic.heal > 0 ? `${cinematic.heal} HP healed` : "",
      cinematic.curseDamage > 0 ? `${cinematic.curseDamage} recoil taken` : "",
    ].filter(Boolean);

    steps.push({
      id: "damage-recovery",
      label: "Impact",
      title: "Damage And Recovery",
      detail: resultParts.join(". ") + ".",
      tone: cinematic.curseDamage > 0 && cinematic.damage <= 0 ? "warn" : "good",
      meta: `${cinematic.enemyName} HP ${cinematic.enemyHpBefore} -> ${cinematic.enemyHpAfter}. You HP ${cinematic.playerHpBefore} -> ${cinematic.playerHpAfter}.`,
    });
  }

  if (cinematic.weaknessHits.length > 0 || cinematic.resistedHits.length > 0 || cinematic.shieldBefore > 0 || cinematic.shieldDamage > 0) {
    const matchupParts = [
      cinematic.weaknessHits.length > 0 ? `Weak hit: ${formatTileLabels(cinematic.weaknessHits)}` : "",
      cinematic.resistedHits.length > 0 ? `Resisted: ${formatTileLabels(cinematic.resistedHits)}` : "",
      cinematic.shieldDamage > 0 ? `Shield ${cinematic.shieldBefore} -> ${cinematic.shieldAfter}${cinematic.shieldBroken ? ", broken" : ""}` : "",
    ].filter(Boolean);

    steps.push({
      id: "matchups",
      label: "Rules",
      title: cinematic.shieldBroken ? "Shield Broken" : "Element Matchups",
      detail: matchupParts.join(". ") + ".",
      tone: cinematic.shieldBroken || cinematic.weaknessHits.length > 0 ? "good" : "warn",
      meta: cinematic.shieldBroken ? "Breaking a shield delays the counter and charges Focus." : undefined,
    });
  }

  steps.push({
    id: "enemy-response",
    label: "Enemy",
    title: cinematic.roomCleared ? "Enemy Falls" : cinematic.wardBlocked ? "Counter Blocked" : cinematic.enemyDamage > 0 ? "Enemy Counter" : "Enemy Charges",
    detail: cinematic.enemyActionLabel || "The enemy waits for the next exchange.",
    tone: cinematic.roomCleared || cinematic.wardBlocked ? "good" : cinematic.enemyDamage > 0 ? "bad" : "neutral",
    meta: `Intent before round: ${cinematic.enemyIntent}`,
  });

  const outcome = getCinematicOutcome(cinematic);
  steps.push({
    id: "outcome",
    label: "Result",
    title: outcome.label,
    detail: cinematic.roomCleared
      ? "The room is cleared. Pick the reward that best shapes this deck's run."
      : cinematic.gameOverAfter
        ? "The run ends here, but deck progress and card history remain saved."
        : "Combat returns to flashcards. Study performance will fuel the next rune board.",
    tone: outcome.tone,
    meta: `Final: ${cinematic.enemyName} ${cinematic.enemyHpAfter}/${Math.max(cinematic.enemyHpAfter, cinematic.enemyHpBefore)} HP, you ${cinematic.playerHpAfter} HP.`,
  });

  return steps;
}

function getInlineCombatDuration(cinematic: CombatCinematic): number {
  const comboTime = Math.min(900, cinematic.comboCount * 120);
  const enemyTime = cinematic.enemyDamage > 0 || cinematic.wardBlocked ? 520 : 0;
  const rewardTime = cinematic.roomCleared || cinematic.gameOverAfter ? 450 : 0;

  return INLINE_COMBAT_BASE_MS + comboTime + enemyTime + rewardTime;
}

function RuneGlyph({ kind }: { kind: TileKind }) {
  const motif = (() => {
    if (kind === "leaf") {
      return (
        <>
          <path d="M50 22 C37 35 34 48 42 62 C48 51 55 43 66 36" />
          <path d="M50 22 C63 36 66 49 58 62 C53 51 46 43 34 36" />
          <path d="M50 26 L50 79" />
          <path d="M50 55 C38 57 31 64 26 75" />
          <path d="M50 57 C62 58 69 65 74 76" />
        </>
      );
    }

    if (kind === "tide") {
      return (
        <>
          <path d="M50 21 C40 35 36 44 36 55 C36 66 42 74 50 74 C58 74 64 66 64 55 C64 44 60 35 50 21Z" />
          <path d="M32 55 C40 49 47 49 55 55 C62 60 68 60 75 55" />
          <path d="M27 67 C35 63 42 63 50 68 C58 72 65 72 73 67" />
          <path d="M50 17 L50 84" />
        </>
      );
    }

    if (kind === "light") {
      return (
        <>
          <path d="M55 14 L34 52 L49 49 L43 84 L67 41 L51 45 Z" />
          <path d="M35 31 L23 43" />
          <path d="M65 68 L77 56" />
          <path d="M50 18 L50 28" />
          <path d="M50 72 L50 84" />
        </>
      );
    }

    if (kind === "flame") {
      return (
        <>
          <path d="M50 15 C40 31 57 38 44 52 C35 62 40 75 50 81 C60 75 65 62 56 52 C47 41 61 31 50 15Z" />
          <path d="M50 38 C44 48 47 56 52 63 C58 55 58 47 50 38Z" />
          <path d="M32 79 C39 68 36 59 43 50" />
          <path d="M68 79 C61 68 64 59 57 50" />
          <path d="M50 12 L50 88" />
        </>
      );
    }

    if (kind === "heart") {
      return (
        <>
          <path d="M50 75 C36 61 27 52 27 40 C27 31 33 26 41 29 C45 31 48 35 50 39 C52 35 55 31 59 29 C67 26 73 31 73 40 C73 52 64 61 50 75Z" />
          <path d="M31 40 L22 40" />
          <path d="M69 40 L78 40" />
          <path d="M50 24 L50 85" />
          <path d="M39 62 C43 58 47 58 50 62 C53 58 57 58 61 62" />
        </>
      );
    }

    return (
      <>
        <path d="M50 16 C38 27 34 37 37 50 C40 63 50 72 50 84 C50 72 60 63 63 50 C66 37 62 27 50 16Z" />
        <path d="M50 31 C43 37 43 47 50 53 C57 47 57 37 50 31Z" />
        <path d="M31 50 C40 45 45 45 50 50 C55 45 60 45 69 50" />
        <path d="M24 64 C36 62 43 66 50 75 C57 66 64 62 76 64" />
        <path d="M50 12 L50 88" />
      </>
    );
  })();

  return (
    <svg className="h-[78%] w-[78%] overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
      <g className="rune-glyph-frame" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="50" cy="50" r="37" />
        <circle cx="50" cy="50" r="24" />
        <path d="M50 2 L50 16" />
        <path d="M50 84 L50 98" />
        <path d="M2 50 L16 50" />
        <path d="M84 50 L98 50" />
        <path d="M45 10 L50 5 L55 10" />
        <path d="M45 90 L50 95 L55 90" />
        <path d="M18 26 L24 26" />
        <path d="M76 74 L82 74" />
      </g>
      <g className="rune-glyph-core" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {motif}
      </g>
      <g className="rune-glyph-fragments" fill="currentColor">
        <rect x="22" y="18" width="2.4" height="2.4" transform="rotate(22 23.2 19.2)" />
        <rect x="76" y="22" width="2" height="2" transform="rotate(22 77 23)" />
        <rect x="21" y="78" width="2" height="2" transform="rotate(22 22 79)" />
        <rect x="76" y="80" width="2.4" height="2.4" transform="rotate(22 77.2 81.2)" />
        <circle cx="33" cy="15" r="1.1" />
        <circle cx="68" cy="86" r="1" />
      </g>
    </svg>
  );
}

function RuneOrb({ kind, status }: { kind: TileKind; status?: RuneStatus | null }) {
  return (
    <>
      <span className="rune-metal-wear absolute inset-0 rounded-full" />
      <span className="absolute inset-[8%] rounded-full border border-white/16" />
      <span className="absolute inset-[18%] rounded-full border border-current/35 opacity-80" />
      <span className="absolute left-1/2 top-[4%] h-[19%] w-px -translate-x-1/2 bg-white/35" />
      <span className="absolute bottom-[4%] left-1/2 h-[19%] w-px -translate-x-1/2 bg-black/50" />
      <span className="absolute left-[47%] top-[6%] h-[7%] w-[6%] border border-current/50 bg-black/30" />
      <span className="absolute bottom-[6%] left-[47%] h-[7%] w-[6%] border border-current/35 bg-black/35" />
      {status === "enhanced" && (
        <span className="absolute right-[7%] top-[8%] flex h-[27%] w-[27%] items-center justify-center rounded-full border border-[#c2ad72]/70 bg-[#332d18]/80 text-[#d5c38c] shadow-[0_0_12px_rgba(194,173,114,0.55)]">
          <Sparkles className="h-[62%] w-[62%]" strokeWidth={2.7} />
        </span>
      )}
      {status === "cursed" && (
        <span className="absolute left-[7%] top-[8%] flex h-[30%] w-[30%] items-center justify-center rounded-full border border-[#7b6a9d]/70 bg-[#161221]/90 text-[#b7aed1] shadow-[0_0_12px_rgba(123,106,157,0.62)]">
          <Skull className="h-[64%] w-[64%]" strokeWidth={2.6} />
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
        <RuneGlyph kind={kind} />
      </span>
    </>
  );
}

let damageIdCounter = 0;
let cinematicIdCounter = 0;
let combatNoticeIdCounter = 0;
let actionEffectIdCounter = 0;

function createCombatNotice(title: string, detail: string, tone: CombatNotice["tone"] = "neutral"): CombatNotice {
  return {
    id: combatNoticeIdCounter++,
    title,
    detail,
    tone,
  };
}

function appendCombatNotices(existing: CombatNotice[], notices: CombatNotice[]): CombatNotice[] {
  return [...existing, ...notices].slice(-4);
}

function createCombatActionEffect(
  type: CombatActionEffectType,
  label: string,
  color: string,
  options: Omit<CombatActionEffect, "id" | "type" | "label" | "color"> = {}
): CombatActionEffect {
  return {
    id: actionEffectIdCounter++,
    type,
    label,
    color,
    ...options,
  };
}

// ─── Initial Combat State ────────────────────────────────
function createInitialCombat(floor: number, playerMaxHp: number, saveData: SaveData, startingDeck?: VocabWord[]): CombatState {
  const difficultyFloor = getDifficultyFloor(floor, saveData);
  const encounter = getEncounterForFloor(floor);
  const enemyDefs = getEnemiesForFloor(floor);
  const hpMult = getHpMultiplier(difficultyFloor);
  const timerMax = getQuestionTimerForFloor(difficultyFloor);
  const deck = startingDeck && startingDeck.length > 0 ? startingDeck : createStarterDeck(saveData);
  const runParty = getRunParty(saveData);
  const runPlayerMaxHp = getPartyMaxHp(runParty, playerMaxHp);
  const encounterBoard = createEncounterBoard(encounter);
  
  const enemies: EnemyInstance[] = enemyDefs.map(def => createEnemyInstance(def, hpMult, encounter));

  const word = drawWordFromDeck(deck, saveData);
  const options = generateDistractors(word, getAllCards(saveData));

  return {
    deckId: getActiveDeckId(saveData),
    floor,
    difficultyFloor,
    encounter,
    deck,
    rewardChoices: [],
    playerHp: runPlayerMaxHp,
    playerMaxHp: runPlayerMaxHp,
    combo: 0,
    maxCombo: 0,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    currentEnemyIndex: 0,
    enemies,
    mode: "studyReady",
    board: encounterBoard.board,
    selectedTileIndex: null,
    runeMoved: false,
    boardMovesMax: MIN_BOARD_MOVES,
    boardMovesLeft: MIN_BOARD_MOVES,
    boardTimeMax: MIN_BOARD_TIME,
    boardTimeLeft: MIN_BOARD_TIME,
    lastMovedTileIds: encounterBoard.changedIds,
    newTileIds: [],
    matchedTileIds: [],
    isResolvingRunes: false,
    dragPointerId: null,
    dragPointerX: 0,
    dragPointerY: 0,
    dragTileId: null,
    dragTileKind: null,
    dragTileStatus: null,
    pendingCinematic: null,
    cinematic: null,
    cinematicStepIndex: 0,
    relicChoices: [],
    runRelics: [],
    combatLog: [],
    eventNotices: [],
    actionEffect: null,
    skillCharge: 0,
    powerPoints: 0,
    actionPoints: 0,
    actionPointsEarnedThisRush: 0,
    studyApOfferedThisRush: 0,
    studyApGoal: STUDY_RUSH_AP_CAP,
    actionPointsSpentThisWindow: 0,
    actionPointCarryCap: 0,
    enemyActionPoints: 0,
    enemyActionPointsSpentThisTurn: 0,
    turnQueue: buildTurnQueue(runParty, enemies),
    activeActorId: null,
    exposedTurns: 0,
    healedOrDefendedThisWindow: false,
    apPenaltyNextRush: 0,
    nextStudyShuffle: false,
    flameDiscountNext: false,
    fragileDebuff: 0,
    boardMessage: encounter.modifierLabel === "Standard"
      ? "Study first, then spend AP on party commands."
      : `${encounter.modifierLabel}: ${encounter.modifierDescription}`,
    studyQuestionsTotal: 0,
    studyQuestionsLeft: 0,
    studyCorrectRound: 0,
    studyWrongRound: 0,
    studyBoardTimeBonus: 0,
    currentWord: word,
    studyFeedback: null,
    options,
    timerMax,
    timerLeft: timerMax,
    phase: "answering",
    abilityUsed: false,
    abilityCooldown: 0,
    activeBuffs: [],
    damageNumbers: [],
    enemyAnim: null,
    playerAnim: null,
    screenShake: 0,
    flashColor: "",
    showPhaseBanner: null,
    isPaused: false,
  };
}

// ─── Main App ────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [save, setSave] = useState<SaveData>(loadSave);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [starterDraftDeck, setStarterDraftDeck] = useState<VocabWord[]>([]);
  const [starterDraftChoices, setStarterDraftChoices] = useState<VocabWord[]>([]);
  const [starterDraftClassId, setStarterDraftClassId] = useState<string>("linguist");
  const [starterDraftMessage, setStarterDraftMessage] = useState("");
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const combatRef = useRef<CombatState | null>(null);
  const advancingCinematicRef = useRef<number | null>(null);

  combatRef.current = combat;

  // Keep save synced
  useEffect(() => {
    saveSave(save);
  }, [save]);

  // ─── Timer Logic ──────────────────────────────────────
  useEffect(() => {
    const isBoardTimer = combat?.mode === "board" && !combat.isResolvingRunes;
    if (screen !== "combat" || !combat || combat.isPaused || combat.phase !== "answering" || !isBoardTimer) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCombat(prev => {
        if (!prev || prev.phase !== "answering" || prev.isPaused) return prev;
        if (prev.mode === "board" && !prev.isResolvingRunes) {
          const newLeft = prev.boardTimeLeft - 0.1;
          if (newLeft <= 0) {
            const expiredState = {
              ...prev,
              boardTimeLeft: 0,
              selectedTileIndex: null,
              isResolvingRunes: true,
              dragPointerId: null,
              dragTileId: null,
              dragTileKind: null,
              dragTileStatus: null,
            };
            setTimeout(() => finishBoardTurn(expiredState, true), 0);
            return expiredState;
          }
          return { ...prev, boardTimeLeft: Math.round(newLeft * 10) / 10 };
        }
        return prev;
      });
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [screen, combat?.phase, combat?.isPaused, combat?.mode]);

  useEffect(() => {
    if (!combat || combat.mode !== "board" || combat.dragPointerId === null) return;

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const latestCombat = combatRef.current;
      if (!latestCombat || latestCombat.mode !== "board" || latestCombat.dragPointerId !== event.pointerId) return;
      event.preventDefault();

      setCombat(prev => prev && prev.dragPointerId === event.pointerId
        ? { ...prev, dragPointerX: event.clientX, dragPointerY: event.clientY }
        : prev
      );

      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const tileElement = element?.closest("[data-rune-index]") as HTMLElement | null;
      const tileIndex = Number(tileElement?.dataset.runeIndex);

      if (Number.isInteger(tileIndex)) {
        moveRuneDrag(tileIndex);
      }
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const latestCombat = combatRef.current;
      if (latestCombat?.mode === "board" && latestCombat.dragPointerId === event.pointerId) {
        finishBoardTurn(latestCombat);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [combat?.mode, combat?.dragPointerId]);

  // ─── Screen shake decay ───────────────────────────────
  useEffect(() => {
    if (!combat || combat.screenShake <= 0) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, screenShake: Math.max(0, prev.screenShake - 1) } : prev);
    }, 50);
    return () => clearTimeout(timeout);
  }, [combat?.screenShake]);

  // ─── Flash decay ──────────────────────────────────────
  useEffect(() => {
    if (!combat || !combat.flashColor) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, flashColor: "" } : prev);
    }, 300);
    return () => clearTimeout(timeout);
  }, [combat?.flashColor]);

  // ─── Phase banner decay ───────────────────────────────
  useEffect(() => {
    if (!combat || !combat.showPhaseBanner) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, showPhaseBanner: null } : prev);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [combat?.showPhaseBanner]);

  // ─── Damage numbers cleanup ───────────────────────────
  useEffect(() => {
    if (!combat || combat.damageNumbers.length === 0) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, damageNumbers: [] } : prev);
    }, combat.mode === "cinematic" && combat.cinematic ? Math.max(1200, getInlineCombatDuration(combat.cinematic) - 450) : 800);
    return () => clearTimeout(timeout);
  }, [combat?.damageNumbers, combat?.mode, combat?.cinematic?.id]);

  useEffect(() => {
    if (!combat || combat.eventNotices.length === 0) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, eventNotices: prev.eventNotices.slice(1) } : prev);
    }, 2800);
    return () => clearTimeout(timeout);
  }, [combat?.eventNotices.map(notice => notice.id).join(",")]);

  useEffect(() => {
    if (!combat?.actionEffect) return;
    const effectId = combat.actionEffect.id;
    const timeout = setTimeout(() => {
      setCombat(prev => {
        if (!prev || prev.actionEffect?.id !== effectId) return prev;
        return { ...prev, actionEffect: null };
      });
    }, 1250);
    return () => clearTimeout(timeout);
  }, [combat?.actionEffect?.id]);

  useEffect(() => {
    if (screen !== "combat" || !combat || combat.mode !== "cinematic" || !combat.cinematic || combat.isPaused) return;
    const cinematicId = combat.cinematic.id;
    const timeout = setTimeout(() => {
      const latestCombat = combatRef.current;
      if (latestCombat?.cinematic?.id === cinematicId) {
        advanceCombatCinematic();
      }
    }, getInlineCombatDuration(combat.cinematic));

    return () => clearTimeout(timeout);
  }, [screen, combat?.mode, combat?.cinematic?.id, combat?.isPaused]);

  useEffect(() => {
    if (!combat || combat.lastMovedTileIds.length === 0) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, lastMovedTileIds: [] } : prev);
    }, 220);
    return () => clearTimeout(timeout);
  }, [combat?.lastMovedTileIds.join(",")]);

  useEffect(() => {
    if (!combat || combat.newTileIds.length === 0) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, newTileIds: [] } : prev);
    }, RUNE_FALL_MS + 80);
    return () => clearTimeout(timeout);
  }, [combat?.newTileIds.join(",")]);

  useEffect(() => {
    if (!combat || combat.matchedTileIds.length === 0) return;
    const timeout = setTimeout(() => {
      setCombat(prev => prev ? { ...prev, matchedTileIds: [] } : prev);
    }, MATCH_POP_MS + 40);
    return () => clearTimeout(timeout);
  }, [combat?.matchedTileIds.join(",")]);

  // ─── Core Combat Functions ────────────────────────────
  const drawNextStudyCard = (state: CombatState, saveData: SaveData = save) => {
    const word = drawWordFromDeck(state.deck, saveData, state.currentWord?.id);
    const options = generateDistractors(word, getAllCards(saveData));
    return {
      currentWord: word,
      options: state.nextStudyShuffle ? shuffleCards(options) : options,
      studyFeedback: null,
    };
  };

  const beginStudyRound = () => {
    if (!combat || combat.phase !== "answering" || combat.isPaused) return;
    const hasStudyHeadStart = combat.activeBuffs.some(buff => buff.type === "study_head_start");
    const hasStudyTax = combat.activeBuffs.some(buff => buff.type === "study_tax");
    const headStartAp = hasStudyHeadStart ? 1 : 0;
    const studyApGoal = STUDY_RUSH_AP_CAP + (hasStudyTax ? 1 : 0);
    const nextCardData = drawNextStudyCard(combat);

    setCombat({
      ...combat,
      ...nextCardData,
      mode: "study",
      activeBuffs: combat.activeBuffs.filter(buff => !["study_head_start", "study_tax", "timer_extend", "timer_slow"].includes(buff.type)),
      actionPoints: Math.min(combat.actionPointCarryCap, combat.actionPoints) + headStartAp,
      actionPointsEarnedThisRush: headStartAp,
      studyApOfferedThisRush: headStartAp,
      studyApGoal,
      actionPointsSpentThisWindow: 0,
      nextStudyShuffle: false,
      studyQuestionsTotal: 0,
      studyQuestionsLeft: 0,
      studyCorrectRound: 0,
      studyWrongRound: 0,
      studyBoardTimeBonus: 0,
      selectedTileIndex: null,
      runeMoved: false,
      isResolvingRunes: false,
      matchedTileIds: [],
      newTileIds: [],
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      pendingCinematic: null,
      cinematic: null,
      boardMessage: `Study set started. Resolve ${studyApGoal} AP worth of cards to open commands${headStartAp ? " with a 1 AP head start" : ""}${hasStudyTax ? ". Enemy pressure added 1 AP to the hand" : ""}${combat.nextStudyShuffle ? ". Answers were scrambled" : ""}.`,
    });
  };

  const finishStudyRound = (state: CombatState, saveData: SaveData = save) => {
    const answered = state.studyQuestionsTotal;
    const nextSave = saveData;
    const adjustedState = {
      ...state,
      deck: refillDeck(state.deck, nextSave),
    };
    const perfectStudy = adjustedState.studyCorrectRound >= 3 && adjustedState.studyWrongRound === 0;
    let nextBuffs = adjustedState.activeBuffs;
    let studyStatusMessage = "";
    const studyNotices: CombatNotice[] = [];
    const currentEnemy = adjustedState.enemies[adjustedState.currentEnemyIndex];

    let exposedTurns = adjustedState.exposedTurns;
    let flameDiscountNext = adjustedState.flameDiscountNext;

    if (perfectStudy && currentEnemy && adjustedState.runRelics.includes("clarity_lens")) {
      exposedTurns = Math.max(exposedTurns, 1);
      studyStatusMessage += " Clarity Lens exposed the enemy.";
      studyNotices.push(createCombatNotice("Relic: Clarity Lens", "Perfect study applied Exposed.", "relic"));
    }

    if (perfectStudy && adjustedState.runRelics.includes("ember_primer")) {
      flameDiscountNext = true;
      studyStatusMessage += " Ember Primer discounted the next Flame action.";
      studyNotices.push(createCombatNotice("Relic: Ember Primer", "Next Flame command costs 1 less AP.", "relic"));
    }

    if (perfectStudy && adjustedState.runRelics.includes("warded_notes") && !nextBuffs.some(buff => buff.type === "ward")) {
      nextBuffs = [...nextBuffs, { type: "ward", remaining: 1 }];
      studyNotices.push(createCombatNotice("Relic: Warded Notes", "Perfect study raised a Ward.", "relic"));
    }
    if (adjustedState.runRelics.includes("combo_aegis") && adjustedState.studyCorrectRound >= 4 && !nextBuffs.some(buff => buff.type === "combo_aegis_used")) {
      nextBuffs = [...nextBuffs, { type: "ward", remaining: 1 }, { type: "combo_aegis_used", remaining: 1 }];
      studyNotices.push(createCombatNotice("Relic: Rush Aegis", "4+ correct raised a Ward.", "relic"));
    }

    setCombat({
      ...adjustedState,
      mode: "commandReady",
      studyQuestionsLeft: 0,
      selectedTileIndex: null,
      runeMoved: false,
      isResolvingRunes: false,
      matchedTileIds: [],
      newTileIds: [],
      lastMovedTileIds: [],
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      activeBuffs: nextBuffs,
      exposedTurns,
      flameDiscountNext,
      pendingCinematic: null,
      cinematic: null,
      eventNotices: appendCombatNotices(adjustedState.eventNotices, studyNotices),
      boardMessage: `Study set complete: ${formatStudyRushResult(state.studyCorrectRound, answered)}. Earned ${adjustedState.actionPointsEarnedThisRush} AP and ${adjustedState.skillCharge}/12 Focus is ready.${studyStatusMessage}`,
    });
  };

  const beginBoardPhase = () => {
    if (!combat || combat.mode !== "boardReady" || combat.phase !== "answering") return;
    setCombat({
      ...combat,
      mode: "board",
      selectedTileIndex: null,
      runeMoved: false,
      isResolvingRunes: false,
      matchedTileIds: [],
      newTileIds: [],
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      boardMovesLeft: 1,
      boardTimeLeft: combat.boardTimeMax,
      pendingCinematic: null,
      cinematic: null,
      boardMessage: `${formatBoardTime(combat.boardTimeMax)} rune sprint. Hold one rune and route fast.`,
    });
  };

  const finishBoardTurn = (state: CombatState, forceResolve = false) => {
    if (state.mode !== "board") return;

    if (!state.runeMoved && !forceResolve) {
      setCombat({
        ...state,
        selectedTileIndex: null,
        runeMoved: false,
        dragPointerId: null,
        dragTileId: null,
        dragTileKind: null,
        dragTileStatus: null,
        boardMessage: `${formatBoardTime(state.boardTimeLeft)} left. Drag through a neighbor, or let time expire.`,
      });
      return;
    }

    resolveBoardMove({
      ...state,
      selectedTileIndex: null,
      runeMoved: false,
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
    }, state.board);
  };

  const handleCorrectAnswer = (state: CombatState) => {
    if (!state.currentWord) return;

    const cardRating = getRatingFromBox(getCardProgress(state.currentWord, save).box);
    const hardEdgeBonus = state.runRelics.includes("hard_edge") && cardRating === "hard" ? 1 : 0;
    const steadyGripBonus = state.runRelics.includes("steady_grip") && state.studyCorrectRound === 0 ? 1 : 0;
    const offeredAp = getProjectedStudyCardAp(state, save);
    const earnedAp = getProjectedCorrectAnswerAp(state, save);
    const apCapped = offeredAp < getApForCorrectCard(state.currentWord, save) + hardEdgeBonus + steadyGripBonus;
    const difficultyFocusBonus = getFocusBonusForCorrectCard(state.currentWord);
    const nextSave = updateCardProgressFromAnswer(save, state.currentWord, true);
    const nextDeck = refillDeck(state.deck, nextSave);
    const answered = state.studyQuestionsTotal + 1;
    const nextScore = state.score + 20 + earnedAp * 5;
    const learnedMessage = getActiveDeck(nextSave).cardRatings?.[state.currentWord.id] === "known" ? " Mastered and removed from study." : "";
    const comboSparkFocus = state.runRelics.includes("combo_spark") && state.studyCorrectRound + 1 === 4 ? 2 : 0;
    const focusGain = (state.runRelics.includes("deep_focus") ? 2 : 1) + hardEdgeBonus + comboSparkFocus + difficultyFocusBonus;
    const answerNotices: CombatNotice[] = [
      ...(hardEdgeBonus > 0 ? [createCombatNotice("Relic: Hard Edge", "Hard card answered: +1 AP before cap and +1 Focus.", "relic")] : []),
      ...(steadyGripBonus > 0 ? [createCombatNotice("Relic: Steady Grip", "First correct answer added +1 AP before cap.", "relic")] : []),
      ...(difficultyFocusBonus > 0 ? [createCombatNotice("Difficult Card", "Harder vocabulary charged +1 extra Focus.", "good")] : []),
      ...(state.runRelics.includes("combo_spark") && state.studyCorrectRound + 1 === 4 ? [createCombatNotice("Relic: Rush Spark", "4 correct in one study set: +2 Focus.", "relic")] : []),
      ...(apCapped ? [createCombatNotice("Study Hand", `Study hand resolved at ${getStudyRushApCap(state)} possible AP.`, "good")] : []),
    ];
    setSave(nextSave);

    const nextState = {
      ...state,
      deck: nextDeck,
      powerPoints: state.powerPoints + earnedAp,
      actionPoints: state.actionPoints + earnedAp,
      actionPointsEarnedThisRush: state.actionPointsEarnedThisRush + earnedAp,
      studyApOfferedThisRush: state.studyApOfferedThisRush + offeredAp,
      apPenaltyNextRush: 0,
      studyQuestionsTotal: answered,
      studyQuestionsLeft: 0,
      studyCorrectRound: state.studyCorrectRound + 1,
      correctCount: state.correctCount + 1,
      skillCharge: Math.min(12, state.skillCharge + focusGain),
      score: nextScore,
      eventNotices: appendCombatNotices(state.eventNotices, answerNotices),
      boardMessage: `+${earnedAp} AP${apCapped ? " (goal filled)" : ""}. +${focusGain} Focus.${learnedMessage}`,
      flashColor: "rgba(46,204,113,0.18)",
    };

    if (nextState.studyApOfferedThisRush >= getStudyRushApCap(nextState)) {
      finishStudyRound(nextState, nextSave);
      return;
    }

    setCombat({ ...nextState, ...drawNextStudyCard(nextState, nextSave) });
  };

  const handleWrongAnswer = (state: CombatState, selectedOption: string) => {
    const missedWord = state.currentWord;
    const nextSave = state.currentWord ? updateCardProgressFromAnswer(save, state.currentWord, false) : save;
    setSave(nextSave);
    const bloodQuill = state.runRelics.includes("blood_quill");
    const answered = state.studyQuestionsTotal + 1;
    const offeredAp = getProjectedStudyCardAp(state, save);
    const bloodQuillFocus = bloodQuill ? 2 : 0;
    const tidalMemoryFocus = state.runRelics.includes("tidal_memory") && state.studyWrongRound === 0 ? 1 : 0;
    const nextState = {
      ...state,
      deck: refillDeck(state.deck, nextSave),
      studyApOfferedThisRush: state.studyApOfferedThisRush + offeredAp,
      studyQuestionsTotal: answered,
      studyQuestionsLeft: 0,
      studyWrongRound: state.studyWrongRound + 1,
      wrongCount: state.wrongCount + 1,
      skillCharge: Math.min(12, state.skillCharge + tidalMemoryFocus + bloodQuillFocus),
      phase: "wrong" as const,
      studyFeedback: missedWord ? {
        selected: selectedOption,
        correct: missedWord.word,
        definition: missedWord.definition,
      } : null,
      fragileDebuff: state.fragileDebuff + (bloodQuill ? 1 : 0),
      eventNotices: bloodQuill
        ? appendCombatNotices(state.eventNotices, [createCombatNotice("Relic: Blood Quill", "Miss charged +2 Focus, but the next enemy hit hurts more.", "relic")])
        : tidalMemoryFocus > 0
          ? appendCombatNotices(state.eventNotices, [createCombatNotice("Relic: Tidal Memory", "First miss this study set still charged +1 Focus.", "relic")])
          : state.eventNotices,
      boardMessage: bloodQuill
        ? `Missed card. Lost ${offeredAp} AP. Blood Quill charged +2 Focus and made you fragile.`
        : tidalMemoryFocus > 0
          ? `Missed card. Lost ${offeredAp} AP. Tidal Memory charged +1 Focus.`
          : `Missed card. Lost ${offeredAp} AP. Review the answer.`,
      flashColor: "rgba(255,71,87,0.2)",
    };

    setCombat(nextState);

    window.setTimeout(() => {
      const latestCombat = combatRef.current;
      if (!latestCombat || latestCombat.mode !== "study" || latestCombat.phase !== "wrong" || latestCombat.currentWord?.id !== missedWord?.id) return;

      if (nextState.studyApOfferedThisRush >= getStudyRushApCap(nextState)) {
        finishStudyRound({
          ...nextState,
          phase: "answering",
          studyFeedback: null,
        }, nextSave);
        return;
      }

      setCombat({
        ...nextState,
        phase: "answering",
        ...drawNextStudyCard(nextState, nextSave),
      });
    }, 1150);
  };

  const playEndOfRoundCinematic = (
    state: CombatState,
    stats: CombatCinematicStats,
    enemy: EnemyInstance,
    details: CombatCinematicDetails,
    nextMode: "studyReady" | "board" | "boardReady",
    nextMessage: string,
    rewardAfter = false,
    gameOverAfter = false
  ) => {
    const cinematic: CombatCinematic = {
      id: cinematicIdCounter++,
      ...stats,
      enemyName: enemy.def.name,
      enemySprite: enemy.def.sprite,
      enemyIsBoss: enemy.def.isBoss,
      enemyIntent: details.enemyIntent,
      enemyHpBefore: details.enemyHpBefore,
      enemyHpAfter: details.enemyHpAfter,
      shieldBefore: details.shieldBefore,
      shieldAfter: details.shieldAfter,
      shieldBroken: details.shieldBroken,
      playerHpBefore: details.playerHpBefore,
      playerHpAfter: details.playerHpAfter,
      enemyActionLabel: details.enemyActionLabel,
      roomCleared: details.roomCleared,
      wardBlocked: details.wardBlocked,
      log: details.log,
      nextMode,
      nextMessage,
      rewardAfter,
      gameOverAfter,
    };

    const inlineMessage = stats.matchedCount > 0
      ? `${stats.comboCount} combo chain is firing from the rune board.`
      : "No combo formed. Enemy intent resolves.";

    setCombat({
      ...state,
      mode: "cinematic",
      selectedTileIndex: null,
      runeMoved: false,
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      pendingCinematic: null,
      cinematic,
      cinematicStepIndex: 0,
      combatLog: details.log,
      enemyAnim: stats.damage > 0 || stats.shieldDamage > 0 ? "hit" : stats.enemyDamage > 0 ? "attack" : null,
      playerAnim: stats.enemyDamage > 0 ? "hit" : stats.heal > 0 ? "heal" : null,
      boardMessage: inlineMessage,
    });
  };

  const advanceCombatCinematic = () => {
    const latestCombat = combatRef.current;
    const cinematic = latestCombat?.cinematic;
    if (!latestCombat || !cinematic || advancingCinematicRef.current === cinematic.id) return;

    advancingCinematicRef.current = cinematic.id;

    setCombat(prev => prev && prev.cinematic?.id === cinematic.id ? {
      ...prev,
      mode: cinematic.nextMode,
      phase: cinematic.rewardAfter ? "transition" : "answering",
      cinematic: null,
      cinematicStepIndex: 0,
      enemyAnim: null,
      playerAnim: null,
      boardMessage: cinematic.nextMessage,
    } : prev);

    if (cinematic.rewardAfter) {
      setScreen("reward");
    }

    if (cinematic.gameOverAfter) {
      const orbsEarned = latestCombat.floor * 10 + latestCombat.correctCount * 2 + latestCombat.maxCombo * 5;
      setSave(prev => updateRunStats(prev, latestCombat, orbsEarned));
      setScreen("gameOver");
    }
  };

  const advanceCombatResolution = () => {
    const latestCombat = combatRef.current;
    const cinematic = latestCombat?.cinematic;
    if (!latestCombat || !cinematic) return;

    const timeline = buildCombatTimeline(cinematic);
    const currentIndex = Math.min(latestCombat.cinematicStepIndex, Math.max(0, timeline.length - 1));

    if (currentIndex < timeline.length - 1) {
      const nextIndex = currentIndex + 1;
      setCombat(prev => prev && prev.cinematic?.id === cinematic.id ? {
        ...prev,
        cinematicStepIndex: nextIndex,
      } : prev);
      return;
    }

    advanceCombatCinematic();
  };

  const finalizeRuneRound = (state: CombatState, stats: CombatCinematicStats) => {
    const enemy = state.enemies[state.currentEnemyIndex];
    if (!enemy || enemy.isDead) return;

    const enemyIntentBefore = getEnemyIntent(enemy);
    const enemyHpBefore = enemy.hp;
    let enemyHpAfter = enemy.hp;
    const playerHpBefore = state.playerHp;
    const defense = resolveEnemyDefense(enemy, stats, state.runRelics);
    const damage = defense.hpDamage;
    const healAmount = Math.min(state.playerMaxHp - state.playerHp, stats.heal);
    let enemyDamage = 0;
    let nextPlayerHp = state.playerHp + healAmount;
    let nextBoard = state.board;
    let nextBuffs = [...state.activeBuffs];
    let specialChangedTileIds: number[] = [];
    let enemyActionLabel = "Enemy is still charging.";
    let wardBlocked = false;
    const resolutionNotes: string[] = [];
    const combatNotices: CombatNotice[] = [];
    const nextEnemies = [...state.enemies];
    let currentEnemyIndex = state.currentEnemyIndex;
    let phaseBanner = state.showPhaseBanner;
    let defeatedEnemy = false;
    let boardMessage = stats.matchedCount > 0
      ? `${stats.comboCount} combo spell finalized.`
      : "No spell formed.";
    if (damage > 0 && stats.attackers.length > 0) {
      boardMessage += ` ${stats.attackers.slice(0, 2).join(", ")} attacked.`;
    }
    const damageNumbers: DamageNumber[] = [...state.damageNumbers];
    let nextSkillCharge = state.skillCharge;
    let finalStats: CombatCinematicStats = {
      ...stats,
      rawDamage: defense.rawDamage,
      damage,
      shieldDamage: defense.shieldDamage,
      shieldBroken: defense.shieldBroken,
      elementDamage: defense.adjustedByElement,
      heal: healAmount,
      enemyDamage: 0,
      weaknessHits: defense.weaknessHits,
      resistedHits: defense.resistedHits,
    };

    if (defense.shieldDamage > 0) {
      nextEnemies[state.currentEnemyIndex] = {
        ...enemy,
        shield: defense.shieldAfter,
      };
      damageNumbers.push({
        id: damageIdCounter++,
        value: defense.shieldDamage,
        x: 48 + Math.random() * 16,
        y: 38,
        color: defense.shieldBroken ? "#F7D154" : "#45A9FF",
        isCrit: defense.shieldBroken,
      });
      boardMessage += ` Shield took ${defense.shieldDamage}.`;
      combatNotices.push(createCombatNotice("Shield Hit", `${defense.shieldDamage} shield damage.`, defense.shieldBroken ? "good" : "neutral"));
      if (defense.shieldBreakBonus > 0) {
        resolutionNotes.push(`Weak runes pressured the shield for +${defense.shieldBreakBonus} break damage.`);
      }
      if (defense.shieldBroken) {
        phaseBanner = "SHIELD BROKEN";
        const focusGain = state.runRelics.includes("fracture_notes") ? 3 : 2;
        nextSkillCharge = Math.min(12, nextSkillCharge + focusGain);
        boardMessage += ` Focus +${focusGain}.`;
        if (defense.fractureBonus > 0) {
          boardMessage += ` Fracture +${defense.fractureBonus} HP.`;
          resolutionNotes.push(`Fracture Notes spilled ${defense.fractureBonus} damage through the broken shield.`);
        }
        if (state.runRelics.includes("clean_margin") && !nextBuffs.some(buff => buff.type === "ward")) {
          nextBuffs = [...nextBuffs, { type: "ward", remaining: 1 }];
          resolutionNotes.push("Clean Margin raised a Ward from the shield break.");
          combatNotices.push(createCombatNotice("Relic: Clean Margin", "Shield break raised a Ward.", "relic"));
        }
        resolutionNotes.push(`${enemy.def.name}'s shield broke, delayed its counter, and charged ${focusGain} Focus.`);
        combatNotices.push(createCombatNotice("Shield Break", `Counter delayed. +${focusGain} Focus.`, "good"));
      }
    }

    if (defense.weaknessHits.length > 0) {
      boardMessage += ` Weak ${formatTileLabels(defense.weaknessHits)} hit.`;
      resolutionNotes.push(`Weakness: ${formatTileLabels(defense.weaknessHits)} damage was amplified.`);
      combatNotices.push(createCombatNotice("Weakness Hit", `${formatTileLabels(defense.weaknessHits)} damage amplified.`, "good"));
      if (state.runRelics.includes("elemental_index")) {
        nextSkillCharge = Math.min(12, nextSkillCharge + 1);
        boardMessage += " Index +1 Focus.";
        resolutionNotes.push("Elemental Index charged 1 Focus from the weakness hit.");
        combatNotices.push(createCombatNotice("Relic: Elemental Index", "+1 Focus from weakness hit.", "relic"));
      }
    }

    if (defense.resistedHits.length > 0) {
      resolutionNotes.push(`Resistance: ${formatTileLabels(defense.resistedHits)} damage was reduced.`);
      combatNotices.push(createCombatNotice("Resisted", `${formatTileLabels(defense.resistedHits)} damage reduced.`, "warn"));
    }

    if (damage > 0) {
      const newHp = Math.max(0, enemy.hp - damage);
      enemyHpAfter = newHp;
      nextEnemies[state.currentEnemyIndex] = {
        ...nextEnemies[state.currentEnemyIndex],
        hp: newHp,
      };
      damageNumbers.push({
        id: damageIdCounter++,
        value: damage,
        x: 50 + Math.random() * 20,
        y: 30,
        color: state.activeBuffs.some(buff => buff.type === "board_surge") ? "#F39C12" : "#FFFFFF",
        isCrit: stats.comboCount >= 4,
      });

      if (newHp <= 0) {
        defeatedEnemy = true;
        nextEnemies[state.currentEnemyIndex] = { ...nextEnemies[state.currentEnemyIndex], isDead: true };
        const allDead = nextEnemies.every(e => e.isDead);

        if (allDead) {
          const rewardChoices = createRewardChoices(save, state.deck, state.difficultyFloor);
          const relicChoices = state.encounter.offersRelic ? createRelicChoices(state.runRelics, state.encounter) : [];
          if (stats.curseDamage > 0) {
            nextPlayerHp = Math.max(0, nextPlayerHp - stats.curseDamage);
            damageNumbers.push({
              id: damageIdCounter++,
              value: stats.curseDamage,
              x: 22 + Math.random() * 16,
              y: 68,
              color: "#B078FF",
              isCrit: false,
            });
            resolutionNotes.push(`${stats.cursedRunes} cursed rune${stats.cursedRunes === 1 ? "" : "s"} caused ${stats.curseDamage} recoil.`);
            combatNotices.push(createCombatNotice("Cursed Recoil", `${stats.curseDamage} damage taken.`, "bad"));
          }
          enemyActionLabel = `${enemy.def.name} was defeated before it could counter.`;
          combatNotices.push(createCombatNotice("Enemy Defeated", `${enemy.def.name} falls before countering.`, "good"));
          const combatLog = buildCombatLog(
            finalStats,
            enemy,
            enemyHpBefore,
            enemyHpAfter,
            playerHpBefore,
            nextPlayerHp,
            enemyActionLabel,
            [`${state.encounter.rewardLabel}: ${relicChoices.length > 0 ? "relic choice plus card draft" : "card draft"}.`]
          );
          const cinematicDetails: CombatCinematicDetails = {
            enemyIntent: enemyIntentBefore,
            enemyHpBefore,
            enemyHpAfter,
            shieldBefore: defense.shieldBefore,
            shieldAfter: defense.shieldAfter,
            shieldBroken: defense.shieldBroken,
            playerHpBefore,
            playerHpAfter: nextPlayerHp,
            enemyActionLabel,
            roomCleared: true,
            wardBlocked,
            log: combatLog,
          };
          const clearedState: CombatState = {
            ...state,
            board: nextBoard,
            boardMovesLeft: 0,
            selectedTileIndex: null,
            runeMoved: false,
            dragPointerId: null,
            dragTileId: null,
            dragTileKind: null,
            dragTileStatus: null,
            lastMovedTileIds: [],
            newTileIds: [],
            matchedTileIds: [],
            isResolvingRunes: false,
            pendingCinematic: null,
            enemies: nextEnemies,
            rewardChoices,
            relicChoices,
            combatLog,
            eventNotices: appendCombatNotices(state.eventNotices, combatNotices),
            combo: stats.comboCount,
            maxCombo: Math.max(state.maxCombo, stats.comboCount),
            score: state.score + damage + defense.shieldDamage + stats.comboCount * 20 + healAmount,
            skillCharge: nextSkillCharge,
            playerHp: nextPlayerHp,
            phase: "transition",
            activeBuffs: nextBuffs,
            damageNumbers,
            flashColor: "rgba(243,156,18,0.2)",
            boardMessage: "Room cleared. Choose a new card for your deck.",
          };

          playEndOfRoundCinematic(clearedState, finalStats, enemy, cinematicDetails, "studyReady", "Room cleared. Choose a new card for your deck.", true);
          return;
        }

        const nextIndex = nextEnemies.findIndex((e, i) => i > state.currentEnemyIndex && !e.isDead);
        if (nextIndex !== -1) {
          currentEnemyIndex = nextIndex;
          enemyActionLabel = `${enemy.def.name} defeated. Next foe steps forward.`;
          boardMessage = `${enemy.def.name} defeated. Next foe steps forward.`;
        }
      } else {
        const updatedEnemy = nextEnemies[state.currentEnemyIndex];
        const hpPct = newHp / enemy.maxHp;

        if (enemy.def.phases && enemy.phase < enemy.def.phases.length) {
          const nextPhase = enemy.def.phases[enemy.phase];
          if (hpPct <= nextPhase.threshold) {
            nextEnemies[state.currentEnemyIndex] = {
              ...updatedEnemy,
              phase: enemy.phase + 1,
              currentDamage: Math.floor(enemy.currentDamage * nextPhase.damageMult),
              attackCharge: nextPhase.attackFreq ? Math.min(updatedEnemy.attackCharge, nextPhase.attackFreq) : updatedEnemy.attackCharge,
            };
            phaseBanner = `PHASE ${enemy.phase + 1}`;
          }
        }

        if (enemy.def.special === "enrage_at_50" && hpPct <= 0.5 && enemy.phase === 1) {
          nextEnemies[state.currentEnemyIndex] = {
            ...nextEnemies[state.currentEnemyIndex],
            phase: 2,
            currentDamage: Math.floor(enemy.currentDamage * 1.5),
            attackCharge: Math.min(nextEnemies[state.currentEnemyIndex].attackCharge, enemy.def.attackFrequency),
          };
          phaseBanner = "ENRAGED!";
        }
      }
    } else if (healAmount > 0) {
      boardMessage = defense.shieldDamage > 0
        ? `${boardMessage} Heart runes restored ${healAmount} HP.`
        : `Heart runes restored ${healAmount} HP.`;
      combatNotices.push(createCombatNotice("Heal Pulse", `${healAmount} HP restored.`, "good"));
    }

    if (stats.curseDamage > 0) {
      nextPlayerHp = Math.max(0, nextPlayerHp - stats.curseDamage);
      damageNumbers.push({
        id: damageIdCounter++,
        value: stats.curseDamage,
        x: 22 + Math.random() * 16,
        y: 68,
        color: "#B078FF",
        isCrit: false,
      });
      boardMessage += ` Cursed runes recoil for ${stats.curseDamage}.`;
      resolutionNotes.push(`${stats.cursedRunes} cursed rune${stats.cursedRunes === 1 ? "" : "s"} caused ${stats.curseDamage} recoil.`);
      combatNotices.push(createCombatNotice("Cursed Recoil", `${stats.curseDamage} damage taken.`, "bad"));
    }

    const chargedEnemy = nextEnemies[currentEnemyIndex];
    if (chargedEnemy && !chargedEnemy.isDead && !defeatedEnemy) {
      const nextCharge = chargedEnemy.attackCharge - 1 + (defense.shieldBroken ? 1 : 0);
      if (nextCharge <= 0) {
        const wardIndex = nextBuffs.findIndex(b => b.type === "ward");
        if (wardIndex >= 0) {
          nextBuffs = nextBuffs.filter((_, i) => i !== wardIndex);
          wardBlocked = true;
          enemyActionLabel = `Ward blocked ${chargedEnemy.def.name}'s counterattack.`;
          boardMessage += " Ward blocked the counterattack.";
          combatNotices.push(createCombatNotice("Ward Block", `${chargedEnemy.def.name}'s counter was blocked.`, "good"));
        } else {
          let incomingDamage = chargedEnemy.currentDamage;
          if (chargedEnemy.def.special === "low_combo_punish" && stats.comboCount < 3) {
            const penaltyDamage = Math.max(4, Math.floor(chargedEnemy.currentDamage * 0.45));
            incomingDamage += penaltyDamage;
            resolutionNotes.push(`${chargedEnemy.def.name} punished a low-combo turn for +${penaltyDamage} damage.`);
            const curse = setRandomRuneStatus(nextBoard, "cursed", 1, { excludeKinds: ["heart"] });
            nextBoard = curse.board;
            specialChangedTileIds = Array.from(new Set([...specialChangedTileIds, ...curse.changedIds]));
            resolutionNotes.push("A low-combo curse marked 1 attack rune.");
          }
          if (chargedEnemy.def.special === "healing_check") {
            if (healAmount <= 0) {
              const penaltyDamage = Math.max(5, Math.floor(chargedEnemy.currentDamage * 0.35));
              incomingDamage += penaltyDamage;
              resolutionNotes.push(`${chargedEnemy.def.name}'s healing test failed: no Heart recovery, +${penaltyDamage} damage.`);
              const curse = setRandomRuneStatus(nextBoard, "cursed", 2, { kind: "heart" });
              nextBoard = curse.board;
              specialChangedTileIds = Array.from(new Set([...specialChangedTileIds, ...curse.changedIds]));
              resolutionNotes.push(`${curse.changedIds.length} Heart runes were cursed.`);
            } else {
              resolutionNotes.push(`${chargedEnemy.def.name}'s healing test passed: Heart recovery prevented the penalty.`);
              const cleanse = clearRuneStatuses(nextBoard, "cursed", 1);
              nextBoard = cleanse.board;
              specialChangedTileIds = Array.from(new Set([...specialChangedTileIds, ...cleanse.changedIds]));
              if (cleanse.changedIds.length > 0) {
                resolutionNotes.push("Heart recovery cleansed 1 cursed rune.");
              }
            }
          }
          enemyDamage = incomingDamage;
          nextPlayerHp = Math.max(0, nextPlayerHp - enemyDamage);
          if (state.runRelics.includes("shadow_bargain")) {
            nextSkillCharge = Math.min(12, nextSkillCharge + 2);
          }
          damageNumbers.push({
            id: damageIdCounter++,
            value: enemyDamage,
            x: 20 + Math.random() * 15,
            y: 70,
            color: "#FF4757",
            isCrit: false,
          });
          enemyActionLabel = `${chargedEnemy.def.name} struck for ${enemyDamage}.`;
          boardMessage += ` ${chargedEnemy.def.name} counters for ${enemyDamage}.`;
          combatNotices.push(createCombatNotice("Enemy Counter", `${chargedEnemy.def.name} struck for ${enemyDamage}.`, "bad"));

          if (chargedEnemy.def.special === "shuffle_answers") {
            nextBoard = shuffleRuneBoard(nextBoard);
            boardMessage += " It scrambles the rune board.";
            resolutionNotes.push(`${chargedEnemy.def.name} scrambled the rune board.`);
            combatNotices.push(createCombatNotice("Enemy Special", "Rune board scrambled.", "warn"));
          } else if (chargedEnemy.def.special === "freeze_timer") {
            nextBuffs.push({ type: "study_tax", remaining: 1 });
            const curse = setRandomRuneStatus(nextBoard, "cursed", 2);
            nextBoard = curse.board;
            specialChangedTileIds = Array.from(new Set([...specialChangedTileIds, ...curse.changedIds]));
            boardMessage += " The next study goal costs 1 additional AP.";
            resolutionNotes.push(`Next study goal increased and ${curse.changedIds.length} runes were cursed.`);
            combatNotices.push(createCombatNotice("Enemy Special", "Study goal increased; runes cursed.", "warn"));
          } else if (chargedEnemy.def.special === "self_heal") {
            const healedHp = Math.min(chargedEnemy.maxHp, nextEnemies[currentEnemyIndex].hp + Math.max(6, Math.floor(chargedEnemy.maxHp * 0.12)));
            nextEnemies[currentEnemyIndex] = {
              ...nextEnemies[currentEnemyIndex],
              hp: healedHp,
            };
            boardMessage += " It drinks back some HP.";
            resolutionNotes.push(`${chargedEnemy.def.name} healed to ${healedHp}/${chargedEnemy.maxHp} HP.`);
            combatNotices.push(createCombatNotice("Enemy Special", `${chargedEnemy.def.name} healed.`, "warn"));
          } else if (chargedEnemy.def.special === "timer_drain") {
            nextSkillCharge = Math.max(0, nextSkillCharge - 3);
            nextBuffs.push({ type: "study_tax", remaining: 1 });
            const curse = setRandomRuneStatus(nextBoard, "cursed", 3);
            nextBoard = curse.board;
            specialChangedTileIds = Array.from(new Set([...specialChangedTileIds, ...curse.changedIds]));
            boardMessage += " Focus is drained and the next study goal rises.";
            resolutionNotes.push(`Focus lost, study goal increased, and ${curse.changedIds.length} runes were cursed.`);
            combatNotices.push(createCombatNotice("Enemy Special", "Focus drained; next study goal increased.", "bad"));
          } else if (chargedEnemy.def.special === "randomize_positions") {
            nextBoard = shuffleRuneBoard(nextBoard);
            const conversion = convertRandomRunes(nextBoard, "shadow", 2);
            nextBoard = conversion.board;
            const curse = setRandomRuneStatus(nextBoard, "cursed", 2, { kind: "shadow" });
            nextBoard = curse.board;
            specialChangedTileIds = Array.from(new Set([...conversion.changedIds, ...curse.changedIds]));
            boardMessage += " Runes scatter into shadow.";
            resolutionNotes.push(`Board shuffled, 2 runes turned Shadow, and ${curse.changedIds.length} Shadow runes were cursed.`);
            combatNotices.push(createCombatNotice("Enemy Special", "Runes scattered into Shadow.", "warn"));
          } else if (chargedEnemy.def.special === "three_phase") {
            const conversion = convertRandomRunes(nextBoard, "shadow", chargedEnemy.phase >= 3 ? 5 : 3);
            nextBoard = conversion.board;
            const curse = setRandomRuneStatus(nextBoard, "cursed", chargedEnemy.phase >= 3 ? 4 : 2, { kind: "shadow" });
            nextBoard = curse.board;
            specialChangedTileIds = Array.from(new Set([...conversion.changedIds, ...curse.changedIds]));
            nextBuffs.push({ type: "study_tax", remaining: 1 });
            boardMessage += " The board is cursed for the next round.";
            resolutionNotes.push(`Board curse: ${conversion.changedIds.length} runes turned Shadow, ${curse.changedIds.length} were cursed, and the next study goal increased.`);
            combatNotices.push(createCombatNotice("Boss Special", "Board cursed for the next round.", "bad"));
          }
        }
        nextEnemies[currentEnemyIndex] = {
          ...nextEnemies[currentEnemyIndex],
          attackCharge: chargedEnemy.def.special === "sequential"
            ? Math.max(1, getEnemyAttackFrequency(chargedEnemy) - 1)
            : getEnemyAttackFrequency(chargedEnemy),
        };
      } else {
        enemyActionLabel = `${chargedEnemy.def.name} is charging (${nextCharge} turn${nextCharge === 1 ? "" : "s"} left).`;
        nextEnemies[currentEnemyIndex] = {
          ...chargedEnemy,
          attackCharge: nextCharge,
        };
      }
    }

    finalStats = { ...finalStats, enemyDamage };
    enemyHpAfter = nextEnemies[state.currentEnemyIndex]?.hp ?? enemyHpAfter;
    const isGameOver = nextPlayerHp <= 0;
    const nextMessage = isGameOver ? "You were defeated." : `${boardMessage} Study set coming up.`;
    const combatLog = buildCombatLog(
      finalStats,
      enemy,
      enemyHpBefore,
      enemyHpAfter,
      playerHpBefore,
      nextPlayerHp,
      enemyActionLabel,
      resolutionNotes
    );
    const cinematicDetails: CombatCinematicDetails = {
      enemyIntent: enemyIntentBefore,
      enemyHpBefore,
      enemyHpAfter,
      shieldBefore: defense.shieldBefore,
      shieldAfter: defense.shieldAfter,
      shieldBroken: defense.shieldBroken,
      playerHpBefore,
      playerHpAfter: nextPlayerHp,
      enemyActionLabel,
      roomCleared: false,
      wardBlocked,
      log: combatLog,
    };

    const nextState: CombatState = {
      ...state,
      mode: "studyReady",
      board: nextBoard,
      boardMovesLeft: 0,
      selectedTileIndex: null,
      runeMoved: false,
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      lastMovedTileIds: specialChangedTileIds,
      newTileIds: [],
      matchedTileIds: [],
      isResolvingRunes: false,
      pendingCinematic: null,
      cinematic: null,
      currentEnemyIndex,
      enemies: nextEnemies,
      combatLog,
      eventNotices: appendCombatNotices(state.eventNotices, combatNotices),
      combo: stats.comboCount,
      maxCombo: Math.max(state.maxCombo, stats.comboCount),
      score: state.score + damage + defense.shieldDamage + stats.comboCount * 20 + healAmount,
      skillCharge: nextSkillCharge,
      playerHp: nextPlayerHp,
      phase: "answering",
      activeBuffs: nextBuffs,
      damageNumbers,
      enemyAnim: null,
      playerAnim: null,
      screenShake: nextPlayerHp < state.playerHp ? 6 : 0,
      flashColor: damage > 0 || defense.shieldDamage > 0 ? "rgba(243,156,18,0.16)" : "",
      showPhaseBanner: phaseBanner,
      boardMessage: nextMessage,
    };

    playEndOfRoundCinematic(nextState, finalStats, enemy, cinematicDetails, "studyReady", nextMessage, false, isGameOver);
  };

  const settlePreparedRuneRound = () => {
    const latestCombat = combatRef.current;
    if (!latestCombat || latestCombat.mode !== "resolveReady" || latestCombat.isResolvingRunes || latestCombat.phase !== "answering") return;

    finalizeRuneRound(latestCombat, latestCombat.pendingCinematic || createEmptyCinematicStats());
  };

  const beginCommandPhase = () => {
    if (!combat || combat.mode !== "commandReady" || combat.phase !== "answering" || combat.isPaused) return;
    const currentActor = getCurrentActor(combat);
    if (currentActor?.kind === "enemy") {
      resolveEnemyActionFromState(combat);
      return;
    }

    if (combat.actionPoints <= 0) {
      const yieldedQueue = currentActor?.kind === "party"
        ? advanceTimelineByCost(combat.turnQueue, currentActor.id, 1)
        : combat.turnQueue;
      const yieldedState = {
        ...combat,
        turnQueue: yieldedQueue,
        actionPointsEarnedThisRush: 0,
        studyApOfferedThisRush: 0,
      };
      if (getCurrentActor(yieldedState)?.kind === "enemy") {
        resolveEnemyActionFromState(yieldedState);
        return;
      }
      setCombat({
        ...yieldedState,
        mode: "studyReady",
        activeActorId: getCurrentActor(yieldedState)?.id || null,
        boardMessage: "No AP earned. The party yielded initiative; start the next study set.",
      });
      return;
    }

    setCombat({
      ...combat,
      mode: "command",
      activeActorId: currentActor?.id || null,
      cinematic: null,
      boardMessage: `${combat.actionPoints} AP ready. Spend it before the enemy acts.`,
    });
  };

  const finishRoomAfterCommand = (state: CombatState) => {
    window.setTimeout(() => {
      const latestCombat = combatRef.current;
      if (!latestCombat || latestCombat.floor !== state.floor || latestCombat.phase !== "transition") return;
      setScreen("reward");
    }, 950);
  };

  const resolveEnemyActionFromState = (baseState: CombatState) => {
    const enemy = baseState.enemies[baseState.currentEnemyIndex];
    if (!enemy || enemy.isDead) return;

    const enemyPlanContext = getEnemyPlanContext(baseState);
    const actionPlan = getEnemyActionPlan(enemy, enemyPlanContext);
    const enemyIntentBefore = getEnemyIntent(enemy, enemyPlanContext);
    const playerHpBefore = baseState.playerHp;
    let nextEnemies = [...baseState.enemies];
    let nextBuffs = [...baseState.activeBuffs];
    let incomingDamage = actionPlan.reduce((total, action) => total + action.damage, 0);
    let wardBlocked = false;
    const combatNotices: CombatNotice[] = [];
    const resolutionNotes: string[] = [];
    let nextSkillCharge = baseState.skillCharge;
    let nextStudyShuffle = baseState.nextStudyShuffle;
    let apPenaltyNextRush = baseState.apPenaltyNextRush;
    let nextQueue = [...baseState.turnQueue];
    const enemyApBudget = getEnemyApForTurn(enemy);
    const enemyApSpent = Math.max(1, Math.min(enemyApBudget, actionPlan.reduce((total, action) => total + action.apCost, 0)));
    const enemyActionName = actionPlan.map(action => action.name).join(" + ") || "Wait";

    if (baseState.fragileDebuff > 0) {
      const fragileDamage = baseState.fragileDebuff * 3;
      incomingDamage += fragileDamage;
      resolutionNotes.push(`Fragile added ${fragileDamage} damage.`);
    }

    const wardIndex = nextBuffs.findIndex(buff => buff.type === "ward");
    const guardIndex = nextBuffs.findIndex(buff => buff.type === "guard");
    if (wardIndex >= 0) {
      nextBuffs = nextBuffs.filter((_, index) => index !== wardIndex);
      incomingDamage = 0;
      wardBlocked = true;
      combatNotices.push(createCombatNotice("Ward Block", `${enemy.def.name}'s action was blocked.`, "good"));
    } else if (guardIndex >= 0) {
      nextBuffs = nextBuffs.filter((_, index) => index !== guardIndex);
      incomingDamage = Math.max(1, Math.floor(incomingDamage * 0.45));
      combatNotices.push(createCombatNotice("Defended", `Incoming damage reduced to ${incomingDamage}.`, "good"));
    }

    if (!wardBlocked) {
      for (const action of actionPlan) {
        if (action.id === "scramble_answers") {
          if (nextStudyShuffle) continue;
          nextStudyShuffle = true;
          resolutionNotes.push("Next study set answer order will be scrambled.");
        } else if (action.id === "study_tax") {
          nextBuffs.push({ type: "study_tax", remaining: 1 });
          resolutionNotes.push("Next study set requires 1 additional AP.");
        } else if (action.id === "drain_focus") {
          nextSkillCharge = Math.max(0, nextSkillCharge - 3);
          apPenaltyNextRush = 1;
          resolutionNotes.push("Focus drained and the first correct card next rush earns 1 less AP.");
        } else if (action.id === "delay_actor") {
          nextQueue = delayPartyMember(nextQueue, 55);
          resolutionNotes.push("A random party member was delayed on the timeline.");
        } else if (action.id === "self_repair") {
          const missingHp = Math.max(0, enemy.maxHp - nextEnemies[baseState.currentEnemyIndex].hp);
          const healAmount = Math.min(missingHp, Math.max(6, Math.floor(enemy.maxHp * 0.12)));
          if (healAmount <= 0) continue;
          nextEnemies[baseState.currentEnemyIndex] = {
            ...nextEnemies[baseState.currentEnemyIndex],
            hp: Math.min(enemy.maxHp, nextEnemies[baseState.currentEnemyIndex].hp + healAmount),
          };
          resolutionNotes.push(`${enemy.def.name} restored ${healAmount} HP.`);
        } else if (action.id === "exploit_hesitation") {
          resolutionNotes.push(`${enemy.def.name} punished spending fewer than 3 AP.`);
        } else if (action.id === "punish_neglect") {
          resolutionNotes.push(`${enemy.def.name} punished the party for not healing or defending.`);
        } else if (action.id === "boss_protocol") {
          nextBuffs.push({ type: "study_tax", remaining: 1 });
          apPenaltyNextRush = Math.max(apPenaltyNextRush, 1);
          resolutionNotes.push("Boss protocol raised the next AP goal and reduced early AP gain.");
        } else if (action.id === "boss_pressure") {
          resolutionNotes.push(`${enemy.def.name} spent extra AP on pressure.`);
        }
      }
    }

    const nextPlayerHp = Math.max(0, baseState.playerHp - incomingDamage);
    if (incomingDamage > 0 && baseState.runRelics.includes("shadow_bargain")) {
      nextSkillCharge = Math.min(12, nextSkillCharge + 2);
      resolutionNotes.push("Shadow Bargain converted damage into +2 Focus.");
      combatNotices.push(createCombatNotice("Relic: Shadow Bargain", "Taking damage charged +2 Focus.", "relic"));
    }
    const enemyActionLabel = wardBlocked
      ? `Ward blocked ${enemy.def.name}'s ${enemyActionName}.`
      : `${enemy.def.name} used ${enemyActionName} for ${incomingDamage}.`;

    if (!wardBlocked) {
      combatNotices.push(createCombatNotice("Enemy Action", enemyActionLabel, incomingDamage > 0 ? "bad" : "neutral"));
    }

    const enemyActor = getCurrentActor(baseState)?.kind === "enemy"
      ? getCurrentActor(baseState)
      : baseState.turnQueue.find(entry => entry.kind === "enemy" && entry.refId === enemy.def.id);
    if (enemyActor) {
      nextQueue = advanceTimelineByCost(nextQueue, enemyActor.id, Math.max(1, enemyApSpent), enemy.def.special === "sequential" ? -18 : 0);
    }

    const isGameOver = nextPlayerHp <= 0;
    const stats = createEmptyCinematicStats();
    stats.enemyDamage = incomingDamage;
    const combatLog = buildCombatLog(
      stats,
      enemy,
      enemy.hp,
      nextEnemies[baseState.currentEnemyIndex]?.hp ?? enemy.hp,
      playerHpBefore,
      nextPlayerHp,
      enemyActionLabel,
      [`Enemy AP: ${enemyApSpent}/${enemyApBudget}.`, ...resolutionNotes]
    );
    const cinematic = createActionCinematic(
      stats,
      enemy,
      {
        enemyIntent: enemyIntentBefore,
        enemyHpBefore: enemy.hp,
        enemyHpAfter: nextEnemies[baseState.currentEnemyIndex]?.hp ?? enemy.hp,
        shieldBefore: enemy.shield,
        shieldAfter: enemy.shield,
        shieldBroken: false,
        playerHpBefore,
        playerHpAfter: nextPlayerHp,
        enemyActionLabel,
        roomCleared: false,
        wardBlocked,
        log: combatLog,
      },
      isGameOver ? "enemyAction" : "studyReady",
      isGameOver ? "You were defeated." : "Enemy acted. Study set coming up.",
      false,
      isGameOver
    );

    const nextState: CombatState = {
      ...baseState,
      mode: "enemyAction",
      phase: "transition",
      enemies: nextEnemies,
      playerHp: nextPlayerHp,
      turnQueue: nextQueue,
      actionPoints: Math.min(baseState.actionPointCarryCap, baseState.actionPoints),
      actionPointsEarnedThisRush: 0,
      studyApOfferedThisRush: 0,
      actionPointsSpentThisWindow: 0,
      enemyActionPoints: enemyApBudget,
      enemyActionPointsSpentThisTurn: enemyApSpent,
      healedOrDefendedThisWindow: false,
      apPenaltyNextRush,
      nextStudyShuffle,
      skillCharge: nextSkillCharge,
      activeBuffs: nextBuffs,
      fragileDebuff: 0,
      cinematic,
      cinematicStepIndex: 0,
      combatLog,
      eventNotices: appendCombatNotices(baseState.eventNotices, [
        createCombatNotice("Enemy AP", `${enemy.def.name} spent ${enemyApSpent}/${enemyApBudget} AP.`, "neutral"),
        ...combatNotices,
      ]),
      damageNumbers: incomingDamage > 0 ? [
        ...baseState.damageNumbers,
        {
          id: damageIdCounter++,
          value: incomingDamage,
          x: 22 + Math.random() * 12,
          y: 68,
          color: "#FF4757",
          isCrit: false,
        },
      ] : baseState.damageNumbers,
      enemyAnim: "attack",
      playerAnim: incomingDamage > 0 ? "hit" : null,
      screenShake: incomingDamage > 0 ? 6 : 0,
      flashColor: incomingDamage > 0 ? "rgba(255,71,87,0.18)" : "rgba(69,169,255,0.12)",
      boardMessage: isGameOver ? "You were defeated." : `${enemy.def.name} used ${enemyActionName}. Study set coming up.`,
    };

    setCombat(nextState);

    window.setTimeout(() => {
      const latestCombat = combatRef.current;
      if (!latestCombat || latestCombat.cinematic?.id !== cinematic.id) return;
      if (isGameOver) {
        const orbsEarned = latestCombat.floor * 10 + latestCombat.correctCount * 2 + latestCombat.maxCombo * 5;
        setSave(prev => updateRunStats(prev, latestCombat, orbsEarned));
        setScreen("gameOver");
        return;
      }

      setCombat(prev => prev && prev.cinematic?.id === cinematic.id ? {
        ...prev,
        mode: "studyReady",
        phase: "answering",
        cinematic: null,
        cinematicStepIndex: 0,
        enemyAnim: null,
        playerAnim: null,
        activeActorId: null,
        boardMessage: "Study set ready. Resolve the fixed AP hand to open the next command window.",
      } : prev);
    }, 1150);
  };

  const handlePlayerCommand = (action: PlayerActionId) => {
    if (!combat || combat.mode !== "command" || combat.phase !== "answering" || combat.isPaused) return;
    const actor = getCurrentActor(combat);
    const party = getRunParty(save);
    const member = getActorCharacter(actor, party);
    const enemy = combat.enemies[combat.currentEnemyIndex];
    if (!actor || !member || !enemy || enemy.isDead) return;

    const baseCost = getPlayerActionCost(member, action, combat);
    if (combat.actionPoints < baseCost) return;

    const playerHpBefore = combat.playerHp;
    const enemyHpBefore = enemy.hp;
    const shieldBefore = enemy.shield;
    let rawDamage = 0;
    let healAmount = 0;
    let kind = member.element;
    let nextBuffs = [...combat.activeBuffs];
    let nextSkillCharge = combat.skillCharge;
    let nextExposedTurns = combat.exposedTurns;
    let nextFlameDiscount = combat.flameDiscountNext && !(member.element === "flame" && action === "skill");
    let healedOrDefended = combat.healedOrDefendedThisWindow;
    let actionDelay = 0;
    const actionNotices: CombatNotice[] = [];
    const actionLabel = getActionLabel(member, action);

    if (action === "attack") {
      rawDamage = Math.max(5, member.attack + Math.floor(combat.difficultyFloor * 1.15));
    } else if (action === "defend") {
      nextBuffs = [...nextBuffs, { type: "guard", remaining: 1 }];
      nextSkillCharge = Math.min(12, nextSkillCharge + 1);
      healedOrDefended = true;
      if (combat.runRelics.includes("runic_tumbler")) {
        actionDelay = -14;
        actionNotices.push(createCombatNotice("Relic: Runic Tumbler", "Defend nudged the timeline in your favor.", "relic"));
      }
    } else if (member.skillId === "steady_hand") {
      rawDamage = Math.floor(member.attack * 1.15) + Math.floor(combat.difficultyFloor * 1.2);
      nextExposedTurns = Math.max(nextExposedTurns, 1);
      actionNotices.push(createCombatNotice("Exposed", "The next weakness hit will strike harder.", "good"));
    } else if (member.skillId === "convert_flame") {
      kind = "flame";
      rawDamage = Math.floor(member.attack * 1.55) + (combat.studyCorrectRound >= 4 ? 14 : 0) + Math.floor(combat.difficultyFloor * 1.25);
    } else if (member.skillId === "ward_word") {
      kind = "tide";
      nextBuffs = [...nextBuffs, { type: "ward", remaining: 1 }];
      healedOrDefended = true;
    } else if (member.skillId === "verdant_shift") {
      kind = "leaf";
      rawDamage = Math.floor(member.attack * 0.75) + Math.floor(combat.difficultyFloor * 0.8);
      healAmount = Math.min(combat.playerMaxHp - combat.playerHp, Math.floor(member.recovery * 1.4) + 16 + (combat.runRelics.includes("greenhouse") ? 6 : 0) + (combat.runRelics.includes("leaf_bloom") && combat.studyCorrectRound >= 4 ? 8 : 0));
      healedOrDefended = healAmount > 0 || healedOrDefended;
      if (combat.runRelics.includes("greenhouse")) {
        actionNotices.push(createCombatNotice("Relic: Greenhouse", "Verdant Shift restored extra HP.", "relic"));
      }
      if (combat.runRelics.includes("heart_ward") && !nextBuffs.some(buff => buff.type === "heart_ward_used")) {
        nextBuffs = [...nextBuffs, { type: "ward", remaining: 1 }, { type: "heart_ward_used", remaining: 1 }];
        actionNotices.push(createCombatNotice("Relic: Heart Ward", "First heal also raised a Ward.", "relic"));
      }
    } else if (member.skillId === "umbra_surge") {
      kind = "shadow";
      rawDamage = Math.floor(member.attack * 2.05) + Math.floor(combat.difficultyFloor * 1.35);
      if (combat.exposedTurns > 0 || enemy.shield > 0) {
        rawDamage += 14;
      }
    }

    if (rawDamage > 0 && enemy.def.weakTo.includes(kind) && combat.exposedTurns > 0) {
      rawDamage = Math.floor(rawDamage * 1.35);
      nextExposedTurns = Math.max(0, nextExposedTurns - 1);
      actionNotices.push(createCombatNotice("Exposed Triggered", "Weakness damage amplified.", "good"));
    }

    if (rawDamage > 0 && enemy.def.weakTo.includes(kind) && combat.runRelics.includes("linebreaker")) {
      rawDamage = Math.floor(rawDamage * 1.18);
      actionNotices.push(createCombatNotice("Relic: Linebreaker", "Weakness hit boosted.", "relic"));
    }

    const stats = createDirectActionStats(kind, rawDamage, healAmount, rawDamage > 0 ? member.name : undefined, action === "skill" ? 5 : action === "attack" ? 3 : 0);
    const defense = resolveEnemyDefense(enemy, stats, combat.runRelics);
    stats.rawDamage = defense.rawDamage;
    stats.damage = defense.hpDamage;
    stats.shieldDamage = defense.shieldDamage;
    stats.shieldBroken = defense.shieldBroken;
    stats.elementDamage = defense.adjustedByElement;
    stats.weaknessHits = defense.weaknessHits;
    stats.resistedHits = defense.resistedHits;
    stats.heal = healAmount;

    let nextEnemies = [...combat.enemies];
    let enemyHpAfter = enemy.hp;
    let currentEnemyIndex = combat.currentEnemyIndex;
    let nextQueue = advanceTimelineByCost(combat.turnQueue, actor.id, baseCost, actionDelay);
    let phaseBanner = combat.showPhaseBanner;

    if (defense.shieldDamage > 0 || defense.hpDamage > 0) {
      enemyHpAfter = Math.max(0, enemy.hp - defense.hpDamage);
      nextEnemies[combat.currentEnemyIndex] = {
        ...enemy,
        hp: enemyHpAfter,
        shield: defense.shieldAfter,
      };

      if (defense.shieldBroken) {
        nextSkillCharge = Math.min(12, nextSkillCharge + (combat.runRelics.includes("fracture_notes") ? 3 : 2));
        phaseBanner = "SHIELD BROKEN";
        actionNotices.push(createCombatNotice("Shield Break", "Counter delayed and Focus charged.", "good"));
      }

      if (enemyHpAfter > 0) {
        const hpPct = enemyHpAfter / enemy.maxHp;
        if (enemy.def.phases && enemy.phase < enemy.def.phases.length) {
          const nextPhase = enemy.def.phases[enemy.phase];
          if (hpPct <= nextPhase.threshold) {
            nextEnemies[combat.currentEnemyIndex] = {
              ...nextEnemies[combat.currentEnemyIndex],
              phase: enemy.phase + 1,
              currentDamage: Math.floor(enemy.currentDamage * nextPhase.damageMult),
            };
            phaseBanner = `PHASE ${enemy.phase + 1}`;
          }
        }
        if (enemy.def.special === "enrage_at_50" && hpPct <= 0.5 && enemy.phase === 1) {
          nextEnemies[combat.currentEnemyIndex] = {
            ...nextEnemies[combat.currentEnemyIndex],
            phase: 2,
            currentDamage: Math.floor(enemy.currentDamage * 1.5),
          };
          phaseBanner = "ENRAGED";
        }
      }
    }

    const nextPlayerHp = Math.min(combat.playerMaxHp, combat.playerHp + healAmount);
    if (enemyHpAfter <= 0 && (defense.hpDamage > 0 || rawDamage > 0)) {
      nextEnemies[combat.currentEnemyIndex] = { ...nextEnemies[combat.currentEnemyIndex], isDead: true, hp: 0 };
      nextQueue = removeEnemyFromQueue(nextQueue, enemy);
    }

    const allDead = nextEnemies.every(nextEnemy => nextEnemy.isDead);
    if (!allDead && enemyHpAfter <= 0) {
      const nextIndex = nextEnemies.findIndex((nextEnemy, index) => index > combat.currentEnemyIndex && !nextEnemy.isDead);
      if (nextIndex !== -1) {
        currentEnemyIndex = nextIndex;
      }
    }

    const nextActionPoints = combat.actionPoints - baseCost;
    const nextSpent = combat.actionPointsSpentThisWindow + baseCost;
    const combatLog = buildCombatLog(
      stats,
      enemy,
      enemyHpBefore,
      enemyHpAfter,
      playerHpBefore,
      nextPlayerHp,
      allDead ? `${enemy.def.name} fell.` : `${member.name} used ${actionLabel}.`,
      [
        defense.weaknessHits.length > 0 ? "Weakness hit amplified the command." : "",
        defense.resistedHits.length > 0 ? "The enemy resisted part of the hit." : "",
      ].filter(Boolean)
    );

    const rewardChoices = allDead ? createRewardChoices(save, combat.deck, combat.difficultyFloor) : combat.rewardChoices;
    const relicChoices = allDead && combat.encounter.offersRelic ? createRelicChoices(combat.runRelics, combat.encounter) : combat.relicChoices;
    const cinematic = createActionCinematic(
      stats,
      enemy,
      {
        enemyIntent: getEnemyIntent(enemy, getEnemyPlanContext(combat)),
        enemyHpBefore,
        enemyHpAfter,
        shieldBefore,
        shieldAfter: defense.shieldAfter,
        shieldBroken: defense.shieldBroken,
        playerHpBefore,
        playerHpAfter: nextPlayerHp,
        enemyActionLabel: allDead ? `${enemy.def.name} fell.` : `${member.name} used ${actionLabel}.`,
        roomCleared: allDead,
        wardBlocked: false,
        log: combatLog,
      },
      allDead ? "command" : "command",
      allDead ? "Room cleared. Choose a reward." : "Command resolved.",
      allDead,
      false
    );

    const nextState: CombatState = {
      ...combat,
      mode: "command",
      phase: "transition",
      enemies: nextEnemies,
      currentEnemyIndex,
      playerHp: nextPlayerHp,
      actionPoints: nextActionPoints,
      actionPointsSpentThisWindow: nextSpent,
      turnQueue: nextQueue,
      activeActorId: getCurrentActor({ ...combat, turnQueue: nextQueue })?.id || null,
      exposedTurns: nextExposedTurns,
      healedOrDefendedThisWindow: healedOrDefended,
      flameDiscountNext: nextFlameDiscount,
      activeBuffs: nextBuffs,
      skillCharge: nextSkillCharge,
      rewardChoices,
      relicChoices,
      cinematic,
      cinematicStepIndex: 0,
      combatLog,
      eventNotices: appendCombatNotices(combat.eventNotices, actionNotices),
      damageNumbers: [
        ...combat.damageNumbers,
        ...(defense.hpDamage + defense.shieldDamage > 0 ? [{
          id: damageIdCounter++,
          value: defense.hpDamage + defense.shieldDamage,
          x: 58 + Math.random() * 12,
          y: 32,
          color: defense.weaknessHits.length > 0 ? "#FFE66D" : TILE_DEFS[kind].color,
          isCrit: defense.weaknessHits.length > 0,
        }] : []),
        ...(healAmount > 0 ? [{
          id: damageIdCounter++,
          value: healAmount,
          x: 22 + Math.random() * 12,
          y: 66,
          color: TILE_DEFS.heart.color,
          isCrit: false,
        }] : []),
      ],
      actionEffect: createCombatActionEffect(action === "defend" || member.skillId === "ward_word" && action === "skill" ? "ward" : "skill", actionLabel, TILE_DEFS[kind].color, {
        kind,
        detail: action === "defend" ? "Next hit reduced" : baseCost === 1 ? "1 AP" : `${baseCost} AP`,
        casterName: member.name,
        casterSprite: member.sprite,
      }),
      enemyAnim: defense.hpDamage + defense.shieldDamage > 0 ? "hit" : null,
      playerAnim: healAmount > 0 ? "heal" : null,
      flashColor: healAmount > 0 ? "rgba(46,204,113,0.14)" : defense.hpDamage + defense.shieldDamage > 0 ? TILE_DEFS[kind].glow : "rgba(69,169,255,0.12)",
      showPhaseBanner: phaseBanner,
      combo: Math.max(combat.combo, combat.studyCorrectRound),
      maxCombo: Math.max(combat.maxCombo, combat.studyCorrectRound),
      score: combat.score + defense.hpDamage + defense.shieldDamage + healAmount + baseCost * 6,
      boardMessage: allDead
        ? "Room cleared. Choose a reward."
        : getCurrentActor({ ...combat, turnQueue: nextQueue })?.kind === "enemy"
          ? "Enemy reached the front of the timeline."
          : nextActionPoints <= 0
            ? "AP spent. Study again before the enemy reaches the front."
            : `${nextActionPoints} AP remains.`,
    };

    setCombat(nextState);

    if (allDead) {
      finishRoomAfterCommand({ ...nextState, phase: "transition" });
      return;
    }

    const nextActor = getCurrentActor(nextState);
    const enemyIsNext = nextActor?.kind === "enemy";
    const apExhausted = nextActionPoints <= 0;
    window.setTimeout(() => {
      if (enemyIsNext) {
        resolveEnemyActionFromState(nextState);
      } else if (apExhausted) {
        setCombat(prev => prev && prev.cinematic?.id === cinematic.id ? {
          ...prev,
          mode: "studyReady",
          phase: "answering",
          cinematic: null,
          cinematicStepIndex: 0,
          enemyAnim: null,
          playerAnim: null,
          activeActorId: getCurrentActor(prev)?.id || null,
          actionPoints: Math.min(prev.actionPointCarryCap, prev.actionPoints),
          actionPointsEarnedThisRush: 0,
          studyApOfferedThisRush: 0,
          boardMessage: "AP spent. Study again before the enemy reaches the front.",
        } : prev);
      } else {
        setCombat(prev => prev && prev.cinematic?.id === cinematic.id ? {
          ...prev,
          phase: "answering",
          cinematic: null,
          cinematicStepIndex: 0,
          enemyAnim: null,
          playerAnim: null,
          boardMessage: `${prev.actionPoints} AP remains. ${getCurrentActor(prev)?.name || "Next actor"} is ready.`,
        } : prev);
      }
    }, enemyIsNext ? 950 : 650);
  };

  const endCommandWindow = () => {
    if (!combat || combat.mode !== "command" || combat.phase !== "answering") return;
    if (getCurrentActor(combat)?.kind === "enemy") {
      resolveEnemyActionFromState(combat);
      return;
    }

    setCombat({
      ...combat,
      mode: "studyReady",
      activeActorId: getCurrentActor(combat)?.id || null,
      actionPoints: Math.min(combat.actionPointCarryCap, combat.actionPoints),
      actionPointsEarnedThisRush: 0,
      studyApOfferedThisRush: 0,
      boardMessage: "Command window ended. Study again before the enemy reaches the front.",
    });
  };

  const commitResolvedBoardMove = (state: CombatState, result: MatchResult) => {
    const hasSurge = state.activeBuffs.some(b => b.type === "board_surge");
    const nextBuffs = state.activeBuffs.filter(b => b.type !== "board_surge");
    const party = getRunParty(save);
    const attackSummary = getPartyDamage(result, party, hasSurge, state.runRelics);
    let damage = attackSummary.total;
    const cls = getClassById(save.selectedClass);
    if (cls?.id === "speedreader" && result.kindCounts.flame > 0) {
      const flameBonus = Math.floor(damage * 0.1);
      damage += flameBonus;
      attackSummary.byElement.flame += flameBonus;
    }

    const healAmount = getPartyHealing(result, party, state.playerHp, state.playerMaxHp, state.runRelics);
    const enhancedRunes = result.statusCounts.enhanced;
    const cursedRunes = result.statusCounts.cursed;
    const curseDamage = cursedRunes * 3;
    const moveNotices: CombatNotice[] = [];
    const activeEnemy = state.enemies[state.currentEnemyIndex];
    if (result.kindCounts.heart > 0 && state.runRelics.includes("heart_ward") && !nextBuffs.some(buff => buff.type === "ward")) {
      nextBuffs.push({ type: "ward", remaining: 1 });
      moveNotices.push(createCombatNotice("Relic: Heart Ward", "Heart match raised a Ward.", "relic"));
    }
    let comboAegisNote = "";
    if (state.runRelics.includes("combo_aegis") && result.comboCount >= 4 && !state.activeBuffs.some(buff => buff.type === "combo_aegis_used")) {
      nextBuffs.push({ type: "combo_aegis_used", remaining: 1 });
      if (!nextBuffs.some(buff => buff.type === "ward")) {
        nextBuffs.push({ type: "ward", remaining: 1 });
      }
      comboAegisNote = " Combo Aegis raised a Ward.";
      moveNotices.push(createCombatNotice("Relic: Combo Aegis", "4+ combo raised a Ward.", "relic"));
    }
    let nextSkillCharge = Math.min(12, state.skillCharge + Math.max(1, Math.min(3, result.comboCount)));
    if (state.runRelics.includes("combo_spark") && result.comboCount >= 4) {
      nextSkillCharge = Math.min(12, nextSkillCharge + 2);
      moveNotices.push(createCombatNotice("Relic: Combo Spark", "+2 Focus from a 4+ combo.", "relic"));
    }

    const primaryKind = getPrimaryRuneKind(result);
    const primaryTile = TILE_DEFS[primaryKind];
    const moveStats = mergeCinematicStats(state.pendingCinematic, {
      elements: [primaryKind],
      runeCounts: result.kindCounts,
      elementDamage: attackSummary.byElement,
      attackers: attackSummary.attackers,
      rawDamage: damage,
      damage,
      shieldDamage: 0,
      shieldBroken: false,
      heal: healAmount,
      enemyDamage: 0,
      curseDamage,
      enhancedRunes,
      cursedRunes,
      weaknessHits: [],
      resistedHits: [],
      comboCount: result.comboCount,
      matchedCount: result.matchedCount,
    });
    const nextMessage = `Runes cleared and fell. Prepared ${damage} ${primaryTile.label} damage (${result.kindCounts[primaryKind]} runes).${comboAegisNote} Resolving combat.`;
    if (result.comboCount >= 2) {
      moveNotices.push(createCombatNotice(`${result.comboCount} Combo`, `${result.matchedCount} runes ignited.`, result.comboCount >= 4 ? "good" : "neutral"));
    }
    if (activeEnemy) {
      const weakHits = activeEnemy.def.weakTo.filter(kind => result.kindCounts[kind] > 0);
      if (weakHits.length > 0) {
        moveNotices.push(createCombatNotice("Weakness Setup", `${formatTileLabels(weakHits)} matched into the spell.`, "good"));
      }
    }
    if (healAmount > 0) {
      moveNotices.push(createCombatNotice("Healing", `${healAmount} HP prepared from Hearts.`, "good"));
    }
    if (cursedRunes > 0) {
      moveNotices.push(createCombatNotice("Cursed Runes", `${curseDamage} recoil queued.`, "bad"));
    }

    const nextState: CombatState = {
      ...state,
      mode: "board",
      board: result.board,
      boardMovesLeft: 0,
      boardTimeLeft: 0,
      selectedTileIndex: null,
      runeMoved: false,
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      lastMovedTileIds: [],
      newTileIds: [],
      matchedTileIds: [],
      isResolvingRunes: false,
      pendingCinematic: moveStats,
      combo: result.comboCount,
      maxCombo: Math.max(state.maxCombo, result.comboCount),
      skillCharge: nextSkillCharge,
      activeBuffs: nextBuffs,
      eventNotices: appendCombatNotices(state.eventNotices, moveNotices),
      flashColor: hasSurge ? "rgba(243,156,18,0.16)" : "",
      boardMessage: nextMessage,
    };

    finalizeRuneRound(nextState, moveStats);
  };

  const showResolvedBoardStep = (state: CombatState, result: MatchResult, stepIndex: number) => {
    const step = result.cascadeSteps[stepIndex];

    if (!step) {
      commitResolvedBoardMove({
        ...state,
        board: result.board,
        matchedTileIds: [],
        newTileIds: [],
        isResolvingRunes: false,
      }, result);
      return;
    }

    const primaryKind = getPrimaryKindFromCounts(step.kindCounts);
    const primaryTile = TILE_DEFS[primaryKind];
    const stepLabel = stepIndex === 0 ? "Match" : `Cascade ${stepIndex + 1}`;
    const hasNextCascade = stepIndex < result.cascadeSteps.length - 1;

    setCombat({
      ...state,
      mode: "board",
      board: step.boardBefore,
      boardMovesLeft: 0,
      boardTimeLeft: 0,
      selectedTileIndex: null,
      runeMoved: false,
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      lastMovedTileIds: [],
      newTileIds: [],
      matchedTileIds: step.matchedTileIds,
      isResolvingRunes: true,
      boardMessage: `${stepLabel}: ${step.matchedCount} ${primaryTile.label} rune${step.kindCounts[primaryKind] === 1 ? "" : "s"} ignite.`,
    });

    setTimeout(() => {
      setCombat(prev => prev ? {
        ...prev,
        board: step.boardAfter,
        matchedTileIds: [],
        newTileIds: step.spawnedTileIds,
        boardMessage: hasNextCascade
          ? `${stepLabel}: runes fall and trigger another combo.`
          : `${stepLabel}: runes fall into place.`,
      } : prev);

      setTimeout(() => {
        showResolvedBoardStep({
          ...state,
          board: step.boardAfter,
          matchedTileIds: [],
          newTileIds: [],
          isResolvingRunes: true,
        }, result, stepIndex + 1);
      }, RUNE_FALL_MS + (hasNextCascade ? CASCADE_PAUSE_MS : 0));
    }, MATCH_POP_MS);
  };

  const resolveBoardMove = (state: CombatState, movedBoard: BoardTile[]) => {
    const result = resolveBoard(movedBoard);

    if (result.matchedCount === 0) {
      const pendingStats = state.pendingCinematic || createEmptyCinematicStats();
      const nextState: CombatState = {
        ...state,
        mode: "board",
        board: movedBoard,
        boardMovesLeft: 0,
        boardTimeLeft: 0,
        selectedTileIndex: null,
        runeMoved: false,
        dragPointerId: null,
        dragTileId: null,
        dragTileKind: null,
        dragTileStatus: null,
        lastMovedTileIds: [],
        newTileIds: [],
        matchedTileIds: [],
        isResolvingRunes: false,
        pendingCinematic: pendingStats,
        boardMessage: "Rune sprint ended with no matches. Resolving combat.",
      };

      finalizeRuneRound(nextState, pendingStats);
      return;
    }

    showResolvedBoardStep({
      ...state,
      board: movedBoard,
      selectedTileIndex: null,
      runeMoved: false,
      dragPointerId: null,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      lastMovedTileIds: [],
      newTileIds: [],
      matchedTileIds: [],
      isResolvingRunes: true,
    }, result, 0);
  };

  const startRuneDrag = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!combat || combat.phase !== "answering" || combat.mode !== "board" || combat.isPaused || combat.isResolvingRunes) return;
    event.preventDefault();
    const heldTile = combat.board[index];
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setCombat({
      ...combat,
      selectedTileIndex: index,
      runeMoved: false,
      dragPointerId: event.pointerId,
      dragPointerX: event.clientX,
      dragPointerY: event.clientY,
      dragTileId: heldTile.id,
      dragTileKind: heldTile.kind,
      dragTileStatus: heldTile.status || null,
      boardMessage: `Rune held. ${formatBoardTime(combat.boardTimeLeft)} left in this sprint.`,
    });
  };

  const moveRuneDrag = (index: number) => {
    setCombat(prev => {
      if (!prev || prev.phase !== "answering" || prev.mode !== "board" || prev.selectedTileIndex === null || prev.selectedTileIndex === index) {
        return prev;
      }

      if (!areAdjacentTiles(prev.selectedTileIndex, index)) {
        return prev;
      }

      const fromTile = prev.board[prev.selectedTileIndex];
      const toTile = prev.board[index];

      return {
        ...prev,
        board: swapBoardTiles(prev.board, prev.selectedTileIndex, index),
        selectedTileIndex: index,
        runeMoved: true,
        lastMovedTileIds: [fromTile.id, toTile.id],
        boardMessage: `Keep routing. ${formatBoardTime(prev.boardTimeLeft)} left.`,
      };
    });
  };

  const handlePowerUp = (type: PowerUpType) => {
    const cost = POWER_UP_COSTS[type];
    if (!combat || combat.phase !== "answering" || combat.isResolvingRunes || combat.mode !== "boardReady" || combat.powerPoints < cost) return;
    const nextPowerPoints = combat.powerPoints - cost;

    if (type === "mend") {
      const healAmount = Math.min(20, combat.playerMaxHp - combat.playerHp);
      if (healAmount <= 0) return;
      const cleanse = clearRuneStatuses(combat.board, "cursed", 1);
      setCombat({
        ...combat,
        powerPoints: nextPowerPoints,
        board: cleanse.board,
        lastMovedTileIds: cleanse.changedIds,
        playerHp: combat.playerHp + healAmount,
        actionEffect: createCombatActionEffect("mend", "Mend", TILE_DEFS.heart.color, {
          kind: "heart",
          detail: `+${healAmount} HP`,
        }),
        eventNotices: appendCombatNotices(combat.eventNotices, [createCombatNotice("Mend", `${healAmount} HP restored${cleanse.changedIds.length > 0 ? ", curse cleansed" : ""}.`, "good")]),
        boardMessage: `Mend restored ${healAmount} HP${cleanse.changedIds.length > 0 ? " and cleansed 1 cursed rune" : ""}.`,
        flashColor: "rgba(46,204,113,0.18)",
      });
      return;
    }

    if (type === "shuffle") {
      const activeEnemy = combat.enemies[combat.currentEnemyIndex];
      const tunedShuffle = createTunedRuneShuffle(combat.board, activeEnemy?.def.weakTo || []);
      const preferredText = tunedShuffle.preferredKind && activeEnemy?.def.weakTo.includes(tunedShuffle.preferredKind)
        ? ` toward ${TILE_DEFS[tunedShuffle.preferredKind].label} weakness`
        : "";
      const setupText = tunedShuffle.immediateCombos > 0
        ? `${tunedShuffle.immediateCombos} ready combo${tunedShuffle.immediateCombos === 1 ? "" : "s"} / ${tunedShuffle.immediateMatched} runes`
        : `${tunedShuffle.productiveSwaps} promising follow-up swap${tunedShuffle.productiveSwaps === 1 ? "" : "s"}`;
      const shiftedText = tunedShuffle.convertedIds.length > 0
        ? ` Shifted ${tunedShuffle.convertedIds.length} rune${tunedShuffle.convertedIds.length === 1 ? "" : "s"}.`
        : "";
      const tumblerEnhancement = combat.runRelics.includes("runic_tumbler")
        ? setRandomRuneStatus(
            tunedShuffle.board,
            "enhanced",
            2,
            tunedShuffle.preferredKind ? { kind: tunedShuffle.preferredKind } : { excludeKinds: ["heart"] }
          )
        : { board: tunedShuffle.board, changedIds: [] };
      const tumblerText = tumblerEnhancement.changedIds.length > 0
        ? ` Runic Tumbler enhanced ${tumblerEnhancement.changedIds.length} rune${tumblerEnhancement.changedIds.length === 1 ? "" : "s"}.`
        : "";

      setCombat({
        ...combat,
        powerPoints: nextPowerPoints,
        board: tumblerEnhancement.board,
        selectedTileIndex: null,
        runeMoved: false,
        dragPointerId: null,
        dragTileId: null,
        dragTileKind: null,
        dragTileStatus: null,
        lastMovedTileIds: Array.from(new Set([...tunedShuffle.highlightIds, ...tumblerEnhancement.changedIds])),
        newTileIds: [],
        matchedTileIds: [],
        actionEffect: createCombatActionEffect("shuffle", "Shuffle", POWER_UP_DEFS.shuffle.color, {
          kind: tunedShuffle.preferredKind || "shadow",
          detail: setupText,
        }),
        eventNotices: appendCombatNotices(combat.eventNotices, [
          createCombatNotice("Shuffle", setupText, "neutral"),
          ...(tumblerEnhancement.changedIds.length > 0 ? [createCombatNotice("Relic: Runic Tumbler", `${tumblerEnhancement.changedIds.length} setup rune${tumblerEnhancement.changedIds.length === 1 ? "" : "s"} enhanced.`, "relic")] : []),
        ]),
        boardMessage: `Shuffle tuned the board${preferredText}: ${setupText}.${shiftedText}${tumblerText} No sprint time spent.`,
        flashColor: "rgba(176,120,255,0.16)",
      });
      return;
    }

    if (type === "surge") {
      const enhancement = setRandomRuneStatus(combat.board, "enhanced", 3, { excludeKinds: ["heart"] });
      setCombat({
        ...combat,
        powerPoints: nextPowerPoints,
        board: enhancement.board,
        lastMovedTileIds: enhancement.changedIds,
        activeBuffs: [...combat.activeBuffs, { type: "board_surge", remaining: 1 }],
        actionEffect: createCombatActionEffect("surge", "Surge", POWER_UP_DEFS.surge.color, {
          kind: "light",
          detail: `${enhancement.changedIds.length} runes charged`,
        }),
        eventNotices: appendCombatNotices(combat.eventNotices, [createCombatNotice("Surge", "Next match deals 60% more damage.", "warn")]),
        boardMessage: `Surge primed and enhanced ${enhancement.changedIds.length} attack rune${enhancement.changedIds.length === 1 ? "" : "s"}.`,
      });
      return;
    }

    setCombat({
      ...combat,
      powerPoints: nextPowerPoints,
      activeBuffs: [...combat.activeBuffs, { type: "ward", remaining: 1 }],
      actionEffect: createCombatActionEffect("ward", "Ward", POWER_UP_DEFS.ward.color, {
        kind: "tide",
        detail: "Next strike blocked",
      }),
      eventNotices: appendCombatNotices(combat.eventNotices, [createCombatNotice("Ward", "Next enemy counter will be blocked.", "good")]),
      boardMessage: "Ward will block the next enemy strike.",
    });
  };

  const handleRuneSkill = (skillId: string) => {
    const skill = getSkillById(skillId);
    if (!combat || !skill || combat.phase !== "answering" || combat.isResolvingRunes || combat.mode !== "boardReady" || combat.skillCharge < skill.cost) return;

    const nextSkillCharge = combat.skillCharge - skill.cost;
    const caster = getRunParty(save).find(member => member.skillId === skillId);
    const createSkillEffect = (kind: TileKind = skill.element, detail = skill.description) => createCombatActionEffect("skill", skill.name, TILE_DEFS[kind].color, {
      kind,
      detail,
      casterName: caster?.name,
      casterSprite: caster?.sprite,
    });

    if (skill.id === "convert_flame") {
      const conversion = convertRandomRunes(combat.board, "flame", 4);
      if (conversion.changedIds.length === 0) return;
      const enhancement = setRandomRuneStatus(conversion.board, "enhanced", 2, { kind: "flame" });
      const changedIds = Array.from(new Set([...conversion.changedIds, ...enhancement.changedIds]));

      setCombat({
        ...combat,
        skillCharge: nextSkillCharge,
        board: enhancement.board,
        lastMovedTileIds: changedIds,
        selectedTileIndex: null,
        actionEffect: createSkillEffect("flame", `${conversion.changedIds.length} runes converted`),
        eventNotices: appendCombatNotices(combat.eventNotices, [
          createCombatNotice(skill.name, `${conversion.changedIds.length} runes became Flame; ${enhancement.changedIds.length} enhanced.`, "neutral"),
        ]),
        boardMessage: `${skill.name} changed ${conversion.changedIds.length} runes to Flame and enhanced ${enhancement.changedIds.length}.`,
        flashColor: TILE_DEFS.flame.glow,
      });
      return;
    }

    if (skill.id === "steady_hand") {
      const nextBoardTime = Math.min(MAX_BOARD_TIME, Math.round((combat.boardTimeMax + BOARD_TIME_SKILL_BONUS) * 10) / 10);
      if (nextBoardTime === combat.boardTimeMax) return;
      const weakKind = getPreferredWeakKind(currentEnemy);
      const enhancement = weakKind
        ? setRandomRuneStatus(combat.board, "enhanced", 1, { kind: weakKind })
        : { board: combat.board, changedIds: [] };

      setCombat({
        ...combat,
        skillCharge: nextSkillCharge,
        board: enhancement.board,
        lastMovedTileIds: enhancement.changedIds,
        boardTimeMax: nextBoardTime,
        boardTimeLeft: nextBoardTime,
        actionEffect: createSkillEffect("light", `+${formatBoardTime(BOARD_TIME_SKILL_BONUS)} sprint time`),
        eventNotices: appendCombatNotices(combat.eventNotices, [
          createCombatNotice(skill.name, `+${formatBoardTime(BOARD_TIME_SKILL_BONUS)} sprint time${weakKind && enhancement.changedIds.length > 0 ? ` and 1 ${TILE_DEFS[weakKind].label} rune enhanced` : ""}.`, "good"),
        ]),
        boardMessage: `${skill.name} added ${formatBoardTime(BOARD_TIME_SKILL_BONUS)} to the rune sprint${weakKind && enhancement.changedIds.length > 0 ? ` and enhanced 1 ${TILE_DEFS[weakKind].label} rune` : ""}.`,
        flashColor: TILE_DEFS.light.glow,
      });
      return;
    }

    if (skill.id === "ward_word") {
      const cleanse = clearRuneStatuses(combat.board, "cursed", 3);
      setCombat({
        ...combat,
        skillCharge: nextSkillCharge,
        board: cleanse.board,
        lastMovedTileIds: cleanse.changedIds,
        activeBuffs: [...combat.activeBuffs, { type: "ward", remaining: 1 }],
        actionEffect: createSkillEffect("tide", "Ward raised"),
        eventNotices: appendCombatNotices(combat.eventNotices, [
          createCombatNotice(skill.name, `Ward raised${cleanse.changedIds.length > 0 ? `; ${cleanse.changedIds.length} curse${cleanse.changedIds.length === 1 ? "" : "s"} cleansed` : ""}.`, "good"),
        ]),
        boardMessage: `${skill.name} raised a Ward${cleanse.changedIds.length > 0 ? ` and cleansed ${cleanse.changedIds.length} cursed rune${cleanse.changedIds.length === 1 ? "" : "s"}` : ""}.`,
        flashColor: TILE_DEFS.tide.glow,
      });
      return;
    }

    if (skill.id === "verdant_shift") {
      const leafConversion = convertRandomRunes(combat.board, "leaf", 3);
      const heartConversion = convertRandomRunes(leafConversion.board, "heart", 2);
      const cleanse = clearRuneStatuses(heartConversion.board, "cursed", 2);
      const enhancement = setRandomRuneStatus(cleanse.board, "enhanced", 2, { kind: "heart" });
      const changedIds = Array.from(new Set([...leafConversion.changedIds, ...heartConversion.changedIds, ...cleanse.changedIds, ...enhancement.changedIds]));
      if (changedIds.length === 0) return;

      setCombat({
        ...combat,
        skillCharge: nextSkillCharge,
        board: enhancement.board,
        lastMovedTileIds: changedIds,
        selectedTileIndex: null,
        actionEffect: createSkillEffect("leaf", `${leafConversion.changedIds.length} Leaf, ${heartConversion.changedIds.length} Heart`),
        eventNotices: appendCombatNotices(combat.eventNotices, [
          createCombatNotice(skill.name, `${leafConversion.changedIds.length} Leaf, ${heartConversion.changedIds.length} Heart, ${cleanse.changedIds.length} cleansed.`, "good"),
        ]),
        boardMessage: `${skill.name} grew leaf and heart runes, cleansed ${cleanse.changedIds.length}, and enhanced ${enhancement.changedIds.length} hearts.`,
        flashColor: TILE_DEFS.leaf.glow,
      });
      return;
    }

    if (skill.id === "umbra_surge") {
      const conversion = convertRandomRunes(combat.board, "shadow", 4);
      if (conversion.changedIds.length === 0) return;
      const enhancement = setRandomRuneStatus(conversion.board, "enhanced", 3, { kind: "shadow" });
      const changedIds = Array.from(new Set([...conversion.changedIds, ...enhancement.changedIds]));

      setCombat({
        ...combat,
        skillCharge: nextSkillCharge,
        board: enhancement.board,
        lastMovedTileIds: changedIds,
        selectedTileIndex: null,
        activeBuffs: [...combat.activeBuffs, { type: "board_surge", remaining: 1 }],
        actionEffect: createSkillEffect("shadow", "Shadow surge primed"),
        eventNotices: appendCombatNotices(combat.eventNotices, [
          createCombatNotice(skill.name, `${conversion.changedIds.length} runes became Shadow; Surge primed.`, "warn"),
        ]),
        boardMessage: `${skill.name} changed runes to Shadow, enhanced ${enhancement.changedIds.length}, and primed Surge.`,
        flashColor: TILE_DEFS.shadow.glow,
      });
    }
  };

  const handleAnswer = (selectedOption: string) => {
    if (!combat || combat.phase !== "answering" || combat.mode !== "study") return;

    const isCorrect = combat.currentWord?.word === selectedOption;
    
    if (isCorrect) {
      handleCorrectAnswer(combat);
    } else {
      handleWrongAnswer(combat, selectedOption);
    }
  };

  const handleAbility = () => {
    if (!combat || combat.abilityUsed || combat.abilityCooldown > 0 || combat.mode === "study" || combat.mode === "commandReady" || combat.mode === "command" || combat.mode === "enemyAction" || combat.mode === "board" || combat.mode === "resolveReady" || combat.mode === "cinematic") return;
    
    const cls = getClassById(save.selectedClass);
    if (!cls) return;
    
    const newBuffs = [...combat.activeBuffs];
    
    const isRuneScreen = combat.mode === "boardReady";
    let nextBoardTimeMax = combat.boardTimeMax;
    let nextBoardTimeLeft = combat.boardTimeLeft;
    let nextFlameDiscount = combat.flameDiscountNext;
    let abilityDetail = cls.abilityDescription;
    let abilityTone: CombatNotice["tone"] = "neutral";

    if (cls.id === "linguist") {
      if (isRuneScreen) {
        nextBoardTimeMax = Math.min(MAX_BOARD_TIME, Math.round((combat.boardTimeMax + BOARD_TIME_SKILL_BONUS) * 10) / 10);
        nextBoardTimeLeft = nextBoardTimeMax;
        abilityDetail = `Steady Hand added ${formatBoardTime(BOARD_TIME_SKILL_BONUS)} to the rune sprint.`;
        abilityTone = "good";
      } else {
        newBuffs.push({ type: "study_head_start", remaining: 1 });
        abilityDetail = "Next study set begins with +1 AP already prepared.";
        abilityTone = "good";
      }
    } else if (cls.id === "speedreader") {
      nextFlameDiscount = true;
      abilityDetail = "Next Flame command costs 1 less AP.";
      abilityTone = "good";
    } else if (cls.id === "scholar") {
      newBuffs.push({ type: isRuneScreen ? "ward" : "reveal_answer", remaining: isRuneScreen ? 1 : 5 });
      abilityDetail = isRuneScreen ? "Ward will block the next enemy strike." : "Study answer help is primed.";
      abilityTone = "good";
    }
    
    setCombat({
      ...combat,
      abilityUsed: true,
      abilityCooldown: cls.abilityCooldown,
      activeBuffs: newBuffs,
      boardTimeMax: nextBoardTimeMax,
      boardTimeLeft: nextBoardTimeLeft,
      flameDiscountNext: nextFlameDiscount,
      actionEffect: createCombatActionEffect(
        cls.id === "speedreader" ? "surge" : cls.id === "scholar" && isRuneScreen ? "ward" : "skill",
        cls.abilityName,
        cls.id === "speedreader" ? POWER_UP_DEFS.surge.color : cls.id === "scholar" ? TILE_DEFS.tide.color : TILE_DEFS.light.color,
        {
          kind: cls.id === "speedreader" ? "flame" : cls.id === "scholar" ? "tide" : "light",
          detail: abilityDetail,
          casterName: cls.name,
          casterSprite: cls.sprite,
        }
      ),
      eventNotices: appendCombatNotices(combat.eventNotices, [
        createCombatNotice(cls.abilityName, abilityDetail, abilityTone),
      ]),
      boardMessage: cls.id === "speedreader"
        ? "Quickened Script discounted the next Flame command."
        : cls.id === "linguist"
          ? isRuneScreen ? `Steady Hand added ${formatBoardTime(BOARD_TIME_SKILL_BONUS)} to the rune sprint.` : "Next study set begins with +1 AP already prepared."
          : cls.id === "scholar" && isRuneScreen
            ? "Ward will block the next enemy strike."
            : combat.boardMessage,
    });
  };

  const beginCombatRun = (classId: string, draftDeck: VocabWord[], saveOverride: SaveData = save) => {
    const nextSave = { ...saveOverride, selectedClass: classId };
    const initial = createInitialCombat(1, STARTING_HP, nextSave, draftDeck);

    setSave(nextSave);
    setCombat(initial);
    setStarterDraftDeck([]);
    setStarterDraftChoices([]);
    setStarterDraftMessage("");
    setScreen("combat");

    if (getActiveDeck(nextSave).stats.totalRuns === 0) {
      setShowTutorial(true);
    }
  };

  const startRun = (classId: string) => {
    const nextSave = { ...save, selectedClass: classId };
    const studyLibrary = getStudyLibrary(nextSave);
    if (studyLibrary.length === 0) {
      setImportMessage("Add cards to this deck before starting a run.");
      setScreen("flashcards");
      return;
    }

    setSave(nextSave);
    setStarterDraftClassId(classId);
    setStarterDraftDeck(studyLibrary.length <= RUN_START_CARD_TARGET ? studyLibrary : []);
    setStarterDraftChoices(studyLibrary.length <= RUN_START_CARD_TARGET ? [] : createStarterDraftChoices(nextSave, []));
    setStarterDraftMessage(studyLibrary.length <= RUN_START_CARD_TARGET
      ? `This deck has ${studyLibrary.length} study card${studyLibrary.length === 1 ? "" : "s"}. Start with all available cards.`
      : "Choose your starting study cards for this run."
    );
    setScreen("starterDraft");
  };

  const handleStarterDraftPick = (card: VocabWord, rating: CardRating) => {
    const baseSave = updateCardProgressFromRating(save, card, rating);
    const nextDraft = rating === "known" || starterDraftDeck.some(existing => existing.id === card.id)
      ? starterDraftDeck
      : [...starterDraftDeck, card];

    setSave(baseSave);
    setStarterDraftDeck(nextDraft);

    if (rating !== "known" && nextDraft.length >= RUN_START_CARD_TARGET) {
      beginCombatRun(starterDraftClassId, nextDraft, baseSave);
      return;
    }

    const excludedIds = new Set(starterDraftChoices.map(choice => choice.id));
    excludedIds.delete(card.id);
    const nextChoices = createStarterDraftChoices(baseSave, nextDraft, excludedIds);
    setStarterDraftChoices(nextChoices);
    setStarterDraftMessage(rating === "known"
      ? "Marked known and replaced. Pick another starting card."
      : nextChoices.length > 0
        ? `${nextDraft.length}/${RUN_START_CARD_TARGET} starting cards chosen.`
        : `No more available cards. Start with ${nextDraft.length} card${nextDraft.length === 1 ? "" : "s"}.`
    );
  };

  const nextFloor = (deckOverride?: VocabWord[], saveOverride?: SaveData) => {
    if (!combat) return;
    const nextFloorNum = combat.floor + 1;
    const nextSave = saveOverride || save;
    const nextDeck = refillDeck(deckOverride || combat.deck, nextSave);
    const difficultyFloor = getDifficultyFloor(nextFloorNum, nextSave);
    const encounter = getEncounterForFloor(nextFloorNum);
    
    // Heal 20% between floors
    const healAmount = Math.floor(combat.playerMaxHp * 0.2);
    const newHp = Math.min(combat.playerMaxHp, combat.playerHp + healAmount);
    
    const enemyDefs = getEnemiesForFloor(nextFloorNum);
    const hpMult = getHpMultiplier(difficultyFloor);
    const timerMax = getQuestionTimerForFloor(difficultyFloor);
    const encounterBoard = createEncounterBoard(encounter);
    
    const enemies: EnemyInstance[] = enemyDefs.map(def => createEnemyInstance(def, hpMult, encounter));
    
    const word = drawWordFromDeck(nextDeck, nextSave, combat.currentWord?.id);
    const options = generateDistractors(word, getAllCards(nextSave));
    const nextRunParty = getRunParty(nextSave);
    
    setCombat({
      ...combat,
      deckId: getActiveDeckId(nextSave),
      floor: nextFloorNum,
      difficultyFloor,
      encounter,
      deck: nextDeck,
      rewardChoices: [],
      playerHp: newHp,
      combo: 0,
      currentEnemyIndex: 0,
      enemies,
      mode: "studyReady",
      board: encounterBoard.board,
      selectedTileIndex: null,
      runeMoved: false,
      boardMovesMax: MIN_BOARD_MOVES,
      boardMovesLeft: MIN_BOARD_MOVES,
      boardTimeMax: MIN_BOARD_TIME,
      boardTimeLeft: MIN_BOARD_TIME,
      lastMovedTileIds: encounterBoard.changedIds,
      newTileIds: [],
      matchedTileIds: [],
      isResolvingRunes: false,
      dragPointerId: null,
      dragPointerX: 0,
      dragPointerY: 0,
      dragTileId: null,
      dragTileKind: null,
      dragTileStatus: null,
      pendingCinematic: null,
      cinematic: null,
      cinematicStepIndex: 0,
      relicChoices: [],
      combatLog: [],
      eventNotices: encounter.modifierLabel === "Standard"
        ? []
        : [createCombatNotice(encounter.title, encounter.modifierDescription, encounter.isBoss ? "bad" : "warn")],
      powerPoints: 0,
      actionPoints: 0,
      actionPointsEarnedThisRush: 0,
      studyApOfferedThisRush: 0,
      studyApGoal: STUDY_RUSH_AP_CAP,
      actionPointsSpentThisWindow: 0,
      actionPointCarryCap: combat.actionPointCarryCap || 0,
      enemyActionPoints: 0,
      enemyActionPointsSpentThisTurn: 0,
      turnQueue: buildTurnQueue(nextRunParty, enemies),
      activeActorId: null,
      exposedTurns: 0,
      healedOrDefendedThisWindow: false,
      apPenaltyNextRush: 0,
      nextStudyShuffle: false,
      flameDiscountNext: false,
      fragileDebuff: 0,
      boardMessage: encounter.modifierLabel === "Standard"
        ? `${encounter.title}. Study first, then spend AP on party commands.`
        : `${encounter.title}: ${encounter.modifierDescription}`,
      studyQuestionsTotal: 0,
      studyQuestionsLeft: 0,
      studyCorrectRound: 0,
      studyWrongRound: 0,
      studyBoardTimeBonus: 0,
      currentWord: word,
      options,
      timerMax,
      timerLeft: timerMax,
      phase: "answering",
      abilityUsed: false,
      activeBuffs: [],
      damageNumbers: [],
      enemyAnim: null,
      playerAnim: null,
      screenShake: 0,
      flashColor: "",
      showPhaseBanner: null,
    });
    
    setScreen("combat");
  };

  const claimRewardCard = (rewardWord: VocabWord, rating: CardRating) => {
    if (!combat) return;
    if (combat.relicChoices.length > 0) {
      setCombat({
        ...combat,
        boardMessage: "Choose a relic before adding the next card.",
      });
      return;
    }

    if (rating === "known") {
      const nextSave = updateCardProgressFromRating(save, rewardWord, rating);
      const excludedIds = new Set(combat.rewardChoices.map(card => card.id));
      const replacement = createRewardChoices(nextSave, combat.deck, combat.difficultyFloor, excludedIds)[0];
      const nextChoices = combat.rewardChoices
        .map(card => card.id === rewardWord.id ? replacement : card)
        .filter((card): card is VocabWord => Boolean(card));

      setSave(nextSave);
      setCombat({
        ...combat,
        rewardChoices: nextChoices,
      });
      return;
    }

    const orbsEarned = combat.floor * 10;
    const alreadyInDeck = combat.deck.some(card => card.id === rewardWord.id);
    const nextSave = updateCardProgressFromRating({
      ...save,
      wisdomOrbs: save.wisdomOrbs + orbsEarned,
    }, rewardWord, rating);
    const nextDeck = !alreadyInDeck
      ? [...combat.deck, rewardWord]
      : combat.deck;

    setSave(nextSave);

    nextFloor(nextDeck, nextSave);
  };

  const claimRelic = (relic: RelicDef) => {
    if (!combat) return;
    const nextRelics = Array.from(new Set([...combat.runRelics, relic.id]));
    setSave(prev => updateActiveDeck(prev, deck => ({
      ...deck,
      unlockedRelicIds: Array.from(new Set([...(deck.unlockedRelicIds || []), relic.id])),
      relicHistory: [...(deck.relicHistory || []), relic.id].slice(-50),
    })));
    setCombat({
      ...combat,
      runRelics: nextRelics,
      relicChoices: [],
      boardMessage: `${relic.name} added to this run.`,
    });
  };

  const exportSaveBackup = () => {
    const backup = createSaveBackup(save);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createBackupFilename(save);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMessage(`Exported ${save.decks.length} deck${save.decks.length === 1 ? "" : "s"} and all progress.`);
  };

  const restoreSaveBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const restoredSave = parseSaveBackup(text);
      if (!confirm("Restore this backup? This replaces the decks and progress saved in this browser.")) return;
      setSave(restoredSave);
      setCombat(null);
      setStarterDraftDeck([]);
      setStarterDraftChoices([]);
      setStarterDraftMessage("");
      setImportText("");
      setImportMessage("");
      setBackupMessage(`Restored ${restoredSave.decks.length} deck${restoredSave.decks.length === 1 ? "" : "s"} from backup.`);
      setScreen("flashcards");
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Could not restore that backup file.");
    }
  };

  const handleImportCards = () => {
    const activeDeck = getActiveDeck(save);
    const result = parseFlashcardImport(importText, getAllCards(save));

    if (result.cards.length === 0) {
      setImportMessage(result.invalid > 0 ? "No new cards found. Check that each line has a term and definition." : "Paste cards first.");
      return;
    }
    const openSlots = Math.max(0, MAX_DECK_CARDS - activeDeck.cards.length);
    if (openSlots <= 0) {
      setImportMessage(`${activeDeck.name} is at the ${MAX_DECK_CARDS.toLocaleString()} card cap.`);
      return;
    }
    const acceptedCards = result.cards.slice(0, openSlots);

    setSave(prev => updateActiveDeck(prev, deck => ({
      ...deck,
      cards: [...deck.cards, ...acceptedCards].slice(0, MAX_DECK_CARDS),
    })));
    setImportText("");
    setImportMessage(`Imported ${acceptedCards.length} cards into ${activeDeck.name}${result.cards.length > acceptedCards.length ? `, stopped at the ${MAX_DECK_CARDS.toLocaleString()} card cap` : ""}${result.skipped ? `, skipped ${result.skipped} duplicates` : ""}${result.invalid ? `, ignored ${result.invalid} lines` : ""}.`);
  };

  const removeImportedCard = (cardId: string) => {
    setSave(prev => {
      return updateActiveDeck(prev, deck => {
        const nextRatings = { ...(deck.cardRatings || {}) };
        const nextProgress = { ...(deck.cardProgress || {}) };
        delete nextRatings[cardId];
        delete nextProgress[cardId];

        return {
          ...deck,
          cards: deck.cards.filter(card => card.id !== cardId),
          cardRatings: nextRatings,
          cardProgress: nextProgress,
        };
      });
    });
  };

  const rateCard = (cardId: string, rating: CardRating) => {
    const card = getAllCards(save).find(candidate => candidate.id === cardId);
    if (!card) return;
    setSave(prev => updateCardProgressFromRating(prev, card, rating));
  };

  const createDeck = () => {
    const name = newDeckName.trim() || `Deck ${save.decks.length + 1}`;
    const deck = createSavedDeck(name, []);
    setSave(prev => ({
      ...prev,
      selectedDeckId: deck.id,
      decks: [...prev.decks, deck],
    }));
    setNewDeckName("");
    setImportMessage(`Created ${deck.name}. Import cards to start a run.`);
    setScreen("flashcards");
  };

  const selectDeck = (deckId: string) => {
    setSave(prev => ({
      ...prev,
      selectedDeckId: deckId,
    }));
    setImportMessage("");
  };

  const deleteDeck = (deckId: string) => {
    if (save.decks.length <= 1) {
      setImportMessage("Keep at least one deck.");
      return;
    }

    setSave(prev => {
      const nextDecks = prev.decks.filter(deck => deck.id !== deckId);
      return {
        ...prev,
        decks: nextDecks,
        selectedDeckId: prev.selectedDeckId === deckId ? nextDecks[0].id : prev.selectedDeckId,
      };
    });
  };

  const goToMenu = () => {
    setCombat(null);
    setStarterDraftDeck([]);
    setStarterDraftChoices([]);
    setStarterDraftMessage("");
    setScreen("menu");
  };

  // ─── Render Helpers ───────────────────────────────────
  const currentEnemy = combat?.enemies[combat.currentEnemyIndex];
  const currentEnemyPlanContext = combat ? getEnemyPlanContext(combat) : undefined;
  const currentEnemyIntent = currentEnemy ? getEnemyIntentDetail(currentEnemy, currentEnemyPlanContext) : null;
  const currentEnemyPuzzle = getEnemyPuzzleHint(currentEnemy);
  const currentEnemyIntentIcon = getEnemyIntentIcon(currentEnemy, currentEnemyPlanContext);
  const currentEnemyIntentShort = getEnemyIntentShortLabel(currentEnemy, currentEnemyPlanContext);
  const activeDeck = getActiveDeck(save);
  const activeDeckStats = activeDeck.stats || createDeckStats();
  const activeDeckCards = activeDeck.cards.length;
  const selectedClass = getClassById(save.selectedClass);
  const runParty = getRunParty(save);
  const showLegacyCinematicScreen: boolean = false;
  const accuracy = combat && (combat.correctCount + combat.wrongCount) > 0
    ? Math.round((combat.correctCount / (combat.correctCount + combat.wrongCount)) * 100)
    : 0;
  const studyAnswered = combat ? combat.studyQuestionsTotal : 0;
  const isRuneBoardLive = combat?.mode === "board" && combat.phase === "answering" && !combat.isPaused && !combat.isResolvingRunes;
  const canUsePowerUps = !!combat && combat.phase === "answering" && combat.mode === "boardReady" && !combat.isResolvingRunes;
  const canUseRuneSkills = !!combat && combat.phase === "answering" && combat.mode === "boardReady" && !combat.isPaused && !combat.isResolvingRunes;
  const currentCardPower = combat?.currentWord ? getProjectedCorrectAnswerAp(combat, save) : 0;
  const currentCardStake = combat?.currentWord ? getProjectedStudyCardAp(combat, save) : 0;
  const currentCardFocusBonus = combat?.currentWord ? getFocusBonusForCorrectCard(combat.currentWord) : 0;
  const currentStudyApCap = combat ? getStudyRushApCap(combat) : STUDY_RUSH_AP_CAP;
  const activeTurnActor = combat ? getCurrentActor(combat) : null;
  const activeCommandCharacter = getActorCharacter(activeTurnActor, runParty);
  const activeCommandSkill = activeCommandCharacter ? getSkillById(activeCommandCharacter.skillId) : null;
  const apCombatMode = Boolean(combat && ["studyReady", "study", "commandReady", "command", "enemyAction"].includes(combat.mode));
  const activeCinematic = combat?.cinematic;
  const preparedPreview = combat?.pendingCinematic && currentEnemy && !currentEnemy.isDead
    ? resolveEnemyDefense(currentEnemy, combat.pendingCinematic, combat.runRelics)
    : null;
  const resolvePreviewLines = combat && currentEnemy && preparedPreview
    ? buildResolvePreviewLines(combat, currentEnemy, preparedPreview)
    : [];
  const cinematicPrimaryKind = activeCinematic
    ? getPrimaryCinematicKind(activeCinematic)
    : "flame";
  const cinematicPrimaryTile = TILE_DEFS[cinematicPrimaryKind];
  const cinematicTimeline = activeCinematic ? buildCombatTimeline(activeCinematic) : [];
  const cinematicAttackKinds = getCinematicAttackKinds(activeCinematic);
  const cinematicRuneStreamKinds = getCinematicRuneStreamKinds(activeCinematic);
  const inlineCinematicKinds = activeCinematic
    ? Array.from(new Set([...cinematicAttackKinds, ...TILE_KINDS.filter(kind => kind !== "heart" && (activeCinematic.runeCounts[kind] || 0) > 0)]))
    : [];
  const cinematicHasTeamEcho = Boolean(activeCinematic?.attackers.includes("Team echo"));
  const cinematicOutgoingDamage = (activeCinematic?.damage || 0) + (activeCinematic?.shieldDamage || 0);
  const cinematicEnemyHpScale = activeCinematic
    ? Math.max(activeCinematic.enemyHpBefore, activeCinematic.enemyHpAfter, 1)
    : 1;
  const cinematicEnemyHpBeforePct = activeCinematic
    ? Math.max(0, Math.min(100, (activeCinematic.enemyHpBefore / cinematicEnemyHpScale) * 100))
    : 0;
  const cinematicEnemyHpAfterPct = activeCinematic
    ? Math.max(0, Math.min(100, (activeCinematic.enemyHpAfter / cinematicEnemyHpScale) * 100))
    : 0;
  const activeCinematicStepIndex = activeCinematic
    ? Math.min(combat?.cinematicStepIndex || 0, Math.max(0, cinematicTimeline.length - 1))
    : 0;
  const activeCinematicStep = cinematicTimeline[activeCinematicStepIndex];
  const cinematicCanAdvanceTimeline = activeCinematicStepIndex < cinematicTimeline.length - 1;
  const cinematicShowsSpell = Boolean(activeCinematic && (activeCinematic.matchedCount > 0 || cinematicOutgoingDamage > 0 || activeCinematic.heal > 0));
  const cinematicShowsEnemyResponse = Boolean(activeCinematic && (activeCinematic.enemyDamage > 0 || activeCinematic.wardBlocked));
  const cinematicPlayerClass = activeCinematic && activeCinematic.heal > 0 ? "player-heal" : "";
  const cinematicEnemyClass = activeCinematic && cinematicOutgoingDamage > 0
      ? "enemy-hit"
      : "";

  // Filter wrong answers if scholar buff is active
  const filteredOptions = combat?.activeBuffs.some(b => b.type === "reveal_answer")
    ? combat.options.filter((opt, i) => opt === combat.currentWord?.word || i < 3)
    : combat?.options || [];
  const hasBoardSurge = combat?.activeBuffs.some(b => b.type === "board_surge") || false;
  const hasWard = combat?.activeBuffs.some(b => b.type === "ward") || false;
  const enhancedRuneCount = combat?.board.filter(tile => tile.status === "enhanced").length || 0;
  const cursedRuneCount = combat?.board.filter(tile => tile.status === "cursed").length || 0;
  const enemyApBudget = currentEnemy ? getEnemyApForTurn(currentEnemy) : 0;
  const enemyApSpentDisplay = combat?.mode === "enemyAction" ? combat.enemyActionPointsSpentThisTurn : 0;
  const enemyApBudgetDisplay = combat?.mode === "enemyAction" && combat.enemyActionPoints > 0
    ? combat.enemyActionPoints
    : enemyApBudget;

  // ─── RENDER: Main Menu ────────────────────────────────
  if (screen === "menu") {
    return (
      <div className="cute-theme relative h-screen w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={assetBackground("/bg_menu_blob.png")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/10 via-transparent to-teal-700/20" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-[#fff1a8]/60 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
          {/* Title */}
          <div className="mb-2">
            <h1 
              className="text-5xl md:text-7xl font-bold text-center tracking-wider"
              style={{ 
                color: "#fff9d6",
                textShadow: "0 3px 0 rgba(30,141,151,0.46), 0 8px 18px rgba(18,91,115,0.24)",
                fontFamily: "Nunito, Inter, sans-serif"
              }}
            >
              LEXICON
            </h1>
            <h1 
              className="text-4xl md:text-6xl font-bold text-center tracking-widest -mt-2"
              style={{ 
                color: "#ff7895",
                textShadow: "0 3px 0 rgba(175,70,109,0.42), 0 8px 18px rgba(18,91,115,0.2)",
                fontFamily: "Nunito, Inter, sans-serif"
              }}
            >
              LABYRINTH
            </h1>
          </div>
          
          <p className="mb-8 text-lg font-bold tracking-wide text-teal-950" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.65)" }}>
            Master Words. Conquer Dungeons.
          </p>
          <div className="mb-4 rounded-lg border border-teal-700/20 bg-white/80 px-4 py-2 text-sm font-bold text-teal-900 shadow-lg backdrop-blur-sm">
            Deck: <span className="font-black text-teal-950">{activeDeck.name}</span> · {activeDeckCards.toLocaleString()} / {MAX_DECK_CARDS.toLocaleString()} cards
          </div>
          
          {/* Play Button */}
          <button
            onClick={() => setScreen("classSelect")}
            className="group relative mb-6 max-w-[calc(100vw-2rem)] rounded-lg border border-teal-700/20 bg-[#ff7895] px-5 py-4 text-base font-black text-white shadow-[0_10px_0_rgba(184,78,117,0.72),0_18px_30px_rgba(18,91,115,0.18)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#ff8fa6] sm:px-12 sm:text-xl"
          >
            <span className="flex items-center gap-3">
              <Sword className="w-6 h-6" />
              ENTER THE DUNGEON
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          
          {/* Menu buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <button
              onClick={() => setScreen("howToPlay")}
              className="flex items-center gap-2 rounded-lg border border-teal-700/15 bg-white/80 px-6 py-3 font-bold text-teal-950 shadow-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              <HelpCircle className="w-5 h-5" />
              How to Play
            </button>
            <button
              onClick={() => setScreen("flashcards")}
              className="flex items-center gap-2 rounded-lg border border-teal-700/15 bg-white/80 px-6 py-3 font-bold text-teal-950 shadow-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              <FileText className="w-5 h-5 text-cyan-300" />
              Flashcards
            </button>
            <button
              onClick={() => setScreen("meta")}
              className="flex items-center gap-2 rounded-lg border border-teal-700/15 bg-white/80 px-6 py-3 font-bold text-teal-950 shadow-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              <Star className="w-5 h-5 text-yellow-400" />
              Upgrades
            </button>
          </div>
          
          {/* Stats bar */}
          <div className="absolute bottom-6 flex items-center gap-6 rounded-full border border-teal-700/15 bg-white/76 px-4 py-2 text-sm font-bold text-teal-900 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <img src={assetUrl("/wisdom_orb_blob.svg")} alt="" className="h-5 w-5" />
              <span>{save.wisdomOrbs}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Best: Floor {activeDeckStats.bestFloor}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>{activeDeckStats.totalCorrect} words</span>
            </div>
          </div>
          
          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all"
          >
            {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: How to Play ──────────────────────────────
  if (screen === "howToPlay") {
    return (
      <div className="relative h-screen w-full overflow-auto bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={assetBackground("/bg_combat_blob.png")} />
        <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4 py-6 sm:px-6">
          <div className="w-full max-w-3xl rounded-lg border border-[#0F3460] bg-[#16213E]/90 p-5 backdrop-blur-sm sm:p-8">
            <h2 className="text-3xl font-bold text-white mb-6 text-center" style={{ fontFamily: "Cinzel, Georgia, serif" }}>How to Play</h2>
            
            <div className="grid gap-4 text-gray-300 sm:grid-cols-2">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-500/20 rounded-lg"><BookOpen className="w-6 h-6 text-green-400" /></div>
                <div>
                  <h3 className="text-white font-semibold">Study Set</h3>
                  <p className="text-sm">Resolve a fixed AP hand of flashcards. Misses show the correct answer but permanently lose that card's AP.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg"><Zap className="w-6 h-6 text-yellow-400" /></div>
                <div>
                  <h3 className="text-white font-semibold">Performance Matters</h3>
                  <p className="text-sm">Correct answers earn AP. Hard cards are worth more, so difficult cards can open commands sooner.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-orange-500/20 rounded-lg"><Flame className="w-6 h-6 text-orange-400" /></div>
                <div>
                  <h3 className="text-white font-semibold">Party Commands</h3>
                  <p className="text-sm">Spend AP on Attack, Defend, or character skills. Each action advances that actor on the timeline.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-500/20 rounded-lg"><Skull className="w-6 h-6 text-red-400" /></div>
                <div>
                  <h3 className="text-white font-semibold">Enemy Intent</h3>
                  <p className="text-sm">Watch the timeline and intent hint. Some enemies punish low AP spend, missed healing, or poor timing.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg"><Shield className="w-6 h-6 text-cyan-300" /></div>
                <div>
                  <h3 className="text-white font-semibold">Weakness & Shields</h3>
                  <p className="text-sm">Weak elements amplify damage. Shield breaks delay the counter and charge Focus.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500/20 rounded-lg"><Star className="w-6 h-6 text-purple-400" /></div>
                <div>
                  <h3 className="text-white font-semibold">Deck Progression</h3>
                  <p className="text-sm">Each deck has its own party unlocks, relic history, best floor, and scaling pace.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setScreen("menu")}
              className="mt-6 w-full py-3 bg-[#0F3460] hover:bg-[#1a4a7a] rounded-lg text-white font-semibold transition-all"
            >
              Got it!
            </button>
          </div>
        </div>

      </div>
    );
  }

  // ─── RENDER: Class Select ─────────────────────────────
  if (screen === "flashcards") {
    const knownCount = Object.values(activeDeck.cardRatings).filter(rating => rating === "known").length;
    const ratedCount = Object.keys(activeDeck.cardRatings).length;
    const studyCount = getStudyLibrary(save).length;

    return (
      <div className="relative w-full h-screen overflow-hidden bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={assetBackground("/bg_menu_blob.png")} />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#0F3460]">
            <button
              onClick={() => setScreen("menu")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back
            </button>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Cinzel, Georgia, serif" }}>Flashcards</h2>
            <div className="flex items-center gap-2 text-cyan-300">
              <Layers className="w-5 h-5" />
              <span className="font-bold">{activeDeckCards}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-6 max-w-6xl mx-auto">
              <section className="bg-[#16213E] rounded-lg border border-[#0F3460] p-5">
                <div className="mb-5 rounded-lg border border-[#0F3460] bg-[#0B1024]/80 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-cyan-300" />
                    <h3 className="text-lg font-bold text-white">Decks</h3>
                  </div>
                  <div className="mb-3 grid gap-2">
                    {save.decks.map(deck => {
                      const isSelected = deck.id === activeDeck.id;
                      return (
                        <button
                          key={deck.id}
                          onClick={() => selectDeck(deck.id)}
                          className={`rounded-md border px-3 py-2 text-left transition-all ${isSelected ? "border-cyan-300 bg-cyan-400/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white">{deck.name}</span>
                            <span className="text-xs text-gray-400">{deck.cards.length.toLocaleString()} cards</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">Best floor {deck.stats.bestFloor} · {deck.stats.totalCorrect} correct</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newDeckName}
                      onChange={event => setNewDeckName(event.target.value)}
                      placeholder="New deck name"
                      className="min-w-0 flex-1 rounded-md border border-[#0F3460] bg-[#071225] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={createDeck}
                      className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-cyan-500"
                    >
                      New
                    </button>
                  </div>
                  {save.decks.length > 1 && (
                    <button
                      onClick={() => deleteDeck(activeDeck.id)}
                      className="mt-3 flex items-center gap-2 text-xs font-bold text-red-300 transition-all hover:text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete selected deck
                    </button>
                  )}
                </div>

                <div className="mb-5 rounded-lg border border-[#0F3460] bg-[#0B1024]/80 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Download className="h-5 w-5 text-yellow-300" />
                    <h3 className="text-lg font-bold text-white">Backup & Restore</h3>
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-gray-400">
                    Export a save file with every deck, card rating, unlock, relic, and run stat. Restore it on another browser to keep playing there.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={exportSaveBackup}
                      className="flex items-center justify-center gap-2 rounded-md border border-yellow-300/40 bg-yellow-400/12 px-3 py-2 text-sm font-bold text-yellow-100 transition-all hover:bg-yellow-400/20"
                    >
                      <Download className="h-4 w-4" />
                      Export Save
                    </button>
                    <button
                      onClick={() => backupInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 rounded-md border border-cyan-300/40 bg-cyan-400/12 px-3 py-2 text-sm font-bold text-cyan-100 transition-all hover:bg-cyan-400/20"
                    >
                      <Upload className="h-4 w-4" />
                      Restore Save
                    </button>
                  </div>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={restoreSaveBackup}
                    className="hidden"
                  />
                  {backupMessage && (
                    <div className="mt-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
                      {backupMessage}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5 text-cyan-300" />
                  <h3 className="text-lg font-bold text-white">Import to {activeDeck.name}</h3>
                </div>
                
                <textarea
                  value={importText}
                  onChange={event => {
                    setImportText(event.target.value);
                    setImportMessage("");
                  }}
                  placeholder={"bonjour\thello\nau revoir\tgoodbye\nmerci - thank you"}
                  className="w-full h-56 resize-none rounded-lg border border-[#0F3460] bg-[#0B1024] p-4 text-sm text-white placeholder:text-gray-600 outline-none focus:border-cyan-400"
                />
                
                <button
                  onClick={handleImportCards}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Import to Deck
                </button>
                
                {importMessage && (
                  <div className="mt-3 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                    {importMessage}
                  </div>
                )}
              </section>

              <section className="min-h-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-[#16213E] rounded-lg p-4 border border-[#0F3460]">
                    <div className="text-2xl font-bold text-white">{activeDeckCards.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Cards</div>
                  </div>
                  <div className="bg-[#16213E] rounded-lg p-4 border border-[#0F3460]">
                    <div className="text-2xl font-bold text-white">{studyCount}</div>
                    <div className="text-xs text-gray-500">Study Pool</div>
                  </div>
                  <div className="bg-[#16213E] rounded-lg p-4 border border-[#0F3460]">
                    <div className="text-2xl font-bold text-white">{ratedCount}</div>
                    <div className="text-xs text-gray-500">Rated</div>
                  </div>
                  <div className="bg-[#16213E] rounded-lg p-4 border border-[#0F3460]">
                    <div className="text-2xl font-bold text-white">{MAX_DECK_CARDS.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Card Cap</div>
                  </div>
                </div>

                <div className="bg-[#16213E] rounded-lg border border-[#0F3460] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#0F3460]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-cyan-300" />
                      <h3 className="text-lg font-bold text-white">{activeDeck.name} Library</h3>
                    </div>
                    <span className="text-xs text-gray-500">{knownCount} known</span>
                  </div>

                  <div className="max-h-[52vh] overflow-auto">
                    {activeDeck.cards.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                        <p>No cards in this deck yet.</p>
                      </div>
                    ) : (
                      [...activeDeck.cards].reverse().map(card => {
                        const currentRating = activeDeck.cardRatings?.[card.id];

                        return (
                          <div key={card.id} className="border-b border-[#0F3460]/70 p-4 last:border-b-0">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-white font-bold">{card.word}</div>
                                <div className="text-sm text-gray-400">{card.definition}</div>
                              </div>
                              <button
                                onClick={() => removeImportedCard(card.id)}
                                className="self-start p-2 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-all"
                                title="Remove card"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {CARD_RATINGS.map(rating => {
                                const isSelected = currentRating === rating.id;

                                return (
                                  <button
                                    key={rating.id}
                                    onClick={() => rateCard(card.id, rating.id)}
                                    className="px-3 py-1.5 rounded-md border text-xs font-bold transition-all"
                                    style={{
                                      borderColor: rating.color,
                                      color: isSelected ? "#0B1024" : rating.color,
                                      backgroundColor: isSelected ? rating.color : `${rating.color}18`,
                                    }}
                                  >
                                    {rating.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

      </div>
    );
  }

  if (screen === "starterDraft") {
    const selectedDraftClass = getClassById(starterDraftClassId);
    const canStartDraftRun = starterDraftDeck.length > 0;

    return (
      <div className="relative min-h-[100dvh] w-full overflow-y-auto bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-55" style={assetBackground("/bg_menu_blob.png")} />
        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-5 sm:py-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setScreen("classSelect")}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-gray-300 transition-all hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </button>
            <div className="text-right">
              <div className="text-xs text-gray-500">Deck</div>
              <div className="font-bold text-white">{activeDeck.name}</div>
            </div>
          </div>

          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "Cinzel, Georgia, serif" }}>
              Choose Starting Cards
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Pick {RUN_START_CARD_TARGET} vocab cards for this run. The rest can appear as rewards later.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
            <div className="rounded-lg border border-[#0F3460] bg-[#16213E]/90 p-4">
              <div className="mb-3 flex items-center gap-3">
                <img src={assetUrl(selectedDraftClass?.sprite)} alt="" className="h-14 w-14 object-contain" />
                <div>
                  <div className="font-bold text-white">{selectedDraftClass?.name}</div>
                  <div className="text-xs text-gray-500">{starterDraftDeck.length}/{RUN_START_CARD_TARGET} chosen</div>
                </div>
              </div>
              <div className="space-y-2">
                {starterDraftDeck.map(card => (
                  <div key={card.id} className="rounded-md bg-black/25 px-3 py-2">
                    <div className="truncate text-sm font-bold text-white">{card.word}</div>
                    <div className="truncate text-xs text-gray-500">{card.definition}</div>
                  </div>
                ))}
                {starterDraftDeck.length === 0 && (
                  <div className="rounded-md border border-dashed border-white/10 p-3 text-center text-sm text-gray-500">
                    No cards chosen yet.
                  </div>
                )}
              </div>
              <button
                onClick={() => beginCombatRun(starterDraftClassId, starterDraftDeck)}
                disabled={!canStartDraftRun}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#E94560] py-3 font-bold text-white transition-all hover:bg-[#ff5b72] disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                <Sword className="h-4 w-4" />
                Start Run
              </button>
            </div>

            <div className="rounded-lg border border-[#0F3460] bg-[#071225]/90 p-4">
              <div className="mb-4 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                {starterDraftMessage}
              </div>

              {starterDraftChoices.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {starterDraftChoices.map(choice => {
                    const rarityColor = choice.difficulty <= 2 ? "#95A5A6" : choice.difficulty <= 4 ? "#3498DB" : "#9B59B6";
                    return (
                      <div key={choice.id} className="rounded-lg border-2 bg-[#16213E] p-4" style={{ borderColor: rarityColor }}>
                        <div className="mb-1 text-xs" style={{ color: rarityColor }}>
                          Starting Card
                        </div>
                        <div className="mb-1 text-lg font-bold text-white">{choice.word}</div>
                        <div className="mb-4 text-xs text-gray-400">{choice.definition}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {CARD_RATINGS.map(rating => (
                            <button
                              key={rating.id}
                              onClick={() => handleStarterDraftPick(choice, rating.id)}
                              className="rounded-md border px-2 py-2 text-xs font-bold transition-all hover:scale-[1.03]"
                              style={{
                                borderColor: rating.color,
                                color: rating.color,
                                backgroundColor: `${rating.color}18`,
                              }}
                            >
                              {rating.shortLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-white/10 text-center text-gray-500">
                  <div>
                    <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                    <p>Ready to start with the selected cards.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "classSelect") {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-y-auto bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-58" style={assetBackground("/bg_menu_blob.png")} />
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-start px-4 py-6 sm:justify-center">
          <h2 className="mb-5 text-2xl font-bold text-white sm:mb-8 sm:text-3xl" style={{ fontFamily: "Cinzel, Georgia, serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            Choose Your Class
          </h2>
          <div className="mb-5 rounded-lg border border-cyan-400/30 bg-black/35 px-4 py-2 text-sm text-cyan-100">
            Running deck: <span className="font-bold text-white">{activeDeck.name}</span>
          </div>
          
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {CLASSES.map(cls => {
              const isUnlocked = getDeckUnlockedClasses(activeDeck).includes(cls.id);
              return (
                <div
                  key={cls.id}
                  className={`relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                    isUnlocked
                      ? "border-[#0F3460] hover:border-[#E94560] hover:scale-105 cursor-pointer bg-[#16213E]/90"
                      : "border-gray-700 bg-gray-900/80 opacity-70"
                  }`}
                  onClick={() => isUnlocked && startRun(cls.id)}
                >
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                      <div className="text-center">
                        <Lock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">{cls.unlockRequirement}</p>
                        <p className="text-yellow-400 text-sm">{cls.unlockCost} orbs</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex h-32 items-center justify-center bg-gradient-to-b from-[#0F3460]/50 to-transparent sm:h-48">
                    <img src={assetUrl(cls.sprite)} alt={cls.name} className="h-28 object-contain drop-shadow-lg sm:h-40" />
                  </div>
                  
                  <div className="p-4 sm:p-5">
                    <h3 className="mb-1 text-lg font-bold text-white sm:text-xl">{cls.name}</h3>
                    <p className="mb-3 text-sm text-gray-400">{cls.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">{cls.abilityName}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{cls.abilityDescription}</p>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-400 text-xs">{cls.passiveDescription}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => setScreen("menu")}
            className="mt-6 flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-white transition-all hover:bg-white/20 sm:mt-8"
          >
            <Home className="w-5 h-5" />
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Combat ───────────────────────────────────
  if (screen === "combat" && combat) {
    return (
      <div
        className="cute-theme relative h-[100dvh] w-full select-none overflow-hidden"
        style={{
          transform: combat.screenShake > 0 
            ? `translate(${(Math.random()-0.5)*combat.screenShake}px, ${(Math.random()-0.5)*combat.screenShake}px)` 
            : "none",
          transition: "transform 0.05s",
        }}
      >
        {/* Flash overlay */}
        {combat.flashColor && (
          <div className="absolute inset-0 z-50 pointer-events-none" style={{ backgroundColor: combat.flashColor }} />
        )}
        
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={assetBackground("/bg_combat_blob.png")}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(7,62,80,0.46), rgba(10,82,96,0.38), rgba(7,62,80,0.58))" }}
        />
        
        {/* Phase Banner */}
        {combat.showPhaseBanner && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <div className="text-5xl font-bold text-red-500 animate-pulse" style={{ textShadow: "0 0 30px rgba(233,69,96,0.8), 0 4px 8px rgba(0,0,0,0.8)" }}>
              {combat.showPhaseBanner}
            </div>
          </div>
        )}

        {combat.eventNotices.length > 0 && (
          <div className="combat-notice-stack pointer-events-none absolute right-2 top-12 z-40 flex w-[min(54vw,220px)] flex-col gap-1 sm:left-1/2 sm:right-auto sm:top-16 sm:w-[min(92vw,420px)] sm:-translate-x-1/2 sm:gap-2">
            {combat.eventNotices.map(notice => (
              <div
                key={notice.id}
                className={`combat-notice rounded-md border px-2 py-1.5 shadow-2xl backdrop-blur-md sm:rounded-lg sm:px-3 sm:py-2 ${
                  notice.tone === "good"
                    ? "border-green-300/45 bg-green-500/18 text-green-50"
                    : notice.tone === "bad"
                      ? "border-red-300/45 bg-red-500/18 text-red-50"
                      : notice.tone === "warn"
                        ? "border-yellow-300/45 bg-yellow-500/18 text-yellow-50"
                        : notice.tone === "relic"
                          ? "border-purple-300/45 bg-purple-500/18 text-purple-50"
                  : "border-cyan-300/40 bg-cyan-500/16 text-cyan-50"
                }`}
              >
                <div className="combat-notice-title text-[9px] font-black uppercase tracking-wide opacity-75 sm:text-[10px]">{notice.title}</div>
                <div className="combat-notice-detail max-h-8 overflow-hidden text-[11px] font-bold leading-tight sm:max-h-none sm:text-sm">{notice.detail}</div>
              </div>
            ))}
          </div>
        )}

        {combat.actionEffect && (
          <div
            className={`action-effect-layer action-effect-${combat.actionEffect.type}`}
            style={{
              "--action-color": combat.actionEffect.color,
              "--action-glow": combat.actionEffect.kind ? TILE_DEFS[combat.actionEffect.kind].glow : `${combat.actionEffect.color}66`,
            } as CSSProperties}
          >
            <div className="action-cast-card">
              {combat.actionEffect.casterSprite ? (
                <img src={assetUrl(combat.actionEffect.casterSprite)} alt="" className="h-9 w-9 object-contain" />
              ) : combat.actionEffect.type === "shuffle" ? (
                <RotateCcw className="h-5 w-5" />
              ) : combat.actionEffect.type === "ward" ? (
                <Shield className="h-5 w-5" />
              ) : combat.actionEffect.type === "mend" ? (
                <Heart className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-black uppercase tracking-wide text-white">
                  {combat.actionEffect.casterName ? `${combat.actionEffect.casterName}: ` : ""}{combat.actionEffect.label}
                </div>
                {combat.actionEffect.detail && (
                  <div className="truncate text-[10px] font-bold text-white/70">{combat.actionEffect.detail}</div>
                )}
              </div>
            </div>

            {combat.actionEffect.kind && (
              <div className="action-rune-sigil">
                <RuneGlyph kind={combat.actionEffect.kind} />
              </div>
            )}

            {combat.actionEffect.type === "ward" && (
              <div className="action-ward-dome">
                <Shield className="h-8 w-8" />
              </div>
            )}

            {combat.actionEffect.type === "mend" && (
              <div className="action-mend-pulse">
                <Heart className="h-7 w-7" />
              </div>
            )}

            {(combat.actionEffect.type === "shuffle" || combat.actionEffect.type === "surge" || combat.actionEffect.type === "skill") && (
              <div className="action-board-ring" />
            )}

            {Array.from({ length: combat.actionEffect.type === "shuffle" ? 8 : combat.actionEffect.type === "surge" ? 6 : 4 }).map((_, index) => (
              <div
                key={`action-mote-${combat.actionEffect!.id}-${index}`}
                className="action-mote"
                style={{
                  "--mote-x": `${18 + index * 9}%`,
                  "--mote-y": `${combat.actionEffect!.type === "ward" ? 34 + (index % 2) * 8 : 70 + (index % 2) * 7}%`,
                  "--mote-dx": `${-18 + index * 6}px`,
                  "--mote-dy": `${combat.actionEffect!.type === "mend" ? 90 : combat.actionEffect!.type === "ward" ? 12 : -120}px`,
                  "--mote-delay": `${index * 75}ms`,
                } as CSSProperties}
              >
                {combat.actionEffect!.kind ? <RuneGlyph kind={combat.actionEffect!.kind} /> : null}
              </div>
            ))}
          </div>
        )}
        
        {/* Tutorial overlay */}
        {showTutorial && (
          <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pb-3 pt-28 sm:inset-0 sm:items-center sm:bg-black/60 sm:p-4">
            <div className="w-full max-w-md rounded-t-lg border border-[#0F3460] bg-[#16213E]/94 p-4 shadow-2xl backdrop-blur-md sm:rounded-2xl sm:p-6">
              <h3 className="mb-2 text-lg font-bold text-white sm:mb-3 sm:text-xl">Welcome to the Dungeon!</h3>
              <p className="mb-3 text-xs text-gray-300 sm:mb-4 sm:text-sm">
                Resolve fixed AP hands of flashcards, then spend the AP you earned on party commands before the enemy reaches you.
              </p>
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full rounded-md bg-green-600 py-3 font-bold text-white transition-all hover:bg-green-500 sm:rounded-lg"
              >
                Let&apos;s Go!
              </button>
            </div>
          </div>
        )}
        
        {/* Pause overlay */}
        {combat.isPaused && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-[#16213E] rounded-2xl p-8 border border-[#0F3460] text-center">
              <h3 className="text-2xl font-bold text-white mb-6">Paused</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setCombat(prev => prev ? { ...prev, isPaused: false } : prev)}
                  className="block w-full px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-all"
                >
                  Resume
                </button>
                <button
                  onClick={goToMenu}
                  className="block w-full px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold transition-all"
                >
                  Quit to Menu
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Top HUD */}
        <div className="relative z-10 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-black/50 rounded-lg px-3 py-1.5">
              <Skull className="w-4 h-4 text-gray-400" />
              <span className="text-white font-bold text-sm">Floor {combat.floor}</span>
            </div>
            <div
              className="hidden items-center rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide sm:flex"
              style={{
                borderColor: combat.encounter.type === "boss" ? "rgba(233,69,96,0.55)" : combat.encounter.type === "elite" ? "rgba(243,156,18,0.55)" : "rgba(69,169,255,0.35)",
                backgroundColor: combat.encounter.type === "boss" ? "rgba(233,69,96,0.14)" : combat.encounter.type === "elite" ? "rgba(243,156,18,0.14)" : "rgba(69,169,255,0.1)",
                color: combat.encounter.type === "boss" ? "#ff91a1" : combat.encounter.type === "elite" ? "#ffd28a" : "#a7dcff",
              }}
            >
              {combat.encounter.title}
            </div>
            {combat.encounter.modifierLabel !== "Standard" && (
              <div
                className="hidden max-w-[260px] truncate rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-xs font-semibold text-gray-200 md:block"
                title={combat.encounter.modifierDescription}
              >
                {combat.encounter.modifierLabel}: {combat.encounter.modifierDescription}
              </div>
            )}
            
            {/* Combo Counter */}
            {combat.combo > 1 && (
              <div 
                className="flex items-center gap-1 bg-black/50 rounded-lg px-3 py-1.5 animate-pulse"
                style={{ 
                  background: combat.combo >= 10 ? "linear-gradient(90deg, rgba(243,156,18,0.3), rgba(231,76,60,0.3))" : undefined 
                }}
              >
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-sm" style={{ color: combat.combo >= 10 ? "#F39C12" : "#E94560" }}>
                  RUSH x{combat.combo}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-400">Score</div>
              <div className="text-white font-bold">{combat.score.toLocaleString()}</div>
            </div>
            <button
              onClick={() => setCombat(prev => prev ? { ...prev, isPaused: true } : prev)}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-all"
            >
              ||
            </button>
          </div>
        </div>

        {combat.turnQueue.length > 0 && (
          <div className="relative z-20 mx-auto mb-1 flex w-[min(96vw,760px)] items-center gap-1.5 overflow-hidden rounded-lg border border-white/10 bg-black/34 px-2 py-1.5 shadow-xl backdrop-blur-md sm:mb-2 sm:gap-2 sm:px-3">
            <span className="mr-1 hidden text-[10px] font-black uppercase tracking-wide text-gray-400 sm:inline">Timeline</span>
            {combat.turnQueue.slice(0, 7).map((entry, index) => {
              const tile = TILE_DEFS[entry.element];
              const isActive = index === 0;
              return (
                <div
                  key={`${entry.id}-${index}`}
                  className={`flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1 transition-all sm:gap-1.5 sm:px-2 ${
                    isActive ? "bg-white/12 text-white" : "bg-white/5 text-gray-300"
                  }`}
                  style={{
                    borderColor: isActive ? `${tile.color}88` : "rgba(255,255,255,0.1)",
                    boxShadow: isActive ? `0 0 16px ${tile.glow}` : undefined,
                  }}
                  title={`${entry.name} - Speed ${entry.speed}`}
                >
                  <img src={assetUrl(entry.avatar)} alt="" className="h-5 w-5 shrink-0 object-contain sm:h-6 sm:w-6" />
                  <span className="truncate text-[10px] font-bold sm:text-xs">{isActive ? "Now: " : ""}{entry.name}</span>
                  <span className="hidden rounded bg-black/35 px-1 text-[9px] font-black text-gray-300 sm:inline">{Math.max(0, Math.round(entry.actionValue))}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Enemy Area - Top 40% */}
        <div className="combat-battlefield relative z-20 flex h-[25dvh] min-h-[164px] flex-col items-center justify-start px-3 sm:h-[24dvh] sm:min-h-[132px] md:max-h-[180px] lg:h-[22dvh]">
          {currentEnemy && (!currentEnemy.isDead || activeCinematic) && (
            <>
              <div className="battlefield-stage pointer-events-none absolute inset-x-2 top-8 bottom-0 z-20 overflow-visible sm:top-14 md:top-12">
                <div className="battlefield-floor" />
                <div className="absolute bottom-0 left-[8%] flex items-end gap-1 sm:left-[25%] sm:gap-2">
                  {runParty.slice(0, 3).map((member, index) => {
                    const tile = TILE_DEFS[member.element];
                    const isAttacking = Boolean(activeCinematic && cinematicShowsSpell && (
                      activeCinematic.attackers.includes(member.name) ||
                      (activeCinematic.elementDamage[member.element] || 0) > 0 ||
                      (cinematicHasTeamEcho && index === 0)
                    ));
                    const isCastingAction = Boolean(combat.actionEffect && (
                      combat.actionEffect.casterName === member.name ||
                      (combat.actionEffect.type === "skill" && combat.actionEffect.kind === member.element)
                    ));
                    return (
                      <div
                        key={`battle-party-${member.id}`}
                        className={`battlefield-party-member ${cinematicPlayerClass} ${isAttacking ? "battlefield-party-attacker" : ""} ${isCastingAction ? "battlefield-party-casting" : ""}`}
                        style={{
                          color: tile.color,
                          "--member-color": tile.color,
                          "--rest-y": `${index % 2 === 0 ? 0 : 8}px`,
                          "--attack-delay": `${index * 90}ms`,
                        } as CSSProperties}
                      >
                        <img
                          src={assetUrl(member.sprite)}
                          alt={member.name}
                          className="h-20 w-20 object-contain sm:h-16 sm:w-16 md:h-20 md:w-20"
                        />
                        <div
                          className="battlefield-member-chip"
                          style={{
                            borderColor: `${tile.color}72`,
                            backgroundColor: `${tile.color}18`,
                          }}
                        >
                          <RuneGlyph kind={member.element} />
                          <span>{member.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={`battlefield-enemy-member absolute bottom-0 right-[6%] sm:right-[25%] ${cinematicEnemyClass}`}>
                  <div
                    className={`battlefield-intent-badge battlefield-intent-${currentEnemyIntent?.severity || "low"}`}
                    title={currentEnemyIntent?.counterplay}
                  >
                    {currentEnemyIntentIcon === "attack" ? (
                      <Skull className="h-3.5 w-3.5" />
                    ) : currentEnemyIntentIcon === "shield" ? (
                      <Shield className="h-3.5 w-3.5" />
                    ) : currentEnemyIntentIcon === "special" ? (
                      <Sparkles className="h-3.5 w-3.5" />
                    ) : (
                      <Timer className="h-3.5 w-3.5" />
                    )}
                    <span>{currentEnemyIntentShort}</span>
                  </div>
                  <img
                    src={assetUrl(currentEnemy.def.sprite)}
                    alt={currentEnemy.def.name}
                    className="h-36 w-36 object-contain sm:h-32 sm:w-32 md:h-40 md:w-40"
                    style={{
                      filter: currentEnemy.def.isBoss ? "saturate(0.78) contrast(1.18) brightness(1.18) drop-shadow(0 0 20px rgba(185,133,148,0.45)) drop-shadow(0 12px 22px rgba(0,0,0,0.45))" : undefined,
                    }}
                  />
                  {currentEnemy.def.isBoss && (
                    <div className="absolute -inset-4 rounded-full border-2 border-red-500/30 animate-pulse" />
                  )}
                  <div className="battlefield-enemy-matchups">
                    <div className="battlefield-matchup-group battlefield-matchup-weak" title={`Weak to ${formatTileLabels(currentEnemy.def.weakTo)}`}>
                      <span>Weak</span>
                      {currentEnemy.def.weakTo.slice(0, 3).map(kind => (
                        <RuneGlyph key={`weak-${kind}`} kind={kind} />
                      ))}
                    </div>
                    {currentEnemy.def.resists && currentEnemy.def.resists.length > 0 && (
                      <div className="battlefield-matchup-group battlefield-matchup-resist" title={`Resists ${formatTileLabels(currentEnemy.def.resists)}`}>
                        <span>Resist</span>
                        {currentEnemy.def.resists.slice(0, 2).map(kind => (
                          <RuneGlyph key={`resist-${kind}`} kind={kind} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {activeCinematic && cinematicShowsSpell && (activeCinematic.damage > 0 || activeCinematic.shieldDamage > 0) && (
                  <>
                    <div
                      key={`battlefield-spell-${activeCinematic.id}-${activeCinematicStepIndex}`}
                      className="battlefield-spell-trail"
                      style={{
                        color: cinematicPrimaryTile.color,
                        background: `linear-gradient(90deg, transparent, ${cinematicPrimaryTile.color}, rgba(238,232,211,0.92), ${cinematicPrimaryTile.color}, transparent)`,
                        boxShadow: `0 0 18px ${cinematicPrimaryTile.glow}`,
                      }}
                    />
                    {(inlineCinematicKinds.length > 0 ? inlineCinematicKinds : [cinematicPrimaryKind]).slice(0, 3).map((kind, index) => {
                      const tile = TILE_DEFS[kind];
                      const caster = getBattlefieldCaster(kind, runParty);
                      const source = getBattlefieldSource(kind, runParty, index);
                      const isWeak = activeCinematic.weaknessHits.includes(kind);
                      const isResisted = activeCinematic.resistedHits.includes(kind);
                      return (
                        <div key={`battlefield-lance-wrap-${activeCinematic.id}-${activeCinematicStepIndex}-${kind}-${index}`}>
                          <div
                            className={`battlefield-caster-token ${isWeak ? "battlefield-caster-weak" : ""} ${isResisted ? "battlefield-caster-resist" : ""}`}
                            style={{
                              left: `${source.x}%`,
                              top: `${source.y}%`,
                              color: tile.color,
                              borderColor: `${tile.color}88`,
                              backgroundColor: `${tile.color}16`,
                              animationDelay: `${index * 100}ms`,
                            }}
                          >
                            {caster && <img src={assetUrl(caster.sprite)} alt="" />}
                            <RuneGlyph kind={kind} />
                          </div>
                          <div
                            className="battlefield-spell-lance battlefield-party-beam"
                            style={{
                              left: `${source.x}%`,
                              top: `${source.y}%`,
                              color: tile.color,
                              background: `linear-gradient(90deg, transparent 0%, ${tile.color} 30%, rgba(238,232,211,0.92) 50%, ${tile.color} 70%, transparent 100%)`,
                              boxShadow: `0 0 20px ${tile.glow}`,
                              animationDelay: `${index * 100}ms`,
                              "--start-y": `${source.y}%`,
                              "--end-y": `${38 + index * 6}%`,
                            } as CSSProperties}
                          >
                            <RuneGlyph kind={kind} />
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className="battlefield-impact-burst"
                      style={{
                        color: cinematicPrimaryTile.color,
                        borderColor: `${cinematicPrimaryTile.color}88`,
                        boxShadow: `0 0 30px ${cinematicPrimaryTile.glow}, inset 0 0 24px ${cinematicPrimaryTile.glow}`,
                      }}
                    />
                    <div
                      className="battlefield-damage-chip"
                      style={{
                        color: activeCinematic.weaknessHits.length > 0 ? "#FFE66D" : cinematicPrimaryTile.color,
                        borderColor: activeCinematic.weaknessHits.length > 0 ? "rgba(255,230,109,0.62)" : `${cinematicPrimaryTile.color}77`,
                        backgroundColor: activeCinematic.weaknessHits.length > 0 ? "rgba(247,209,84,0.16)" : `${cinematicPrimaryTile.color}16`,
                      }}
                    >
                      {activeCinematic.weaknessHits.length > 0 ? "WEAK " : ""}
                      {activeCinematic.damage + activeCinematic.shieldDamage}
                    </div>
                    {cinematicOutgoingDamage > 0 && (
                      <div className="battlefield-hp-delta">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wide text-red-100/80">Enemy HP</span>
                          <span className="text-xs font-black text-white">-{cinematicOutgoingDamage}</span>
                        </div>
                        <div className="battlefield-hp-delta-bar">
                          <span
                            className="battlefield-hp-delta-old"
                            style={{ width: `${cinematicEnemyHpBeforePct}%` }}
                          />
                          <span
                            className="battlefield-hp-delta-new"
                            style={{ width: `${cinematicEnemyHpAfterPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeCinematic && cinematicShowsEnemyResponse && activeCinematic.enemyDamage > 0 && (
                  <>
                    <div key={`enemy-counter-${activeCinematic.id}-${activeCinematicStepIndex}`} className="battlefield-enemy-trail" />
                    <div className="battlefield-player-impact" />
                  </>
                )}
                {activeCinematic && cinematicShowsEnemyResponse && activeCinematic.wardBlocked && (
                  <div className="battlefield-ward-block">
                    <Shield className="h-5 w-5" />
                    <span>Ward</span>
                  </div>
                )}
              </div>
              {/* Enemy HP Bar */}
              <div className="relative z-30 mb-0 w-52 pt-0.5 sm:mb-3 sm:w-64 sm:pt-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{currentEnemy.def.name}</span>
                  <span className="text-gray-400">{currentEnemy.hp}/{currentEnemy.maxHp}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-gray-600 bg-gray-800 sm:h-4">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%`,
                      background: currentEnemy.hp / currentEnemy.maxHp > 0.5 
                        ? "linear-gradient(90deg, #E94560, #FF4757)" 
                        : "linear-gradient(90deg, #FF4757, #C0392B)"
                    }}
                  />
                </div>
                <div className="mt-1 hidden flex-wrap items-center justify-center gap-1 text-[10px] font-bold sm:flex sm:text-[11px]">
                  <span
                    className="rounded-md border px-1.5 py-0.5"
                    style={{
                      borderColor: `${TILE_DEFS[currentEnemy.def.element].color}66`,
                      backgroundColor: `${TILE_DEFS[currentEnemy.def.element].color}16`,
                      color: TILE_DEFS[currentEnemy.def.element].color,
                    }}
                  >
                    {TILE_DEFS[currentEnemy.def.element].label}
                  </span>
                  <span className="rounded-md border border-yellow-300/30 bg-yellow-300/10 px-1.5 py-0.5 text-yellow-100">
                    Weak {formatTileLabels(currentEnemy.def.weakTo)}
                  </span>
                  {currentEnemy.def.resists && currentEnemy.def.resists.length > 0 && (
                    <span className="hidden rounded-md border border-slate-300/20 bg-slate-300/10 px-1.5 py-0.5 text-slate-200 sm:inline-block">
                      Resists {formatTileLabels(currentEnemy.def.resists)}
                    </span>
                  )}
                </div>
                {currentEnemy.maxShield > 0 && (
                  <div className="mt-1">
                    <div className="mb-0.5 flex justify-between text-[10px] font-bold text-cyan-100">
                      <span>Shield</span>
                      <span>{currentEnemy.shield}/{currentEnemy.maxShield}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full border border-cyan-300/25 bg-cyan-950/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-yellow-200 transition-all duration-300"
                        style={{ width: `${currentEnemy.maxShield > 0 ? (currentEnemy.shield / currentEnemy.maxShield) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Attack charge orbs */}
              <div className="relative z-30 mb-0.5 flex items-center gap-1.5 sm:mb-3">
                <span
                  className="enemy-countdown-chip rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
                  style={{
                    borderColor: currentEnemy.attackCharge <= 1 ? "rgba(255,71,87,0.62)" : "rgba(255,255,255,0.16)",
                    backgroundColor: currentEnemy.attackCharge <= 1 ? "rgba(255,71,87,0.2)" : "rgba(0,0,0,0.32)",
                    color: currentEnemy.attackCharge <= 1 ? "#ffd1d6" : "#dbeafe",
                  }}
                >
                  {getEnemyCountdownLabel(currentEnemy)}
                </span>
                <div className="hidden gap-1 sm:flex">
                  {Array.from({ length: getEnemyAttackFrequency(currentEnemy) }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${
                        i < currentEnemy.attackCharge ? "bg-red-500 animate-pulse" : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div
                className="relative z-30 mb-1 hidden max-w-[92vw] rounded-md border px-2 py-1 text-center text-[11px] font-semibold sm:mb-2 sm:block sm:text-xs"
                style={{
                  borderColor: currentEnemyIntent?.severity === "high" ? "rgba(255,71,87,0.55)" : currentEnemyIntent?.severity === "medium" ? "rgba(247,209,84,0.36)" : "rgba(255,255,255,0.14)",
                  backgroundColor: currentEnemyIntent?.severity === "high" ? "rgba(255,71,87,0.16)" : currentEnemyIntent?.severity === "medium" ? "rgba(247,209,84,0.1)" : "rgba(255,255,255,0.06)",
                  color: currentEnemyIntent?.severity === "high" ? "#ffd1d6" : currentEnemyIntent?.severity === "medium" ? "#fff0b8" : "#dbeafe",
                }}
              >
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide">
                    {currentEnemyIntent?.severity === "high" ? "Incoming" : currentEnemyIntent?.severity === "medium" ? "Tactic" : "Intent"}
                  </span>
                  <span>{currentEnemyIntent?.label || getEnemyIntent(currentEnemy, currentEnemyPlanContext)}</span>
                </div>
                {currentEnemyIntent?.actions && currentEnemyIntent.actions.length > 0 && (
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {currentEnemyIntent.actions.map(action => (
                      <span
                        key={action.id}
                        title={action.description}
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          action.severity === "high"
                            ? "border-red-300/35 bg-red-300/10 text-red-100"
                            : action.severity === "medium"
                              ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-100"
                              : "border-blue-200/20 bg-blue-200/10 text-blue-100"
                        }`}
                      >
                        {action.name} {action.apCost}AP
                      </span>
                    ))}
                  </div>
                )}
                {currentEnemyIntent?.counterplay && (
                  <div className="mt-0.5 text-[10px] font-medium leading-tight text-gray-300">
                    {currentEnemyIntent.counterplay}
                  </div>
                )}
                {currentEnemyPuzzle && (
                  <div
                    className={`mx-auto mt-1 w-fit rounded px-2 py-0.5 text-[10px] font-bold ${
                      currentEnemyPuzzle.tone === "good"
                        ? "bg-green-300/12 text-green-100"
                        : currentEnemyPuzzle.tone === "bad"
                          ? "bg-red-300/12 text-red-100"
                          : currentEnemyPuzzle.tone === "warn"
                            ? "bg-yellow-300/12 text-yellow-100"
                            : "bg-white/10 text-blue-100"
                    }`}
                  >
                    {currentEnemyPuzzle.label}: {currentEnemyPuzzle.text}
                  </div>
                )}
              </div>
              {/* Damage Numbers */}
              {combat.damageNumbers.map(dn => (
                <div
                  key={dn.id}
                  className="absolute pointer-events-none animate-bounce"
                  style={{ 
                    left: `${dn.x}%`, 
                    top: `${dn.y}%`,
                    animation: "floatUp 0.8s ease-out forwards",
                  }}
                >
                  <span 
                    className={`font-bold ${dn.isCrit ? "text-3xl" : "text-xl"}`}
                    style={{ 
                      color: dn.color,
                      textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 0 10px currentColor",
                    }}
                  >
                    {dn.value}{dn.isCrit ? " CRIT!" : ""}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {combat.mode === "cinematic" && activeCinematic && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div className="cinematic-combo-chip">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200 sm:h-4 sm:w-4" />
                {activeCinematic.comboCount > 0
                  ? `${activeCinematic.comboCount} combo`
                  : "No combo"}
              </div>
              <span className="text-cyan-100/70">{activeCinematic.matchedCount} runes</span>
            </div>

            {cinematicRuneStreamKinds.slice(0, 6).map((kind, index) => {
              const tile = TILE_DEFS[kind];
              return (
                <div
                  key={`board-stream-${kind}-${index}`}
                  className="board-energy-stream"
                  style={{
                    left: `${18 + index * 10}%`,
                    top: `${69 + (index % 2) * 7}%`,
                    color: tile.color,
                    background: `linear-gradient(180deg, transparent, ${tile.color}, rgba(238,232,211,0.9), ${tile.color}, transparent)`,
                    boxShadow: `0 0 20px ${tile.glow}`,
                    animationDelay: `${index * 95}ms`,
                    "--stream-x": `${-8 + index * 4}vw`,
                    "--stream-y": `-${35 + index * 2}vh`,
                  } as CSSProperties}
                >
                  <RuneGlyph kind={kind} />
                </div>
              );
            })}

            {cinematicAttackKinds.map((kind, index) => {
              const tile = TILE_DEFS[kind];
              const isWeak = activeCinematic.weaknessHits.includes(kind);
              const isResisted = activeCinematic.resistedHits.includes(kind);
              const damage = activeCinematic.elementDamage[kind] || 0;
              return (
                <div
                  key={`inline-impact-${kind}`}
                  className={`inline-impact-label ${isWeak ? "inline-impact-weak" : isResisted ? "inline-impact-resist" : ""}`}
                  style={{
                    left: `calc(72% + ${index * 1.15 - 1.5}rem)`,
                    top: `${28 + (index % 2) * 5}%`,
                    animationDelay: `${760 + index * 100}ms`,
                    borderColor: `${tile.color}66`,
                    color: isWeak ? "#FFE66D" : isResisted ? "#C8D3E8" : tile.color,
                    backgroundColor: isWeak ? "rgba(247,209,84,0.18)" : isResisted ? "rgba(148,163,184,0.16)" : `${tile.color}16`,
                  }}
                >
                  {isWeak ? "WEAK " : isResisted ? "RESIST " : ""}
                  {damage}
                </div>
              );
            })}

            {activeCinematic.heal > 0 && (
              <div
                className="inline-heart-projectile"
                style={{
                  left: "25%",
                  top: "78%",
                  "--tx": "42vw",
                  "--ty": "2vh",
                  color: TILE_DEFS.heart.color,
                } as CSSProperties}
              >
                <RuneGlyph kind="heart" />
              </div>
            )}

            {activeCinematic.enemyDamage > 0 && (
              <>
                <div className="inline-enemy-slash" />
                <div className="inline-player-hit-label">-{activeCinematic.enemyDamage}</div>
              </>
            )}

            {activeCinematic.wardBlocked && (
              <div className="inline-ward-block">
                <Shield className="h-8 w-8" />
                <span>BLOCK</span>
              </div>
            )}

            <div className="cinematic-resolve-pip">
              Resolving
            </div>
          </div>
        )}
        
        {/* Puzzle Combat Area */}
        <div className="combat-puzzle-area relative z-10 h-[calc(75dvh-52px)] min-h-0 px-2 pb-2 md:h-[calc(74dvh-52px)] md:px-4 md:pb-4 lg:h-[calc(72dvh-52px)]">
          <div className="combat-layout-grid mx-auto grid h-full max-w-5xl grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(158px,auto)] gap-2 sm:grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(280px,360px)_minmax(360px,1fr)] md:grid-rows-1 md:gap-3 xl:max-w-[1080px]">
            {showLegacyCinematicScreen && combat.mode === "cinematic" && activeCinematic ? (
              <section className="relative min-h-0 overflow-hidden rounded-lg border border-[#E94560]/40 bg-[#071225]/95 p-3 shadow-2xl md:col-span-2 sm:p-4">
                <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 50% 38%, ${cinematicPrimaryTile.glow}, transparent 52%)` }} />
                <div className="relative flex h-full flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-xs font-bold uppercase tracking-wide text-gray-300">
                          Combat Resolution
                        </span>
                        <span className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs font-bold text-cyan-100">
                          {combat.encounter.title}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white sm:text-base">
                        {activeCinematic.comboCount} combo{activeCinematic.comboCount === 1 ? "" : "s"} - {activeCinematic.matchedCount} runes - {cinematicPrimaryTile.label} core
                        {activeCinematic.shieldDamage > 0 ? ` - ${activeCinematic.shieldDamage} shield` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <div className="text-gray-500">Result</div>
                      <div className={activeCinematic.roomCleared ? "font-bold text-yellow-200" : activeCinematic.gameOverAfter ? "font-bold text-red-300" : "font-bold text-cyan-100"}>
                        {activeCinematic.roomCleared ? "Room cleared" : activeCinematic.gameOverAfter ? "Defeat" : "Next study"}
                      </div>
                    </div>
                  </div>

                  <div className="relative grid min-h-0 flex-1 grid-cols-[1fr_0.95fr_1fr] items-center gap-2">
                    <div className={`justify-self-center text-center ${cinematicPlayerClass}`}>
                      <img src={assetUrl(selectedClass?.sprite)} alt="Player" className="mx-auto h-16 object-contain drop-shadow-2xl sm:h-20 md:h-24" />
                      <div className="mt-1 text-[11px] font-bold text-gray-200 sm:text-xs">
                        HP {activeCinematic.playerHpBefore} {"->"} {activeCinematic.playerHpAfter}
                      </div>
                    </div>

                    <div className="relative flex min-h-20 flex-col items-center justify-center gap-2 sm:min-h-24">
                      {cinematicShowsSpell && (
                        <>
                          <div className="cinematic-spell-trail absolute top-1/2 h-1 w-36 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${cinematicPrimaryTile.color}, transparent)` }} />
                          <div
                            className="cinematic-rune-burst flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/50 text-white shadow-2xl sm:h-20 sm:w-20"
                            style={{
                              color: cinematicPrimaryTile.color,
                              background: `radial-gradient(circle at 35% 25%, rgba(255,255,255,0.96), ${cinematicPrimaryTile.color} 24%, ${cinematicPrimaryTile.dark} 68%, #050816 112%)`,
                              boxShadow: `0 0 36px ${cinematicPrimaryTile.glow}, inset 0 0 18px rgba(255,255,255,0.25)`,
                            }}
                          >
                            <RuneGlyph kind={cinematicPrimaryKind} />
                          </div>
                        </>
                      )}
                      {!cinematicShowsSpell && activeCinematicStep && (
                        <div className={`rounded-lg border px-3 py-2 text-center text-xs font-black uppercase tracking-wide ${getTimelineToneClasses(activeCinematicStep.tone)}`}>
                          {activeCinematicStep.label}
                        </div>
                      )}
                      {cinematicShowsEnemyResponse && activeCinematic.enemyDamage > 0 && (
                        <div className="enemy-counter-slash absolute h-1.5 w-28 rounded-full bg-red-400 shadow-[0_0_18px_rgba(255,71,87,0.9)]" />
                      )}
                      {cinematicShowsEnemyResponse && activeCinematic.wardBlocked && (
                        <div className="cinematic-ward-ring absolute h-24 w-24 rounded-full border-2 border-cyan-200/70" />
                      )}
                    </div>

                    <div className={`justify-self-center text-center ${cinematicEnemyClass}`}>
                      <img
                        src={assetUrl(activeCinematic.enemySprite)}
                        alt={activeCinematic.enemyName}
                        className="mx-auto h-16 object-contain drop-shadow-2xl sm:h-20 md:h-24"
                        style={{
                          filter: activeCinematic.enemyIsBoss ? "drop-shadow(0 0 20px rgba(233,69,96,0.45))" : undefined,
                        }}
                      />
                      <div className="mt-1 text-[11px] font-bold text-gray-200 sm:text-xs">
                        {activeCinematic.enemyName} {activeCinematic.enemyHpBefore} {"->"} {activeCinematic.enemyHpAfter}
                      </div>
                      {(activeCinematic.shieldBefore > 0 || activeCinematic.shieldAfter > 0) && (
                        <div className={activeCinematic.shieldBroken ? "mt-0.5 text-[10px] font-bold text-yellow-200" : "mt-0.5 text-[10px] font-bold text-cyan-100"}>
                          Shield {activeCinematic.shieldBefore} {"->"} {activeCinematic.shieldAfter}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-2 border-t border-white/10 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(230px,0.72fr)]">
                    {activeCinematicStep && (
                      <div className={`combat-timeline-beat rounded-lg border p-2.5 shadow-xl ${getTimelineToneClasses(activeCinematicStep.tone)}`}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wide opacity-75">
                            Beat {activeCinematicStepIndex + 1} / {cinematicTimeline.length}
                          </span>
                          <span className="rounded bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                            {activeCinematicStep.label}
                          </span>
                        </div>
                        <div className="text-base font-black text-white sm:text-lg">{activeCinematicStep.title}</div>
                        <p className="mt-1 text-sm font-semibold leading-snug text-current/85">{activeCinematicStep.detail}</p>
                        {activeCinematicStep.meta && (
                          <div className="mt-2 rounded-md border border-white/10 bg-black/18 px-2 py-1 text-xs font-semibold text-white/78">
                            {activeCinematicStep.meta}
                          </div>
                        )}
                      </div>
                    )}

                    <ol className="grid gap-1 text-xs">
                      {cinematicTimeline.map((step, index) => {
                        const isRevealed = index <= activeCinematicStepIndex;
                        const isActive = index === activeCinematicStepIndex;
                        return (
                          <li
                            key={`${step.id}-${index}`}
                            className={`flex items-start gap-2 rounded-md border px-2 py-1 transition-all ${
                              isActive
                                ? getTimelineToneClasses(step.tone)
                                : isRevealed
                                  ? "border-white/14 bg-white/8 text-gray-200"
                                  : "border-white/8 bg-black/18 text-gray-500"
                            }`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                              isRevealed ? "bg-white/16 text-white" : "bg-white/6 text-gray-600"
                            }`}>
                              {index + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-black">{isRevealed ? step.title : step.label}</span>
                              {isRevealed && <span className="line-clamp-2 text-[11px] leading-snug opacity-80">{step.detail}</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1 text-[11px] sm:text-xs">
                    {TILE_KINDS.filter(kind => (activeCinematic.runeCounts[kind] || 0) > 0 || (activeCinematic.elementDamage[kind] || 0) > 0).map(kind => {
                      const tile = TILE_DEFS[kind];
                      const valueLabel = kind === "heart"
                        ? `${activeCinematic.heal} HP`
                        : `${activeCinematic.elementDamage[kind]} dmg`;
                      const matchupLabel = activeCinematic.weaknessHits.includes(kind)
                        ? " weak"
                        : activeCinematic.resistedHits.includes(kind)
                          ? " resisted"
                          : "";
                      return (
                        <span
                          key={kind}
                          className="whitespace-nowrap rounded-md border px-2 py-1 font-bold"
                          style={{ borderColor: `${tile.color}66`, color: tile.color, backgroundColor: `${tile.color}14` }}
                        >
                          {tile.label}: {activeCinematic.runeCounts[kind]} runes / {valueLabel}{matchupLabel}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex shrink-0 justify-end border-t border-white/10 pt-1.5">
                    <button
                      type="button"
                      onClick={advanceCombatResolution}
                      className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/40 bg-cyan-500/18 px-3 py-1.5 text-sm font-bold text-cyan-50 transition-all hover:bg-cyan-400/25"
                    >
                      <Check className="h-4 w-4" />
                      {cinematicCanAdvanceTimeline
                        ? "Next Beat"
                        : activeCinematic.rewardAfter
                        ? "Choose Reward"
                        : activeCinematic.gameOverAfter
                          ? "Finish Run"
                          : "Continue"}
                    </button>
                  </div>
                </div>
              </section>
            ) : apCombatMode ? (
              <>
                <section className="hidden min-h-0 flex-col overflow-hidden rounded-lg border border-cyan-300/25 bg-[#071225]/88 p-2 shadow-2xl sm:p-4 md:flex">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-white">
                        <Sword className="h-4 w-4 text-cyan-200" />
                        <span className="font-bold">Party Command</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-400 sm:text-xs">{combat.boardMessage}</p>
                    </div>
                    <div className="shrink-0 rounded-md border border-yellow-300/35 bg-yellow-300/12 px-2 py-1 text-center">
                      <div className="text-[9px] font-black uppercase tracking-wide text-yellow-100/70">AP</div>
                      <div className="text-lg font-black text-yellow-100">{combat.actionPoints}</div>
                    </div>
                  </div>

                  <div className="grid min-h-0 flex-1 gap-2 overflow-auto pr-1">
                    {runParty.slice(0, 5).map(member => {
                      const tile = TILE_DEFS[member.element];
                      const actorEntry = combat.turnQueue.find(entry => entry.kind === "party" && entry.refId === member.id);
                      const isNow = activeCommandCharacter?.id === member.id && combat.mode === "command";
                      return (
                        <div
                          key={`command-party-${member.id}`}
                          className={`flex items-center gap-2 rounded-md border bg-black/22 px-2 py-1.5 ${isNow ? "ring-1 ring-white/45" : ""}`}
                          style={{ borderColor: isNow ? `${tile.color}99` : `${tile.color}44`, boxShadow: isNow ? `0 0 16px ${tile.glow}` : undefined }}
                        >
                          <img src={assetUrl(member.sprite)} alt="" className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-bold text-white">{member.name}</span>
                              <span className="text-[10px] font-bold" style={{ color: tile.color }}>{TILE_DEFS[member.element].label}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                              <span>SPD {member.speed}</span>
                              <span>ATK {member.attack}</span>
                              <span>REC {member.recovery}</span>
                              <span className="ml-auto">{actorEntry ? Math.max(0, Math.round(actorEntry.actionValue)) : "--"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md bg-black/25 p-2">
                      <div className="text-gray-500">Focus</div>
                      <div className="font-bold text-cyan-100">{combat.skillCharge}/12</div>
                    </div>
                    <div className="rounded-md bg-black/25 p-2">
                      <div className="text-gray-500">Study</div>
                      <div className="font-bold text-green-200">{combat.studyCorrectRound}/{combat.studyQuestionsTotal}</div>
                    </div>
                    <div className="rounded-md bg-black/25 p-2">
                      <div className="text-gray-500">Spent</div>
                      <div className="font-bold text-yellow-100">{combat.actionPointsSpentThisWindow}</div>
                    </div>
                    <div className="rounded-md bg-black/25 p-2">
                      <div className="text-gray-500">Enemy AP</div>
                      <div className="font-bold text-red-100">{enemyApSpentDisplay}/{enemyApBudgetDisplay}</div>
                    </div>
                  </div>
                </section>

                <section className="flex min-h-0 flex-col justify-between overflow-hidden rounded-lg border border-[#0F3460] bg-[#16213E]/88 p-2 shadow-2xl sm:p-4">
                  <div className="min-h-0">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-white">
                          <BookOpen className="h-4 w-4 text-cyan-300" />
                          <span className="font-bold">
                            {combat.mode === "studyReady" ? "Study Set"
                              : combat.mode === "study" ? "Flashcards"
                                : combat.mode === "commandReady" ? "Commands Ready"
                                  : combat.mode === "enemyAction" ? "Enemy Action"
                                    : "Choose Action"}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-400 sm:text-xs">
                          {combat.mode === "studyReady" && "Answer cards to build AP for this turn."}
                          {combat.mode === "study" && `${studyAnswered} answered.`}
                          {combat.mode === "commandReady" && `${combat.actionPointsEarnedThisRush} AP earned. Inspect intent, then command the party.`}
                          {combat.mode === "command" && activeCommandCharacter && `${activeCommandCharacter.name} is acting now.`}
                          {combat.mode === "enemyAction" && "The enemy is resolving its intent."}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-black/30 px-2 py-1 text-xs font-bold text-cyan-100">
                        {combat.deck.length} cards
                      </span>
                    </div>

                    {combat.mode === "studyReady" && (
                      <div className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50">
                        Tap Ready below to resolve a fixed AP hand of flashcards.
                      </div>
                    )}

                    {combat.mode === "commandReady" && (
                      <div className="rounded-md border border-[#E94560]/35 bg-[#E94560]/12 px-3 py-2 text-sm font-semibold text-pink-50">
                        Tap Ready below to spend AP. Actions move the timeline; fast actors may act again before the enemy.
                      </div>
                    )}

                    {combat.mode === "command" && activeCommandCharacter && (
                      <div className="space-y-2">
                        <div
                          className="rounded-md border bg-black/25 p-2"
                          style={{ borderColor: `${TILE_DEFS[activeCommandCharacter.element].color}66` }}
                        >
                          <div className="flex items-center gap-2">
                            <img src={assetUrl(activeCommandCharacter.sprite)} alt="" className="h-10 w-10 object-contain" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-white">{activeCommandCharacter.name}</div>
                              <div className="text-[11px] font-semibold text-gray-400">{activeCommandSkill?.name || "Skill"} - {activeCommandSkill?.description || activeCommandCharacter.passive}</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {(["attack", "defend", "skill"] as PlayerActionId[]).map(action => {
                            const cost = getPlayerActionCost(activeCommandCharacter, action, combat);
                            const label = getActionLabel(activeCommandCharacter, action);
                            const canUse = combat.phase === "answering" && combat.actionPoints >= cost;
                            const icon = action === "defend" ? <Shield className="h-4 w-4" /> : action === "skill" ? <Sparkles className="h-4 w-4" /> : <Sword className="h-4 w-4" />;
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => handlePlayerCommand(action)}
                                disabled={!canUse}
                                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border border-white/12 bg-black/24 px-2 py-2 text-center text-xs font-bold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-20 sm:text-sm"
                              >
                                {icon}
                                <span>{label}</span>
                                <span className="rounded bg-yellow-300/15 px-1.5 py-0.5 text-[10px] text-yellow-100">{cost} AP</span>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={endCommandWindow}
                          disabled={combat.phase !== "answering"}
                          className="flex w-full items-center justify-center rounded-md border border-white/10 bg-white/6 py-2 text-xs font-bold text-gray-200 transition-all hover:bg-white/10 disabled:opacity-45"
                        >
                          End Window
                        </button>
                      </div>
                    )}

                    {(combat.mode === "study" || combat.mode === "enemyAction") && (
                      <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-gray-200">
                        {combat.mode === "study" ? `${studyAnswered} answered` : "Resolving on the battlefield"}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2 sm:gap-4">
                    <img src={assetUrl(selectedClass?.sprite)} alt="Player" className="h-8 w-8 object-contain sm:h-12 sm:w-12" />
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Heart className="h-3 w-3 text-red-400" />
                          HP
                        </span>
                        <span className={`font-bold ${combat.playerHp / combat.playerMaxHp < 0.25 ? "text-red-400 animate-pulse" : "text-gray-300"}`}>
                          {combat.playerHp}/{combat.playerMaxHp}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full border border-gray-600 bg-gray-800 sm:h-4">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(combat.playerHp / combat.playerMaxHp) * 100}%`,
                            background: combat.playerHp / combat.playerMaxHp > 0.5
                              ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                              : combat.playerHp / combat.playerMaxHp > 0.25
                                ? "linear-gradient(90deg, #F39C12, #E67E22)"
                                : "linear-gradient(90deg, #FF4757, #C0392B)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Accuracy</div>
                      <div className="text-xs font-bold text-white sm:text-sm">{accuracy}%</div>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#0F3460] bg-[#071225]/90 p-1.5 shadow-2xl sm:p-4">
              <div className="mb-1 flex min-h-0 items-start justify-between gap-2 sm:mb-3 sm:min-h-[52px] sm:gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white">
                    <Layers className="h-4 w-4 text-cyan-300" />
                    <span className="font-bold">Rune Board</span>
                  </div>
                  <p className="mt-1 hidden h-8 overflow-hidden text-[11px] leading-snug text-gray-400 sm:block sm:text-xs">{combat.boardMessage}</p>
                </div>
                <div className="hidden min-h-7 shrink-0 flex-wrap justify-end gap-2 sm:flex">
                  {combat.pendingCinematic && combat.pendingCinematic.matchedCount > 0 && (
                    <span className="rounded-md border border-orange-300/50 bg-orange-300/10 px-2 py-1 text-xs font-bold text-orange-100">
                      Prepared {preparedPreview ? `${preparedPreview.hpDamage} HP${preparedPreview.shieldDamage > 0 ? ` + ${preparedPreview.shieldDamage} shield` : ""}` : combat.pendingCinematic.damage}
                    </span>
                  )}
                  {hasBoardSurge && <span className="rounded-md border border-yellow-400/50 bg-yellow-400/10 px-2 py-1 text-xs font-bold text-yellow-300">Surge</span>}
                  {hasWard && <span className="rounded-md border border-cyan-300/50 bg-cyan-300/10 px-2 py-1 text-xs font-bold text-cyan-200">Ward</span>}
                  {enhancedRuneCount > 0 && (
                    <span
                      className="rounded-md border border-yellow-300/50 bg-yellow-300/10 px-2 py-1 text-xs font-bold text-yellow-100"
                      title={getRuneStatusTitle("enhanced")}
                    >
                      Enhanced +power {enhancedRuneCount}
                    </span>
                  )}
                  {cursedRuneCount > 0 && (
                    <span
                      className="rounded-md border border-purple-300/50 bg-purple-300/10 px-2 py-1 text-xs font-bold text-purple-100"
                      title={getRuneStatusTitle("cursed")}
                    >
                      Cursed recoil {cursedRuneCount}
                    </span>
                  )}
                  {combat.runRelics.length > 0 && <span className="rounded-md border border-purple-300/50 bg-purple-300/10 px-2 py-1 text-xs font-bold text-purple-200">{combat.runRelics.length} Relic</span>}
                </div>
              </div>

              <div className="mb-1 sm:mb-3">
                <div className="mb-1 hidden items-center justify-between text-xs sm:flex">
                  <span className="flex items-center gap-1 text-gray-300">
                    <Timer className="h-3 w-3 text-cyan-300" />
                    Rune sprint
                  </span>
                  <span className="font-bold text-cyan-200">
                    {combat.mode === "board" ? formatBoardTime(combat.boardTimeLeft) : combat.mode === "resolveReady" || combat.mode === "cinematic" ? "0.0s" : formatBoardTime(combat.boardTimeMax)}
                  </span>
                </div>
                <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-900">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${Math.min(100, (combat.boardTimeLeft / Math.max(1, combat.boardTimeMax)) * 100)}%`,
                      background: "linear-gradient(90deg, #45A9FF, #E94560)",
                    }}
                  />
                </div>
                <div className="mb-1 hidden items-center justify-between text-xs sm:flex">
                  <span className="flex items-center gap-1 text-gray-300">
                    <Zap className="h-3 w-3 text-yellow-300" />
                    Power points
                  </span>
                  <span className="font-bold text-yellow-300">
                    {combat.powerPoints}
                  </span>
                </div>
                <div className="mb-1 hidden items-center justify-between text-xs sm:flex">
                  <span className="flex items-center gap-1 text-gray-300">
                    <Star className="h-3 w-3 text-cyan-200" />
                    Focus
                  </span>
                  <span className="font-bold text-cyan-200">
                    {combat.skillCharge}/12
                  </span>
                </div>
                <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-900">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (combat.powerPoints / 12) * 100)}%`,
                      background: "linear-gradient(90deg, #F39C12, #FFD166)",
                    }}
                  />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-900">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (combat.skillCharge / 12) * 100)}%`,
                      background: "linear-gradient(90deg, #45A9FF, #B078FF)",
                    }}
                  />
                </div>
                <div className="mt-2 hidden h-[74px] overflow-hidden rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-[11px] leading-snug text-gray-300 sm:block">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-gray-100">Prepared spell</span>
                    {combat.pendingCinematic && combat.pendingCinematic.matchedCount > 0 && preparedPreview ? (
                      <span className="font-bold text-orange-100">
                        {preparedPreview.rawDamage} raw {"->"} {preparedPreview.hpDamage} HP
                        {preparedPreview.shieldDamage > 0 ? ` / ${preparedPreview.shieldDamage} shield` : ""}
                      </span>
                    ) : (
                      <span className="font-bold text-gray-500">No rune matches prepared</span>
                    )}
                  </div>
                  <div className="mt-1 flex min-h-6 flex-wrap gap-1">
                    {combat.pendingCinematic && combat.pendingCinematic.matchedCount > 0 && preparedPreview ? (
                      <>
                        {preparedPreview.weaknessHits.length > 0 && (
                          <span className="rounded border border-yellow-300/30 bg-yellow-300/10 px-1.5 py-0.5 font-bold text-yellow-100">
                            Weak {formatTileLabels(preparedPreview.weaknessHits)}
                          </span>
                        )}
                        {preparedPreview.resistedHits.length > 0 && (
                          <span className="rounded border border-slate-300/20 bg-slate-300/10 px-1.5 py-0.5 font-bold text-slate-200">
                            Resisted {formatTileLabels(preparedPreview.resistedHits)}
                          </span>
                        )}
                        {preparedPreview.shieldBroken && (
                          <span className="rounded border border-cyan-200/35 bg-cyan-200/10 px-1.5 py-0.5 font-bold text-cyan-100">
                            Shield break delays counter, +{combat.runRelics.includes("fracture_notes") ? 3 : 2} Focus
                          </span>
                        )}
                        {preparedPreview.fractureBonus > 0 && (
                          <span className="rounded border border-orange-300/35 bg-orange-300/10 px-1.5 py-0.5 font-bold text-orange-100">
                            Fracture +{preparedPreview.fractureBonus} HP
                          </span>
                        )}
                        {preparedPreview.weaknessHits.length > 0 && combat.runRelics.includes("elemental_index") && (
                          <span className="rounded border border-yellow-100/35 bg-white/10 px-1.5 py-0.5 font-bold text-white">
                            Index +1 Focus
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500">Match three or more runes to prepare damage and healing.</span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="relative mx-auto mt-auto w-full max-w-[min(92vw,340px)] shrink-0 touch-none select-none sm:max-w-[380px] md:max-w-[340px] lg:max-w-[330px]"
                style={{
                  aspectRatio: `${BOARD_COLS} / ${BOARD_ROWS}`,
                }}
              >
                {combat.board.map((tile, index) => {
                  const tileDef = TILE_DEFS[tile.kind];
                  const isSelected = combat.selectedTileIndex === index;
                  const isHeld = combat.dragTileId === tile.id;
                  const isMoving = combat.lastMovedTileIds.includes(tile.id);
                  const isNewTile = combat.newTileIds.includes(tile.id);
                  const isMatched = combat.matchedTileIds.includes(tile.id);
                  const statusTitle = getRuneStatusTitle(tile.status);
                  const statusPrefix = tile.status === "enhanced" ? "Enhanced " : tile.status === "cursed" ? "Cursed " : "";
                  const col = index % BOARD_COLS;
                  const row = Math.floor(index / BOARD_COLS);
                  const cellWidth = 100 / BOARD_COLS;
                  const cellHeight = 100 / BOARD_ROWS;

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      data-rune-index={index}
                      onPointerDown={(event) => startRuneDrag(index, event)}
                      disabled={!isRuneBoardLive}
                      className={`absolute overflow-hidden rounded-full border transition-[left,top,transform,opacity,box-shadow] duration-200 ease-out sm:border-2 ${
                        isSelected ? "border-white" : "border-white/15"
                      } ${isMoving ? "rune-swap" : ""} ${isNewTile ? "rune-spawn" : ""} ${isMatched ? "rune-match-pop" : ""} ${tile.status === "enhanced" ? "rune-enhanced" : ""} ${tile.status === "cursed" ? "rune-cursed" : ""} ${isHeld ? "opacity-20" : ""} ${isRuneBoardLive ? "cursor-grab hover:scale-105 active:cursor-grabbing" : combat.mode === "cinematic" ? "cursor-default opacity-90" : "cursor-not-allowed opacity-65"}`}
                      style={{
                        left: `${col * cellWidth}%`,
                        top: `${row * cellHeight}%`,
                        width: `calc(${cellWidth}% - 0.35rem)`,
                        height: `calc(${cellHeight}% - 0.35rem)`,
                        transform: isSelected && !isHeld ? "scale(1.08)" : "scale(1)",
                        transitionDuration: combat.isResolvingRunes ? `${RUNE_FALL_MS}ms` : "180ms",
                        transitionTimingFunction: combat.isResolvingRunes ? "cubic-bezier(0.18, 0.82, 0.22, 1)" : "ease-out",
                        color: tileDef.color,
                        borderColor: isSelected ? "rgba(238,232,211,0.92)" : `${tileDef.color}88`,
                        background: `radial-gradient(circle at 50% 38%, rgba(238,232,211,0.28) 0%, ${tileDef.color}d9 20%, ${tileDef.color}90 58%, ${tileDef.dark} 104%), linear-gradient(145deg, rgba(238,232,211,0.16), rgba(0,0,0,0.32))`,
                        boxShadow: isSelected
                          ? `0 0 24px ${tileDef.glow}, inset 0 0 18px rgba(255,255,255,0.16), inset 0 -8px 14px rgba(0,0,0,0.34)`
                          : tile.status === "enhanced"
                            ? `0 0 24px rgba(225,202,114,0.58), inset 0 -8px 14px rgba(0,0,0,0.36), 0 6px 14px rgba(0,0,0,0.24)`
                            : tile.status === "cursed"
                              ? `0 0 24px rgba(167,132,221,0.58), inset 0 -8px 14px rgba(0,0,0,0.4), 0 6px 14px rgba(0,0,0,0.28)`
                              : `0 0 14px ${tileDef.glow}, inset 0 -8px 14px rgba(0,0,0,0.34), inset 0 1px 10px rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.24)`,
                        touchAction: "none",
                      }}
                      title={statusTitle ? `${tileDef.label} rune - ${statusTitle}` : `${tileDef.label} rune`}
                      aria-label={`${statusPrefix}${tileDef.label} rune`}
                    >
                      <RuneOrb kind={tile.kind} status={tile.status} />
                    </button>
                  );
                })}
                {combat.dragPointerId !== null && combat.dragTileKind && (
                  <div
                    className="pointer-events-none fixed z-[70] h-14 w-14 overflow-hidden rounded-full border-2 border-white text-white shadow-2xl sm:h-16 sm:w-16"
                    style={{
                      left: combat.dragPointerX,
                      top: combat.dragPointerY,
                      transform: "translate(-50%, -50%) scale(1.08)",
                      color: TILE_DEFS[combat.dragTileKind].color,
                      background: `radial-gradient(circle at 50% 38%, rgba(238,232,211,0.28) 0%, ${TILE_DEFS[combat.dragTileKind].color}d9 20%, ${TILE_DEFS[combat.dragTileKind].color}90 58%, ${TILE_DEFS[combat.dragTileKind].dark} 104%), linear-gradient(145deg, rgba(238,232,211,0.16), rgba(0,0,0,0.32))`,
                      boxShadow: `0 0 30px ${TILE_DEFS[combat.dragTileKind].glow}, inset 0 0 18px rgba(255,255,255,0.16), inset 0 -8px 14px rgba(0,0,0,0.34)`,
                    }}
                  >
                    <RuneOrb kind={combat.dragTileKind} status={combat.dragTileStatus} />
                  </div>
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-col justify-center overflow-hidden rounded-lg border border-[#0F3460] bg-[#16213E]/86 p-1.5 shadow-2xl sm:block sm:overflow-auto sm:bg-[#16213E]/92 sm:p-4">
              <div className="hidden rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2 sm:mb-4 sm:block sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3 sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-white">
                      <BookOpen className="h-5 w-5 text-cyan-300" />
                      <span className="font-bold">
                      {combat.mode === "studyReady" ? "Study Set"
                          : combat.mode === "study" ? "Flashcards"
                            : combat.mode === "boardReady" ? "Rune Sprint Ready"
                              : combat.mode === "cinematic" ? "Combo Resolution"
                              : combat.mode === "resolveReady" ? "Resolve Ready"
                                : "Rune Sprint"}
                      </span>
                    </div>
                    <p className="mt-1 hidden text-xs text-gray-400 sm:block">
                      {combat.mode === "studyReady" && "Resolve a fixed AP hand. Misses lose that card's AP."}
                      {combat.mode === "study" && `${studyAnswered} card${studyAnswered === 1 ? "" : "s"} answered.`}
                      {combat.mode === "boardReady" && `${formatBoardTime(combat.boardTimeMax)} and ${combat.powerPoints} power points ready.`}
                      {combat.mode === "board" && `${formatBoardTime(combat.boardTimeLeft)} left. Drag one rune fast.`}
                      {combat.mode === "cinematic" && "Combos are firing from the board."}
                      {combat.mode === "resolveReady" && "Preview the outcome, then settle combat."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-black/30 px-2 py-1 text-xs font-bold text-cyan-100">
                    {combat.deck.length} cards
                  </span>
                </div>
                {combat.mode === "studyReady" && (
                  <button
                    onClick={beginStudyRound}
                    disabled={combat.phase !== "answering" || combat.isPaused}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 py-3 font-bold text-white transition-all hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    <BookOpen className="h-4 w-4" />
                    Start Study Set
                  </button>
                )}
                {combat.mode === "boardReady" && (
                  <button
                    onClick={beginBoardPhase}
                    disabled={combat.phase !== "answering" || combat.isPaused}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[#E94560] py-3 font-bold text-white transition-all hover:bg-[#ff5b72] disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start {formatBoardTime(combat.boardTimeMax)}
                  </button>
                )}
                {combat.mode === "resolveReady" && (
                  <button
                    onClick={settlePreparedRuneRound}
                    disabled={combat.phase !== "answering" || combat.isPaused}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 py-3 font-bold text-white transition-all hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    <Sword className="h-4 w-4" />
                    Settle Combat
                  </button>
                )}
                {(combat.mode === "study" || combat.mode === "board" || combat.mode === "cinematic") && (
                  <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-gray-200">
                    {combat.mode === "study"
                      ? `${studyAnswered} answered`
                      : combat.mode === "cinematic"
                        ? "Resolving automatically"
                        : `${formatBoardTime(combat.boardTimeLeft)} left`}
                  </div>
                )}
              </div>

              {combat.mode === "resolveReady" && (
                <div className="mb-2 rounded-lg border border-orange-300/35 bg-orange-300/10 p-2 sm:mb-4 sm:p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-orange-100">
                      <Sword className="h-4 w-4" />
                      Resolve Preview
                    </div>
                    <span className="rounded bg-black/30 px-2 py-0.5 text-[10px] font-bold text-orange-100">
                      Tap to settle
                    </span>
                  </div>
                  <div className="grid gap-1.5 text-[11px] sm:grid-cols-2">
                    {resolvePreviewLines.map((line) => (
                      <div
                        key={`${line.label}-${line.value}`}
                        className={`rounded-md border px-2 py-1.5 ${
                          line.tone === "good"
                            ? "border-green-300/30 bg-green-300/10 text-green-100"
                            : line.tone === "bad"
                              ? "border-red-300/35 bg-red-300/10 text-red-100"
                              : line.tone === "warn"
                                ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-100"
                                : "border-white/10 bg-black/20 text-gray-200"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{line.label}</div>
                        <div className="font-semibold">{line.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="hidden sm:mb-4 sm:grid sm:grid-cols-2 sm:gap-2">
                {(Object.keys(POWER_UP_DEFS) as PowerUpType[]).map(type => {
                  const power = POWER_UP_DEFS[type];
                  const cost = POWER_UP_COSTS[type];
                  const canAfford = combat.powerPoints >= cost;
                  const canUseThisBoost = type !== "mend" || combat.playerHp < combat.playerMaxHp;

                  return (
                    <button
                      key={type}
                      onClick={() => handlePowerUp(type)}
                      disabled={!canUsePowerUps || !canAfford || !canUseThisBoost}
                      className="rounded-md border px-2 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-2"
                      style={{
                        borderColor: power.color,
                        backgroundColor: `${power.color}16`,
                      }}
                      title={power.description}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold sm:text-sm" style={{ color: power.color }}>{power.label}</span>
                        <span className="rounded bg-black/30 px-2 py-0.5 text-xs font-bold text-white">{cost}</span>
                      </div>
                      <p className="mt-1 hidden text-xs text-gray-400 sm:block">{power.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:mb-4 sm:grid sm:grid-cols-3 sm:gap-1.5">
                {runParty.slice(0, 5).map(member => {
                  const skill = getSkillById(member.skillId);
                  const tile = TILE_DEFS[member.element];
                  const canUseSkill = !!skill && canUseRuneSkills && combat.skillCharge >= skill.cost;
                  const tacticalHint = skill ? getSkillTacticalHint(skill.id, currentEnemy) : "";
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => skill && handleRuneSkill(skill.id)}
                      disabled={!canUseSkill}
                      className="rounded-md border bg-black/20 p-2 text-left transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                      style={{ borderColor: `${tile.color}66` }}
                      title={skill ? `${skill.name}: ${skill.description}` : member.passive}
                    >
                      <div className="flex items-center gap-2">
                        <img src={assetUrl(member.sprite)} alt="" className="h-7 w-7 object-contain" />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white">{member.name}</div>
                          <div className="truncate text-[10px]" style={{ color: tile.color }}>{skill?.name || "Passive"}</div>
                        </div>
                      </div>
                      {skill && (
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className={tacticalHint === "Resisted here" ? "text-red-200" : tacticalHint ? "text-yellow-100" : "text-gray-500"}>
                            {tacticalHint || "Skill"}
                          </span>
                          <span className="rounded bg-black/30 px-1.5 py-0.5 font-bold text-cyan-100">{skill.cost} Focus</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {combat.runRelics.length > 0 && (
                <div className="mb-2 hidden flex-wrap gap-1.5 sm:mb-4 sm:flex">
                  {combat.runRelics.map(relicId => {
                    const relic = getRelicById(relicId);
                    if (!relic) return null;
                    const tile = TILE_DEFS[relic.element];
                    return (
                      <span
                        key={relic.id}
                        className="rounded-md border px-2 py-1 text-[10px] font-bold"
                        style={{ borderColor: `${tile.color}66`, color: tile.color, backgroundColor: `${tile.color}14` }}
                        title={relic.description}
                      >
                        {relic.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {combat.combatLog.length > 0 && (
                <div className="mb-2 hidden border-t border-white/10 pt-2 sm:mb-4 sm:block">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-200">
                    <Sword className="h-3.5 w-3.5 text-orange-300" />
                    Last Resolution
                  </div>
                  <div className="space-y-1 text-[11px] leading-snug text-gray-400">
                    {combat.combatLog.slice(0, 4).map((line, index) => (
                      <div key={`${line}-${index}`} className="flex gap-2">
                        <span className="text-gray-600">{index + 1}</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-4">
                <div className={`relative transition-all duration-300 ${combat.playerAnim === "hit" ? "player-hit" : combat.playerAnim === "heal" ? "player-heal" : ""}`}>
                  <img src={assetUrl(selectedClass?.sprite)} alt="Player" className="h-8 w-8 object-contain sm:h-12 sm:w-12" />
                  {combat.activeBuffs.length > 0 && (
                    <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-yellow-400 animate-pulse" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Heart className="h-3 w-3 text-red-400" />
                      HP
                    </span>
                    <span className={`font-bold ${combat.playerHp / combat.playerMaxHp < 0.25 ? "text-red-400 animate-pulse" : "text-gray-300"}`}>
                      {combat.playerHp}/{combat.playerMaxHp}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border border-gray-600 bg-gray-800 sm:h-4">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(combat.playerHp / combat.playerMaxHp) * 100}%`,
                        background: combat.playerHp / combat.playerMaxHp > 0.5
                          ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                          : combat.playerHp / combat.playerMaxHp > 0.25
                            ? "linear-gradient(90deg, #F39C12, #E67E22)"
                            : "linear-gradient(90deg, #FF4757, #C0392B)",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleAbility}
                  disabled={combat.abilityUsed || combat.abilityCooldown > 0 || combat.phase !== "answering" || combat.mode === "study" || combat.mode === "board" || combat.mode === "resolveReady" || combat.mode === "cinematic"}
                  className={`relative rounded-lg border-2 p-1.5 transition-all duration-200 sm:p-3 ${
                    combat.abilityUsed || combat.abilityCooldown > 0 || combat.mode === "study" || combat.mode === "board" || combat.mode === "resolveReady" || combat.mode === "cinematic"
                      ? "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-600"
                      : "border-[#E94560] bg-[#0F3460] text-white hover:scale-105 hover:bg-[#1a4a7a]"
                  }`}
                  title={selectedClass?.abilityName}
                >
                  <Zap className="h-5 w-5" />
                  {combat.abilityCooldown > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs">
                      {combat.abilityCooldown}
                    </span>
                  )}
                </button>

                <div className="text-right">
                  <div className="hidden text-xs text-gray-500 sm:block">Accuracy</div>
                  <div className="text-xs font-bold text-white sm:text-sm">{accuracy}%</div>
                </div>
              </div>
            </section>
              </>
            )}
          </div>
        </div>

        {!showTutorial && !combat.isPaused && combat.mode === "studyReady" && (
          <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center bg-gradient-to-t from-[#050816]/94 via-[#050816]/38 to-transparent px-3 pb-3 pt-24 sm:inset-0 sm:items-center sm:bg-[#050816]/92 sm:py-4">
            <div className="max-h-[42dvh] w-full max-w-md overflow-auto rounded-t-lg border border-cyan-400/30 bg-[#16213E]/94 p-3 text-center shadow-2xl backdrop-blur-md sm:max-h-[92dvh] sm:rounded-lg sm:p-6">
              <div className="mx-auto mb-3 hidden h-12 w-12 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-cyan-200 sm:mb-4 sm:flex sm:h-14 sm:w-14">
                <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-white sm:mb-2 sm:text-2xl">Study Set Ready</h3>
              <p className="mb-3 text-xs text-gray-300 sm:mb-5 sm:text-sm">
                Resolve a fixed AP hand to open party commands. Hard cards shorten the set, but every miss permanently loses that card's AP.
              </p>
              <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:mb-5 sm:gap-3 sm:text-sm">
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">AP Goal</div>
                  <div className="font-bold text-white">{STUDY_RUSH_AP_CAP} AP</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Card Value</div>
                  <div className="font-bold text-white">Easy 1 / Hard 3</div>
                </div>
              </div>
              <button
                onClick={beginStudyRound}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 py-3 font-bold text-white transition-all hover:bg-cyan-500"
              >
                <Check className="h-4 w-4" />
                Ready
              </button>
            </div>
          </div>
        )}

        {!showTutorial && !combat.isPaused && combat.mode === "commandReady" && (
          <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center bg-gradient-to-t from-[#050816]/94 via-[#050816]/34 to-transparent px-3 pb-3 pt-24 sm:inset-0 sm:items-center sm:bg-[#050816]/88 sm:py-4">
            <div className="max-h-[44dvh] w-full max-w-md overflow-auto rounded-t-lg border border-[#E94560]/40 bg-[#16213E]/94 p-3 text-center shadow-2xl backdrop-blur-md sm:max-h-[92dvh] sm:rounded-lg sm:p-6">
              <div className="mx-auto mb-3 hidden h-12 w-12 items-center justify-center rounded-full border border-[#E94560]/50 bg-[#E94560]/12 text-pink-200 sm:mb-4 sm:flex sm:h-14 sm:w-14">
                <Sword className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-white sm:mb-2 sm:text-2xl">Commands Ready</h3>
              <p className="mb-3 text-xs text-gray-300 sm:mb-5 sm:text-sm">
                {formatStudyRushResult(combat.studyCorrectRound, combat.studyQuestionsTotal)}. You earned {combat.actionPointsEarnedThisRush}/{currentStudyApCap} AP. Spend it now; unspent AP disappears after the enemy acts.
              </p>
              <div className="mb-3 grid grid-cols-4 gap-1.5 text-xs sm:mb-5 sm:gap-2 sm:text-sm">
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Correct</div>
                  <div className="font-bold text-green-300">{combat.studyCorrectRound}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Missed</div>
                  <div className="font-bold text-red-300">{combat.studyWrongRound}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">AP</div>
                  <div className="font-bold text-yellow-100">{combat.actionPoints}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Focus</div>
                  <div className="font-bold text-purple-200">{combat.skillCharge}</div>
                </div>
              </div>
              <button
                onClick={beginCommandPhase}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#E94560] py-3 font-bold text-white transition-all hover:bg-[#ff5b72]"
              >
                <Check className="h-4 w-4" />
                Ready
              </button>
            </div>
          </div>
        )}

        {!showTutorial && !combat.isPaused && combat.mode === "boardReady" && (
          <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center bg-gradient-to-t from-[#050816]/94 via-[#050816]/34 to-transparent px-3 pb-3 pt-24 sm:inset-0 sm:items-center sm:bg-[#050816]/88 sm:py-4">
            <div className="max-h-[52dvh] w-full max-w-md overflow-auto rounded-t-lg border border-[#E94560]/40 bg-[#16213E]/94 p-3 text-center shadow-2xl backdrop-blur-md sm:max-h-[92dvh] sm:rounded-lg sm:p-6">
              <div className="mx-auto mb-3 hidden h-12 w-12 items-center justify-center rounded-full border border-[#E94560]/50 bg-[#E94560]/12 text-pink-200 sm:mb-4 sm:flex sm:h-14 sm:w-14">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-white sm:mb-2 sm:text-2xl">Rune Sprint Ready</h3>
              <p className="mb-3 text-xs text-gray-300 sm:mb-5 sm:text-sm">
                {formatStudyRushResult(combat.studyCorrectRound, combat.studyQuestionsTotal)}. You earned {formatBoardTime(combat.boardTimeMax)} of board time. Spend boosts now; once the sprint starts, it is pure routing.
              </p>
              <div className="mb-3 grid grid-cols-5 gap-1.5 text-xs sm:mb-5 sm:gap-2 sm:text-sm">
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Correct</div>
                  <div className="font-bold text-green-300">{combat.studyCorrectRound}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Missed</div>
                  <div className="font-bold text-red-300">{combat.studyWrongRound}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Power</div>
                  <div className="font-bold text-cyan-200">{combat.powerPoints}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Focus</div>
                  <div className="font-bold text-purple-200">{combat.skillCharge}</div>
                </div>
                <div className="rounded-md bg-black/25 p-2 sm:p-3">
                  <div className="text-xs text-gray-500">Time</div>
                  <div className="font-bold text-pink-200">{formatBoardTime(combat.boardTimeMax)}</div>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-5">
                {(Object.keys(POWER_UP_DEFS) as PowerUpType[]).map(type => {
                  const power = POWER_UP_DEFS[type];
                  const cost = POWER_UP_COSTS[type];
                  const canUseThisBoost = type !== "mend" || combat.playerHp < combat.playerMaxHp;
                  return (
                    <button
                      key={type}
                      onClick={() => handlePowerUp(type)}
                      disabled={combat.powerPoints < cost || !canUseThisBoost}
                      className="rounded-md border px-2 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-2"
                      style={{
                        borderColor: power.color,
                        backgroundColor: `${power.color}16`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold sm:text-sm" style={{ color: power.color }}>{power.label}</span>
                        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-white sm:px-2 sm:text-xs">{cost} PP</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:mb-5 sm:grid-cols-2">
                {runParty.slice(0, 5).map(member => {
                  const skill = getSkillById(member.skillId);
                  if (!skill) return null;
                  const tile = TILE_DEFS[member.element];
                  const canUseSkill = canUseRuneSkills && combat.skillCharge >= skill.cost;
                  const tacticalHint = getSkillTacticalHint(skill.id, currentEnemy);
                  return (
                    <button
                      key={`ready-skill-${member.id}`}
                      type="button"
                      onClick={() => handleRuneSkill(skill.id)}
                      disabled={!canUseSkill}
                      className="rounded-md border bg-black/20 px-2 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-2"
                      style={{ borderColor: `${tile.color}66`, backgroundColor: `${tile.color}12` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-bold text-white sm:text-sm">{member.name}: {skill.name}</span>
                        <span className="shrink-0 rounded bg-black/30 px-2 py-0.5 text-xs font-bold text-cyan-100">{skill.cost} Focus</span>
                      </div>
                      <div className="mt-1 hidden text-[11px] font-semibold sm:block" style={{ color: tile.color }}>
                        {tacticalHint || skill.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={beginBoardPhase}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#E94560] py-3 font-bold text-white transition-all hover:bg-[#ff5b72]"
              >
                <Sparkles className="h-4 w-4" />
                Ready
              </button>
            </div>
          </div>
        )}

        {!showTutorial && !combat.isPaused && combat.mode === "resolveReady" && (
          <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center bg-gradient-to-t from-[#050816]/94 via-[#050816]/34 to-transparent px-3 pb-3 pt-24 sm:inset-0 sm:items-center sm:bg-[#050816]/88 sm:py-4">
            <div className="max-h-[48dvh] w-full max-w-lg overflow-auto rounded-t-lg border border-orange-300/40 bg-[#16213E]/94 p-3 text-center shadow-2xl backdrop-blur-md sm:max-h-[92dvh] sm:rounded-lg sm:p-6">
              <div className="mx-auto mb-3 hidden h-12 w-12 items-center justify-center rounded-full border border-orange-300/50 bg-orange-300/12 text-orange-100 sm:mb-4 sm:flex sm:h-14 sm:w-14">
                <Sword className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-white sm:mb-2 sm:text-2xl">Resolve Combat?</h3>
              <p className="mb-3 text-xs text-gray-300 sm:mb-4 sm:text-sm">
                Your rune assault is prepared. Check the result, then settle the exchange.
              </p>
              <div className="mb-3 grid gap-2 text-left text-xs sm:mb-5 sm:grid-cols-2 sm:text-sm">
                {resolvePreviewLines.map((line) => (
                  <div
                    key={`overlay-${line.label}-${line.value}`}
                    className={`rounded-md border px-2 py-1.5 sm:px-3 sm:py-2 ${
                      line.tone === "good"
                        ? "border-green-300/30 bg-green-300/10 text-green-100"
                        : line.tone === "bad"
                          ? "border-red-300/35 bg-red-300/10 text-red-100"
                          : line.tone === "warn"
                            ? "border-yellow-300/30 bg-yellow-300/10 text-yellow-100"
                            : "border-white/10 bg-black/20 text-gray-200"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{line.label}</div>
                    <div className="font-semibold">{line.value}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={settlePreparedRuneRound}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 py-3 font-bold text-white transition-all hover:bg-orange-400"
              >
                <Check className="h-4 w-4" />
                Settle Combat
              </button>
            </div>
          </div>
        )}

        {!showTutorial && !combat.isPaused && combat.mode === "study" && combat.currentWord && (
          <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center bg-gradient-to-t from-[#050816]/95 via-[#050816]/48 to-transparent px-3 pb-3 pt-[30dvh] sm:inset-0 sm:items-center sm:bg-[#050816]/92 sm:py-3">
            <div className="max-h-[68dvh] w-full max-w-2xl overflow-auto rounded-t-lg border border-[#0F3460] bg-[#16213E]/95 p-3 shadow-2xl backdrop-blur-md sm:max-h-[94dvh] sm:rounded-lg sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2 sm:mb-5 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <BookOpen className="h-5 w-5 text-cyan-300" />
                    <h3 className="text-base font-bold sm:text-xl">Study Set</h3>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                    {studyAnswered} answered
                  </p>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  <span className="rounded-md bg-black/30 px-2 py-1.5 text-xs font-bold text-cyan-100 sm:px-3 sm:py-2 sm:text-sm">
                    {combat.studyCorrectRound} correct
                  </span>
                  <span className="rounded-md bg-yellow-400/15 px-2 py-1.5 text-xs font-bold text-yellow-200 sm:px-3 sm:py-2 sm:text-sm">
                    {currentCardPower === currentCardStake ? `${currentCardStake} AP at stake` : `${currentCardPower}/${currentCardStake} AP available`}
                  </span>
                  {currentCardFocusBonus > 0 && (
                    <span className="rounded-md bg-purple-400/15 px-2 py-1.5 text-xs font-bold text-purple-100 sm:px-3 sm:py-2 sm:text-sm">
                      +{currentCardFocusBonus} Focus
                    </span>
                  )}
                  <span className="hidden rounded-md bg-black/30 px-2 py-1.5 text-xs font-bold text-gray-300 sm:inline-flex sm:px-3 sm:py-2 sm:text-sm">
                    Hand {combat.studyApOfferedThisRush}/{currentStudyApCap}
                  </span>
                </div>
              </div>

              <div className="mb-3 sm:mb-5">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-yellow-100">{combat.actionPointsEarnedThisRush} AP earned</span>
                  <span className="text-gray-500">{combat.studyApOfferedThisRush} / {currentStudyApCap} AP hand resolved</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-200 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (combat.studyApOfferedThisRush / Math.max(1, currentStudyApCap)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div
                className="mb-3 rounded-lg border-2 bg-[#0F3460]/90 p-3 transition-all duration-200 sm:mb-5 sm:p-5"
                style={{
                  borderColor: combat.studyFeedback ? "#FF4757" : "#E94560",
                }}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400 sm:mb-2 sm:text-xs">Definition</p>
                <p className="text-base leading-relaxed text-white sm:text-xl">{combat.currentWord.definition}</p>
              </div>

              {combat.studyFeedback && (
                <div className="mb-3 rounded-md border border-red-300/45 bg-red-500/12 p-3 shadow-lg sm:mb-4">
                  <div className="text-[10px] font-black uppercase tracking-wide text-red-100/75">Correct Answer</div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-black text-white">{combat.studyFeedback.correct}</span>
                    <span className="text-xs font-semibold text-red-100/80">{combat.studyFeedback.definition}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-red-100/70">
                    You chose {combat.studyFeedback.selected}.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                {(filteredOptions.length > 0 ? filteredOptions : combat.options || []).map((opt, i) => {
                  const isCorrectOption = combat.studyFeedback?.correct === opt;
                  const isSelectedWrongOption = combat.studyFeedback?.selected === opt && !isCorrectOption;
                  const btnClass = combat.studyFeedback
                    ? isCorrectOption
                      ? "border-green-300 bg-green-500/18 text-green-50 shadow-[0_0_18px_rgba(46,204,113,0.22)]"
                      : isSelectedWrongOption
                        ? "border-red-300 bg-red-500/18 text-red-50"
                        : "border-[#3a3a5c] bg-[#071225]/60 text-gray-500"
                    : "bg-[#071225] hover:bg-[#10254a] border-[#3a3a5c] text-white";

                  return (
                    <button
                      key={`${opt}-${i}`}
                      onClick={() => handleAnswer(opt)}
                      disabled={combat.phase !== "answering" || combat.isPaused}
                      className={`min-h-10 rounded-md border-2 px-3 py-2 text-left text-sm font-semibold transition-all duration-200 sm:min-h-12 sm:px-4 sm:py-3 sm:text-base ${btnClass}`}
                    >
                      <span className="mr-2 text-gray-500">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Reward Screen ────────────────────────────
  if (screen === "reward" && combat) {
    const isBossReward = combat.encounter.isBoss || combat.enemies.some(e => e.def.isBoss && e.isDead);
    const orbsEarned = combat.floor * 10;
    const rewardChoices = combat.rewardChoices;
    const pendingCharacterUnlocks = getPendingCharacterUnlocks(save, combat);
    const rampStride = getDeckRampStride(Math.max(1, activeDeckCards));
    
    return (
      <div className="relative h-screen w-full overflow-auto bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-58" style={assetBackground("/bg_combat_blob.png")} />
        <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4 py-6">
          <h2 
            className="text-4xl font-bold mb-2"
            style={{ color: "#F39C12", textShadow: "0 0 20px rgba(243,156,18,0.5)", fontFamily: "Cinzel, Georgia, serif" }}
          >
            {isBossReward ? "BOSS DEFEATED!" : combat.encounter.isElite ? "ELITE CLEARED!" : "VICTORY!"}
          </h2>
          <p className="text-gray-400 mb-6">Floor {combat.floor} cleared · {combat.encounter.rewardLabel}</p>
          
          {/* Stats */}
          <div className="flex gap-6 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">x{combat.maxCombo}</div>
              <div className="text-xs text-gray-500">Best Study Set</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">+{orbsEarned}</div>
              <div className="text-xs text-gray-500">Wisdom Orbs</div>
            </div>
          </div>

          <div className="mb-5 grid w-full max-w-4xl gap-2 text-sm md:grid-cols-2">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-cyan-100">
              <div className="font-bold">Deck ramp</div>
              <div className="text-xs text-cyan-100/75">
                {activeDeckCards} cards: difficulty advances every {rampStride} floor{rampStride === 1 ? "" : "s"}.
              </div>
            </div>
            <div className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-yellow-100">
              <div className="font-bold">Run milestones</div>
              <div className="text-xs text-yellow-100/75">
                {pendingCharacterUnlocks.length > 0
                  ? `${pendingCharacterUnlocks.map(character => character.name).join(", ")} will join this deck after the run.`
                  : "No new character milestone pending yet."}
              </div>
            </div>
          </div>

          {combat.relicChoices.length > 0 && (
            <div className="mb-6 w-full max-w-4xl">
              <h3 className="mb-3 flex items-center justify-center gap-2 text-lg font-bold text-white">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                Choose a Deck Relic
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {combat.relicChoices.map(relic => {
                  const tile = TILE_DEFS[relic.element];
                  const reason = getRelicChoiceReason(relic, combat);
                  return (
                    <button
                      key={relic.id}
                      onClick={() => claimRelic(relic)}
                      className="rounded-lg border-2 bg-[#071225]/90 p-4 text-left transition-all hover:scale-[1.02]"
                      style={{ borderColor: tile.color, boxShadow: `0 0 20px ${tile.glow}` }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{relic.name}</span>
                        <span className="rounded bg-black/30 px-2 py-0.5 text-xs capitalize" style={{ color: tile.color }}>{relic.rarity}</span>
                      </div>
                      <p className="text-sm text-gray-400">{relic.description}</p>
                      <div className="mt-3 rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: tile.color }}>{reason.tag}</div>
                        <div className="text-xs text-gray-300">{reason.text}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Reward cards */}
          {rewardChoices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 w-full max-w-4xl">
              {rewardChoices.map((rewardWord, i) => {
              const rarityColor = rewardWord.difficulty <= 2 ? "#95A5A6" : rewardWord.difficulty <= 4 ? "#3498DB" : "#9B59B6";
              const insight = getRewardCardInsight(rewardWord, combat);
              return (
                <div
                  key={rewardWord.id}
                  className={`reward-card-${i} bg-[#16213E] rounded-lg p-4 border-2 transition-all duration-200 text-left`}
                  style={{ borderColor: rarityColor }}
                >
                  <div className="text-xs mb-1" style={{ color: rarityColor }}>
                    {rewardWord.difficulty <= 2 ? "Common" : rewardWord.difficulty <= 4 ? "Uncommon" : "Rare"}
                  </div>
                  <div className="text-white font-bold text-lg mb-1">{rewardWord.word}</div>
                  <div className="text-gray-400 text-xs mb-2">{rewardWord.definition}</div>
                  <div className="mb-3 rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: rarityColor }}>{insight.tag}</div>
                    <div className="text-xs text-gray-300">{insight.text}</div>
                  </div>
                  <div className="mb-4 flex items-center gap-1 text-sm" style={{ color: rarityColor }}>
                    <BookOpen className="h-3 w-3" />
                    <span>Choose a study rank</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CARD_RATINGS.map(rating => (
                      <button
                        key={rating.id}
                        onClick={() => claimRewardCard(rewardWord, rating.id)}
                        disabled={combat.relicChoices.length > 0}
                        className="px-2 py-2 rounded-md border text-xs font-bold transition-all hover:scale-[1.03]"
                        style={{
                          borderColor: rating.color,
                          color: rating.color,
                          backgroundColor: combat.relicChoices.length > 0 ? "rgba(80,80,95,0.18)" : `${rating.color}18`,
                          opacity: combat.relicChoices.length > 0 ? 0.45 : 1,
                        }}
                      >
                        {rating.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          ) : (
            <button
              onClick={() => {
                if (combat.relicChoices.length > 0) return;
                setSave(prev => ({ ...prev, wisdomOrbs: prev.wisdomOrbs + orbsEarned }));
                nextFloor();
              }}
              disabled={combat.relicChoices.length > 0}
              className="px-8 py-3 mb-6 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-all disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              Continue
            </button>
          )}
          
          <div className="flex items-center gap-3 text-gray-500 text-sm mb-4">
            <span>{combat.relicChoices.length > 0 ? "Choose a relic first, then add one word" : "Choose one word and set its learning rank"}</span>
            <span className="flex items-center gap-1">
              <Layers className="w-4 h-4" />
              Deck: {combat.deck.length} cards
            </span>
          </div>
          
          {/* Heal on boss kill */}
          {isBossReward && (
            <div className="flex items-center gap-2 text-green-400 mb-4">
              <Heart className="w-5 h-5" />
              <span>+30% HP restored!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Game Over ────────────────────────────────
  if (screen === "gameOver") {
    const lastCombat = combat;
    const floor = lastCombat?.floor || 1;
    const finalScore = lastCombat?.score || 0;
    const orbsEarned = floor * 10 + (lastCombat?.correctCount || 0) * 2 + (lastCombat?.maxCombo || 0) * 5;
    const bestFloor = activeDeckStats.bestFloor;
    const isNewBest = floor >= bestFloor;
    
    // Check unlocks
    const unlockChecks = [
      { classId: "speedreader", requirement: "Reach Floor 5", met: floor >= 5, cost: 100 },
      { classId: "scholar", requirement: "Learn 50 words (total correct)", met: save.stats.totalCorrect >= 50, cost: 200 },
    ];
    
    return (
      <div className="relative w-full h-screen overflow-hidden bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-48" style={assetBackground("/bg_combat_blob.png")} />
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-[#1A1A2E]" />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
          <h2 
            className="text-5xl font-bold mb-2"
            style={{ color: "#FF4757", textShadow: "0 0 30px rgba(255,71,87,0.5)", fontFamily: "Cinzel, Georgia, serif" }}
          >
            DEFEATED
          </h2>
          
          <p className="text-gray-400 mb-6 text-lg">
            You reached <span className="text-white font-bold">Floor {floor}</span>
            {isNewBest && <span className="text-yellow-400 ml-2">(New Best!)</span>}
          </p>
          
          {/* Stats */}
          <div className="bg-[#16213E]/80 rounded-2xl p-6 border border-[#0F3460] max-w-md w-full mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{lastCombat?.correctCount || 0}</div>
                <div className="text-xs text-gray-500">Correct Answers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{accuracy}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">x{lastCombat?.maxCombo || 0}</div>
                <div className="text-xs text-gray-500">Max Combo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{finalScore.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#0F3460] flex items-center justify-center gap-2">
              <img src={assetUrl("/wisdom_orb_blob.svg")} alt="" className="h-6 w-6" />
              <span className="text-yellow-400 font-bold text-lg">+{orbsEarned} Wisdom Orbs</span>
            </div>
          </div>
          
          {/* Unlock notifications */}
          {unlockChecks.map(check => {
            if (!check.met || getDeckUnlockedClasses(activeDeck).includes(check.classId)) return null;
            const cls = getClassById(check.classId);
            return (
              <div key={check.classId} className="bg-purple-500/20 border border-purple-500 rounded-xl p-4 mb-4 max-w-md w-full flex items-center gap-4">
                <img src={assetUrl(cls?.sprite)} alt="" className="w-12 h-12 object-contain" />
                <div>
                  <p className="text-purple-400 font-bold">New Class Unlocked!</p>
                  <p className="text-white">{cls?.name} is now available</p>
                </div>
              </div>
            );
          })}
          
          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setScreen("meta")}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F3460] hover:bg-[#1a4a7a] rounded-lg text-white font-bold transition-all"
            >
              <Star className="w-5 h-5 text-yellow-400" />
              Upgrades
            </button>
            <button
              onClick={() => {
                setCombat(null);
                setScreen("classSelect");
              }}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-all hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
            <button
              onClick={goToMenu}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
            >
              <Home className="w-5 h-5" />
              Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Meta Upgrade ─────────────────────────────
  if (screen === "meta") {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-[#1A1A2E]">
        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={assetBackground("/bg_menu_blob.png")} />
        
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#0F3460]">
            <button
              onClick={() => setScreen("menu")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back
            </button>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Cinzel, Georgia, serif" }}>Deck Upgrades</h2>
            <div className="flex items-center gap-2">
              <img src={assetUrl("/wisdom_orb_blob.svg")} alt="" className="h-6 w-6" />
              <span className="text-yellow-400 font-bold">{save.wisdomOrbs}</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Character Classes */}
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sword className="w-5 h-5 text-blue-400" />
              {activeDeck.name} Classes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {CLASSES.map(cls => {
                const isUnlocked = getDeckUnlockedClasses(activeDeck).includes(cls.id);
                const canUnlock = !isUnlocked && save.wisdomOrbs >= cls.unlockCost;
                
                return (
                  <div 
                    key={cls.id} 
                    className={`rounded-xl p-4 border-2 ${
                      isUnlocked ? "bg-[#16213E] border-[#0F3460]" : "bg-gray-900/50 border-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <img src={assetUrl(cls.sprite)} alt="" className="w-12 h-12 object-contain" />
                      <div>
                        <h4 className="text-white font-bold">{cls.name}</h4>
                        <p className="text-gray-500 text-xs">{cls.passiveDescription}</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{cls.description}</p>
                    
                    {isUnlocked ? (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        Unlocked
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (canUnlock) {
                            setSave(prev => ({
                              ...prev,
                              wisdomOrbs: prev.wisdomOrbs - cls.unlockCost,
                              decks: prev.decks.map(deck => deck.id === getActiveDeckId(prev)
                                ? {
                                    ...deck,
                                    unlockedClasses: Array.from(new Set([...(deck.unlockedClasses || []), cls.id])),
                                    unlockedCharacterIds: Array.from(new Set([...(deck.unlockedCharacterIds || []), cls.id])),
                                    updatedAt: Date.now(),
                                  }
                                : deck),
                            }));
                          }
                        }}
                        disabled={!canUnlock}
                        className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                          canUnlock
                            ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                            : "bg-gray-800 text-gray-600 cursor-not-allowed"
                        }`}
                      >
                        {canUnlock ? `Unlock (${cls.unlockCost} orbs)` : `Locked (${cls.unlockCost} orbs)`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-300" />
              {activeDeck.name} Party
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
              {CHARACTER_DEFS.map(character => {
                const isUnlocked = getRunParty(save).some(member => member.id === character.id);
                const tile = TILE_DEFS[character.element];
                const skill = getSkillById(character.skillId);

                return (
                  <div
                    key={character.id}
                    className={`rounded-xl border p-3 ${isUnlocked ? "bg-[#16213E]" : "bg-gray-900/45 opacity-70"}`}
                    style={{ borderColor: isUnlocked ? `${tile.color}88` : "rgba(75,85,99,0.8)" }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <img src={assetUrl(character.sprite)} alt="" className="h-10 w-10 object-contain" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{character.name}</div>
                        <div className="truncate text-xs" style={{ color: tile.color }}>{TILE_DEFS[character.element].label}</div>
                      </div>
                    </div>
                    <p className="mb-2 text-xs text-gray-400">{skill?.name}: {skill?.description}</p>
                    <div className={isUnlocked ? "text-xs font-bold text-green-300" : "text-xs text-gray-500"}>
                      {isUnlocked ? "In party pool" : character.unlockHint}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Stats */}
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Career Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#16213E] rounded-xl p-4 border border-[#0F3460]">
                <div className="text-2xl font-bold text-white">{save.stats.totalRuns}</div>
                <div className="text-xs text-gray-500">Total Runs</div>
              </div>
              <div className="bg-[#16213E] rounded-xl p-4 border border-[#0F3460]">
                <div className="text-2xl font-bold text-white">{save.stats.bestFloor}</div>
                <div className="text-xs text-gray-500">Best Floor</div>
              </div>
              <div className="bg-[#16213E] rounded-xl p-4 border border-[#0F3460]">
                <div className="text-2xl font-bold text-white">{save.stats.bestScore.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Best Score</div>
              </div>
              <div className="bg-[#16213E] rounded-xl p-4 border border-[#0F3460]">
                <div className="text-2xl font-bold text-white">{save.stats.maxCombo}</div>
                <div className="text-xs text-gray-500">Max Combo</div>
              </div>
              <div className="bg-[#16213E] rounded-xl p-4 border border-[#0F3460]">
                <div className="text-2xl font-bold text-white">{save.stats.totalCorrect}</div>
                <div className="text-xs text-gray-500">Total Correct</div>
              </div>
              <div className="bg-[#16213E] rounded-xl p-4 border border-[#0F3460]">
                <div className="text-2xl font-bold text-white">
                  {save.stats.totalCorrect + save.stats.totalWrong > 0 
                    ? Math.round((save.stats.totalCorrect / (save.stats.totalCorrect + save.stats.totalWrong)) * 100) 
                    : 0}%
                </div>
                <div className="text-xs text-gray-500">Lifetime Accuracy</div>
              </div>
            </div>
            
            {/* Reset button */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to reset all progress?")) {
                    localStorage.removeItem(SAVE_KEY);
                    setSave(loadSave());
                  }
                }}
                className="text-red-500 hover:text-red-400 text-sm transition-all"
              >
                Reset All Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
