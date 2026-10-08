import { IAiClassificationProvider } from './ai-provider.interface.js';
import {
  AiClassifyQuestionInput,
  AiClassifyResult,
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  AiClassificationStatus,
  CATEGORY_TOPICS_MAP,
  canonicalizeTopic,
} from '../../types/question.types.js';

interface ConceptDefinition {
  category: QuestionCategory;
  topic: string;
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

const CONCEPT_DEFINITIONS: ConceptDefinition[] = [
  // QUANTITATIVE_APTITUDE
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Profit & Loss',
    keywords: ['cost price', 'selling price', 'profit percentage', 'loss percentage', 'markup', 'discount', 'marked price', 'dealer', 'trader sells', 'gain percent', 'cp', 'sp', 'loss percent', 'profit of', 'buys an article', 'sells it for', 'buys', 'sells', 'profit %', 'find the profit'],
    patterns: [/\b(cost\s*price|selling\s*price|profit\s*%|loss\s*%|marked\s*price|discount\s*%|profit\s+percentage|loss\s+percentage)\b/i, /\b(buys\s+an?\s+article|sells\s+(it|an?\s+article))\b/i, /\b₹?\s*\d+\s*(gain|loss|profit)\b/i],
    weight: 2.5,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Time Speed Distance',
    keywords: ['speed', 'distance', 'train', 'platform', 'km/hr', 'kmph', 'm/s', 'relative speed', 'stream', 'boat', 'upstream', 'downstream', 'overtakes', 'travels at', 'average speed'],
    patterns: [/\b(km\/h|kmph|m\/s|speed\s+of|distance\s+between|train\s+crosses|upstream|downstream)\b/i],
    weight: 2.0,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Time & Work',
    keywords: ['workers', 'completing work', 'efficiency', 'pipes', 'cistern', 'tank', 'together complete', 'alone can do', 'days to finish', 'wages', 'work done'],
    patterns: [/\b(can\s+do\s+a\s+piece\s+of\s+work|days\s+to\s+complete|pipes?\s+and\s+cisterns?|together\s+finish)\b/i],
    weight: 2.0,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Percentage',
    keywords: ['percentage', 'percent', 'percentage increase', 'percentage decrease', 'population increased', 'marks scored', 'exam passed'],
    patterns: [/\b(\d+%\s*increase|\d+%\s*decrease|percentage\s+of|increased\s+by\s*\d+%)\b/i],
    weight: 1.5,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Average',
    keywords: ['average', 'mean of numbers', 'average age', 'average weight', 'average runs', 'batsman average', 'average marks'],
    patterns: [/\b(average\s+(of|age|weight|runs|score|marks)|mean\s+of)\b/i],
    weight: 1.8,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Probability',
    keywords: ['probability', 'dice', 'coin', 'tossed', 'deck of cards', 'drawn at random', 'mutually exclusive', 'favorable outcomes', 'sample space'],
    patterns: [/\b(probability\s+of|drawn\s+at\s+random|deck\s+of\s+\d+\s+cards|die\s+is\s+rolled|coin\s+is\s+tossed)\b/i],
    weight: 2.0,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Simple Interest',
    keywords: ['simple interest', 'per annum', 'rate of interest', 'principal amount', 'borrowed at', 'sum doubles in', 'simple interest on'],
    patterns: [/\b(simple\s+interest|s\.i\.|principal\s+amount|rate\s+of\s+\d+%\s+per\s+annum)\b/i],
    weight: 1.9,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Compound Interest',
    keywords: ['compound interest', 'compounded annually', 'compounded half-yearly', 'compounded quarterly', 'c.i.', 'difference between ci and si'],
    patterns: [/\b(compound\s+interest|compounded\s+(annually|half-yearly|quarterly))\b/i],
    weight: 2.0,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Ratio & Proportion',
    keywords: ['ratio', 'proportion', 'divided between a and b', 'divided among', 'proportional to', 'third proportional', 'mean proportional'],
    patterns: [/\b(ratio\s+of|\d+\s*:\s*\d+|proportional\s+to|mean\s+proportional)\b/i],
    weight: 1.8,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Permutation & Combination',
    keywords: ['permutation', 'combination', 'arranged in', 'ways to select', 'selections', 'factorial', 'npr', 'ncr', 'arrangements of letters'],
    patterns: [/\b(number\s+of\s+ways|arranged\s+in|selected\s+from|permutation|combination)\b/i],
    weight: 2.0,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Number System',
    keywords: ['divisible by', 'remainder', 'prime number', 'lcm', 'hcf', 'unit digit', 'gcd', 'greatest common divisor', 'divisibility rule'],
    patterns: [/\b(divisible\s+by\s+\d+|unit\s+digit|lcm\s+and\s+hcf|prime\s+factor)\b/i],
    weight: 1.8,
  },
  {
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Data Interpretation',
    keywords: ['bar graph', 'pie chart', 'line graph', 'table represents', 'chart shows', 'data given below'],
    patterns: [/\b(pie\s*chart|bar\s*graph|data\s+in\s+the\s+table)\b/i],
    weight: 2.0,
  },

