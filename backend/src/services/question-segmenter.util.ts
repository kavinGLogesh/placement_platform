export interface RawParsedQuestion {
  questionNumber?: number | string;
  questionText: string;
  imageUrl?: string | null;
  hasUnresolvedDiagram?: boolean;
  diagramReviewNote?: string | null;
  options: Array<{
    optionText: string;
    optionOrder?: number;
    isCorrect?: boolean;
    label?: string;
  }>;
  documentAnswer?: string | null;
  hasDocumentAnswer?: boolean;
  explanation?: string | null;
  marks?: number;
  negativeMarks?: number;
}

/**
 * High-Precision Document Question Segmenter
 * Separates 100, 500, 1,000+ individual questions from raw text documents (PDF, DOCX, TXT).
 * Detects inline answers, explanations, and end-of-document Answer Keys.
 * Preserves mathematical symbols, formulas, special characters, and question numbering.
 * NEVER invents missing answers.
 */
export class QuestionSegmenter {
  /**
   * Main entry point to segment text into individual questions
   */
  static segmentQuestions(rawText: string): RawParsedQuestion[] {
    if (!rawText || !rawText.trim()) {
      return [];
    }

    // Step 1: Detect and extract Answer Key section if present at the end
    const { questionsText, answerKeyMap } = this.extractAnswerKeySection(rawText);

    // Step 2: Segment into individual question blocks
    const rawBlocks = this.splitIntoQuestionBlocks(questionsText);

    const questions: RawParsedQuestion[] = [];

    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i].trim();
      if (block.length < 10) continue;

