import VOCABULARY, { generateDistractors, type VocabWord } from "../data/vocabulary";
import {
  DEFAULT_STUDY_SETTINGS,
  chooseQuestionType,
  createDirectionStudyProgress,
  getCorrectAnswerAp,
  getEnabledStudyDirections,
  getInitialMastery,
  getMasteryLabel,
  getStudyDirectionKey,
  getStudyProgressWeight,
  getStudyQueuePriority,
  normalizeDirectionStudyProgress,
  normalizeStudySettings,
  updateDirectionStudyProgress,
  type DeckStudySettings,
  type DirectionStudyProgress,
  type StudyDirection,
  type StudyQuestionType,
} from "../game/study";
import type { BlobTacticsState } from "./blobTactics";

const SAVE_KEY = "lexicon_labyrinth_save";
const RUN_SAVE_KEY = "lexicon_labyrinth_blob_tactics_runs";
const STARTER_DECK_ID = "starter-japanese";
const STARTER_CARD_COUNT = 6;

interface LegacyCardProgress {
  box: number;
  correctStreak: number;
  wrongStreak: number;
  seen: number;
  correct: number;
  wrong: number;
  dueAt: number;
}

interface BlobSavedDeck {
  id: string;
  name: string;
  cards: VocabWord[];
  cardRatings?: Record<string, "hard" | "medium" | "easy" | "known">;
  cardProgress?: Record<string, LegacyCardProgress>;
  introducedCardIds?: string[];
  directionProgress?: Record<string, DirectionStudyProgress>;
  studySettings?: DeckStudySettings;
  updatedAt?: number;
  [key: string]: unknown;
}

interface BlobSaveData {
  selectedDeckId: string;
  decks: BlobSavedDeck[];
  [key: string]: unknown;
}

export interface BlobStudyDeckSummary {
  id: string;
  name: string;
  cardCount: number;
  reviewCount: number;
  introducedCount: number;
}

export interface BlobStudyQuestion {
  cardId: string;
  prompt: string;
  answer: string;
  definition: string;
  direction: StudyDirection;
  questionType: StudyQuestionType;
  options: string[];
  masteryBefore: number;
  masteryLabel: string;
  reward: number;
}

export interface BlobStudyAnswerResult {
  isCorrect: boolean;
  answer: string;
  masteryBefore: number;
  masteryAfter: number;
  masteryEvent: string;
  upgraded: boolean;
}

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const createFallbackDeck = (): BlobSavedDeck => ({
  id: STARTER_DECK_ID,
  name: "Starter Deck",
  cards: VOCABULARY,
  cardRatings: {},
  cardProgress: {},
  introducedCardIds: [],
  directionProgress: {},
  studySettings: DEFAULT_STUDY_SETTINGS,
  updatedAt: Date.now(),
});

const createFallbackSave = (): BlobSaveData => {
  const deck = createFallbackDeck();
  return { selectedDeckId: deck.id, decks: [deck] };
};

function loadSave(): BlobSaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BlobSaveData>;
      if (Array.isArray(parsed.decks) && parsed.decks.length > 0) {
        return {
          ...parsed,
          selectedDeckId: typeof parsed.selectedDeckId === "string" ? parsed.selectedDeckId : parsed.decks[0].id,
          decks: parsed.decks.map(deck => ({
            ...deck,
            cards: Array.isArray(deck.cards) ? deck.cards : [],
            cardRatings: deck.cardRatings || {},
            cardProgress: deck.cardProgress || {},
            introducedCardIds: Array.isArray(deck.introducedCardIds) ? deck.introducedCardIds : [],
            directionProgress: deck.directionProgress || {},
            studySettings: normalizeStudySettings(deck.studySettings),
          })),
        } as BlobSaveData;
      }
    }
  } catch {
    // A malformed save should not prevent the standalone lab from loading.
  }
  return createFallbackSave();
}

