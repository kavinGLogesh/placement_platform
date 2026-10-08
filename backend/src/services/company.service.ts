import { companyRepository } from '../repositories/company.repository.js';
import { questionRepository } from '../repositories/question.repository.js';
import {
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyQueryFilters,
  CompanyQuestionDto,
  CompanyQuestionIntelligenceDto,
  CompanyQuestionFilter,
  CompanyQuestionUploadResult,
  QuestionDuplicateCandidateDto,
} from '../types/company.types.js';
import { PaginatedResult } from '../types/management.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseQuestionFileBuffer } from '../utils/question-parser.util.js';
import {
  generateExactQuestionHash,
  compareQuestionSemantics,
  normalizeText,
} from '../utils/duplicate-detector.util.js';
import { validateCategoryTopic } from '../validators/question.validator.js';

export class CompanyService {
  async getCompanies(filters: CompanyQueryFilters = {}): Promise<PaginatedResult<CompanyDto>> {
    return companyRepository.getCompanies(filters);
  }

  async getCompanyById(id: string): Promise<CompanyDto> {
    const company = await companyRepository.getCompanyById(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }
    return company;
  }

  async createCompany(payload: CreateCompanyDto): Promise<CompanyDto> {
    const existing = await companyRepository.getCompanyByCode(payload.code);
    if (existing) {
      throw new AppError(`Company with code '${payload.code.toUpperCase()}' already exists`, 409);
    }
    return companyRepository.createCompany(payload);
  }

  async updateCompany(id: string, payload: UpdateCompanyDto): Promise<CompanyDto> {
    if (payload.code) {
      const existing = await companyRepository.getCompanyByCode(payload.code);
      if (existing && existing.id !== id) {
        throw new AppError(`Company with code '${payload.code.toUpperCase()}' already exists`, 409);
      }
    }
    return companyRepository.updateCompany(id, payload);
  }

  async updateCompanyStatus(id: string, isActive: boolean): Promise<CompanyDto> {
    await this.getCompanyById(id);
    return companyRepository.updateCompany(id, { isActive });
  }

  async deleteCompany(id: string): Promise<boolean> {
    return companyRepository.deleteCompany(id);
  }

  async getCompanyIntelligence(companyId: string): Promise<CompanyQuestionIntelligenceDto> {
    return companyRepository.getCompanyIntelligence(companyId);
  }

  async getCompanyQuestions(
    companyId: string,
    filters: CompanyQuestionFilter = {}
  ): Promise<PaginatedResult<CompanyQuestionDto>> {
    await this.getCompanyById(companyId);
    return companyRepository.getCompanyQuestions(companyId, filters);
  }

