const TONE_KEYS = {
  s: 1,
  f: 2,
  r: 3,
  x: 4,
  j: 5
} as const;

type ToneKey = keyof typeof TONE_KEYS;
type FamilyKey = "a" | "aw" | "aa" | "e" | "ee" | "i" | "o" | "oo" | "ow" | "u" | "uw" | "y";

const FAMILY_VARIANTS: Record<FamilyKey, string[]> = {
  a: ["a", "á", "à", "ả", "ã", "ạ"],
  aw: ["ă", "ắ", "ằ", "ẳ", "ẵ", "ặ"],
  aa: ["â", "ấ", "ầ", "ẩ", "ẫ", "ậ"],
  e: ["e", "é", "è", "ẻ", "ẽ", "ẹ"],
  ee: ["ê", "ế", "ề", "ể", "ễ", "ệ"],
  i: ["i", "í", "ì", "ỉ", "ĩ", "ị"],
  o: ["o", "ó", "ò", "ỏ", "õ", "ọ"],
  oo: ["ô", "ố", "ồ", "ổ", "ỗ", "ộ"],
  ow: ["ơ", "ớ", "ờ", "ở", "ỡ", "ợ"],
  u: ["u", "ú", "ù", "ủ", "ũ", "ụ"],
  uw: ["ư", "ứ", "ừ", "ử", "ữ", "ự"],
  y: ["y", "ý", "ỳ", "ỷ", "ỹ", "ỵ"]
};

const UPPERCASE_FAMILY_VARIANTS: Record<FamilyKey, string[]> = {
  a: ["A", "Á", "À", "Ả", "Ã", "Ạ"],
  aw: ["Ă", "Ắ", "Ằ", "Ẳ", "Ẵ", "Ặ"],
  aa: ["Â", "Ấ", "Ầ", "Ẩ", "Ẫ", "Ậ"],
  e: ["E", "É", "È", "Ẻ", "Ẽ", "Ẹ"],
  ee: ["Ê", "Ế", "Ề", "Ể", "Ễ", "Ệ"],
  i: ["I", "Í", "Ì", "Ỉ", "Ĩ", "Ị"],
  o: ["O", "Ó", "Ò", "Ỏ", "Õ", "Ọ"],
  oo: ["Ô", "Ố", "Ồ", "Ổ", "Ỗ", "Ộ"],
  ow: ["Ơ", "Ớ", "Ờ", "Ở", "Ỡ", "Ợ"],
  u: ["U", "Ú", "Ù", "Ủ", "Ũ", "Ụ"],
  uw: ["Ư", "Ứ", "Ừ", "Ử", "Ữ", "Ự"],
  y: ["Y", "Ý", "Ỳ", "Ỷ", "Ỹ", "Ỵ"]
};

type CharMeta = {
  family: FamilyKey;
  tone: number;
  uppercase: boolean;
};

const CHAR_META = new Map<string, CharMeta>();

Object.entries(FAMILY_VARIANTS).forEach(([family, variants]) => {
  variants.forEach((char, tone) => {
    CHAR_META.set(char, { family: family as FamilyKey, tone, uppercase: false });
  });
});

Object.entries(UPPERCASE_FAMILY_VARIANTS).forEach(([family, variants]) => {
  variants.forEach((char, tone) => {
    CHAR_META.set(char, { family: family as FamilyKey, tone, uppercase: true });
  });
});

const WORD_REGEX = /([\p{L}]+)$/u;

const getVariants = (family: FamilyKey, uppercase: boolean) =>
  uppercase ? UPPERCASE_FAMILY_VARIANTS[family] : FAMILY_VARIANTS[family];

const replaceCharAt = (text: string, index: number, char: string) =>
  `${text.slice(0, index)}${char}${text.slice(index + 1)}`;

const getWordMatch = (text: string) => {
  const match = text.match(WORD_REGEX);
  if (!match) return null;

  return {
    word: match[1],
    start: text.length - match[1].length
  };
};