function persistSave(save: BlobSaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function updateDeck(deckId: string, updater: (deck: BlobSavedDeck) => BlobSavedDeck): BlobSavedDeck {
  const save = loadSave();
  const current = save.decks.find(deck => deck.id === deckId) || save.decks[0] || createFallbackDeck();
  const nextDeck = { ...updater(current), updatedAt: Date.now() };
  const hasDeck = save.decks.some(deck => deck.id === nextDeck.id);
  persistSave({
    ...save,
    selectedDeckId: nextDeck.id,
    decks: hasDeck
      ? save.decks.map(deck => deck.id === nextDeck.id ? nextDeck : deck)
      : [...save.decks, nextDeck],
  });
  return nextDeck;
}

function getDirectionProgress(deck: BlobSavedDeck, card: VocabWord, direction: StudyDirection): DirectionStudyProgress {
  const rating = deck.cardRatings?.[card.id];
  return normalizeDirectionStudyProgress(deck.directionProgress?.[getStudyDirectionKey(card.id, direction)], getInitialMastery(rating));
}

function ensureStudyCards(deckId: string): BlobSavedDeck {
  return updateDeck(deckId, deck => {
    const knownIds = new Set(Object.entries(deck.cardRatings || {}).filter(([, rating]) => rating === "known").map(([cardId]) => cardId));
    const introducedIds = new Set((deck.introducedCardIds || []).filter(cardId => deck.cards.some(card => card.id === cardId) && !knownIds.has(cardId)));
    if (introducedIds.size === 0) {
      deck.cards.filter(card => !knownIds.has(card.id)).slice(0, STARTER_CARD_COUNT).forEach(card => introducedIds.add(card.id));
    }
    const directionProgress = { ...(deck.directionProgress || {}) };
    const settings = normalizeStudySettings(deck.studySettings);
    deck.cards.filter(card => introducedIds.has(card.id)).forEach(card => {
      getEnabledStudyDirections(settings).forEach(direction => {
        const key = getStudyDirectionKey(card.id, direction);
        if (!directionProgress[key]) directionProgress[key] = createDirectionStudyProgress(getInitialMastery(deck.cardRatings?.[card.id]));
      });
    });
    return {
      ...deck,
      introducedCardIds: [...introducedIds],
      directionProgress,
      studySettings: settings,
    };
  });
}

function createOptions(card: VocabWord, direction: StudyDirection, deck: BlobSavedDeck): string[] {
  if (direction === "definition_to_term") return generateDistractors(card, deck.cards);
  const distractors = shuffle(deck.cards
    .filter(candidate => candidate.id !== card.id && candidate.definition !== card.definition)
    .map(candidate => candidate.definition))
    .slice(0, 3);
  return shuffle([card.definition, ...distractors]);
}

export function getBlobStudyDecks(): BlobStudyDeckSummary[] {
  return loadSave().decks.map(deck => {
    const introduced = new Set(deck.introducedCardIds || []);
    return {
      id: deck.id,
      name: deck.name,
      cardCount: deck.cards.length,
      introducedCount: introduced.size,
      reviewCount: Object.values(deck.directionProgress || {}).reduce((sum, progress) => sum + (progress.seen || 0), 0),
    };
  });
}

export function getSelectedBlobStudyDeckId(): string {
  const save = loadSave();
  return save.decks.some(deck => deck.id === save.selectedDeckId) ? save.selectedDeckId : save.decks[0]?.id || STARTER_DECK_ID;
}

export function selectBlobStudyDeck(deckId: string): BlobSavedDeck {
  return ensureStudyCards(deckId);
}

export function drawBlobStudyQuestion(deckId: string, previousKey?: string): BlobStudyQuestion {
  const deck = ensureStudyCards(deckId);
  const settings = normalizeStudySettings(deck.studySettings);
  const knownIds = new Set(Object.entries(deck.cardRatings || {}).filter(([, rating]) => rating === "known").map(([cardId]) => cardId));
  const introducedIds = new Set(deck.introducedCardIds || []);
  const candidates = deck.cards
    .filter(card => introducedIds.has(card.id) && !knownIds.has(card.id))
    .flatMap(card => getEnabledStudyDirections(settings).map(direction => ({
      card,
      direction,
      key: getStudyDirectionKey(card.id, direction),
      progress: getDirectionProgress(deck, card, direction),
    })));
  if (candidates.length === 0) throw new Error("This deck needs at least one active study card.");
  const withoutPrevious = candidates.length > 1 ? candidates.filter(candidate => candidate.key !== previousKey) : candidates;
  const available = withoutPrevious.length > 0 ? withoutPrevious : candidates;
  const now = Date.now();
  const priority = Math.min(...available.map(candidate => getStudyQueuePriority(candidate.progress, now)));
  const pool = available.filter(candidate => getStudyQueuePriority(candidate.progress, now) === priority);
  const totalWeight = pool.reduce((sum, candidate) => sum + getStudyProgressWeight(candidate.progress, now, candidate.card.difficulty), 0);
  let roll = Math.random() * totalWeight;
  let selected = pool[pool.length - 1];
  for (const candidate of pool) {
    roll -= getStudyProgressWeight(candidate.progress, now, candidate.card.difficulty);
    if (roll <= 0) {
      selected = candidate;
      break;
    }
  }
  const questionType = chooseQuestionType(settings, selected.progress);
  return {
    cardId: selected.card.id,
    prompt: selected.direction === "term_to_definition" ? selected.card.word : selected.card.definition,
    answer: selected.direction === "term_to_definition" ? selected.card.definition : selected.card.word,
    definition: selected.card.definition,
    direction: selected.direction,
    questionType,
    options: questionType === "multiple_choice" ? createOptions(selected.card, selected.direction, deck) : [],
    masteryBefore: selected.progress.mastery,
    masteryLabel: getMasteryLabel(selected.progress.mastery),
    reward: getCorrectAnswerAp(selected.progress, questionType),
  };
}

export function answerBlobStudyQuestion(deckId: string, question: BlobStudyQuestion, isCorrect: boolean): BlobStudyAnswerResult {
  let answerResult: BlobStudyAnswerResult | null = null;
  updateDeck(deckId, deck => {
    const card = deck.cards.find(candidate => candidate.id === question.cardId);
    if (!card) return deck;
    const key = getStudyDirectionKey(card.id, question.direction);
    const currentDirection = getDirectionProgress(deck, card, question.direction);
    const nextDirection = updateDirectionStudyProgress(currentDirection, isCorrect, question.questionType);
    const currentCard = deck.cardProgress?.[card.id] || { box: 2, correctStreak: 0, wrongStreak: 0, seen: 0, correct: 0, wrong: 0, dueAt: 0 };
    const nextBox = isCorrect ? Math.min(5, currentCard.box + 1) : Math.max(1, currentCard.box - (currentCard.wrongStreak > 0 ? 2 : 1));
    answerResult = {
      isCorrect,
      answer: question.answer,
      masteryBefore: currentDirection.mastery,
      masteryAfter: nextDirection.mastery,
      masteryEvent: getMasteryLabel(currentDirection.mastery) === getMasteryLabel(nextDirection.mastery)
        ? ""
        : `${card.word} is now ${getMasteryLabel(nextDirection.mastery)}.`,
      upgraded: isCorrect && (question.reward >= 1.2 || card.difficulty >= 4),
    };
    return {
      ...deck,
      directionProgress: { ...(deck.directionProgress || {}), [key]: nextDirection },
      cardProgress: {
        ...(deck.cardProgress || {}),
        [card.id]: {
          box: nextBox,
          correctStreak: isCorrect ? currentCard.correctStreak + 1 : 0,
          wrongStreak: isCorrect ? 0 : currentCard.wrongStreak + 1,
          seen: currentCard.seen + 1,
          correct: currentCard.correct + (isCorrect ? 1 : 0),
          wrong: currentCard.wrong + (isCorrect ? 0 : 1),
          dueAt: nextDirection.dueAt,
        },
      },
    };
  });
  if (!answerResult) throw new Error("The reviewed card is no longer available.");
  return answerResult;
}

export function loadBlobTacticsRun(deckId: string): BlobTacticsState | null {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    const runs = raw ? JSON.parse(raw) as Record<string, BlobTacticsState> : {};
    return runs[deckId] || null;
  } catch {
    return null;
  }
}

export function saveBlobTacticsRun(deckId: string, state: BlobTacticsState) {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    const runs = raw ? JSON.parse(raw) as Record<string, BlobTacticsState> : {};
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify({ ...runs, [deckId]: state }));
  } catch {
    // The lab remains playable even if browser storage is unavailable.
  }
}

export function clearBlobTacticsRun(deckId: string) {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    const runs = raw ? JSON.parse(raw) as Record<string, BlobTacticsState> : {};
    delete runs[deckId];
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(runs));
  } catch {
    // Ignore storage failures in the standalone lab.
  }
}