  // LOGICAL_REASONING
  {
    category: 'LOGICAL_REASONING',
    topic: 'Blood Relations',
    keywords: ['father', 'mother', 'brother', 'sister', 'uncle', 'aunt', 'maternal', 'paternal', 'nephew', 'niece', 'pointing to a photograph', 'son of my father'],
    patterns: [/\b(pointing\s+to|how\s+is\s+[a-z]+\s+related\s+to|father\s+of|maternal\s+uncle|only\s+daughter)\b/i],
    weight: 2.2,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Direction Sense',
    keywords: ['north', 'south', 'east', 'west', 'turns left', 'turns right', 'facing towards', 'shadow falls', 'distance from starting point'],
    patterns: [/\b(walks\s+\d+\s*(m|km)\s+(towards|north|south|east|west)|turns\s+(left|right)|starting\s+point)\b/i],
    weight: 2.2,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Syllogism',
    keywords: ['statements', 'conclusions', 'all a are b', 'some a are b', 'no a is b', 'some not', 'venn diagram', 'follows'],
    patterns: [/\b(statements?:\s*all|conclusions?:\s*(some|all|no)|some\s+[a-z]+\s+are\s+[a-z]+)\b/i],
    weight: 2.2,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Coding-Decoding',
    keywords: ['coded as', 'code for', 'written as', 'decipher', 'language, CAT is coded', 'numerical code'],
    patterns: [/\b(is\s+coded\s+as|code\s+for|how\s+will\s+[a-z]+\s+be\s+coded)\b/i],
    weight: 2.0,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Number Series',
    keywords: ['find the next term', 'missing number', 'wrong number in the series', 'series:', 'next number in the sequence'],
    patterns: [/\b(find\s+the\s+(next|missing)\s+(number|term)|series:\s*\d+,\s*\d+)\b/i, /^\s*\d+,\s*\d+,\s*\d+,\s*\d+,\s*(\?|\.\.\.)/m],
    weight: 2.0,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Letter Series',
    keywords: ['next letters', 'missing letter', 'letter series', 'alphabetical series'],
    patterns: [/\b([A-Z]{2,4},\s*[A-Z]{2,4},\s*[A-Z]{2,4})\b/],
    weight: 1.9,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Seating Arrangement',
    keywords: ['circular table', 'facing the center', 'sitting opposite', 'row of people', 'facing north and south', 'linear arrangement'],
    patterns: [/\b(sitting\s+around\s+a\s+circle|facing\s+the\s+centre|seated\s+in\s+a\s+row)\b/i],
    weight: 2.0,
  },
  {
    category: 'LOGICAL_REASONING',
    topic: 'Statement & Conclusion',
    keywords: ['statement', 'assumption', 'conclusion', 'inference', 'assertion', 'reason', 'critically examine'],
    patterns: [/\b(statement:\s*.*conclusion:|which\s+of\s+the\s+conclusions?\s+logically\s+follows?)\b/i],
    weight: 2.0,
  },

