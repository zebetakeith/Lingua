import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear(),
};

const { answerStudyQuestion, completeStudyExposure, drawStudyQuestion, getStudyDecks, getStudyDirectionLabel, introduceStudyCards, isStudyQuestionUnavailableError, selectStudyDeck, tryDrawStudyQuestion } = await import("../src/game/studyBridge.ts");
const { createDirectionStudyProgress, getActiveStudyResponseMs, getEscalatedStudyCombatSpeed, updateDirectionStudyProgress } = await import("../src/game/study.ts");

const cards = [
  { id: "new-1", word: "mizu", definition: "water", difficulty: 2, options: [] },
  { id: "new-2", word: "hi", definition: "fire", difficulty: 2, options: [] },
];
const settings = {
  askTermToDefinition: true,
  askDefinitionToTerm: false,
  useMultipleChoice: true,
  useSelfGrade: false,
  shuffleAnswers: false,
};

function progress(seen, cardFingerprint) {
  return {
    ...(cardFingerprint ? { cardFingerprint } : {}),
    mastery: 0.6,
    correctStreak: seen ? 2 : 0,
    wrongStreak: 0,
    seen,
    correct: seen,
    wrong: 0,
    dueAt: 0,
    reviewsToday: 0,
    correctToday: 0,
    reviewDay: "2000-01-01",
    lastReviewedAt: seen ? Date.now() - 86_400_000 : 0,
  };
}

function putDeck(id, overrides = {}) {
  values.clear();
  const deck = {
    id,
    name: id,
    cards,
    cardRatings: {},
    cardProgress: {},
    introducedCardIds: cards.map(card => card.id),
    directionProgress: {},
    studySettings: settings,
    ...overrides,
  };
  values.set("lexicon_labyrinth_save", JSON.stringify({ selectedDeckId: id, decks: [deck] }));
}

putDeck("pristine");
selectStudyDeck("pristine");
assert.equal(drawStudyQuestion("pristine", "quadratic").seenBefore, false, "a pristine direction must be protected");
assert.deepEqual(getStudyDirectionLabel("pristine", "new-1::term_to_definition"), { prompt: "mizu", answer: "water" }, "learning reports should resolve a missed direction back to readable card text");

putDeck("legacy", {
  cardProgress: { "new-1": { box: 4, correctStreak: 4, wrongStreak: 0, seen: 8, correct: 8, wrong: 0, dueAt: 0 } },
});
selectStudyDeck("legacy");
assert.equal(drawStudyQuestion("legacy", "quadratic").seenBefore, false, "legacy card-level history must not mark an unseen direction as seen");

putDeck("reverse-direction", {
  cardRatings: { "new-2": "known" },
  studySettings: { ...settings, askDefinitionToTerm: true },
  directionProgress: { "new-1::term_to_definition": progress(4) },
});
selectStudyDeck("reverse-direction");
const reverseDirectionRandom = Math.random;
Math.random = () => 0;
const reverseDirectionQuestion = drawStudyQuestion("reverse-direction", "quadratic", "new-1::term_to_definition");
Math.random = reverseDirectionRandom;
assert.equal(reverseDirectionQuestion.direction, "definition_to_term", "the reverse direction should remain independently selectable");
assert.equal(reverseDirectionQuestion.seenBefore, false, "history in one direction must not bypass protection in the reverse direction");

putDeck("single-direction", { cardRatings: { "new-2": "known" } });
selectStudyDeck("single-direction");
const singleFirst = drawStudyQuestion("single-direction", "quadratic");
const singleRepeat = drawStudyQuestion("single-direction", "quadratic");
assert.equal(singleFirst.cardId, singleRepeat.cardId, "the single-card regression should repeat the same study direction");
assert.notEqual(singleFirst.instanceId, singleRepeat.instanceId, "repeated prompts need unique render identities so local answer state cannot carry over");

putDeck("easy", { cardRatings: { "new-1": "easy", "new-2": "easy" } });
selectStudyDeck("easy");
assert.equal(drawStudyQuestion("easy", "quadratic").seenBefore, false, "difficulty ratings must not bypass first-exposure protection");

