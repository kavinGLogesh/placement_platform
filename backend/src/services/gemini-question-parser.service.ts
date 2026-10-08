import fs from 'fs';
import path from 'path';
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  CATEGORY_TOPICS_MAP,
  canonicalizeTopic,
  canonicalizeDifficulty,
  ExtractedQuestionDto,
  GeminiParsedQuestionResult,
  ConfidenceScores,
} from '../types/question.types.js';
import { questionRepository } from '../repositories/question.repository.js';
import { semanticClassifierProvider } from './ai/semantic-classifier.provider.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.config.js';
import {
  detectRealFileType,
  parseDocxDocument,
  parseXlsxDocument,
  parseCsvDocument,
  parseXmlDocument,
  parsePdfDocument,
} from './document-parser.util.js';
import { QuestionSegmenter, RawParsedQuestion } from './question-segmenter.util.js';
import {
  validateImageMagicBytes,
  generateSafeImageFilename,
  QUESTIONS_UPLOAD_DIR,
} from '../utils/file-security.util.js';

export class GeminiQuestionParserService {
  /**
   * Main entrypoint to process uploaded document, spreadsheet, image, or text.
   * Seamlessly handles 100, 500, 1,000+ questions using high-precision parsers,
   * segmentation, batched Gemini semantic intelligence, and local semantic fallback.
   * Fixes root-cause ZIP/XML binary leakage (no PK ... [Content_Types].xml).
   */
  async analyzeDocument(params: {
    file?: { buffer: Buffer; originalname: string; mimetype: string };
    text?: string;
    apiKey?: string;
    targetCompanyId?: string;
  }): Promise<GeminiParsedQuestionResult> {
    const apiKey =
      params.apiKey?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      env.GEMINI_API_KEY?.trim();

    // 1. Identify File Type & Run Dedicated Parser
    const { rawQuestions, fullText, isScannedPdf, isImage } = await this.extractRawQuestionsFromInput(
      params.file,
      params.text
    );

    // 2. If it's a visual input (Scanned PDF or Image), use Gemini Multimodal Vision directly
    if (params.file && (isScannedPdf || isImage)) {
      if (apiKey) {
        try {
          return await this.processMultimodalVisualInput(params.file, apiKey, params.targetCompanyId);
        } catch (err: any) {
          console.warn('[GeminiQuestionParserService] Multimodal visual analysis failed:', err.message);
        }
      }
      // If visual without API key or failed, check if any raw questions could be parsed from OCR/text
      if (rawQuestions.length === 0) {
        throw new AppError(
          'Scanned document or image requires Gemini Multimodal API key for visual recognition. Please configure GEMINI_API_KEY.',
          400
        );
      }
    }

    if (rawQuestions.length === 0 && (!fullText || !fullText.trim())) {
      throw new AppError(
        'No assessment questions could be recognized from the provided document. Please check the document format.',
        400
      );
    }

    // 3. Process Large Scale / Batch Question Understanding
    const enrichedQuestions = await this.batchProcessQuestions(rawQuestions, fullText, apiKey, params.targetCompanyId);

    // 4. Run Duplicate Check against Active Question Bank & Compute Statistics
    return this.applyDuplicateDetectionAndCounters(enrichedQuestions);
  }

