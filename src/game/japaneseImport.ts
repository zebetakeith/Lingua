import type { VocabWord } from "../data/vocabulary";

export type ImportDelimiter = "auto" | "tab" | "comma" | "semicolon" | "pipe";

export interface JapaneseImportResult {
  cards: VocabWord[];
  skipped: number;
  invalid: number;
  delimiter: Exclude<ImportDelimiter, "auto"> | "legacy";
  hasHeader: boolean;
}

const DELIMITER_CHARS: Record<Exclude<ImportDelimiter, "auto">, string> = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
  pipe: "|",
};

const WRITTEN_HEADERS = new Set(["written", "word", "term", "kanji", "japanese", "front"]);
const READING_HEADERS = new Set(["reading", "kana", "hiragana", "pronunciation"]);
const MEANING_HEADERS = new Set(["meaning", "definition", "english", "translation", "back"]);

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, "");
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(lines: string[]): Exclude<ImportDelimiter, "auto"> | "legacy" {
  const sample = lines.slice(0, 8);
  const ranked = (Object.entries(DELIMITER_CHARS) as [Exclude<ImportDelimiter, "auto">, string][])
    .map(([name, character]) => ({
      name,
      score: sample.reduce((sum, line) => sum + (splitDelimitedLine(line, character).length >= 2 ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score > 0 ? ranked[0].name : "legacy";
}

function parseLegacyLine(line: string): string[] {
  for (const separator of [" - ", " = ", " : ", ":"]) {
    const index = line.indexOf(separator);
    if (index > 0) return [line.slice(0, index).trim(), line.slice(index + separator.length).trim()];
  }
  return [];
}

function cardKey(card: Pick<VocabWord, "word" | "reading" | "definition">): string {
  return [card.word, card.reading || "", card.definition]
    .map(value => value.trim().toLocaleLowerCase())
    .join("::");
}

export function parseJapaneseFlashcardImport(
  text: string,
  existingCards: VocabWord[],
  requestedDelimiter: ImportDelimiter = "auto",
): JapaneseImportResult {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const delimiter = requestedDelimiter === "auto" ? detectDelimiter(lines) : requestedDelimiter;
  const delimiterCharacter = delimiter === "legacy" ? null : DELIMITER_CHARS[delimiter];
  const rows = lines.map(line => delimiterCharacter ? splitDelimitedLine(line, delimiterCharacter) : parseLegacyLine(line));
  const firstRow = rows[0] || [];
  const normalizedHeader = firstRow.map(normalizeHeader);
  const writtenIndex = normalizedHeader.findIndex(value => WRITTEN_HEADERS.has(value));
  const readingIndex = normalizedHeader.findIndex(value => READING_HEADERS.has(value));
  const meaningIndex = normalizedHeader.findIndex(value => MEANING_HEADERS.has(value));
  const hasHeader = writtenIndex >= 0 && meaningIndex >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const existingKeys = new Set(existingCards.map(cardKey));
  const importedKeys = new Set<string>();
  const cards: VocabWord[] = [];
  let skipped = 0;
  let invalid = 0;
  const timestamp = Date.now();

  dataRows.forEach((row, index) => {
    const written = (hasHeader ? row[writtenIndex] : row[0])?.trim() || "";
    const reading = (hasHeader ? (readingIndex >= 0 ? row[readingIndex] : "") : row.length >= 3 ? row[1] : "")?.trim() || "";
    const meaningCells = hasHeader
      ? [row[meaningIndex]]
      : row.length >= 3
        ? row.slice(2)
        : row.slice(1);
    const meaning = meaningCells.filter(Boolean).join(delimiterCharacter || " ").trim();
    if (!written || !meaning) {
      invalid += 1;
      return;
    }
    const candidate: VocabWord = {
      id: `imported-${timestamp}-${index}`,
      word: written,
      ...(reading ? { reading } : {}),
      definition: meaning,
      difficulty: 2,
      options: [],
    };
    const key = cardKey(candidate);
    if (existingKeys.has(key) || importedKeys.has(key)) {
      skipped += 1;
      return;
    }
    importedKeys.add(key);
    cards.push(candidate);
  });

  return { cards, skipped, invalid, delimiter, hasHeader };
}