putDeck("finished", { cardRatings: { "new-1": "known", "new-2": "known" } });
assert.equal(getStudyDecks()[0].activeCount, 0, "a fully known deck should report no active cards for a new run");
assert.equal(getStudyDecks()[0].introducedCount, 0, "known cards should not be mislabeled as introduced active cards");
assert.equal(tryDrawStudyQuestion("finished", "quadratic"), null, "an active run should recover safely when no study prompts remain");

putDeck("changed-live");
selectStudyDeck("changed-live");
const changedReview = drawStudyQuestion("changed-live", "quadratic");
putDeck("changed-live", { cardRatings: { [changedReview.cardId]: "known" } });
assert.throws(
  () => answerStudyQuestion("changed-live", changedReview, true),
  isStudyQuestionUnavailableError,
  "a card marked known outside the game should be skipped instead of receiving hidden progress",
);
assert.throws(
  () => completeStudyExposure("changed-live", changedReview),
  isStudyQuestionUnavailableError,
  "an unseen card marked known outside the game should be skipped instead of completing a stale lesson",
);

putDeck("edited-live");
selectStudyDeck("edited-live");
const staleQuestion = drawStudyQuestion("edited-live", "quadratic");
putDeck("edited-live", {
  cards: cards.map(card => card.id === staleQuestion.cardId ? { ...card, definition: `${card.definition} edited` } : card),
});
assert.throws(
  () => answerStudyQuestion("edited-live", staleQuestion, true),
  isStudyQuestionUnavailableError,
  "editing a live card should not apply a stale answer to its new content",
);

putDeck("disabled-live");
selectStudyDeck("disabled-live");
const disabledQuestion = drawStudyQuestion("disabled-live", "quadratic");
putDeck("disabled-live", { studySettings: { ...settings, askTermToDefinition: false, askDefinitionToTerm: true } });
assert.throws(
  () => answerStudyQuestion("disabled-live", disabledQuestion, true),
  isStudyQuestionUnavailableError,
  "disabling a direction should safely retire its open prompt",
);

putDeck("deleted-live");
selectStudyDeck("deleted-live");
const deletedQuestion = drawStudyQuestion("deleted-live", "quadratic");
putDeck("replacement-world");
assert.equal(tryDrawStudyQuestion("deleted-live", "quadratic"), null, "a deleted deck should not silently draw from another study world");
assert.throws(
  () => answerStudyQuestion("deleted-live", deletedQuestion, true),
  isStudyQuestionUnavailableError,
  "a deleted deck should not write its open answer into another study world",
);

putDeck("duplicate", {
  cards: [
    { ...cards[0], id: "reused-id", word: "old-word", definition: "old meaning" },
    { ...cards[1], id: "reused-id", word: "brand-new-word", definition: "brand new meaning" },
  ],
  introducedCardIds: ["reused-id"],
  directionProgress: { "reused-id::term_to_definition": progress(4) },
});
selectStudyDeck("duplicate");
introduceStudyCards("duplicate", 1);
const originalRandom = Math.random;
Math.random = () => 0.999999;
const duplicateQuestion = drawStudyQuestion("duplicate", "quadratic");
Math.random = originalRandom;
assert.equal(duplicateQuestion.prompt, "brand-new-word", "the repaired duplicate should remain independently selectable");
assert.equal(duplicateQuestion.seenBefore, false, "a repaired duplicate ID must not inherit another card's history");

putDeck("fingerprint", {
  directionProgress: { "new-1::term_to_definition": progress(4, "card-stale-content") },
});
selectStudyDeck("fingerprint");
Math.random = () => 0;
const fingerprintQuestion = drawStudyQuestion("fingerprint", "quadratic");
Math.random = originalRandom;
assert.equal(fingerprintQuestion.cardId, "new-1", "the fingerprint regression case should select the changed card");
assert.equal(fingerprintQuestion.seenBefore, false, "changed card content must invalidate stale direction history");