      const parsed = this.parseIndividualBlock(block, i + 1, answerKeyMap);
      if (parsed) {
        questions.push(parsed);
      }
    }

    return questions;
  }

  /**
   * Identifies and extracts end-of-document Answer Key tables or blocks.
   * e.g.,
   * ANSWER KEY:
   * 1. C   2. A   3. D   4. B
   * or
   * 1 - C
   * 2 - A
   */
  private static extractAnswerKeySection(text: string): {
    questionsText: string;
    answerKeyMap: Map<number, string>;
  } {
    const answerKeyMap = new Map<number, string>();

    // Look for Answer Key headers near the bottom
    const keyHeaderRegex = /\b(?:ANSWER\s*KEY|ANSWERS\s*SHEET|SOLUTION\s*KEY|KEY\s*ANSWERS?|ANSWERS\s*:)\b/i;
    const match = text.match(keyHeaderRegex);

    if (!match || match.index === undefined) {
      return { questionsText: text, answerKeyMap };
    }

    // Ensure the header is towards the end or followed by answer mappings
    const keySectionStart = match.index;
    const keySectionText = text.substring(keySectionStart);

    // Parse mappings like "1. C", "1) A", "1-C", "Q1: D", "1: A"
    const mappingRegex = /(?:Q(?:uestion|\.)?\s*)?(\d{1,4})\s*[:.\-–\)]\s*([A-E]|True|False|\b[A-E]\b)/gi;
    let mapMatch: RegExpExecArray | null;
    let matchCount = 0;

    while ((mapMatch = mappingRegex.exec(keySectionText)) !== null) {
      const qNum = parseInt(mapMatch[1], 10);
      const ans = mapMatch[2].trim().toUpperCase();
      if (!isNaN(qNum) && ans) {
        answerKeyMap.set(qNum, ans);
        matchCount++;
      }
    }

    // If at least 2 answer mappings were found, strip the answer key from the questions text
    if (matchCount >= 2) {
      const questionsText = text.substring(0, keySectionStart).trim();
      return { questionsText, answerKeyMap };
    }

    return { questionsText: text, answerKeyMap };
  }

  /**
   * Splits document text into individual question blocks using line-anchored regex
   */
  private static splitIntoQuestionBlocks(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Match question starts: either at start of string or at start of a line
    const headerRegex = /(?:^|\r?\n)\s*(?:Q(?:uestion|\.)?\s*(\d{1,4})[\.\:\)\-–]?|(\d{1,4})\s*[\.\)\-–]|\[(\d{1,4})\])\s+/gim;
    const matchIndices: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(trimmed)) !== null) {
      matchIndices.push(match.index);
    }

    if (matchIndices.length > 0) {
      const blocks: string[] = [];
      for (let i = 0; i < matchIndices.length; i++) {
        const start = matchIndices[i];
        const end = i + 1 < matchIndices.length ? matchIndices[i + 1] : trimmed.length;
        const block = trimmed.substring(start, end).trim();
        if (block.length > 10) {
          blocks.push(block);
        }
      }
      if (blocks.length > 0) {
        return blocks;
      }
    }

    // Fallback: Split on double newlines
    return trimmed
      .split(/(?:\r?\n\s*){2,}/)
      .map((b) => b.trim())
      .filter((b) => b.length > 10);
  }

  /**
   * Parses an individual question block into statement, options, answers, and explanations
   */
  private static parseIndividualBlock(
    block: string,
    fallbackNumber: number,
    answerKeyMap: Map<number, string>
  ): RawParsedQuestion | null {
    // 1. Extract Question Number
    let questionNumber: number | string = fallbackNumber;
    const numMatch = block.match(/^(?:Q(?:uestion|\.)?\s*(\d{1,4})|\[(\d{1,4})\]|(\d{1,4})\s*[\.\)\-–])/i);
    if (numMatch) {
      const numStr = numMatch[1] || numMatch[2] || numMatch[3];
      if (numStr) {
        questionNumber = parseInt(numStr, 10);
      }
    }

    // 2. Extract Inline Answer
    let documentAnswer: string | null = null;
    let hasDocumentAnswer = false;

    const answerRegex = /\b(?:Answer|Ans|Correct\s*Answer|Key|Correct\s*Option)\s*[:.\-–]\s*(Option\s*)?([A-E]|True|False|[^\r\n]+)/i;
    const ansMatch = block.match(answerRegex);
    if (ansMatch) {
      documentAnswer = ansMatch[2].trim();
      hasDocumentAnswer = true;
    } else if (typeof questionNumber === 'number' && answerKeyMap.has(questionNumber)) {
      documentAnswer = answerKeyMap.get(questionNumber)!;
      hasDocumentAnswer = true;
    }

    // 3. Extract Explanation
    let explanation: string | null = null;
    const expRegex = /\b(?:Explanation|Solution|Rationale|Reason)\s*[:.\-–]\s*([\s\S]+?)(?=$|\n[A-E][\.\)]|\n\d+[\.\)])/i;
    const expMatch = block.match(expRegex);
    if (expMatch) {
      explanation = expMatch[1].trim();
    }

    // 4. Extract Marks and Negative Marks
    let marks = 1.0;
    let negativeMarks = 0.0;
    const marksMatch = block.match(/\[\s*(?:Marks?\s*:\s*)?(\d+(?:\.\d+)?)\s*(?:,\s*Negative\s*:\s*(\d+(?:\.\d+)?))?\s*\]/i);
    if (marksMatch) {
      marks = parseFloat(marksMatch[1]);
      if (marksMatch[2]) {
        negativeMarks = parseFloat(marksMatch[2]);
      }
    }

    // 5. Extract Options
    // Clean statement by removing answer, explanation, and marks lines from options search
    const statementAndOptions = block
      .replace(answerRegex, '')
      .replace(expRegex, '')
      .replace(/\[\s*(?:Marks?\s*:\s*)?\d+(?:\.\d+)?.*?\]/i, '')
      .trim();

    const options = this.extractOptions(statementAndOptions, documentAnswer);

    // 6. Extract clean Question Statement
    let questionText = statementAndOptions;
    // Strip leading question numbering
    questionText = questionText.replace(/^(?:Q(?:uestion|\.)?\s*\d+[\.\:\)\-–]?|\b\d{1,4}\s*[\.\)\-–]|\[\d{1,4}\])\s+/i, '').trim();

    // Strip options from statement text
    const firstOptionIndex = this.findFirstOptionIndex(questionText);
    if (firstOptionIndex > 0) {
      questionText = questionText.substring(0, firstOptionIndex).trim();
    }

    // If question statement is empty, fallback to trimmed block
    if (!questionText) {
      questionText = block.substring(0, 300).trim();
    }

    // 7. Extract Image/Diagram or Detect Visual Reference
    let imageUrl: string | null = null;
    let hasUnresolvedDiagram = false;
    let diagramReviewNote: string | null = null;

    // Check for inline markdown image ![alt](url) or HTML <img src="url"> or [Image: url]
    const imgMatch = questionText.match(/!\[(?:[^\]]*)\]\(([^)]+)\)|<img[^>]*src=["']([^"']+)["'][^>]*>|\[Image:\s*([^\]]+)\]/i);
    if (imgMatch) {
      imageUrl = (imgMatch[1] || imgMatch[2] || imgMatch[3]).trim();
      questionText = questionText.replace(imgMatch[0], '').trim();
    } else {
      // Check if statement refers to a diagram/figure/chart/circuit/table
      const diagramRefRegex = /\b(refer\s+to\s+(?:the\s+)?(?:figure|diagram|chart|graph|image|table)|shown\s+in\s+(?:the\s+)?(?:figure|diagram|circuit|chart|graph)|see\s+(?:the\s+)?(?:figure|diagram|circuit|graph)|(?:figure|fig\.?|diagram|chart|circuit|schematic)\s*(?:[A-Z0-9\.\-]+)?\s*[:\-\—]?)\b/i;
      if (diagramRefRegex.test(questionText)) {
        hasUnresolvedDiagram = true;
        diagramReviewNote = 'Visual reference detected in question text. Needs Admin review or manual diagram upload.';
      }
    }

    return {
      questionNumber,
      questionText,
      imageUrl,
      hasUnresolvedDiagram,
      diagramReviewNote,
      options,
      documentAnswer,
      hasDocumentAnswer,
      explanation,
      marks,
      negativeMarks,
    };
  }

  /**
   * Extracts options (A, B, C, D) from question text
   */
  private static extractOptions(
    text: string,
    documentAnswer: string | null
  ): Array<{ optionText: string; optionOrder: number; isCorrect: boolean; label: string }> {
    const options: Array<{ optionText: string; optionOrder: number; isCorrect: boolean; label: string }> = [];

    // Try line-by-line options: "A) ...", "A. ...", "(A) ...", "a) ..."
    const lineOptionRegex = /(?:^|\r?\n)\s*(?:\(?([A-E])\)|\b([A-E])[\.\)])\s+([^\r\n]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = lineOptionRegex.exec(text)) !== null) {
      const label = (match[1] || match[2]).toUpperCase();
      const optText = match[3].trim();
      const isCorrect = this.isOptionCorrect(label, optText, documentAnswer);

      options.push({
        optionText: optText,
        optionOrder: options.length + 1,
        isCorrect,
        label,
      });
    }

    // If line-by-line didn't find at least 2 options, try inline options: "(A) 10% (B) 20% (C) 15% (D) 25%"
    if (options.length < 2) {
      options.length = 0; // reset
      const inlineOptionRegex = /\(?([A-E])\)[\.\s]+([\s\S]+?)(?=\(?([A-E])\)|\s*$)/gi;

      while ((match = inlineOptionRegex.exec(text)) !== null) {
        const label = match[1].toUpperCase();
        const optText = match[2].trim();
        if (optText.length > 0 && optText.length < 200) {
          const isCorrect = this.isOptionCorrect(label, optText, documentAnswer);
          options.push({
            optionText: optText,
            optionOrder: options.length + 1,
            isCorrect,
            label,
          });
        }
      }
    }

    // If still no options found, check True / False questions
    if (options.length === 0 && /\b(True|False)\b/i.test(text)) {
      const isTrueCorrect = documentAnswer?.toLowerCase() === 'true';
      const isFalseCorrect = documentAnswer?.toLowerCase() === 'false';
      options.push(
        { optionText: 'True', optionOrder: 1, isCorrect: isTrueCorrect, label: 'A' },
        { optionText: 'False', optionOrder: 2, isCorrect: isFalseCorrect, label: 'B' }
      );
    }

    return options;
  }

  /**
   * Determines whether an option matches the document's answer key
   */
  private static isOptionCorrect(
    label: string,
    optionText: string,
    documentAnswer: string | null
  ): boolean {
    if (!documentAnswer) return false;

    const cleanAns = documentAnswer.trim().toUpperCase();
    const cleanLabel = label.trim().toUpperCase();

    // Direct label match: e.g. "C" matches label "C" or "Option C"
    if (cleanAns === cleanLabel || cleanAns === `OPTION ${cleanLabel}` || cleanAns === `(${cleanLabel})`) {
      return true;
    }

    // Text match: e.g. Answer is "20%" and optionText is "20%"
    if (optionText && optionText.trim().toLowerCase() === documentAnswer.trim().toLowerCase()) {
      return true;
    }

    return false;
  }

  /**
   * Helper to locate where options begin in a question block
   */
  private static findFirstOptionIndex(text: string): number {
    const match = text.match(/(?:^|\r?\n)\s*(?:\(?[A-E]\)|\b[A-E][\.\)])\s+/i);
    return match ? match.index || -1 : -1;
  }
}
