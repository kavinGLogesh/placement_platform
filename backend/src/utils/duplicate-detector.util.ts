import crypto from 'node:crypto';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'how', 'many', 'much', 'calculate', 'find', 'determine', 'evaluate', 'compute',
  'following', 'select', 'choose', 'given', 'suppose', 'assume', 'solve', 'if'
]);

const SYNONYMS: Record<string, string> = {
  '%': 'percent',
  'percentage': 'percent',
  'pct': 'percent',
  'ratio': 'ratio',
  'proportion': 'ratio',
  'avg': 'average',
  'mean': 'average',
  'diff': 'difference',
  'subtraction': 'difference',
  'add': 'sum',
  'addition': 'sum',
  'total': 'sum',
  'mult': 'product',
  'multiply': 'product',
  'multiplication': 'product',
  'divide': 'division',
};

/**
 * Normalizes text for comparison:
 * Lowercases, replaces smart quotes/apostrophes, normalizes whitespace, strips outer punctuation.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/(\d+)\s*%/g, '$1 percent')
    .replace(/%/g, ' percent ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s+\-*/=^.<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts normalized tokens after stop word removal and synonym expansion.
 */
export function extractSignificantTokens(text: string): { tokens: Set<string>; numbers: Set<string> } {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(Boolean);

  const tokens = new Set<string>();
  const numbers = new Set<string>();

  for (const rawWord of words) {
    const cleanWord = rawWord.replace(/^[^\w]+|[^\w]+$/g, '');
    if (!cleanWord) continue;
    const word = SYNONYMS[cleanWord] || cleanWord;

    // Check if word is or contains a number
    if (/^\d+(?:\.\d+)?%?$/.test(word)) {
      numbers.add(word.replace('%', ''));
      tokens.add(word);
      continue;
    }

    if (!STOP_WORDS.has(word) && word.length > 1) {
      tokens.add(word);
    }
  }

  return { tokens, numbers };
}

/**
 * Generates deterministic SHA-256 fingerprint for exact duplicate detection.
 * Order-agnostic for options so swapped options A/B produce the exact same hash.
 */
export function generateExactQuestionHash(params: {
  category: string;
  topic: string;
  questionText: string;
  options?: Array<{ optionText: string }>;
  correctAnswer?: string | null;
}): string {
  const normCategory = normalizeText(params.category);
  const normTopic = normalizeText(params.topic);
  const normText = normalizeText(params.questionText);
  const normAnswer = params.correctAnswer ? normalizeText(params.correctAnswer) : '';

  const sortedOptions = (params.options || [])
    .map((o) => normalizeText(o.optionText))
    .filter(Boolean)
    .sort()
    .join('||');

  const payload = `${normCategory}|${normTopic}|${normText}|${sortedOptions}|${normAnswer}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export interface SemanticComparisonResult {
  isPossibleDuplicate: boolean;
  similarityScore: number;
  reason: string;
}

/**
 * Calculates semantic similarity between two questions within the same category/topic.
 * Uses Jaccard similarity over significant tokens and verifies numerical literal consistency.
 */
export function compareQuestionSemantics(
  textA: string,
  textB: string,
  topic?: string
): SemanticComparisonResult {
  const a = extractSignificantTokens(textA);
  const b = extractSignificantTokens(textB);

  // If numbers exist in both and do NOT overlap at all, they are likely variations with different values
  if (a.numbers.size > 0 && b.numbers.size > 0) {
    let commonNumbers = 0;
    for (const num of a.numbers) {
      if (b.numbers.has(num)) commonNumbers++;
    }
    // E.g., one has [20, 500], other has [30, 800] -> commonNumbers is 0
    if (commonNumbers === 0 && (a.numbers.size >= 2 || b.numbers.size >= 2)) {
      return {
        isPossibleDuplicate: false,
        similarityScore: 0.25,
        reason: 'Questions have distinct numerical parameters (different values/problems).',
      };
    }
  }

  if (a.tokens.size === 0 || b.tokens.size === 0) {
    return {
      isPossibleDuplicate: false,
      similarityScore: 0,
      reason: 'Insufficient significant tokens for semantic analysis.',
    };
  }

  // Calculate Jaccard Similarity on significant tokens
  let intersectionCount = 0;
  for (const token of a.tokens) {
    if (b.tokens.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...a.tokens, ...b.tokens]).size;
  const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;

  // Numerical alignment boost
  let score = jaccard;
  if (a.numbers.size > 0 && b.numbers.size > 0) {
    let commonNumbers = 0;
    for (const num of a.numbers) {
      if (b.numbers.has(num)) commonNumbers++;
    }
    const numOverlap = commonNumbers / Math.max(a.numbers.size, b.numbers.size);
    if (numOverlap === 1.0 && jaccard >= 0.5) {
      // Both questions operate on the identical set of numbers with strong wording overlap
      score = Math.min(1.0, jaccard * 0.7 + numOverlap * 0.35);
    }
  }

  const roundedScore = Math.round(score * 100) / 100;
  const isPossible = roundedScore >= 0.75;

  const topicLabel = topic ? ` in Topic '${topic}'` : '';
  const reason = isPossible
    ? `Semantic similarity: ${Math.round(roundedScore * 100)}% significant token overlap${topicLabel}.`
    : `Distinct questions: only ${Math.round(roundedScore * 100)}% token overlap${topicLabel}.`;

  return {
    isPossibleDuplicate: isPossible,
    similarityScore: roundedScore,
    reason,
  };
}