const isVowelFamily = (family: FamilyKey) =>
  ["a", "aw", "aa", "e", "ee", "i", "o", "oo", "ow", "u", "uw", "y"].includes(family);

const transformLastCharacter = (word: string, families: FamilyKey[], nextFamily: FamilyKey) => {
  const chars = [...word];
  const index = chars.length - 1;
  const meta = CHAR_META.get(chars[index]);

  if (!meta || !families.includes(meta.family)) return null;

  return replaceCharAt(word, index, getVariants(nextFamily, meta.uppercase)[meta.tone]);
};

const removeLastMark = (word: string) => {
  const chars = [...word];

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const meta = CHAR_META.get(chars[index]);
    if (!meta) continue;

    if (meta.tone > 0) {
      return replaceCharAt(word, index, getVariants(meta.family, meta.uppercase)[0]);
    }

    const familyFallback: Partial<Record<FamilyKey, FamilyKey>> = {
      aw: "a",
      aa: "a",
      ee: "e",
      oo: "o",
      ow: "o",
      uw: "u"
    };

    const fallbackFamily = familyFallback[meta.family];
    if (fallbackFamily) {
      return replaceCharAt(word, index, getVariants(fallbackFamily, meta.uppercase)[0]);
    }
  }

  if (word.endsWith("đ")) return `${word.slice(0, -1)}d`;
  if (word.endsWith("Đ")) return `${word.slice(0, -1)}D`;

  return null;
};

const normalizeTonePlacement = (word: string) => {
  const chars = [...word];
  const tonedChar = chars.find((char) => {
    const meta = CHAR_META.get(char);
    return meta && meta.tone > 0;
  });

  if (!tonedChar) return word;

  const toneMeta = CHAR_META.get(tonedChar);
  if (!toneMeta) return word;

  const plainWord = chars
    .map((char) => {
      const meta = CHAR_META.get(char);
      if (!meta) return char;
      return getVariants(meta.family, meta.uppercase)[0];
    })
    .join("");

  const targetIndex = getToneTargetIndex(plainWord);
  if (targetIndex < 0) return plainWord;

  const targetMeta = CHAR_META.get([...plainWord][targetIndex]);
  if (!targetMeta) return plainWord;

  return replaceCharAt(
    plainWord,
    targetIndex,
    getVariants(targetMeta.family, targetMeta.uppercase)[toneMeta.tone]
  );
};

const getToneTargetIndex = (word: string) => {
  const chars = [...word];
  const vowelIndexes = chars
    .map((char, index) => ({ char, index, meta: CHAR_META.get(char) }))
    .filter((item) => item.meta && isVowelFamily(item.meta.family));

  if (vowelIndexes.length === 0) return -1;

  const lowerWord = word.toLowerCase();
  const filteredIndexes = vowelIndexes.filter(({ index, meta }) => {
    if (!meta) return false;

    const hasAnotherVowel = vowelIndexes.some((item) => item.index !== index);
    if (hasAnotherVowel && meta.family === "u" && lowerWord[index - 1] === "q") return false;
    if (hasAnotherVowel && meta.family === "i" && lowerWord[index - 1] === "g") return false;

    return true;
  });

  const candidates = filteredIndexes.length > 0 ? filteredIndexes : vowelIndexes;
  const qualityMarkedCandidates = candidates.filter(({ meta }) =>
    meta ? ["aw", "aa", "ee", "oo", "ow", "uw"].includes(meta.family) : false
  );

  if (qualityMarkedCandidates.length === 1) return qualityMarkedCandidates[0].index;
  if (qualityMarkedCandidates.length > 1) {
    return qualityMarkedCandidates[qualityMarkedCandidates.length - 1].index;
  }

  if (candidates.length === 1) return candidates[0].index;
  if (candidates.length === 2) {
    const [first, second] = candidates;
    if (first.meta?.family === "u" && second.meta?.family === "y") return second.index;
    const hasTrailingConsonant = second.index < [...word].length - 1;
    return hasTrailingConsonant ? second.index : first.index;
  }

  return candidates[1].index;
};