const repeatedMeaningCards = [
  { id: "same-1", word: "aka", definition: "red", difficulty: 2, options: [] },
  { id: "same-2", word: "beni", definition: "crimson", difficulty: 2, options: [] },
  { id: "same-3", word: "kurenai", definition: "crimson", difficulty: 2, options: [] },
  { id: "same-4", word: "ao", definition: "blue", difficulty: 2, options: [] },
  { id: "same-5", word: "midori", definition: "green", difficulty: 2, options: [] },
];
putDeck("duplicate-meanings", {
  cards: repeatedMeaningCards,
  introducedCardIds: repeatedMeaningCards.map(card => card.id),
});
selectStudyDeck("duplicate-meanings");
Math.random = () => 0;
const uniqueOptionsQuestion = drawStudyQuestion("duplicate-meanings", "quadratic");
Math.random = originalRandom;
assert.equal(new Set(uniqueOptionsQuestion.options).size, uniqueOptionsQuestion.options.length, "multiple-choice meanings should never render duplicate buttons");

putDeck("one-card-options", { cards: [cards[0]], introducedCardIds: [cards[0].id] });
selectStudyDeck("one-card-options");
const oneCardQuestion = drawStudyQuestion("one-card-options", "quadratic");
assert.equal(oneCardQuestion.options.length, 4, "a one-card deck should still receive a meaningful four-choice recognition prompt");
assert.equal(new Set(oneCardQuestion.options).size, 4, "fallback recognition choices should remain unique");
assert.ok(oneCardQuestion.options.includes(oneCardQuestion.answer), "fallback choices must retain the correct answer");

assert.equal(getActiveStudyResponseMs(1_000, 9_000, 3_000), 5_000, "completed command time must be excluded from recall timing");
assert.equal(getActiveStudyResponseMs(1_000, 9_000, 2_000, 7_000), 4_000, "an open command panel must be excluded from recall timing");
assert.equal(getActiveStudyResponseMs(9_000, 1_000, 0), 0, "clock drift must never create a negative response time");
const pressureProfile = { label: "Struggling", graceMs: 4_000, combatSpeed: 0.75 };
assert.equal(getEscalatedStudyCombatSpeed(pressureProfile, 4_000), 0.75, "a seen prompt should preserve its full grace period");
assert.ok(getEscalatedStudyCombatSpeed(pressureProfile, 24_000) > 0.75, "enemy pressure should rise when a seen prompt is left unanswered");
assert.equal(getEscalatedStudyCombatSpeed(pressureProfile, 100_000), 1.35, "prompt pressure should cap at a firm but bounded speed");
const reviewNow = Date.now();
const scheduledProgress = { ...createDirectionStudyProgress(0.6), mastery: 0.6, correctStreak: 2, dueAt: reviewNow + 86_400_000 };
const dueProgress = { ...scheduledProgress, dueAt: reviewNow - 1 };
const earlyCorrect = updateDirectionStudyProgress(scheduledProgress, true, "multiple_choice", reviewNow);
const dueCorrect = updateDirectionStudyProgress(dueProgress, true, "multiple_choice", reviewNow);
assert.ok(earlyCorrect.mastery - scheduledProgress.mastery < dueCorrect.mastery - dueProgress.mastery, "bonus reviews should grant less mastery than due recalls");
assert.equal(earlyCorrect.dueAt, scheduledProgress.dueAt, "a correct bonus review should preserve the scheduled due date");
const earlyMiss = updateDirectionStudyProgress(scheduledProgress, false, "multiple_choice", reviewNow);
assert.equal(earlyMiss.dueAt, reviewNow, "an early miss should become due immediately");
assert.ok(earlyMiss.mastery < scheduledProgress.mastery, "an early miss should still provide full forgetting evidence");

putDeck("balanced-production", {
  studySettings: {
    ...settings,
    askTermToDefinition: false,
    askDefinitionToTerm: true,
  },
  directionProgress: { "new-1::definition_to_term": progress(3) },
});
selectStudyDeck("balanced-production");
Math.random = () => 0;
const productionQuestion = drawStudyQuestion("balanced-production", "quadratic", undefined, "balanced");
Math.random = originalRandom;
assert.equal(productionQuestion.questionType, "self_grade", "balanced production recall should reveal and self-grade without typing");

process.stdout.write("Study safety assertions passed.\n");
