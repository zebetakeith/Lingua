import VOCABULARY, { generateDistractors, type VocabWord } from "../data/vocabulary.ts";
import {
  DEFAULT_STUDY_SETTINGS,
  chooseQuestionType,
  getCorrectAnswerReward,
  getEnabledStudyDirections,
  getInitialMastery,
  getMasteryLabel,
  getStudyDirectionKey,
  getReviewDay,
  getStudyPressureProfile,
  getStudyProgressWeight,
  getStudyQueuePriority,
  normalizeDirectionStudyProgress,
  normalizeStudySettings,
  updateDirectionStudyProgress,
  type DeckStudySettings,
  type DirectionStudyProgress,
  type StudyDirection,
  type StudyPressureProfile,
  type StudyQuestionType,
  type StudyRecallMode,
  type StudyRewardCurve,
} from "./study.ts";

const SAVE_KEY = "lexicon_labyrinth_save";
const STARTER_DECK_ID = "starter-japanese";

function stableCardHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function getCardFingerprint(card: Pick<VocabWord, "word" | "definition">): string {
  const normalized = `${card.word.trim().toLocaleLowerCase()}\u241f${card.definition.trim().toLocaleLowerCase()}`;
  return `card-${stableCardHash(normalized)}`;
}

function repairDuplicateCardIds(cards: VocabWord[]): VocabWord[] {
  const usedIds = new Set<string>();
  return cards.map((card, index) => {
    const baseId = typeof card.id === "string" && card.id.trim() ? card.id.trim() : `card-${index + 1}`;
    let repairedId = baseId;
    if (usedIds.has(repairedId)) {
      const fingerprint = getCardFingerprint(card);
      repairedId = `${baseId}-recovered-${fingerprint}`;
      let suffix = 2;
      while (usedIds.has(repairedId)) {
        repairedId = `${baseId}-recovered-${fingerprint}-${suffix}`;
        suffix += 1;
      }
    }
    usedIds.add(repairedId);
    return repairedId === card.id ? card : { ...card, id: repairedId };
  });
}

interface LegacyCardProgress {
  box: number;
  correctStreak: number;
  wrongStreak: number;
  seen: number;
  correct: number;
  wrong: number;
  dueAt: number;
}

interface StudyDeck {
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

interface StudySave {
  selectedDeckId: string;
  decks: StudyDeck[];
  [key: string]: unknown;
}

export interface StudyDeckSummary {
  id: string;
  name: string;
  cardCount: number;
  activeCount: number;
  introducedCount: number;
  reviewCount: number;
}

export interface StudyQuestion {
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
  due: boolean;
  seenBefore: boolean;
  pressure: StudyPressureProfile;
  rewardCurve: StudyRewardCurve;
}

export interface StudyAnswerResult {
  isCorrect: boolean;
  answer: string;
  masteryBefore: number;
  masteryAfter: number;
  masteryEvent: string;
  wasUnseen: boolean;
  progressKey: string;
}

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

function createFallbackDeck(): StudyDeck {
  return {
    id: STARTER_DECK_ID,
    name: "Starter Deck",
    cards: VOCABULARY,
    cardRatings: {},
    cardProgress: {},
    introducedCardIds: [],
    directionProgress: {},
    studySettings: DEFAULT_STUDY_SETTINGS,
    updatedAt: Date.now(),
  };
}

function createFallbackSave(): StudySave {
  const deck = createFallbackDeck();
  return { selectedDeckId: deck.id, decks: [deck] };
}

function loadSave(): StudySave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudySave>;
      if (Array.isArray(parsed.decks) && parsed.decks.length > 0) {
        return {
          ...parsed,
          selectedDeckId: typeof parsed.selectedDeckId === "string" ? parsed.selectedDeckId : parsed.decks[0].id,
          decks: parsed.decks.map(deck => ({
            ...deck,
            cards: repairDuplicateCardIds(Array.isArray(deck.cards) ? deck.cards : []),
            cardRatings: deck.cardRatings || {},
            cardProgress: deck.cardProgress || {},
            introducedCardIds: Array.isArray(deck.introducedCardIds) ? deck.introducedCardIds : [],
            directionProgress: deck.directionProgress || {},
            studySettings: normalizeStudySettings(deck.studySettings),
          })),
        } as StudySave;
      }
    }
  } catch {
    // A malformed save should not prevent the study bridge from loading.
  }
  return createFallbackSave();
}

