export type StudyDirection = "term_to_definition" | "definition_to_term";
export type StudyQuestionType = "multiple_choice" | "typed" | "self_grade";

export interface DeckStudySettings {
  askTermToDefinition: boolean;
  askDefinitionToTerm: boolean;
  useMultipleChoice: boolean;
  useTypedAnswer: boolean;
  useSelfGrade: boolean;
  shuffleAnswers: boolean;
}

export interface DirectionStudyProgress {
  mastery: number;
  correctStreak: number;
  wrongStreak: number;
  seen: number;
  correct: number;
  wrong: number;
  dueAt: number;
  reviewsToday: number;
  correctToday: number;
  reviewDay: string;
  lastReviewedAt: number;
}

export const DEFAULT_STUDY_SETTINGS: DeckStudySettings = {
  askTermToDefinition: true,
  askDefinitionToTerm: true,
  useMultipleChoice: true,
  useTypedAnswer: true,
  useSelfGrade: true,
  shuffleAnswers: true,
};

const MASTERY_INTERVALS_MS = [
  2 * 60_000,
  10 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000,
  3 * 24 * 60 * 60_000,
];

export function normalizeStudySettings(settings?: Partial<DeckStudySettings> | null): DeckStudySettings {
  const normalized = {
    ...DEFAULT_STUDY_SETTINGS,
    ...(settings || {}),
  };

  if (!normalized.askTermToDefinition && !normalized.askDefinitionToTerm) {
    normalized.askDefinitionToTerm = true;
  }
  if (!normalized.useMultipleChoice && !normalized.useTypedAnswer && !normalized.useSelfGrade) {
    normalized.useMultipleChoice = true;
  }

  return normalized;
}

export function getStudyDirectionKey(cardId: string, direction: StudyDirection): string {
  return `${cardId}::${direction}`;
}

