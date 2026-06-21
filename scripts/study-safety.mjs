import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear(),
};

const { drawStudyQuestion, introduceStudyCards, selectStudyDeck } = await import("../src/game/studyBridge.ts");

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

putDeck("legacy", {
  cardProgress: { "new-1": { box: 4, correctStreak: 4, wrongStreak: 0, seen: 8, correct: 8, wrong: 0, dueAt: 0 } },
});
selectStudyDeck("legacy");
assert.equal(drawStudyQuestion("legacy", "quadratic").seenBefore, false, "legacy card-level history must not mark an unseen direction as seen");

putDeck("easy", { cardRatings: { "new-1": "easy", "new-2": "easy" } });
selectStudyDeck("easy");
assert.equal(drawStudyQuestion("easy", "quadratic").seenBefore, false, "difficulty ratings must not bypass first-exposure protection");

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

process.stdout.write("Study safety: 7 assertions passed.\n");