  // VERBAL_ABILITY
  {
    category: 'VERBAL_ABILITY',
    topic: 'Synonyms',
    keywords: ['synonym', 'closest in meaning', 'same meaning', 'nearest in meaning'],
    patterns: [/\b(synonym\s+of|nearest\s+in\s+meaning\s+to|closest\s+in\s+meaning)\b/i],
    weight: 2.2,
  },
  {
    category: 'VERBAL_ABILITY',
    topic: 'Antonyms',
    keywords: ['antonym', 'opposite in meaning', 'opposite of'],
    patterns: [/\b(antonym\s+of|opposite\s+in\s+meaning|most\s+opposite\s+to)\b/i],
    weight: 2.2,
  },
  {
    category: 'VERBAL_ABILITY',
    topic: 'Error Detection',
    keywords: ['find the error', 'grammatical error', 'spotting errors', 'part containing error', 'sentence has an error', 'identify the error', 'error in the sentence', 'neither of the students', 'identify the error in'],
    patterns: [/\b(spot\s+the\s+error|identify\s+the\s+error|error\s+in\s+the\s+sentence|part\s+of\s+the\s+sentence\s+(has|contains)\s+an\s+error|no\s+error)\b/i],
    weight: 2.5,
  },
  {
    category: 'VERBAL_ABILITY',
    topic: 'Sentence Correction',
    keywords: ['sentence correction', 'improve the underlined', 'replace the underlined', 'correct sentence'],
    patterns: [/\b(improve\s+the\s+bracketed|correct\s+the\s+sentence|phrase\s+replacement)\b/i],
    weight: 2.0,
  },
  {
    category: 'VERBAL_ABILITY',
    topic: 'Fill in the Blanks',
    keywords: ['fill in the blank', 'suitable word', 'appropriate word', 'blank space'],
    patterns: [/\b(fill\s+in\s+the\s+blank|choose\s+the\s+(correct|suitable)\s+word\s+to\s+fill)\b/i, /_{3,}|\.{4,}/],
    weight: 1.8,
  },
  {
    category: 'VERBAL_ABILITY',
    topic: 'Para Jumbles',
    keywords: ['jumbled sentences', 'rearrange the parts', 'logical sequence P Q R S', 'P, Q, R, S'],
    patterns: [/\b(rearrange\s+the\s+following|p:\s*.*q:\s*.*r:\s*.*s:|p,\s*q,\s*r,\s*s)\b/i],
    weight: 2.2,
  },