  /**
   * Extracts raw questions using dedicated, type-specific parsers.
   * Completely avoids raw ZIP buffer stringification.
   */
  private async extractRawQuestionsFromInput(
    file?: { buffer: Buffer; originalname: string; mimetype: string },
    text?: string
  ): Promise<{
    rawQuestions: RawParsedQuestion[];
    fullText: string;
    isScannedPdf: boolean;
    isImage: boolean;
  }> {
    let rawQuestions: RawParsedQuestion[] = [];
    let fullText = text || '';
    let isScannedPdf = false;
    let isImage = false;

    if (file) {
      const realType = detectRealFileType(file.buffer, file.originalname, file.mimetype);

      switch (realType) {
        case 'DOCX': {
          // Dedicated DOCX parser using mammoth
          const docxResult = await parseDocxDocument(file.buffer);
          fullText = (docxResult.text + '\n' + (text || '')).trim();
          rawQuestions = QuestionSegmenter.segmentQuestions(fullText);

          // If DOCX has embedded images, associate with questions
          if (docxResult.embeddedImages && docxResult.embeddedImages.length > 0) {
            let imgIdx = 0;
            for (const q of rawQuestions) {
              if (q.hasUnresolvedDiagram && imgIdx < docxResult.embeddedImages.length) {
                q.imageUrl = docxResult.embeddedImages[imgIdx].url;
                q.hasUnresolvedDiagram = false;
                q.diagramReviewNote = null;
                imgIdx++;
              }
            }
            if (imgIdx === 0 && rawQuestions.length === docxResult.embeddedImages.length) {
              for (let k = 0; k < rawQuestions.length; k++) {
                rawQuestions[k].imageUrl = docxResult.embeddedImages[k].url;
              }
            }
          }
          break;
        }

        case 'XLSX': {
          // Dedicated XLSX parser using SheetJS
          const xlsxResult = parseXlsxDocument(file.buffer);
          rawQuestions = xlsxResult.rawQuestions;
          fullText = (xlsxResult.text + '\n' + (text || '')).trim();
          if (rawQuestions.length === 0 && fullText.trim()) {
            rawQuestions = QuestionSegmenter.segmentQuestions(fullText);
          }
          break;
        }

        case 'CSV': {
          // Dedicated CSV parser
          const csvResult = parseCsvDocument(file.buffer);
          rawQuestions = csvResult.rawQuestions;
          fullText = (csvResult.text + '\n' + (text || '')).trim();
          if (rawQuestions.length === 0 && fullText.trim()) {
            rawQuestions = QuestionSegmenter.segmentQuestions(fullText);
          }
          break;
        }

        case 'XML': {
          // Dedicated XML parser using fast-xml-parser
          const xmlResult = parseXmlDocument(file.buffer);
          rawQuestions = xmlResult.rawQuestions;
          fullText = (xmlResult.text + '\n' + (text || '')).trim();
          if (rawQuestions.length === 0 && fullText.trim()) {
            rawQuestions = QuestionSegmenter.segmentQuestions(fullText);
          }
          break;
        }

        case 'PDF': {
          // Dedicated PDF text extraction
          const pdfResult = await parsePdfDocument(file.buffer);
          isScannedPdf = pdfResult.isScanned;
          if (!isScannedPdf && pdfResult.text) {
            fullText = (pdfResult.text + '\n' + (text || '')).trim();
            rawQuestions = QuestionSegmenter.segmentQuestions(fullText);
          }
          break;
        }

        case 'IMAGE': {
          isImage = true;
          break;
        }

        case 'TEXT':
        default: {
          const raw = file.buffer.toString('utf-8');
          fullText = (raw + '\n' + (text || '')).trim();
          rawQuestions = QuestionSegmenter.segmentQuestions(fullText);
          break;
        }
      }
    } else if (text && text.trim()) {
      rawQuestions = QuestionSegmenter.segmentQuestions(text.trim());
    }

    return { rawQuestions, fullText, isScannedPdf, isImage };
  }

  /**
   * Processes large volume of segmented questions (100, 500, 1000+) in controlled batches.
   * Calls Gemini for deep concept intelligence, with instant fallback to local semantic classifier.
   */
  private async batchProcessQuestions(
    rawQuestions: RawParsedQuestion[],
    _fullText: string,
    apiKey?: string,
    targetCompanyId?: string
  ): Promise<ExtractedQuestionDto[]> {
    const enrichedList: ExtractedQuestionDto[] = [];
    const BATCH_SIZE = 15; // 15 questions per batch optimal for Gemini throughput and token bounds

    for (let i = 0; i < rawQuestions.length; i += BATCH_SIZE) {
      const batch = rawQuestions.slice(i, i + BATCH_SIZE);
      let batchResults: Array<Partial<ExtractedQuestionDto>> = [];

      if (apiKey) {
        try {
          batchResults = await this.classifyBatchWithGemini(batch, apiKey);
        } catch (err: any) {
          console.warn(`[GeminiQuestionParserService] Gemini batch classification failed for chunk [${i}-${i + batch.length}]: ${err.message}. Using semantic fallback.`);
        }
      }

      // Merge Gemini results or run local semantic classification fallback
      for (let j = 0; j < batch.length; j++) {
        const raw = batch[j];
        const geminiItem = batchResults[j];

        const enriched = await this.resolveQuestionClassification(raw, geminiItem, i + j + 1, targetCompanyId);
        enrichedList.push(enriched);
      }
    }

    return enrichedList;
  }