const applyToneToWord = (word: string, toneKey: ToneKey) => {
  const targetIndex = getToneTargetIndex(word);
  if (targetIndex < 0) return null;

  const chars = [...word];
  const meta = CHAR_META.get(chars[targetIndex]);
  if (!meta) return null;

  return replaceCharAt(
    word,
    targetIndex,
    getVariants(meta.family, meta.uppercase)[TONE_KEYS[toneKey]]
  );
};

export const applyTelexKey = (currentValue: string, rawKey: string) => {
  if (rawKey.length !== 1) {
    return `${currentValue}${rawKey}`;
  }

  const key = rawKey;
  const lowerKey = key.toLowerCase();
  const wordMatch = getWordMatch(currentValue);

  if (!wordMatch) {
    return `${currentValue}${key}`;
  }

  const { word, start } = wordMatch;

  if (lowerKey in TONE_KEYS) {
    const nextWord = applyToneToWord(word, lowerKey as ToneKey);
    if (!nextWord) return `${currentValue}${key}`;
    return `${currentValue.slice(0, start)}${nextWord}`;
  }

  if (lowerKey === "z") {
    const nextWord = removeLastMark(word);
    if (!nextWord) return `${currentValue}${key}`;
    return `${currentValue.slice(0, start)}${nextWord}`;
  }

  if (lowerKey === "d") {
    if (word.endsWith("d")) return `${currentValue.slice(0, -1)}đ`;
    if (word.endsWith("D")) return `${currentValue.slice(0, -1)}Đ`;
    return `${currentValue}${key}`;
  }

  if (lowerKey === "a") {
    const nextWord = transformLastCharacter(word, ["a"], "aa");
    if (!nextWord) return `${currentValue}${key}`;
    return `${currentValue.slice(0, start)}${nextWord}`;
  }

  if (lowerKey === "e") {
    const nextWord = transformLastCharacter(word, ["e"], "ee");
    if (!nextWord) return `${currentValue}${key}`;
    return `${currentValue.slice(0, start)}${nextWord}`;
  }

  if (lowerKey === "o") {
    const nextWord = transformLastCharacter(word, ["o"], "oo");
    if (!nextWord) return `${currentValue}${key}`;
    return `${currentValue.slice(0, start)}${nextWord}`;
  }

  if (lowerKey === "w") {
    const chars = [...word];
    const index = chars.length - 1;
    const meta = CHAR_META.get(chars[index]);
    if (!meta) return `${currentValue}${key}`;

    const nextFamilyByCurrent: Partial<Record<FamilyKey, FamilyKey>> = {
      a: "aw",
      o: "ow",
      u: "uw"
    };

    const nextFamily = nextFamilyByCurrent[meta.family];
    if (!nextFamily) return `${currentValue}${key}`;

    const nextWord = replaceCharAt(word, index, getVariants(nextFamily, meta.uppercase)[meta.tone]);
    return `${currentValue.slice(0, start)}${nextWord}`;
  }

  const appendedValue = `${currentValue}${key}`;
  const appendedMatch = getWordMatch(appendedValue);
  if (!appendedMatch || !/[\p{L}]/u.test(key)) return appendedValue;

  return `${appendedValue.slice(0, appendedMatch.start)}${normalizeTonePlacement(appendedMatch.word)}`;
};

export const applyVirtualKeyboardInput = (previousValue: string, rawInput: string) => {
  if (rawInput === previousValue) return previousValue;

  return [...rawInput].reduce((currentValue, key) => applyTelexKey(currentValue, key), "");
};

export const applyVirtualKeyboardButton = (previousValue: string, button: string) => {
  if (button === "{bksp}") {
    return [...previousValue].slice(0, -1).join("");
  }

  if (button === "{space}") {
    return `${previousValue} `;
  }

  if (button === ".com" || button === "@") {
    return `${previousValue}${button}`;
  }

  if (button.length === 1) {
    return applyTelexKey(previousValue, button);
  }

  return previousValue;
};