  // TECHNICAL_MCQ
  {
    category: 'TECHNICAL_MCQ',
    topic: 'Data Structures',
    keywords: ['binary search tree', 'linked list', 'stack', 'queue', 'heap', 'hashing', 'graph traversal', 'bfs', 'dfs', 'avl tree', 'doubly linked list', 'time complexity of inserting'],
    patterns: [/\b(binary\s+search\s+tree|linked\s+list|stack\s+and\s+queue|hash\s*table|avl\s+tree|dfs|bfs)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'Algorithms',
    keywords: ['dijkstra', 'quicksort', 'mergesort', 'dynamic programming', 'greedy algorithm', 'big o notation', 'asymptotic complexity', 'divide and conquer'],
    patterns: [/\b(o\(n\s*log\s*n\)|big\s*o\s*notation|quicksort|mergesort|dijkstra|greedy\s+approach)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'DBMS',
    keywords: ['sql query', 'database', 'foreign key', 'primary key', 'normalization', 'bcnf', 'acid properties', 'transaction isolation', 'relational algebra', 'join'],
    patterns: [/\b(select\s+.*\s+from|foreign\s+key|acid\s+properties|normalization\s+(1nf|2nf|3nf|bcnf)|inner\s+join)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'Operating Systems',
    keywords: ['deadlock', 'semaphore', 'process scheduling', 'paging', 'virtual memory', 'round robin', 'thread', 'context switching', 'fork()', 'mutex'],
    patterns: [/\b(deadlock|semaphore|mutex|virtual\s+memory|context\s+switch|process\s+scheduling)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'Computer Networks',
    keywords: ['tcp', 'udp', 'osi model', 'ip address', 'subnet mask', 'http', 'dns', 'router', 'mac address', 'three-way handshake', 'congestion control'],
    patterns: [/\b(osi\s+model|tcp\/ip|subnet\s+mask|dns|three-way\s+handshake|packet\s+switching)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'Java',
    keywords: ['jvm', 'garbage collection', 'interfaces in java', 'static synchronized', 'polymorphism in java', 'abstract class in java', 'public static void main', 'stringbuilder'],
    patterns: [/\b(public\s+static\s+void\s+main|system\.out\.println|jvm|garbage\s+collector)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'Python',
    keywords: ['python list comprehension', 'lambda function in python', 'decorator in python', 'generator yield', 'python dict', 'def __init__', 'gil in python'],
    patterns: [/\b(def\s+[a-z_][a-z0-9_]*\(|list\s+comprehension|generator|yield|__init__)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'C',
    keywords: ['pointers in c', 'malloc', 'printf', 'scanf', 'sizeof operator', 'struct in c', 'segmentation fault', 'pointer arithmetic'],
    patterns: [/\b(#include\s*<stdio\.h>|int\s*\*ptr|malloc\(|printf\(|scanf\()\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'C++',
    keywords: ['std::vector', 'cin', 'cout', 'virtual destructor', 'c++ template', 'stl in c++', 'friend function'],
    patterns: [/\b(std::cout|std::vector|#include\s*<iostream>|template\s*<typename)\b/i],
    weight: 2.0,
  },
  {
    category: 'TECHNICAL_MCQ',
    topic: 'OOP',
    keywords: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'class and object', 'method overriding', 'method overloading'],
    patterns: [/\b(encapsulation|polymorphism|method\s+overriding|abstraction|inheritance\s+in)\b/i],
    weight: 1.8,
  },

  // CODING
  {
    category: 'CODING',
    topic: 'Arrays',
    keywords: ['two sum', 'maximum subarray', 'subarray sum', 'rotate array', 'merge intervals', 'prefix sum', 'sliding window'],
    patterns: [/\b(array\s+of\s+integers|subarray|two\s+pointer|sliding\s+window)\b/i],
    weight: 1.9,
  },
  {
    category: 'CODING',
    topic: 'Dynamic Programming',
    keywords: ['longest increasing subsequence', 'knapsack', 'memoization', 'tabulation', 'optimal substructure', 'coin change', 'matrix chain multiplication'],
    patterns: [/\b(dynamic\s+programming|dp\[i\]|knapsack|longest\s+common\s+subsequence)\b/i],
    weight: 2.2,
  },
  {
    category: 'CODING',
    topic: 'Recursion',
    keywords: ['base case', 'recursive function', 'tower of hanoi', 'backtracking', 'n-queens'],
    patterns: [/\b(recursive\s+step|base\s+condition|tower\s+of\s+hanoi|backtracking)\b/i],
    weight: 2.0,
  },
];

export class SemanticClassifierProvider implements IAiClassificationProvider {
  readonly providerName = 'SemanticConceptClassifier';

  async classifyQuestion(input: AiClassifyQuestionInput): Promise<AiClassifyResult> {
    const text = input.questionText.trim();
    const explanation = input.explanation || '';
    const fullContent = `${text} ${explanation}`.toLowerCase();

    // 1. Topic & Category Scoring
    let bestMatch: ConceptDefinition | null = null;
    let highestScore = 0;
    let runnerUpScore = 0;

    for (const concept of CONCEPT_DEFINITIONS) {
      let score = 0;

      // Check keywords
      for (const kw of concept.keywords) {
        if (fullContent.includes(kw.toLowerCase())) {
          score += 1.5 * concept.weight;
        }
      }

      // Check regex patterns
      for (const pat of concept.patterns) {
        if (pat.test(fullContent)) {
          score += 2.5 * concept.weight;
        }
      }

      if (score > highestScore) {
        runnerUpScore = highestScore;
        highestScore = score;
        bestMatch = concept;
      } else if (score > runnerUpScore) {
        runnerUpScore = score;
      }
    }

    // Default category/topic if no strong concept detected
    const category: QuestionCategory = bestMatch?.category || 'QUANTITATIVE_APTITUDE';
    let topic = bestMatch?.topic || 'Percentage';

    // Verify against authoritative taxonomy
    const canonical = canonicalizeTopic(category, topic);
    if (canonical) {
      topic = canonical;
    } else {
      topic = CATEGORY_TOPICS_MAP[category][0];
    }

    // Calculate Category & Topic Confidences
    let categoryConfidence = 0.85;
    let topicConfidence = 0.80;

    if (highestScore > 0) {
      const margin = highestScore - runnerUpScore;
      if (margin >= 3.0) {
        categoryConfidence = Math.min(0.98, 0.85 + (highestScore / 25) * 0.13);
        topicConfidence = Math.min(0.96, 0.80 + (highestScore / 25) * 0.16);
      } else if (margin >= 1.0) {
        categoryConfidence = 0.82;
        topicConfidence = 0.74;
      } else {
        // High ambiguity between two concepts
        categoryConfidence = 0.70;
        topicConfidence = 0.65;
      }
    } else {
      // Very low concept detection
      categoryConfidence = 0.50;
      topicConfidence = 0.45;
    }

    // 2. Question Type Analysis
    const questionType = this.analyzeQuestionType(input);
    const typeConfidence = input.options && input.options.length > 0 ? 0.98 : 0.90;

    // 3. Difficulty Analysis (Reasoning steps, calculations, conceptual complexity, distractors)
    const { difficulty, difficultyConfidence, reasoning } = this.analyzeDifficulty(input, category, topic);

    // 4. Overall Confidence & Needs Review check
    const overallConfidence = parseFloat(
      ((categoryConfidence * 0.35) + (topicConfidence * 0.35) + (difficultyConfidence * 0.15) + (typeConfidence * 0.15)).toFixed(2)
    );

    // Rule: If any key confidence is < 0.75, or overall < 0.75, mark NEEDS_REVIEW
    const status: AiClassificationStatus =
      categoryConfidence < 0.75 || topicConfidence < 0.75 || overallConfidence < 0.75
        ? 'NEEDS_REVIEW'
        : 'CLASSIFIED';

    return {
      category,
      topic,
      difficulty,
      questionType,
      confidence: {
        category: parseFloat(categoryConfidence.toFixed(2)),
        topic: parseFloat(topicConfidence.toFixed(2)),
        difficulty: parseFloat(difficultyConfidence.toFixed(2)),
        questionType: parseFloat(typeConfidence.toFixed(2)),
        overall: overallConfidence,
      },
      reasoning,
      status,
      modelName: this.providerName,
    };
  }

  private analyzeQuestionType(input: AiClassifyQuestionInput): QuestionType {
    if (input.options && input.options.length > 0) {
      if (input.options.length === 2) {
        const texts = input.options.map((o) => o.optionText.trim().toLowerCase());
        if (texts.includes('true') && texts.includes('false')) {
          return 'TRUE_FALSE';
        }
      }
      const correctCount = input.options.filter((o) => o.isCorrect).length;
      if (correctCount > 1) {
        return 'MULTIPLE_CHOICE';
      }
      return 'SINGLE_CHOICE';
    }

    const text = input.questionText.toLowerCase();
    if (text.includes('fill in the blank') || /_{3,}|\.{4,}/.test(input.questionText)) {
      return 'FILL_BLANK';
    }

    if (text.includes('explain') || text.includes('describe') || text.includes('write a program') || text.includes('implement')) {
      return 'DESCRIPTIVE';
    }

    return 'SINGLE_CHOICE';
  }

  private analyzeDifficulty(
    input: AiClassifyQuestionInput,
    category: QuestionCategory,
    topic: string
  ): { difficulty: QuestionDifficulty; difficultyConfidence: number; reasoning: string } {
    const text = input.questionText;
    const lower = text.toLowerCase();

    let complexityPoints = 0;
    const reasoningPoints: string[] = [];

    // Concept count and multi-step reasoning
    const mathFormulas = (text.match(/[+*=><√%^-]/g) || []).length;
    const numbersCount = (text.match(/\b\d+(\.\d+)?\b/g) || []).length;

    if (numbersCount >= 4 || mathFormulas >= 3) {
      complexityPoints += 2;
      reasoningPoints.push('Multiple numerical parameters and quantitative relationships involved');
    }

    // Keyword indicators of multi-stage problem solving
    const multiStageKeywords = [
      'successive', 'compound', 'simultaneously', 'respectively', 'alternately', 'ratio of speed',
      'relative to', 'two trains', 'leak in cistern', 'after receiving discount and tax',
      'recurrence relation', 'nested loop', 'amortization', 'weighted average'
    ];
    for (const kw of multiStageKeywords) {
      if (lower.includes(kw)) {
        complexityPoints += 2;
        reasoningPoints.push(`Advanced concept: '${kw}' requiring multi-stage deduction`);
        break;
      }
    }

    // Direct, single-step problem solving
    const directKeywords = [
      'find the cost price', 'calculate the profit percentage', 'find the profit percentage', 'find profit percentage',
      'find the profit', 'find the mean', 'find the speed', 'find the synonym', 'antonym of', 'what is the output of',
      'find the value of', 'what is the value'
    ];
    let isDirect = false;
    for (const kw of directKeywords) {
      if (
        lower.includes(kw) &&
        numbersCount <= 3 &&
        !lower.includes('successive') &&
        !lower.includes('discount') &&
        !lower.includes('markup') &&
        !lower.includes('marked')
      ) {
        isDirect = true;
        break;
      }
    }

    // Option distractor complexity
    if (input.options && input.options.length >= 4) {
      const numbersInOptions = input.options
        .map((o) => parseFloat(o.optionText.replace(/[^0-9.]/g, '')))
        .filter((n) => !isNaN(n));

      if (numbersInOptions.length >= 3) {
        const sorted = [...numbersInOptions].sort((a, b) => a - b);
        let minDiff = Infinity;
        for (let i = 1; i < sorted.length; i++) {
          minDiff = Math.min(minDiff, sorted[i] - sorted[i - 1]);
        }
        if (minDiff <= 2 && minDiff > 0) {
          complexityPoints += 1;
          reasoningPoints.push('Closely spaced numerical options requiring exact precision');
        }
      }
    }

    // Complexity mapping
    let difficulty: QuestionDifficulty = 'MEDIUM';
    let difficultyConfidence = 0.82;

    if (isDirect && complexityPoints <= 1) {
      difficulty = 'EASY';
      difficultyConfidence = 0.88;
      reasoningPoints.push('Single conceptual step with straightforward algebraic or conceptual application');
    } else if (complexityPoints >= 3) {
      difficulty = 'HARD';
      difficultyConfidence = 0.84;
      reasoningPoints.push('Multi-step reasoning requiring simultaneous application of principles and high cognitive effort');
    } else {
      difficulty = 'MEDIUM';
      difficultyConfidence = 0.80;
      reasoningPoints.push('Standard two-step problem solving with moderate calculation or structural reasoning');
    }

    const reasoning = `Analyzed under ${category} → ${topic}: ${reasoningPoints.join('; ')}.`;
    return { difficulty, difficultyConfidence, reasoning };
  }
}

export const semanticClassifierProvider = new SemanticClassifierProvider();