  /**
   * Classifies a batch of up to 15 questions via Gemini in a single structured prompt
   */
  private async classifyBatchWithGemini(
    batch: RawParsedQuestion[],
    apiKey: string
  ): Promise<Array<Partial<ExtractedQuestionDto>>> {
    const prompt = `You are a Tier-1 Principal AI Assessment Classifier for a College Placement Platform.
Analyze each of the following ${batch.length} questions and determine its exact conceptual classification.

TAXONOMY RESTRICTION (Use ONLY these categories):
- QUANTITATIVE_APTITUDE (Topics: Percentage, Profit & Loss, Ratio & Proportion, Average, Time & Work, Time Speed Distance, Simple Interest, Compound Interest, Probability, Number System, Permutation & Combination, Data Interpretation)
- LOGICAL_REASONING (Topics: Number Series, Letter Series, Coding-Decoding, Blood Relations, Direction Sense, Seating Arrangement, Syllogism, Clocks & Calendars, Statement & Conclusion)
- VERBAL_ABILITY (Topics: Reading Comprehension, Synonyms, Antonyms, Error Detection, Sentence Correction, Fill in the Blanks, Para Jumbles)
- TECHNICAL_MCQ (Topics: Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks, Java, Python, C, C++, OOP)
- CODING (Topics: Arrays, Strings, Dynamic Programming, Recursion, Trees, Graphs)

CONCEPT UNDERSTANDING RULES:
- "A man buys an article for ₹500 and sells it for ₹600. Find the profit percentage." -> Topic: "Profit & Loss", Difficulty: "EASY"
- "The price of an article increases from ₹500 to ₹600." -> Topic: "Percentage", Difficulty: "EASY"
- "A shopkeeper marks an article 30% above cost price and gives a 10% discount." -> Topic: "Profit & Loss", Difficulty: "MEDIUM"
- "If price increased by 20% and decreased by 20%" -> Topic: "Percentage", Difficulty: "MEDIUM"

ANSWER INTEGRITY RULES:
- Do NOT invent a correct answer if not provided in the question text.
- If an explicit document answer is provided, extract it accurately.
- You may calculate and provide an "aiVerifiedAnswer" for verification.

QUESTIONS TO CLASSIFY:
${JSON.stringify(
  batch.map((q, idx) => ({
    index: idx,
    number: q.questionNumber,
    statement: q.questionText,
    options: q.options.map((o) => `${o.label || ''}) ${o.optionText}`),
    documentAnswer: q.documentAnswer || null,
  })),
  null,
  2
)}

Return strict JSON format:
{
  "results": [
    {
      "index": 0,
      "category": "QUANTITATIVE_APTITUDE",
      "topic": "Profit & Loss",
      "difficulty": "EASY",
      "questionType": "SINGLE_CHOICE",
      "aiVerifiedAnswer": "B",
      "confidence": {
        "category": 0.98,
        "topic": 0.96,
        "difficulty": 0.90,
        "questionType": 0.98,
        "answer": 0.95
      },
      "reasoning": "Single-step profit percentage calculation"
    }
  ]
}`;

    const rawResponse = await this.callGeminiApi(apiKey, [{ text: prompt }]);
    const results: any[] = Array.isArray(rawResponse?.results) ? rawResponse.results : [];

