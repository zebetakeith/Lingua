export interface VocabWord {
  id: string;
  /** Japanese written form, or the front of a legacy two-sided card. */
  word: string;
  /** Kana reading for Japanese cards. Omitted for legacy two-sided cards. */
  reading?: string;
  /** English meaning, or the back of a legacy two-sided card. */
  definition: string;
  difficulty: number; // 1-6
  options: string[];
}

const VOCABULARY: VocabWord[] = [
  // Difficulty 1 (A1 - most common)
  { id: "v001", word: "abandon", definition: "to leave behind or desert", difficulty: 1, options: ["abandon", "abbreviate", "abduct", "abolish"] },
  { id: "v002", word: "ability", definition: "the power or skill to do something", difficulty: 1, options: ["ability", "agility", "hostility", "credibility"] },
  { id: "v003", word: "absence", definition: "the state of being away or not present", difficulty: 1, options: ["absence", "absence", "essence", "presence"] },
  { id: "v004", word: "academy", definition: "a school or college for special training", difficulty: 1, options: ["academy", "alumni", "academic", "alchemist"] },
  { id: "v005", word: "accident", definition: "an unfortunate event happening unexpectedly", difficulty: 1, options: ["accident", "incident", "evident", "resident"] },
  { id: "v006", word: "achieve", definition: "to successfully complete or reach a goal", difficulty: 1, options: ["achieve", "believe", "receive", "deceive"] },
  { id: "v007", word: "acquire", definition: "to get or gain possession of", difficulty: 1, options: ["acquire", "require", "inquire", "squire"] },
  { id: "v008", word: "address", definition: "the place where someone lives", difficulty: 1, options: ["address", "redress", "distress", "progress"] },
  { id: "v009", word: "advance", definition: "to move forward or make progress", difficulty: 1, options: ["advance", "advantage", "adventure", "advertise"] },
  { id: "v010", word: "advise", definition: "to offer suggestions or recommendations", difficulty: 1, options: ["advise", "devise", "revise", "surmise"] },
  { id: "v011", word: "affect", definition: "to influence or produce a change in", difficulty: 1, options: ["affect", "effect", "infect", "defect"] },
  { id: "v012", word: "against", definition: "in opposition to", difficulty: 1, options: ["against", "again", "amongst", "amidst"] },
  { id: "v013", word: "airport", definition: "a place where aircraft take off and land", difficulty: 1, options: ["airport", "seaport", "passport", "transport"] },
  { id: "v014", word: "ancient", definition: "very old, belonging to the distant past", difficulty: 1, options: ["ancient", "anxious", "ambient", "ancillary"] },
  { id: "v015", word: "angry", definition: "feeling or showing strong annoyance", difficulty: 1, options: ["angry", "anxious", "hungry", "furious"] },
  { id: "v016", word: "animal", definition: "a living creature that is not a human or plant", difficulty: 1, options: ["animal", "animate", "annals", "anomaly"] },
  { id: "v017", word: "anxious", definition: "feeling worried or nervous", difficulty: 1, options: ["anxious", "anguish", "anxious", "ancient"] },
  { id: "v018", word: "appear", definition: "to come into sight or become visible", difficulty: 1, options: ["appear", "disappear", "reappear", "transparent"] },
  { id: "v019", word: "appoint", definition: "to assign someone to a position or role", difficulty: 1, options: ["appoint", "disappoint", "ointment", "standpoint"] },
  { id: "v020", word: "arrange", definition: "to put in proper order or sequence", difficulty: 1, options: ["arrange", "derange", "estranged", "grange"] },
  { id: "v021", word: "arrival", definition: "the act of coming to a place", difficulty: 1, options: ["arrival", "survival", "revival", "rival"] },
  { id: "v022", word: "article", definition: "a piece of writing in a newspaper or magazine", difficulty: 1, options: ["article", "particle", "particular", "vertical"] },
  { id: "v023", word: "attempt", definition: "to try to do something", difficulty: 1, options: ["attempt", "contempt", "tempt", "exempt"] },
  { id: "v024", word: "average", definition: "the typical or usual amount, rate, or degree", difficulty: 1, options: ["average", "beverage", "coverage", "leverage"] },
  { id: "v025", word: "balance", definition: "an even distribution of weight or amount", difficulty: 1, options: ["balance", "valance", "ambulance", "vigilance"] },
  { id: "v026", word: "barrier", definition: "a fence or obstacle that blocks the way", difficulty: 1, options: ["barrier", "carrier", "ferrier", "marrier"] },
  { id: "v027", word: "battery", definition: "a device that stores and provides electricity", difficulty: 1, options: ["battery", "flattery", "lottery", "pottery"] },
  { id: "v028", word: "believe", definition: "to accept something as true", difficulty: 1, options: ["believe", "relieve", "achieve", "grieve"] },
  { id: "v029", word: "benefit", definition: "an advantage or profit gained from something", difficulty: 1, options: ["benefit","deficit","proficit","solicit"]},
  { id: "v030", word: "between", definition: "in the space separating two things", difficulty: 1, options: ["between", "betwixt", "beneath", "beyond"] },
  // Difficulty 2 (A2)
  { id: "v031", word: "brilliant", definition: "exceptionally clever or talented", difficulty: 2, options: ["brilliant", "resilient", "compliant", "defiant"] },
  { id: "v032", word: "broadcast", definition: "to transmit a program by radio or TV", difficulty: 2, options: ["broadcast", "broadband", "broadside", "broaden"] },
  { id: "v033", word: "campaign", definition: "an organized course of action for a purpose", difficulty: 2, options: ["campaign", "champagne", "companion", "champion"] },
  { id: "v034", word: "capacity", definition: "the maximum amount something can hold", difficulty: 2, options: ["capacity", "capability", "rapacity", "audacity"] },
  { id: "v035", word: "category", definition: "a class or group of things with shared characteristics", difficulty: 2, options: ["category", "allegory", "inventory", "dormitory"] },
  { id: "v036", word: "ceremony", definition: "a formal event performed on a special occasion", difficulty: 2, options: ["ceremony", "testimony", "harmony", "alimony"] },
  { id: "v037", word: "champion", definition: "a person who has defeated all opponents", difficulty: 2, options: ["champion", "campaign", "champagne", "companion"] },
  { id: "v038", word: "circular", definition: "having the shape of a circle", difficulty: 2, options: ["circular", "circulate", "circus", "circuit"] },
  { id: "v039", word: "civilian", definition: "a person not in the armed services", difficulty: 2, options: ["civilian", "villain", "guardian", "civilian"] },
  { id: "v040", word: "collapse", definition: "to fall down or cave in suddenly", difficulty: 2, options: ["collapse", "elapse", "relapse", "prolapse"] },
  { id: "v041", word: "commerce", definition: "the activity of buying and selling", difficulty: 2, options: ["commerce", "commence", "comment", "command"] },
  { id: "v042", word: "compete", definition: "to strive to gain or win something", difficulty: 2, options: ["compete", "complete", "deplete", "replete"] },
  { id: "v043", word: "complain", definition: "to express dissatisfaction about something", difficulty: 2, options: ["complain", "explain", "restrain", "detain"] },
  { id: "v044", word: "complete", definition: "having all necessary parts; finished", difficulty: 2, options: ["complete", "deplete", "replete", "secrete"] },
  { id: "v045", word: "compound", definition: "a thing composed of two or more elements", difficulty: 2, options: ["compound", "compounds", "expound", "propound"] },
  { id: "v046", word: "computer", definition: "an electronic device for processing data", difficulty: 2, options: ["computer", "commuter", "commuter", "imputer"] },
  { id: "v047", word: "conclude", definition: "to bring to an end; to reach a decision", difficulty: 2, options: ["conclude", "exclude", "seclude", "preclude"] },
  { id: "v048", word: "concrete", definition: "a building material made from sand, gravel, and cement", difficulty: 2, options: ["concrete", "discrete", "replete", "secrete"] },
  { id: "v049", word: "conflict", definition: "a serious disagreement or argument", difficulty: 2, options: ["conflict", "inflict", "afflict", "predict"] },
  { id: "v050", word: "constant", definition: "occurring continuously; unchanging", difficulty: 2, options: ["constant", "distant", "instant", "resistant"] },
  // Difficulty 3 (B1)
  { id: "v051", word: "ambiguous", definition: "having more than one possible meaning", difficulty: 3, options: ["ambiguous", "ambitious", "ambidextrous", "ambivalent"] },
  { id: "v052", word: "anticipate", definition: "to expect or predict something in advance", difficulty: 3, options: ["anticipate", "participate", "emancipate", "dissipate"] },
  { id: "v053", word: "apprehend", definition: "to arrest or seize someone; to understand", difficulty: 3, options: ["apprehend", "comprehend", "recommend", "condescend"] },
  { id: "v054", word: "assurance", definition: "a positive declaration intended to give confidence", difficulty: 3, options: ["assurance", "insurance", "endurance", "reassurance"] },
  { id: "v055", word: "authorize", definition: "to give official permission or approval", difficulty: 3, options: ["authorize", "categorize", "theorize", "memorize"] },
  { id: "v056", word: "brutalize", definition: "to treat someone in a cruel or violent way", difficulty: 3, options: ["brutalize", "civilize", "mobilize", "immobilize"] },
  { id: "v057", word: "calculate", definition: "to determine mathematically", difficulty: 3, options: ["calculate", "circulate", "articulate", "speculate"] },
  { id: "v058", word: "circulate", definition: "to move continuously through a closed system", difficulty: 3, options: ["circulate", "calculate", "speculate", "coagulate"] },
  { id: "v059", word: "coalition", definition: "an alliance for combined action", difficulty: 3, options: ["coalition", "collision", "pollution", "solution"] },
  { id: "v060", word: "commodity", definition: "a raw material or primary agricultural product", difficulty: 3, options: ["commodity", "comedy", "oddity", "modesty"] },
  { id: "v061", word: "competent", definition: "having the necessary ability or skill", difficulty: 3, options: ["competent", "competitor", "complacent", "compelling"] },
  { id: "v062", word: "component", definition: "a part or element of a larger whole", difficulty: 3, options: ["component", "opponent", "proponent", "exponent"] },
  { id: "v063", word: "constrain", definition: "to compel or force someone to do something", difficulty: 3, options: ["constrain", "restrain", "abstain", "pertain"] },
  { id: "v064", word: "construct", definition: "to build or form by putting together parts", difficulty: 3, options: ["construct", "destruct", "instruct", "obstruct"] },
  { id: "v065", word: "controversy", definition: "prolonged public disagreement or heated discussion", difficulty: 3, options: ["controversy", "controversy", "adversary", "perversity"] },
  { id: "v066", word: "corruption", definition: "dishonest or fraudulent conduct by those in power", difficulty: 3, options: ["corruption", "eruption", "disruption", "bankruption"] },
  { id: "v067", word: "criterion", definition: "a standard by which something is judged", difficulty: 3, options: ["criterion", "criticism", "hysteria", "mysterious"] },
  { id: "v068", word: "curriculum", definition: "the subjects taught in a school or course", difficulty: 3, options: ["curriculum", "curiosity", "curator", "curable"] },
  { id: "v069", word: "dedicate", definition: "to devote time and effort to a particular task", difficulty: 3, options: ["dedicate", "medicate", "indicate", "predicate"] },
  { id: "v070", word: "defendant", definition: "a person accused of a crime in court", difficulty: 3, options: ["defendant", "attendant", "descendant", "dependent"] },
  // Difficulty 4 (B2)
  { id: "v071", word: "conscientious", definition: "wishing to do what is right; very careful", difficulty: 4, options: ["conscientious", "conscious", "contentious", "conspicuous"] },
  { id: "v072", word: "constituent", definition: "a component part of something", difficulty: 4, options: ["constituent", "instituent", "diluent", "continuent"] },
  { id: "v073", word: "contemplate", definition: "to look thoughtfully at; to consider deeply", difficulty: 4, options: ["contemplate", "templatize", "stimulate", "simulate"] },
  { id: "v074", word: "convalescent", definition: "recovering from illness", difficulty: 4, options: ["convalescent", "adolescent", "obsolescent", "iridescent"] },
  { id: "v075", word: "counterfeit", definition: "a fraudulent imitation of something valuable", difficulty: 4, options: ["counterfeit", "counterpart", "counteract", "countermand"] },
  { id: "v076", word: "deliberate", definition: "done consciously and intentionally; careful", difficulty: 4, options: ["deliberate", "liberate", "illiterate", "obliterate"] },
  { id: "v077", word: "demonstrate", definition: "to show clearly by giving proof or evidence", difficulty: 4, options: ["demonstrate", "remonstrate", "frustrate", "illustrate"] },
  { id: "v078", word: "discrepancy", definition: "a lack of compatibility between two facts", difficulty: 4, options: ["discrepancy", "constancy", "distancy", "extravagancy"] },
  { id: "v079", word: "disposition", definition: "a person's inherent qualities of mind and character", difficulty: 4, options: ["disposition", "preposition", "composition", "decomposition"] },
  { id: "v080", word: "eccentric", definition: "unconventional and slightly strange", difficulty: 4, options: ["eccentric", "concentric", "centric", "ethnocentric"] },
  { id: "v081", word: "eloquent", definition: "fluent and persuasive in speaking or writing", difficulty: 4, options: ["eloquent", "frequent", "subsequent", "consequent"] },
  { id: "v082", word: "empirical", definition: "based on observation or experience, not theory", difficulty: 4, options: ["empirical", "clinical", "critical", "cynical"] },
  { id: "v083", word: "encompass", definition: "to surround or enclose completely", difficulty: 4, options: ["encompass", "compass", "bypass", "surpass"] },
  { id: "v084", word: "endeavor", definition: "to try hard to do or achieve something", difficulty: 4, options: ["endeavor", "favor", "savor", "flavor"] },
  { id: "v085", word: "ephemeral", definition: "lasting for a very short time", difficulty: 4, options: ["ephemeral", "perennial", "eternal", "internal"] },
  { id: "v086", word: "equivalent", definition: "equal in value, amount, or meaning", difficulty: 4, options: ["equivalent", "ambivalent", "prevalent", "malevolent"] },
  { id: "v087", word: "evacuate", definition: "to remove someone from a place of danger", difficulty: 4, options: ["evacuate", "evaluate", "activate", "motivate"] },
  { id: "v088", word: "exaggerate", definition: "to represent something as larger or more important", difficulty: 4, options: ["exaggerate", "aggravate", "alleviate", "activate"] },
  { id: "v089", word: "exemplify", definition: "to be a typical example of", difficulty: 4, options: ["exemplify", "simplify", "amplify", "rectify"] },
  { id: "v090", word: "formidable", definition: "inspiring fear or respect through being powerful", difficulty: 4, options: ["formidable", "affable", "amiable", "portable"] },
  // Difficulty 5 (C1)
  { id: "v091", word: "ameliorate", definition: "to make something bad or unsatisfactory better", difficulty: 5, options: ["ameliorate", "deteriorate", "exaggerate", "alleviate"] },
  { id: "v092", word: "anachronism", definition: "something out of place in a historical period", difficulty: 5, options: ["anachronism", "chronicle", "chronic", "synchronize"] },
  { id: "v093", word: "antithesis", definition: "a person or thing that is the direct opposite", difficulty: 5, options: ["antithesis", "synthesis", "photosynthesis", "hypothesis"] },
  { id: "v094", word: "capitulate", definition: "to cease to resist; to surrender", difficulty: 5, options: ["capitulate", "manipulate", "articulate", "circulate"] },
  { id: "v095", word: "cognizant", definition: "having knowledge or being aware of", difficulty: 5, options: ["cognizant", "ignorant", "arrogant", "vacant"] },
  { id: "v096", word: "commensurate", definition: "corresponding in size or degree", difficulty: 5, options: ["commensurate", "immense", "amateur", "corporate"] },
  { id: "v097", word: "conflagration", definition: "an extensive fire that destroys a great deal", difficulty: 5, options: ["conflagration", "inflammation", "concentration", "constellation"] },
  { id: "v098", word: "disseminate", definition: "to spread information widely", difficulty: 5, options: ["disseminate", "inseminate", "contaminate", "eliminate"] },
  { id: "v099", word: "epistemology", definition: "the theory of knowledge, especially its methods", difficulty: 5, options: ["epistemology","etymology","genealogy","methodology"]},
  { id: "v100", word: "equanimity", definition: "mental calmness and composure", difficulty: 5, options: ["equanimity", "animosity", "uniformity", "magnanimity"] },
  { id: "v101", word: "exacerbate", definition: "to make a problem or bad situation worse", difficulty: 5, options: ["exacerbate", "alleviate", "aggravate", "evacuate"] },
  { id: "v102", word: "grandiloquent", definition: "using fancy or pompous words", difficulty: 5, options: ["grandiloquent", "eloquent", "magnificent", "prevalent"] },
  { id: "v103", word: "hegemony", definition: "leadership or dominance of one group over others", difficulty: 5, options: ["hegemony", "harmony", "homonym", "ceremony"] },
  { id: "v104", word: "iconoclast", definition: "someone who attacks cherished beliefs", difficulty: 5, options: ["iconoclast", "enthusiast", "loyalist", "traditionalist"] },
  { id: "v105", word: "incontrovertible", definition: "not able to be denied or disputed", difficulty: 5, options: ["incontrovertible", "convertible", "controversial", "reversible"] },
  { id: "v106", word: "juxtaposition", definition: "the fact of placing things side by side for contrast", difficulty: 5, options: ["juxtaposition", "composition", "decomposition", "disposition"] },
  { id: "v107", word: "magnanimous", definition: "generous or forgiving toward a rival", difficulty: 5, options: ["magnanimous", "unanimous", "venomous", "enormous"] },
  { id: "v108", word: "non sequitur", definition: "a conclusion that does not follow from the premises", difficulty: 5, options: ["non sequitur", "sine qua non", "status quo", "pro bono"] },
  { id: "v109", word: "obfuscate", definition: "to render obscure or unclear; to confuse", difficulty: 5, options: ["obfuscate", "elucidate", "illuminate", "educate"] },
  { id: "v110", word: "perspicacious", definition: "having a ready insight into things; shrewd", difficulty: 5, options: ["perspicacious", "conscious", "precocious", "atrocious"] },
  // Difficulty 6 (C2+)
  { id: "v111", word: "antediluvian", definition: "ridiculously old-fashioned; before the biblical flood", difficulty: 6, options: ["antediluvian", "millennial", "perennial", "postmodern"] },
  { id: "v112", word: "apocryphal", definition: "of doubtful authenticity, although widely circulated", difficulty: 6, options: ["apocryphal", "canonical", "genuine", "authentic"] },
  { id: "v113", word: "belles-lettres", definition: "essays and works valued for their aesthetic quality", difficulty: 6, options: ["belles-lettres", "haute couture", "avant-garde", "noblesse oblige"] },
  { id: "v114", word: "bildungsroman", definition: "a novel about the moral growth of the protagonist", difficulty: 6, options: ["bildungsroman", "dystopian", "utopian", "picaresque"] },
  { id: "v115", word: "ceteris paribus", definition: "with other conditions remaining the same", difficulty: 6, options: ["ceteris paribus", "carpe diem", "modus operandi", "quid pro quo"] },
  { id: "v116", word: "chiaroscuro", definition: "the treatment of light and shade in drawing and painting", difficulty: 6, options: ["chiaroscuro", "baroque", "rococo", "impressionism"] },
  { id: "v117", word: "deus ex machina", definition: "an unexpected power saving a seemingly hopeless situation", difficulty: 6, options: ["deus ex machina", "alter ego", "prima facie", "habeas corpus"] },
  { id: "v118", word: "doppelganger", definition: "an apparition or double of a living person", difficulty: 6, options: ["doppelganger", "poltergeist", "wraith", "apparition"] },
  { id: "v119", word: "eschatological", definition: "relating to death, judgment, and the final destiny", difficulty: 6, options: ["eschatological", "etymological", "anthropological", "archaeological"] },
  { id: "v120", word: "exegesis", definition: "critical explanation or interpretation of a text", difficulty: 6, options: ["exegesis", "genesis", "nemesis", "synthesis"] },
  { id: "v121", word: "fait accompli", definition: "a thing that has already happened and cannot be changed", difficulty: 6, options: ["fait accompli", "joie de vivre", "tour de force", "cause celebre"] },
  { id: "v122", word: "gadfly", definition: "a person who annoys others by persistent criticism", difficulty: 6, options: ["gadfly", "butterfly", "dragonfly", "firefly"] },
  { id: "v123", word: "hubris", definition: "excessive pride or self-confidence", difficulty: 6, options: ["hubris", "humility", "hubbub", "hybrid"] },
  { id: "v124", word: "idee fixe", definition: "an idea that dominates someone's mind; an obsession", difficulty: 6, options: ["idee fixe", "raison d'etre", "savoir faire", "esprit de corps"] },
  { id: "v125", word: "in medias res", definition: "into the middle of a narrative; without preamble", difficulty: 6, options: ["in medias res", "ex nihilo", "ab initio", "ipso facto"] },
];

