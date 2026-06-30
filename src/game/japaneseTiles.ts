export interface JapaneseStudyTile {
  id: string;
  text: string;
}

type ScriptKind = "kanji" | "hiragana" | "katakana" | "other";

const SIMILAR_CHARACTERS: Record<string, string> = {
  日: "曰目白", 曰: "日目", 人: "入八", 入: "人八", 土: "士干", 士: "土干", 未: "末朱", 末: "未本",
  口: "囗日", 木: "本未", 本: "木末", 大: "犬太", 犬: "大太", 目: "自日", 自: "目白", 千: "干牛",
  牛: "午千", 午: "牛干", 今: "令", 令: "今", 右: "石", 石: "右", 名: "各", 各: "名", 待: "持時",
  持: "待時", 時: "持待", 味: "妹未", 美: "羊", 聞: "間問", 間: "聞問", 話: "語活", 語: "話悟",
  さ: "きち", き: "さち", ぬ: "めね", め: "ぬあ", ね: "れわ", れ: "ねわ", は: "ほま", ほ: "はま",
  る: "ろ", ろ: "る", あ: "おめ", お: "あ", シ: "ツ", ツ: "シ", ソ: "ン", ン: "ソ",
};

const DEFAULT_KANJI = Array.from("日月火水木金土人入口大小中上下左右本学先生時分今何食見聞話読書行来帰買会");
const DEFAULT_HIRAGANA = Array.from("あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん");
const DEFAULT_KATAKANA = Array.from("アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン");

function scriptKind(character: string): ScriptKind {
  if (/\p{Script=Han}/u.test(character)) return "kanji";
  if (/\p{Script=Hiragana}/u.test(character)) return "hiragana";
  if (/\p{Script=Katakana}/u.test(character)) return "katakana";
  return "other";
}

export function splitJapaneseWrittenForm(value: string): string[] {
  return Array.from(value.normalize("NFC").replace(/\s+/g, ""));
}

export function createJapaneseTileChoices(
  answer: string,
  learnedWrittenForms: string[],
  random: () => number = Math.random,
): JapaneseStudyTile[] {
  const correct = splitJapaneseWrittenForm(answer);
  const correctSet = new Set(correct);
  const learnedCharacters = Array.from(new Set(learnedWrittenForms.flatMap(splitJapaneseWrittenForm)))
    .filter(character => !correctSet.has(character));
  const distractors: string[] = [];

  const addForKind = (kind: ScriptKind, fallback: string[]) => {
    const correctForKind = correct.filter(character => scriptKind(character) === kind);
    if (correctForKind.length === 0) return;
    const candidates = new Map<string, number>();
    const add = (character: string, score: number) => {
      if (correctSet.has(character) || scriptKind(character) !== kind) return;
      candidates.set(character, Math.max(score, candidates.get(character) || 0));
    };
    correctForKind.forEach(character => {
      Array.from(SIMILAR_CHARACTERS[character] || "").forEach(similar => add(similar, learnedCharacters.includes(similar) ? 12 : 8));
    });
    learnedCharacters.forEach(character => add(character, 6));
    fallback.forEach(character => add(character, 1));
    const target = Math.min(4, Math.max(2, correctForKind.length));
    const picked = [...candidates.entries()]
      .map(([character, score]) => ({ character, score, tie: random() }))
      .sort((left, right) => right.score - left.score || left.tie - right.tie)
      .slice(0, target)
      .map(candidate => candidate.character);
    distractors.push(...picked);
  };

  addForKind("kanji", DEFAULT_KANJI);
  addForKind("hiragana", DEFAULT_HIRAGANA);
  addForKind("katakana", DEFAULT_KATAKANA);

  const tiles = [
    ...correct.map((text, index) => ({ id: `answer-${index}`, text })),
    ...Array.from(new Set(distractors)).map((text, index) => ({ id: `distractor-${index}`, text })),
  ];
  return tiles
    .map(tile => ({ ...tile, order: random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ id, text }) => ({ id, text }));
}