    return results.map((item: any) => ({
      category: this.normalizeCategory(item.category),
      topic: item.topic ? String(item.topic).trim() : undefined,
      difficulty: item.difficulty ? canonicalizeDifficulty(item.difficulty) : undefined,
      questionType: item.questionType ? this.normalizeQuestionType(item.questionType) : undefined,
      aiVerifiedAnswer: item.aiVerifiedAnswer ? String(item.aiVerifiedAnswer).trim() : null,
      confidence: item.confidence ? {
        category: this.parseConfidence(item.confidence.category, 0.90),
        topic: this.parseConfidence(item.confidence.topic, 0.88),
        difficulty: this.parseConfidence(item.confidence.difficulty, 0.85),
        questionType: this.parseConfidence(item.confidence.questionType, 0.95),
        answer: this.parseConfidence(item.confidence.answer, 0.90),
        overall: this.parseConfidence(item.confidence.overall, 0.89),
      } : undefined,
      reasoning: item.reasoning ? String(item.reasoning).trim() : undefined,
    }));
  }

  /**
   * Resolves final question classification by merging Gemini results or running local semantic analysis.
   * Guarantees strict compliance: NO answers are invented if absent in document.
   */
  private async resolveQuestionClassification(
    raw: RawParsedQuestion,
    geminiItem: Partial<ExtractedQuestionDto> | undefined,
    displayIndex: number,
    targetCompanyId?: string
  ): Promise<ExtractedQuestionDto> {
    const questionText = raw.questionText.trim();

    // 1. Determine Category & Topic
    let category: QuestionCategory = geminiItem?.category || 'QUANTITATIVE_APTITUDE';
    let topic: string = geminiItem?.topic ? canonicalizeTopic(category, geminiItem.topic) || '' : '';
    let difficulty: QuestionDifficulty = geminiItem?.difficulty || 'MEDIUM';
    let questionType: QuestionType = geminiItem?.questionType || 'SINGLE_CHOICE';
    let reasoning = geminiItem?.reasoning || '';
    let conf: ConfidenceScores;

    if (geminiItem && topic) {
      conf = geminiItem.confidence || {
        category: 0.92,
        topic: 0.90,
        difficulty: 0.85,
        questionType: 0.95,
        answer: raw.hasDocumentAnswer ? 0.95 : 0.0,
        overall: 0.90,
      };
    } else {
      // Local Semantic Classifier Fallback
      const semanticResult = await semanticClassifierProvider.classifyQuestion({
        questionText,
        options: raw.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect })),
        correctAnswer: raw.documentAnswer,
        explanation: raw.explanation,
      });

      category = semanticResult.category;
      topic = canonicalizeTopic(category, semanticResult.topic) || this.fallbackTopic(category);
      difficulty = semanticResult.difficulty;
      questionType = semanticResult.questionType;
      reasoning = semanticResult.reasoning;
      conf = {
        category: semanticResult.confidence.category,
        topic: semanticResult.confidence.topic,
        difficulty: semanticResult.confidence.difficulty,
        questionType: semanticResult.confidence.questionType,
        answer: raw.hasDocumentAnswer ? 0.90 : 0.0,
        overall: semanticResult.confidence.overall,
      };
    }

    // 2. Answer Handling: Strictly distinguish Document Answer vs AI-Verified Answer
    const documentAnswer = raw.documentAnswer || null;
    const hasDocumentAnswer = Boolean(raw.hasDocumentAnswer && documentAnswer);
    const aiVerifiedAnswer = geminiItem?.aiVerifiedAnswer || null;

    // The active answer to import: uses Document Answer if available.
    // If no document answer, correctAnswer is NULL (NOT INVENTED).
    const correctAnswer = hasDocumentAnswer ? documentAnswer : null;

    // 3. Synchronize Option Correct Flags
    const options = raw.options.map((opt, idx) => {
      let isCorrect = Boolean(opt.isCorrect);
      if (hasDocumentAnswer && documentAnswer) {
        const cleanAns = documentAnswer.toUpperCase();
        const cleanLabel = (opt.label || String.fromCharCode(65 + idx)).toUpperCase();
        if (cleanAns === cleanLabel || cleanAns === `OPTION ${cleanLabel}` || opt.optionText.trim().toLowerCase() === documentAnswer.trim().toLowerCase()) {
          isCorrect = true;
        }
      }
      return {
        optionText: opt.optionText,
        optionOrder: idx + 1,
        isCorrect: hasDocumentAnswer ? isCorrect : false,
      };
    });

    // 4. Status Evaluation & Confidence Gate (threshold 0.75)
    let status: 'CLASSIFIED' | 'NEEDS_REVIEW' | 'DUPLICATE' | 'AI_FAILED' = 'CLASSIFIED';

    if (
      !hasDocumentAnswer || // Flag if document has no answer key
      raw.hasUnresolvedDiagram || // Flag if diagram reference exists but visual could not be extracted
      conf.category < 0.75 ||
      conf.topic < 0.75 ||
      conf.difficulty < 0.75 ||
      (conf.overall && conf.overall < 0.75)
    ) {
      status = 'NEEDS_REVIEW';
    }

    return {
      tempId: `ext-${Date.now()}-${displayIndex}`,
      companyId: targetCompanyId || undefined,
      questionNumber: raw.questionNumber || displayIndex,
      category,
      topic,
      difficulty,
      questionType,
      questionText,
      imageUrl: raw.imageUrl || null,
      hasUnresolvedDiagram: Boolean(raw.hasUnresolvedDiagram),
      diagramReviewNote: raw.diagramReviewNote || null,
      marks: raw.marks || 1.0,
      negativeMarks: raw.negativeMarks || 0.0,
      correctAnswer,
      documentAnswer,
      aiVerifiedAnswer,
      hasDocumentAnswer,
      explanation: raw.explanation || null,
      options,
      confidence: conf,
      reasoning: reasoning || 'Classified via multi-stage conceptual analysis.',
      status,
      isDuplicate: false,
      isApproved: status === 'CLASSIFIED',
    };
  }

  /**
   * Processes visual image or scanned PDF directly using Gemini Multimodal Vision API
   */
  private async processMultimodalVisualInput(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    apiKey: string,
    targetCompanyId?: string
  ): Promise<GeminiParsedQuestionResult> {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    const mime = file.mimetype.startsWith('image/')
      ? file.mimetype
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'pdf'
            ? 'application/pdf'
            : 'image/jpeg';

    let savedImageUrl: string | null = null;
    if (file.mimetype.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      const magic = validateImageMagicBytes(file.buffer);
      if (magic.isValid) {
        const safeName = generateSafeImageFilename(magic.ext);
        const targetPath = path.resolve(QUESTIONS_UPLOAD_DIR, safeName);
        fs.writeFileSync(targetPath, file.buffer);
        savedImageUrl = `/api/questions/images/${safeName}`;
      }
    }

    const base64Data = file.buffer.toString('base64');
    const prompt = `You are a Tier-1 Multimodal Document OCR and Question Extraction Intelligence Engine for a College Placement Platform.
Analyze this image/document and extract ALL assessment questions.

FOR EVERY QUESTION EXTRACT:
- Question Number
- Question Statement (preserve formulas, percentages, mathematical notation, special characters)
- Options (labels A, B, C, D)
- Document Answer: Only if explicitly visible or marked in the document. DO NOT INVENT ANSWERS.
- AI-Verified Answer: Calculated solution for verification
- Category: QUANTITATIVE_APTITUDE, LOGICAL_REASONING, VERBAL_ABILITY, TECHNICAL_MCQ, CODING
- Topic: Specific concept (e.g. Profit & Loss, Percentage, Number Series, Time & Work)
- Difficulty: EASY, MEDIUM, or HARD
- Question Type: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE

Return strict JSON:
{
  "detectedCompany": null,
  "detectedYear": null,
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "options": [{"optionText": "...", "label": "A", "isCorrect": false}],
      "documentAnswer": "C",
      "aiVerifiedAnswer": "C",
      "hasDocumentAnswer": true,
      "category": "QUANTITATIVE_APTITUDE",
      "topic": "Profit & Loss",
      "difficulty": "EASY",
      "questionType": "SINGLE_CHOICE",
      "categoryConfidence": 0.98,
      "topicConfidence": 0.95,
      "difficultyConfidence": 0.90,
      "typeConfidence": 0.99,
      "answerConfidence": 0.95,
      "reasoning": "..."
    }
  ]
}`;

    const parts: any[] = [
      { text: prompt },
      {
        inline_data: {
          mime_type: mime,
          data: base64Data,
        },
      },
    ];

    const raw = await this.callGeminiApi(apiKey, parts);
    const rawQuestions: any[] = Array.isArray(raw?.questions) ? raw.questions : [];

    const extractedList: ExtractedQuestionDto[] = rawQuestions.map((q: any, idx: number) => {
      const category = this.normalizeCategory(q.category);
      const topic = canonicalizeTopic(category, String(q.topic || '')) || this.fallbackTopic(category);
      const difficulty = canonicalizeDifficulty(q.difficulty);
      const questionType = this.normalizeQuestionType(q.questionType);
      const hasDocumentAnswer = Boolean(q.documentAnswer && q.documentAnswer !== 'NOT_PROVIDED');

      const catConf = this.parseConfidence(q.categoryConfidence, 0.95);
      const topConf = this.parseConfidence(q.topicConfidence, 0.92);
      const diffConf = this.parseConfidence(q.difficultyConfidence, 0.88);
      const typeConf = this.parseConfidence(q.typeConfidence, 0.98);
      const ansConf = this.parseConfidence(q.answerConfidence, hasDocumentAnswer ? 0.95 : 0.0);
      const overall = Number(((catConf + topConf + diffConf + typeConf + ansConf) / 5).toFixed(2));

      let status: 'CLASSIFIED' | 'NEEDS_REVIEW' | 'DUPLICATE' | 'AI_FAILED' = 'CLASSIFIED';
      if (!hasDocumentAnswer || catConf < 0.75 || topConf < 0.75) {
        status = 'NEEDS_REVIEW';
      }

      const options = Array.isArray(q.options)
        ? q.options.map((opt: any, oIdx: number) => ({
            optionText: typeof opt === 'string' ? opt : String(opt.optionText || opt.text || '').trim(),
            optionOrder: oIdx + 1,
            isCorrect: Boolean(opt.isCorrect),
          }))
        : [];

      return {
        tempId: `ext-${Date.now()}-${idx + 1}`,
        companyId: targetCompanyId || undefined,
        questionNumber: q.questionNumber || idx + 1,
        category,
        topic,
        difficulty,
        questionType,
        questionText: String(q.questionText || '').trim(),
        imageUrl: savedImageUrl,
        hasUnresolvedDiagram: false,
        diagramReviewNote: null,
        marks: typeof q.marks === 'number' ? q.marks : 1.0,
        negativeMarks: typeof q.negativeMarks === 'number' ? q.negativeMarks : 0.0,
        correctAnswer: hasDocumentAnswer ? String(q.documentAnswer).trim() : null,
        documentAnswer: hasDocumentAnswer ? String(q.documentAnswer).trim() : null,
        aiVerifiedAnswer: q.aiVerifiedAnswer ? String(q.aiVerifiedAnswer).trim() : null,
        hasDocumentAnswer,
        explanation: q.explanation ? String(q.explanation).trim() : null,
        options,
        confidence: {
          category: catConf,
          topic: topConf,
          difficulty: diffConf,
          questionType: typeConf,
          answer: ansConf,
          overall,
        },
        reasoning: q.reasoning || 'Extracted via Gemini multimodal vision.',
        status,
        isDuplicate: false,
        isApproved: status === 'CLASSIFIED',
      };
    });

    return this.applyDuplicateDetectionAndCounters(extractedList, raw?.detectedCompany, raw?.detectedYear);
  }

  /**
   * Invokes Google Gemini REST API with timeout and model fallback
   */
  private async callGeminiApi(apiKey: string, parts: any[]): Promise<any> {
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError: any = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout guard

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          let errJson;
          try {
            errJson = JSON.parse(errText);
          } catch {
            // ignore
          }
          const message = errJson?.error?.message || response.statusText || `Gemini API error (${response.status})`;
          lastError = new Error(`Gemini ${model}: ${message}`);
          continue;
        }

        const data: any = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error('Gemini response was empty or blocked by safety filters.');
        }

        try {
          return JSON.parse(candidateText);
        } catch {
          const cleaned = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }

  /**
   * Scans active Question Bank for exact and normalized duplicate statements
   */
  private async applyDuplicateDetectionAndCounters(
    questions: ExtractedQuestionDto[],
    detectedCompany: string | null = null,
    detectedYear: number | null = null
  ): Promise<GeminiParsedQuestionResult> {
    if (questions.length === 0) {
      return {
        detectedCompany,
        detectedYear,
        totalParsed: 0,
        totalValid: 0,
        totalNeedsReview: 0,
        totalDuplicates: 0,
        totalFailed: 0,
        questions: [],
      };
    }

    try {
      const duplicateMap = await questionRepository.findDuplicateQuestions(
        questions.map((q) => ({
          questionText: q.questionText,
          category: q.category,
          topic: q.topic,
        }))
      );

      for (const q of questions) {
        let dup = duplicateMap.get(q.questionText);
        if (!dup) {
          const normQ = q.questionText.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
          for (const [key, val] of duplicateMap.entries()) {
            const normKey = key.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
            if (normQ === normKey || (normQ.length > 25 && (normKey.includes(normQ) || normQ.includes(normKey)))) {
              dup = val;
              break;
            }
          }
        }
        if (dup) {
          q.isDuplicate = true;
          q.duplicateOfId = dup.id;
          q.duplicateReason = dup.reason;
          q.status = 'DUPLICATE';
          q.isApproved = false; // Never auto-approve duplicate questions
        }
      }
    } catch (err: any) {
      console.warn('[GeminiQuestionParserService] Duplicate check encountered error:', err.message);
    }

    let totalValid = 0;
    let totalNeedsReview = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    for (const q of questions) {
      if (q.status === 'CLASSIFIED') totalValid++;
      else if (q.status === 'NEEDS_REVIEW') totalNeedsReview++;
      else if (q.status === 'DUPLICATE') totalDuplicates++;
      else if (q.status === 'AI_FAILED') totalFailed++;
    }

    return {
      detectedCompany,
      detectedYear,
      totalParsed: questions.length,
      totalValid,
      totalNeedsReview,
      totalDuplicates,
      totalFailed,
      questions,
    };
  }

  private normalizeCategory(cat: any): QuestionCategory {
    const s = String(cat || '').toUpperCase().trim();
    if (s.includes('QUANT') || s.includes('MATH') || s.includes('APTITUDE')) return 'QUANTITATIVE_APTITUDE';
    if (s.includes('LOGIC') || s.includes('REASON')) return 'LOGICAL_REASONING';
    if (s.includes('VERBAL') || s.includes('ENGLISH') || s.includes('GRAMMAR')) return 'VERBAL_ABILITY';
    if (s.includes('CODING') || s.includes('PROGRAM')) return 'CODING';
    if (s.includes('TECH') || s.includes('MCQ') || s.includes('COMPUTER')) return 'TECHNICAL_MCQ';
    return 'QUANTITATIVE_APTITUDE';
  }

  private normalizeQuestionType(t: any): QuestionType {
    const s = String(t || '').toUpperCase().trim();
    if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'DESCRIPTIVE', 'CODING'].includes(s)) {
      return s as QuestionType;
    }
    return 'SINGLE_CHOICE';
  }

  private fallbackTopic(cat: QuestionCategory): string {
    return CATEGORY_TOPICS_MAP[cat]?.[0] || 'Percentage';
  }

  private parseConfidence(val: any, fallback: number): number {
    if (typeof val === 'number' && !isNaN(val)) {
      if (val > 1.0) val = val / 100;
      return Number(Math.min(1.0, Math.max(0.0, val)).toFixed(2));
    }
    return fallback;
  }
}

export const geminiQuestionParserService = new GeminiQuestionParserService();