export function getReviewDay(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getInitialMastery(rating?: "hard" | "medium" | "easy" | "known"): number {
  if (rating === "hard") return 0.12;
  if (rating === "easy") return 0.62;
  if (rating === "known") return 0.95;
  return 0.34;
}

export function createDirectionStudyProgress(initialMastery = 0.34): DirectionStudyProgress {
  return {
    mastery: clampMastery(initialMastery),
    correctStreak: 0,
    wrongStreak: 0,
    seen: 0,
    correct: 0,
    wrong: 0,
    dueAt: 0,
    reviewsToday: 0,
    correctToday: 0,
    reviewDay: getReviewDay(),
    lastReviewedAt: 0,
  };
}

export function normalizeDirectionStudyProgress(
  progress?: Partial<DirectionStudyProgress> | null,
  initialMastery = 0.34
): DirectionStudyProgress {
  const fallback = createDirectionStudyProgress(initialMastery);
  if (!progress) return fallback;
  return {
    mastery: clampMastery(typeof progress.mastery === "number" ? progress.mastery : fallback.mastery),
    correctStreak: Math.max(0, Number(progress.correctStreak) || 0),
    wrongStreak: Math.max(0, Number(progress.wrongStreak) || 0),
    seen: Math.max(0, Number(progress.seen) || 0),
    correct: Math.max(0, Number(progress.correct) || 0),
    wrong: Math.max(0, Number(progress.wrong) || 0),
    dueAt: Math.max(0, Number(progress.dueAt) || 0),
    reviewsToday: Math.max(0, Number(progress.reviewsToday) || 0),
    correctToday: Math.max(0, Number(progress.correctToday) || 0),
    reviewDay: typeof progress.reviewDay === "string" ? progress.reviewDay : getReviewDay(),
    lastReviewedAt: Math.max(0, Number(progress.lastReviewedAt) || 0),
  };
}

export function getEnabledStudyDirections(settings: DeckStudySettings): StudyDirection[] {
  const directions: StudyDirection[] = [];
  if (settings.askTermToDefinition) directions.push("term_to_definition");
  if (settings.askDefinitionToTerm) directions.push("definition_to_term");
  return directions.length > 0 ? directions : ["definition_to_term"];
}

export function chooseQuestionType(settings: DeckStudySettings, progress: DirectionStudyProgress): StudyQuestionType {
  const enabled = getEnabledQuestionTypes(settings);
  if (enabled.length === 1) return enabled[0];

  const mastery = progress.mastery;
  const roll = Math.random();
  if (mastery >= 0.68 && settings.useSelfGrade && roll < 0.56) return "self_grade";
  if (mastery >= 0.32 && settings.useTypedAnswer && roll < 0.78) return "typed";
  if (settings.useMultipleChoice) return "multiple_choice";
  if (settings.useTypedAnswer) return "typed";
  return "self_grade";
}

export function getStudyProgressWeight(progress: DirectionStudyProgress, now = Date.now()): number {
  const dueWeight = progress.dueAt <= now ? 1.65 : 0.72;
  const struggleWeight = 1 + progress.wrongStreak * 0.55;
  const masteryWeight = 0.45 + (1 - progress.mastery) * 1.75;
  return Math.max(0.08, dueWeight * struggleWeight * masteryWeight);
}

export function getCorrectAnswerAp(progress: DirectionStudyProgress, questionType: StudyQuestionType, now = Date.now()): number {
  const normalized = normalizeForToday(progress, now);
  const masteryReward = normalized.mastery < 0.2
    ? 2.1
    : normalized.mastery < 0.42
      ? 1.55
      : normalized.mastery < 0.68
        ? 1
        : normalized.mastery < 0.84
          ? 0.62
          : 0.38;
  const repeatReward = normalized.correctToday === 0
    ? 1
    : normalized.correctToday === 1
      ? 0.7
      : normalized.correctToday === 2
        ? 0.45
        : 0.25;
  const questionReward = questionType === "self_grade" ? 1.12 : questionType === "typed" ? 1 : 0.88;
  const dueReward = normalized.dueAt <= now ? 1 : 0.82;
  return roundAp(Math.max(0.1, masteryReward * repeatReward * questionReward * dueReward));
}

export function updateDirectionStudyProgress(
  progress: DirectionStudyProgress,
  isCorrect: boolean,
  questionType: StudyQuestionType,
  now = Date.now()
): DirectionStudyProgress {
  const current = normalizeForToday(progress, now);
  const nextCorrectStreak = isCorrect ? current.correctStreak + 1 : 0;
  const nextWrongStreak = isCorrect ? 0 : current.wrongStreak + 1;
  const formatStrength = questionType === "self_grade" ? 1.25 : questionType === "typed" ? 1.08 : 0.82;
  const masteryChange = isCorrect
    ? (0.055 + Math.min(0.045, nextCorrectStreak * 0.008)) * formatStrength
    : -(0.11 + Math.min(0.12, nextWrongStreak * 0.035));
  const mastery = clampMastery(current.mastery + masteryChange);
  const intervalIndex = mastery < 0.2 ? 0 : mastery < 0.4 ? 1 : mastery < 0.6 ? 2 : mastery < 0.78 ? 3 : mastery < 0.9 ? 4 : 5;

  return {
    mastery,
    correctStreak: nextCorrectStreak,
    wrongStreak: nextWrongStreak,
    seen: current.seen + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
    wrong: current.wrong + (isCorrect ? 0 : 1),
    dueAt: isCorrect ? now + MASTERY_INTERVALS_MS[intervalIndex] : now,
    reviewsToday: current.reviewsToday + 1,
    correctToday: current.correctToday + (isCorrect ? 1 : 0),
    reviewDay: getReviewDay(now),
    lastReviewedAt: now,
  };
}

export function formatAp(value: number): string {
  const rounded = roundAp(Math.max(0, value));
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(/0$/, "");
}

export function getMasteryLabel(mastery: number): string {
  if (mastery < 0.22) return "Struggling";
  if (mastery < 0.48) return "Learning";
  if (mastery < 0.72) return "Familiar";
  if (mastery < 0.88) return "Strong";
  return "Mastered";
}

function getEnabledQuestionTypes(settings: DeckStudySettings): StudyQuestionType[] {
  const types: StudyQuestionType[] = [];
  if (settings.useMultipleChoice) types.push("multiple_choice");
  if (settings.useTypedAnswer) types.push("typed");
  if (settings.useSelfGrade) types.push("self_grade");
  return types.length > 0 ? types : ["multiple_choice"];
}

function normalizeForToday(progress: DirectionStudyProgress, now: number): DirectionStudyProgress {
  return progress.reviewDay === getReviewDay(now)
    ? progress
    : {
        ...progress,
        reviewsToday: 0,
        correctToday: 0,
        reviewDay: getReviewDay(now),
      };
}

function clampMastery(value: number): number {
  return Math.max(0.04, Math.min(0.98, value));
}

function roundAp(value: number): number {
  return Math.round(value * 100) / 100;
}