function persistSave(save: StudySave) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function updateDeck(deckId: string, updater: (deck: StudyDeck) => StudyDeck): StudyDeck {
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

function getDirectionProgress(deck: StudyDeck, card: VocabWord, direction: StudyDirection): DirectionStudyProgress {
  const rating = deck.cardRatings?.[card.id];
  const stored = deck.directionProgress?.[getStudyDirectionKey(card.id, direction)];
  const fingerprint = getCardFingerprint(card);
  const progress = stored?.cardFingerprint && stored.cardFingerprint !== fingerprint ? null : stored;
  return {
    ...normalizeDirectionStudyProgress(
    progress,
    getInitialMastery(rating),
    ),
    cardFingerprint: fingerprint,
  };
}

function ensureStudyCards(deckId: string): StudyDeck {
  return updateDeck(deckId, deck => {
    const knownIds = new Set(Object.entries(deck.cardRatings || {})
      .filter(([, rating]) => rating === "known")
      .map(([cardId]) => cardId));
    const introducedIds = new Set((deck.introducedCardIds || [])
      .filter(cardId => deck.cards.some(card => card.id === cardId) && !knownIds.has(cardId)));
    const directionProgress = { ...(deck.directionProgress || {}) };
    const settings = normalizeStudySettings(deck.studySettings);
    deck.cards.filter(card => introducedIds.has(card.id)).forEach(card => {
      getEnabledStudyDirections(settings).forEach(direction => {
        const key = getStudyDirectionKey(card.id, direction);
        directionProgress[key] = getDirectionProgress({ ...deck, directionProgress }, card, direction);
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

function createOptions(card: VocabWord, direction: StudyDirection, deck: StudyDeck, shouldShuffle: boolean): string[] {
  const options = direction === "definition_to_term"
    ? generateDistractors(card, deck.cards)
    : [
        card.definition,
        ...shuffle(deck.cards
          .filter(candidate => candidate.id !== card.id && candidate.definition !== card.definition)
          .map(candidate => candidate.definition))
          .slice(0, 3),
      ];
  return shouldShuffle ? shuffle(options) : options;
}

export function getStudyDecks(): StudyDeckSummary[] {
  return loadSave().decks.map(deck => {
    const activeIds = new Set(deck.cards
      .filter(card => deck.cardRatings?.[card.id] !== "known")
      .map(card => card.id));
    return {
      id: deck.id,
      name: deck.name,
      cardCount: deck.cards.length,
      activeCount: activeIds.size,
      introducedCount: new Set((deck.introducedCardIds || []).filter(cardId => activeIds.has(cardId))).size,
      reviewCount: Object.values(deck.directionProgress || {}).reduce((sum, progress) => sum + (progress.seen || 0), 0),
    };
  });
}

export function getSelectedStudyDeckId(): string {
  const save = loadSave();
  return save.decks.some(deck => deck.id === save.selectedDeckId)
    ? save.selectedDeckId
    : save.decks[0]?.id || STARTER_DECK_ID;
}

export function selectStudyDeck(deckId: string) {
  ensureStudyCards(deckId);
}

export function introduceStudyCards(deckId: string, count: number): VocabWord[] {
  let introduced: VocabWord[] = [];
  updateDeck(deckId, deck => {
    const knownIds = new Set(Object.entries(deck.cardRatings || {})
      .filter(([, rating]) => rating === "known")
      .map(([cardId]) => cardId));
    const introducedIds = new Set(deck.introducedCardIds || []);
    introduced = deck.cards
      .filter(card => !knownIds.has(card.id) && !introducedIds.has(card.id))
      .slice(0, Math.max(0, Math.floor(count)));
    const settings = normalizeStudySettings(deck.studySettings);
    const directionProgress = { ...(deck.directionProgress || {}) };
    introduced.forEach(card => {
      introducedIds.add(card.id);
      getEnabledStudyDirections(settings).forEach(direction => {
        const key = getStudyDirectionKey(card.id, direction);
        directionProgress[key] = getDirectionProgress({ ...deck, directionProgress }, card, direction);
      });
    });
    return { ...deck, introducedCardIds: [...introducedIds], directionProgress };
  });
  return introduced;
}

export function getStudyQuestionKey(question: Pick<StudyQuestion, "cardId" | "direction">): string {
  return getStudyDirectionKey(question.cardId, question.direction);
}

export function drawStudyQuestion(
  deckId: string,
  rewardCurve: StudyRewardCurve,
  previousKey?: string,
  recallMode: StudyRecallMode = "deck",
): StudyQuestion {
  const deck = ensureStudyCards(deckId);
  const settings = normalizeStudySettings(deck.studySettings);
  const knownIds = new Set(Object.entries(deck.cardRatings || {})
    .filter(([, rating]) => rating === "known")
    .map(([cardId]) => cardId));
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
  const totalWeight = pool.reduce(
    (sum, candidate) => sum + getStudyProgressWeight(candidate.progress, now, candidate.card.difficulty),
    0,
  );
  let roll = Math.random() * totalWeight;
  let selected = pool[pool.length - 1];
  for (const candidate of pool) {
    roll -= getStudyProgressWeight(candidate.progress, now, candidate.card.difficulty);
    if (roll <= 0) {
      selected = candidate;
      break;
    }
  }
  const questionType = chooseQuestionType(settings, selected.progress, selected.direction, recallMode);
  const seenBefore = selected.progress.seen > 0;
  return {
    cardId: selected.card.id,
    prompt: selected.direction === "term_to_definition" ? selected.card.word : selected.card.definition,
    answer: selected.direction === "term_to_definition" ? selected.card.definition : selected.card.word,
    definition: selected.card.definition,
    direction: selected.direction,
    questionType,
    options: questionType === "multiple_choice"
      ? createOptions(selected.card, selected.direction, deck, settings.shuffleAnswers)
      : [],
    masteryBefore: selected.progress.mastery,
    masteryLabel: getMasteryLabel(selected.progress.mastery),
    reward: seenBefore ? getCorrectAnswerReward(selected.progress, questionType, rewardCurve, now) : 0.25,
    due: selected.progress.dueAt <= now,
    seenBefore,
    pressure: getStudyPressureProfile(selected.progress),
    rewardCurve,
  };
}

export function tryDrawStudyQuestion(
  deckId: string,
  rewardCurve: StudyRewardCurve,
  previousKey?: string,
  recallMode: StudyRecallMode = "deck",
): StudyQuestion | null {
  try {
    return drawStudyQuestion(deckId, rewardCurve, previousKey, recallMode);
  } catch (error) {
    if (error instanceof Error && error.message === "This deck needs at least one active study card.") return null;
    throw error;
  }
}

export function isStudyQuestionUnavailableError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === "The reviewed card is no longer available."
    || error.message === "The introduced card is no longer available."
  );
}

function normalizeTypedAnswer(value: string, direction: StudyDirection): string {
  let normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (direction === "term_to_definition") {
    normalized = normalized.replace(/^(?:a|an|the|to)\s+/, "");
  }
  return normalized;
}

function getTypedAnswerVariants(answer: string, direction: StudyDirection): string[] {
  const pieces = answer.split(/\s*(?:\/|;|\||\bor\b)\s*/iu).filter(Boolean);
  return Array.from(new Set(pieces.flatMap(piece => {
    const withoutParenthetical = piece.replace(/\s*\([^)]*\)\s*/g, " ");
    return [piece, withoutParenthetical].map(value => normalizeTypedAnswer(value, direction)).filter(Boolean);
  })));
}

export function isTypedStudyAnswerCorrect(
  input: string,
  answer: string,
  direction: StudyDirection,
): boolean {
  const normalizedInput = normalizeTypedAnswer(input, direction);
  if (!normalizedInput) return false;
  return getTypedAnswerVariants(answer, direction).includes(normalizedInput);
}

export function answerStudyQuestion(
  deckId: string,
  question: StudyQuestion,
  isCorrect: boolean,
): StudyAnswerResult {
  let answerResult: StudyAnswerResult | null = null;
  updateDeck(deckId, deck => {
    const card = deck.cards.find(candidate => candidate.id === question.cardId);
    if (!card || deck.cardRatings?.[card.id] === "known") return deck;
    const key = getStudyDirectionKey(card.id, question.direction);
    const currentDirection = getDirectionProgress(deck, card, question.direction);
    const nextDirection = updateDirectionStudyProgress(currentDirection, isCorrect, question.questionType);
    const currentCard = deck.cardProgress?.[card.id] || {
      box: 2,
      correctStreak: 0,
      wrongStreak: 0,
      seen: 0,
      correct: 0,
      wrong: 0,
      dueAt: 0,
    };
    const nextBox = isCorrect
      ? Math.min(5, currentCard.box + 1)
      : Math.max(1, currentCard.box - (currentCard.wrongStreak > 0 ? 2 : 1));
    answerResult = {
      isCorrect,
      answer: question.answer,
      masteryBefore: currentDirection.mastery,
      masteryAfter: nextDirection.mastery,
      masteryEvent: getMasteryLabel(currentDirection.mastery) === getMasteryLabel(nextDirection.mastery)
        ? ""
        : `${card.word} is now ${getMasteryLabel(nextDirection.mastery)}.`,
      wasUnseen: currentDirection.seen === 0,
      progressKey: key,
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

export function completeStudyExposure(
  deckId: string,
  question: StudyQuestion,
): StudyAnswerResult {
  let exposureResult: StudyAnswerResult | null = null;
  updateDeck(deckId, deck => {
    const card = deck.cards.find(candidate => candidate.id === question.cardId);
    if (!card || deck.cardRatings?.[card.id] === "known") return deck;
    const key = getStudyDirectionKey(card.id, question.direction);
    const currentDirection = getDirectionProgress(deck, card, question.direction);
    const now = Date.now();
    const nextDirection: DirectionStudyProgress = {
      ...currentDirection,
      seen: currentDirection.seen + 1,
      dueAt: now,
      reviewDay: getReviewDay(now),
      lastReviewedAt: now,
    };
    const currentCard = deck.cardProgress?.[card.id] || {
      box: 2,
      correctStreak: 0,
      wrongStreak: 0,
      seen: 0,
      correct: 0,
      wrong: 0,
      dueAt: 0,
    };
    exposureResult = {
      isCorrect: true,
      answer: question.answer,
      masteryBefore: currentDirection.mastery,
      masteryAfter: currentDirection.mastery,
      masteryEvent: "",
      wasUnseen: currentDirection.seen === 0,
      progressKey: key,
    };
    return {
      ...deck,
      directionProgress: { ...(deck.directionProgress || {}), [key]: nextDirection },
      cardProgress: {
        ...(deck.cardProgress || {}),
        [card.id]: { ...currentCard, seen: currentCard.seen + 1, dueAt: now },
      },
    };
  });
  if (!exposureResult) throw new Error("The introduced card is no longer available.");
  return exposureResult;
}