  /**
   * Production-Grade Multi-Level Duplicate Detection & Upload Pipeline
   *
   * Flow:
   * 1. Validate Target Company exists and is active.
   * 2. Parse File Buffer (.xlsx, .xls, .csv, .json) with limits and sanitization.
   * 3. Validate Category & Topics against Platform Master Matrix.
   * 4. Multi-level Duplicate Detection:
   *    A. Exact Duplicate (Normalized text + options + structure)
   *       -> Automatically reject/skip creating duplicate question record.
   *       -> Link existing question to target company with occurrence increment.
   *    B. Possible / Semantic Duplicate (High token overlap in same category & topic)
   *       -> Insert/link question and flag for Admin Review in duplicate queue.
   *       -> Do NOT auto-delete semantic matches.
   *    C. Accepted Unique Question
   *       -> Create Question record with SHA-256 exactHash.
   *       -> Link to Company with Source, Year, Label.
   * 5. Generate comprehensive post-upload duplicate report.
   */
  async uploadCompanyQuestions(
    companyId: string,
    fileBuffer: Buffer,
    filename?: string,
    createdById?: string
  ): Promise<CompanyQuestionUploadResult> {
    const company = await this.getCompanyById(companyId);
    if (!company.isActive) {
      throw new AppError(`Cannot upload questions: Company '${company.name}' is currently inactive. Please activate it first.`, 400);
    }

    const { rows, parseErrors } = parseQuestionFileBuffer(fileBuffer, filename);

    const result: CompanyQuestionUploadResult = {
      totalRows: rows.length + parseErrors.length,
      acceptedCount: 0,
      exactDuplicatesCount: 0,
      possibleDuplicatesCount: 0,
      invalidCount: parseErrors.length,
      failedRowsCount: parseErrors.length,
      exactDuplicates: [],
      possibleDuplicates: [],
      invalidQuestions: parseErrors.map((e) => ({
        row: e.row,
        error: e.error,
      })),
      failedRows: parseErrors.map((e) => ({
        row: e.row,
        reason: e.error,
      })),
    };

    // Track hashes seen in the current upload batch to prevent duplicates within the same file
    const seenHashesInBatch = new Map<string, string>(); // exactHash -> questionId

    for (const row of rows) {
      // 1. Validate Category & Topic against Master Matrix
      try {
        validateCategoryTopic(row.category, row.topic);
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || 'Category or Topic validation failed';
        result.invalidCount++;
        result.failedRowsCount++;
        result.invalidQuestions.push({
          row: row.rowNumber,
          questionText: row.questionText,
          error: errorMsg,
        });
        result.failedRows.push({
          row: row.rowNumber,
          reason: errorMsg,
        });
        continue;
      }

      // Validate options for choice types
      if (row.questionType === 'SINGLE_CHOICE' || row.questionType === 'MULTIPLE_CHOICE') {
        if (!row.options || row.options.length < 2) {
          const err = 'Multiple choice questions require at least 2 options';
          result.invalidCount++;
          result.failedRowsCount++;
          result.invalidQuestions.push({
            row: row.rowNumber,
            questionText: row.questionText,
            error: err,
          });
          result.failedRows.push({ row: row.rowNumber, reason: err });
          continue;
        }

        const hasCorrect = row.options.some((o) => o.isCorrect) || Boolean(row.correctAnswer);
        if (!hasCorrect) {
          const err = 'At least one option must be designated as correct';
          result.invalidCount++;
          result.failedRowsCount++;
          result.invalidQuestions.push({
            row: row.rowNumber,
            questionText: row.questionText,
            error: err,
          });
          result.failedRows.push({ row: row.rowNumber, reason: err });
          continue;
        }
      }

      // 2. Generate Exact SHA-256 Hash
      const exactHash = generateExactQuestionHash({
        category: row.category,
        topic: row.topic,
        questionText: row.questionText,
        options: row.options,
        correctAnswer: row.correctAnswer,
      });

      // 3. Exact Duplicate Check (Batch + Database Hash + Exact Normalized Text)
      let existingQuestionId: string | null = null;

      if (seenHashesInBatch.has(exactHash)) {
        existingQuestionId = seenHashesInBatch.get(exactHash)!;
      } else {
        const dbExisting = await questionRepository.findQuestionByExactHash(exactHash);
        if (dbExisting) {
          existingQuestionId = dbExisting.id;
        }
      }

      // Filter candidates in the SAME category and topic for exact text fallback & semantic check
      const topicCandidates = await questionRepository.findQuestionsByTopic(row.category, row.topic);

      if (!existingQuestionId) {
        const exactTextMatch = topicCandidates.find(
          (cand) => normalizeText(cand.questionText) === normalizeText(row.questionText)
        );
        if (exactTextMatch) {
          existingQuestionId = exactTextMatch.id;
        }
      }

      if (existingQuestionId) {
        // EXACT DUPLICATE FOUND:
        // Automatically reject/skip creating another Question record!
        // Link the existing question to this company and increment occurrences
        await companyRepository.recordCompanyQuestion({
          companyId,
          questionId: existingQuestionId,
          source: row.source,
          year: row.year,
          isReported: Boolean(row.source),
          label: 'Repeated Question',
        });

        result.exactDuplicatesCount++;
        result.exactDuplicates.push({
          row: row.rowNumber,
          questionText: row.questionText,
          existingQuestionId,
          action: 'Exact duplicate detected. Linked existing question to company; skipped database insertion.',
        });
        continue;
      }

      // 4. Semantic / Possible Duplicate Check
      let semanticMatch: { candidateId: string; candidateText: string; score: number; reason: string } | null = null;

      for (const cand of topicCandidates) {
        const sem = compareQuestionSemantics(row.questionText, cand.questionText, row.topic);
        if (sem.isPossibleDuplicate) {
          semanticMatch = {
            candidateId: cand.id,
            candidateText: cand.questionText,
            score: sem.similarityScore,
            reason: sem.reason,
          };
          break; // Found highest similarity match
        }
      }

      // 5. Insert Unique Question Record
      const createdQuestion = await questionRepository.createQuestion(
        {
          companyId,
          exactHash,
          category: row.category,
          topic: row.topic,
          difficulty: row.difficulty,
          questionType: row.questionType,
          questionText: row.questionText,
          marks: row.marks,
          negativeMarks: row.negativeMarks,
          correctAnswer: row.correctAnswer,
          explanation: row.explanation,
          status: 'ACTIVE',
          options: row.options.map((o) => ({
            optionText: o.optionText,
            optionOrder: o.optionOrder,
            isCorrect: o.isCorrect,
          })),
        },
        createdById
      );

      // Record in batch cache
      seenHashesInBatch.set(exactHash, createdQuestion.id);

      if (semanticMatch) {
        // Flagged as POSSIBLE DUPLICATE for Admin review
        await companyRepository.recordCompanyQuestion({
          companyId,
          questionId: createdQuestion.id,
          source: row.source,
          year: row.year,
          isReported: Boolean(row.source),
          label: 'Possible Duplicate',
        });

        await companyRepository.createDuplicateCandidate({
          companyId,
          originalQuestionId: semanticMatch.candidateId,
          candidateQuestionId: createdQuestion.id,
          candidateText: row.questionText,
          similarityScore: semanticMatch.score,
          reason: semanticMatch.reason,
        });

        result.possibleDuplicatesCount++;
        result.possibleDuplicates.push({
          row: row.rowNumber,
          questionText: row.questionText,
          matchedQuestionId: semanticMatch.candidateId,
          matchedQuestionText: semanticMatch.candidateText,
          similarityScore: semanticMatch.score,
          reason: semanticMatch.reason,
        });
      } else {
        // ACCEPTED UNIQUE QUESTION
        await companyRepository.recordCompanyQuestion({
          companyId,
          questionId: createdQuestion.id,
          source: row.source,
          year: row.year,
          isReported: Boolean(row.source),
          label: row.source ? 'Reported Question' : 'Company Tagged',
        });

        result.acceptedCount++;
      }
    }

    return result;
  }

  async getDuplicateCandidates(companyId?: string): Promise<QuestionDuplicateCandidateDto[]> {
    return companyRepository.getDuplicateCandidates(companyId);
  }

  async resolveDuplicateCandidate(
    candidateId: string,
    status: 'CONFIRMED_DUPLICATE' | 'REJECTED'
  ): Promise<QuestionDuplicateCandidateDto> {
    return companyRepository.resolveDuplicateCandidate(candidateId, status);
  }
}

export const companyService = new CompanyService();
