import { prisma } from '../config/prisma.config.js';
import { questionRepository } from '../repositories/question.repository.js';
import {
  AssessmentDto,
  AssessmentSectionDto,
  AssessmentPaperDto,
  AssessmentQuestionDto,
  RandomizedOptionDto,
  QuestionShortageDetail,
  QuestionShortageErrorPayload,
  PaperGenerationResult,
  COMPONENT_CATEGORY_MAP,
} from '../types/assessment.types.js';
import { QuestionDto } from '../types/question.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class InsufficientQuestionsError extends AppError {
  public readonly payload: QuestionShortageErrorPayload;

  constructor(payload: QuestionShortageErrorPayload) {
    super(payload.message, 400, payload);
    this.name = 'InsufficientQuestionsError';
    this.payload = payload;
  }
}

// Fisher-Yates In-Place Shuffler
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class QuestionSelectionEngine {
  /**
   * Main Selection Engine Pipeline:
   * Assessment Configuration
   * → Category Filter
   * → Topic Filter
   * → Difficulty Filter
   * → Question Type Filter
   * → Monthly Usage Filter
   * → Duplicate Filter
   * → Eligibility Validation
   * → Question Selection
   */
  async generatePapers(
    assessment: AssessmentDto,
    sections: AssessmentSectionDto[]
  ): Promise<{
    papers: AssessmentPaperDto[];
    usageRecords: { questionId: string; usageMonth: number; usageYear: number }[];
    resultSummary: PaperGenerationResult;
  }> {
    if (!sections || sections.length === 0) {
      throw new Error('Assessment has no configured sections');
    }

    const numberOfPapers = Math.max(1, assessment.numberOfPapers || 1);
    const cycleDate = assessment.startDate ? new Date(assessment.startDate) : new Date();
    const usageMonth = cycleDate.getMonth() + 1;
    const usageYear = cycleDate.getFullYear();

    // 1. MONTHLY USAGE FILTER: Gather all questions used in this monthly cycle
    const monthlyUsedQuestionIds = await this.getMonthlyUsedQuestionIds(usageMonth, usageYear, assessment.id);

    // Track global excluded IDs across sections for this generation request to guarantee ZERO duplicates
    const globallyUsedQuestionIds = new Set<string>(monthlyUsedQuestionIds);

    // 2. ELIGIBILITY & SUFFICIENCY VERIFICATION (FAIL-FAST RULE)
    const sectionPools: Map<string, QuestionDto[]> = new Map();
    const shortages: QuestionShortageDetail[] = [];
    let totalRequired = 0;
    let totalAvailable = 0;

    for (const section of sections) {
      const requiredForSection = numberOfPapers * section.questionsCount;
      totalRequired += requiredForSection;

      // Query database for eligible questions matching category, topics, difficulty, type
      const eligibleQuestions = await this.queryEligibleQuestions(
        section,
        Array.from(globallyUsedQuestionIds),
        assessment
      );

      const availableCount = eligibleQuestions.length;
      totalAvailable += availableCount;

      if (availableCount < requiredForSection) {
        const missing = requiredForSection - availableCount;
        shortages.push({
          sectionName: section.name,
          component: section.component,
          category: COMPONENT_CATEGORY_MAP[section.component],
          topics: section.topics,
          difficulty: section.difficulty || 'ANY',
          questionType: section.questionType || 'ANY',
          required: requiredForSection,
          available: availableCount,
          missing,
        });
      } else {
        // Shuffle or sort pool
        const selectedPool = assessment.randomQuestions
          ? shuffleArray(eligibleQuestions).slice(0, requiredForSection)
          : eligibleQuestions.slice(0, requiredForSection);

        sectionPools.set(section.id, selectedPool);

        // Reserve these question IDs so subsequent sections cannot select them
        selectedPool.forEach((q) => globallyUsedQuestionIds.add(q.id));
      }
    }

    // 3. FAIL COMPLETELY IF ANY SHORTAGE OCCURS
    if (shortages.length > 0) {
      const totalMissing = shortages.reduce((acc, s) => acc + s.missing, 0);
      throw new InsufficientQuestionsError({
        message: `Insufficient eligible questions in Question Bank. Required: ${totalRequired}, Available: ${totalAvailable}, Missing: ${totalMissing}`,
        error: 'INSUFFICIENT_QUESTIONS',
        required: totalRequired,
        available: totalAvailable,
        missing: totalMissing,
        shortages,
      });
    }

    // 4. DISTRIBUTE QUESTIONS ACROSS PAPERS
    const papers: AssessmentPaperDto[] = [];
    const usageRecords: { questionId: string; usageMonth: number; usageYear: number }[] = [];
    const paperLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

    for (let paperIdx = 0; paperIdx < numberOfPapers; paperIdx++) {
      const paperCode = numberOfPapers === 1
        ? 'SET-A'
        : `SET-${paperLetters[paperIdx] || (paperIdx + 1)}`;
      const paperId = `paper-${Date.now()}-${paperIdx + 1}-${Math.random().toString(36).substring(2, 6)}`;
      const paperQuestions: AssessmentQuestionDto[] = [];
      let questionOrderCounter = 1;

      for (const section of sections) {
        const sectionPool = sectionPools.get(section.id)!;
        // Slice the portion for this specific paper
        const paperQuestionsForSection = sectionPool.slice(
          paperIdx * section.questionsCount,
          (paperIdx + 1) * section.questionsCount
        );

        for (const rawQuestion of paperQuestionsForSection) {
          // Prepare options
          let randomizedOptions: RandomizedOptionDto[] | undefined;
          if (rawQuestion.options && rawQuestion.options.length > 0) {
            const rawOpts = rawQuestion.options.map((opt) => ({
              id: opt.id,
              optionText: opt.optionText,
              optionOrder: opt.optionOrder,
              isCorrect: opt.isCorrect,
            }));

            if (assessment.randomOptions) {
              randomizedOptions = shuffleArray(rawOpts).map((opt, idx) => ({
                ...opt,
                optionOrder: idx + 1,
              }));
            } else {
              randomizedOptions = [...rawOpts].sort((a, b) => a.optionOrder - b.optionOrder);
            }
          }

          const assessmentQuestion: AssessmentQuestionDto = {
            id: `asmt-q-${Date.now()}-${paperIdx}-${questionOrderCounter}-${Math.random().toString(36).substring(2, 6)}`,
            paperId,
            sectionId: section.id,
            questionId: rawQuestion.id,
            questionOrder: questionOrderCounter++,
            marks: section.marksPerQuestion || 1.0,
            negativeMarks: section.negativeMarks || 0.0,
            questionText: rawQuestion.questionText,
            category: rawQuestion.category,
            topic: rawQuestion.topic,
            difficulty: rawQuestion.difficulty,
            questionType: rawQuestion.questionType,
            randomizedOptions,
            createdAt: new Date(),
          };

          paperQuestions.push(assessmentQuestion);

          usageRecords.push({
            questionId: rawQuestion.id,
            usageMonth,
            usageYear,
          });
        }
      }

      papers.push({
        id: paperId,
        assessmentId: assessment.id,
        paperCode,
        paperIndex: paperIdx + 1,
        createdAt: new Date(),
        questions: paperQuestions,
      });
    }

    const totalAllocated = papers.reduce((acc, p) => acc + (p.questions?.length || 0), 0);
    const questionsPerPaper = papers[0]?.questions?.length || 0;

    return {
      papers,
      usageRecords,
      resultSummary: {
        assessmentId: assessment.id,
        numberOfPapers,
        totalQuestionsPerPaper: questionsPerPaper,
        totalQuestionsAllocated: totalAllocated,
        papers: papers.map((p) => ({
          id: p.id,
          paperCode: p.paperCode,
          paperIndex: p.paperIndex,
          questionsCount: p.questions?.length || 0,
        })),
      },
    };
  }

  /**
   * Retrieve all question IDs that have been used in the given cycle
   */
  private async getMonthlyUsedQuestionIds(
    month: number,
    year: number,
    currentAssessmentId?: string
  ): Promise<string[]> {
    const usedIds: string[] = [];

    if (process.env.NODE_ENV === 'test') {
      for (const usage of questionRepository.memStore.usages.values()) {
        if (
          usage.usageMonth === month &&
          usage.usageYear === year &&
          usage.assessmentId !== currentAssessmentId
        ) {
          usedIds.push(usage.questionId);
        }
      }
      return usedIds;
    }

    const usages = await prisma.questionUsage.findMany({
      where: {
        usageMonth: month,
        usageYear: year,
        ...(currentAssessmentId ? { NOT: { assessmentId: currentAssessmentId } } : {}),
      },
      select: { questionId: true },
    });
    usedIds.push(...usages.map((u) => u.questionId));
    return usedIds;
  }

  /**
   * Database-side filtered query for eligible questions
   * Category Filter -> Topic Filter -> Difficulty Filter -> Question Type Filter -> Eligibility (ACTIVE)
   */
  private async queryEligibleQuestions(
    section: AssessmentSectionDto,
    excludedQuestionIds: string[],
    assessment?: AssessmentDto
  ): Promise<QuestionDto[]> {
    const category = COMPONENT_CATEGORY_MAP[section.component];

    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(questionRepository.memStore.questions.values());

      list = list.filter((q) => q.status === 'ACTIVE');
      list = list.filter((q) => q.category === category);

      if (section.topics && section.topics.length > 0) {
        list = list.filter((q) => section.topics.includes(q.topic));
      }

      if (section.difficulty) {
        list = list.filter((q) => q.difficulty === section.difficulty);
      }

      if (section.questionType) {
        list = list.filter((q) => q.questionType === section.questionType);
      }

      if (excludedQuestionIds.length > 0) {
        list = list.filter((q) => !excludedQuestionIds.includes(q.id));
      }

      if (assessment?.companyId) {
        list.sort((a, b) => {
          const aMatch =
            a.companyId === assessment.companyId ||
            (a.companyQuestions && a.companyQuestions.some((cq) => cq.companyId === assessment.companyId))
              ? 1
              : 0;
          const bMatch =
            b.companyId === assessment.companyId ||
            (b.companyQuestions && b.companyQuestions.some((cq) => cq.companyId === assessment.companyId))
              ? 1
              : 0;
          return bMatch - aMatch;
        });
      }

      return list;
    }

    const whereClause: Record<string, unknown> = {
      category,
      status: 'ACTIVE',
    };

    if (section.topics && section.topics.length > 0) {
      whereClause.topic = { in: section.topics };
    }

    if (section.difficulty) {
      whereClause.difficulty = section.difficulty;
    }

    if (section.questionType) {
      whereClause.questionType = section.questionType;
    }

    if (excludedQuestionIds.length > 0) {
      whereClause.id = { notIn: excludedQuestionIds };
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        options: { orderBy: { optionOrder: 'asc' } },
        companyQuestions: true,
      },
    });

    const questionList = questions as unknown as QuestionDto[];
    if (assessment?.companyId) {
      questionList.sort((a, b) => {
        const aMatch =
          a.companyId === assessment.companyId ||
          (a.companyQuestions && a.companyQuestions.some((cq) => cq.companyId === assessment.companyId))
            ? 1
            : 0;
        const bMatch =
          b.companyId === assessment.companyId ||
          (b.companyQuestions && b.companyQuestions.some((cq) => cq.companyId === assessment.companyId))
            ? 1
            : 0;
        return bMatch - aMatch;
      });
    }

    return questionList;
  }
}

export const questionSelectionEngine = new QuestionSelectionEngine();
