import type { VocabWord } from "./vocabulary";

export const JAPANESE_STARTER_DECK_ID = "starter-japanese-core";
export const LEGACY_ENGLISH_STARTER_DECK_ID = "starter-japanese";
export const LEGACY_ENGLISH_STARTER_NAME = "Starter English Vocabulary";
export const JAPANESE_STUDY_DECK_NAME = "Japanese Study";

// Japanese-first describes the study tools, not bundled vocabulary.
// The learner owns this deck and fills it through the structured importer.
export const STARTER_JAPANESE: VocabWord[] = [];

export function isLegacyEnglishStarterDeck(deck: { id?: string; cards?: VocabWord[] }): boolean {
  return deck.id === LEGACY_ENGLISH_STARTER_DECK_ID
    && deck.cards?.[0]?.id === "v001"
    && deck.cards[0].word === "abandon";
}

export function isGeneratedJapaneseSampleDeck(deck: { id?: string; cards?: VocabWord[] }): boolean {
  return deck.id === JAPANESE_STARTER_DECK_ID
    && deck.cards?.length === 120
    && deck.cards[0]?.id === "jp-001"
    && deck.cards[119]?.id === "jp-120";
}

export default STARTER_JAPANESE;