export function getWordsByDifficulty(difficulty: number, count: number): VocabWord[] {
  const pool = VOCABULARY.filter(w => w.difficulty === difficulty);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getWordsForFloor(floor: number, count: number): VocabWord[] {
  let diffs: number[] = [];
  if (floor <= 2) diffs = [1];
  else if (floor <= 4) diffs = [1, 2];
  else if (floor <= 6) diffs = [2, 3];
  else if (floor <= 8) diffs = [3, 4];
  else if (floor <= 10) diffs = [4, 5];
  else diffs = [4, 5, 6];
  
  const pool = VOCABULARY.filter(w => diffs.includes(w.difficulty));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomWord(floor: number): VocabWord {
  const pool = getWordsForFloor(floor, 100);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateDistractors(correctWord: VocabWord, allWords: VocabWord[]): string[] {
  const usedWords = new Set([correctWord.word]);
  const distractors: string[] = [];
  const addDistractors = (candidates: VocabWord[]) => {
    for (const word of candidates) {
      if (word.id === correctWord.id || usedWords.has(word.word)) continue;
      usedWords.add(word.word);
      distractors.push(word.word);
      if (distractors.length >= 3) break;
    }
  };

  const sameDifficulty = allWords.filter(w => w.difficulty === correctWord.difficulty);
  addDistractors([...sameDifficulty].sort(() => Math.random() - 0.5));
  addDistractors([...allWords].sort(() => Math.random() - 0.5));
  addDistractors([...VOCABULARY].sort(() => Math.random() - 0.5));

  const options = [correctWord.word, ...distractors.slice(0, 3)];
  return options.sort(() => Math.random() - 0.5);
}

export default VOCABULARY;
