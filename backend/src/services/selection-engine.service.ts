import { prisma } from '../config/prisma.config.js';
import { questionRepository } from '../repositories/question.repository.js';
import { assessmentRepository } from '../repositories/assessment.repository.js';
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
  COMPONENT_TOPICS_MAP,
  TopicAvailabilityBreakdown,
  QuestionAvailabilityValidationDto,
} from '../types/assessment.types.js';
import { QuestionDto } from '../types/question.types.js';
import { AppError } from '../middleware/errorHandler.js';

export const DEFAULT_ROTATION_COOLDOWN = 5;

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
   * Retrieves the question IDs that are currently ineligible under the
   * Five-Assessment Rotation Rule:
   * Once a question is used in an assessment, it cannot be reused until five subsequent
   * assessments in the applicable rotation scope have been successfully generated.
   */
  async getRotationIneligibleQuestionIds(
    assessment: AssessmentDto,
    rotationLimit: number = DEFAULT_ROTATION_COOLDOWN
  ): Promise<string[]> {
    const recentAssessmentIds = await assessmentRepository.getRecentGeneratedAssessmentsInScope(
      assessment.companyId,
      assessment.id,
      rotationLimit
    );

    if (recentAssessmentIds.length === 0) {
      return [];
    }

    if (process.env.NODE_ENV === 'test') {
      const ineligible = new Set<string>();
      for (const usage of questionRepository.memStore.usages.values()) {
        if (usage.assessmentId && recentAssessmentIds.includes(usage.assessmentId)) {
          ineligible.add(usage.questionId);
        }
      }
      return Array.from(ineligible);
    }

    const usages = await prisma.questionUsage.findMany({
      where: {
        assessmentId: { in: recentAssessmentIds },
      },
      select: { questionId: true },
      distinct: ['questionId'],
    });

    return usages.map((u) => u.questionId);
  }

  /**
   * Validates available approved questions against the assessment requirements:
   * - Evaluates each section, category, topic, and difficulty.
   * - Checks questions currently ineligible due to the 5-assessment rotation rule.
   * - Calculates eligible questions separately for each topic and difficulty.
   * - Never fabricates replacement questions.
   */
  async validateQuestionAvailability(
    assessment: AssessmentDto,
    sections: AssessmentSectionDto[],
    rotationCooldown: number = DEFAULT_ROTATION_COOLDOWN
  ): Promise<QuestionAvailabilityValidationDto> {
    if (!sections || sections.length === 0) {
      throw new Error('Assessment has no configured sections');
    }

    const numberOfPapers = Math.max(1, assessment.numberOfPapers || 1);
    const rotationIneligibleIds = await this.getRotationIneligibleQuestionIds(assessment, rotationCooldown);
    const rotationIneligibleSet = new Set(rotationIneligibleIds);

    const globallyAllocatedIds = new Set<string>(rotationIneligibleSet);
    const shortages: QuestionShortageDetail[] = [];
    const allTopicBreakdowns: TopicAvailabilityBreakdown[] = [];
    let totalRequired = 0;
    let totalEligible = 0;
    let totalMissing = 0;
    let totalIneligibleDueToRotation = 0;

    for (const section of sections) {
      const requiredForSection = numberOfPapers * section.questionsCount;
      totalRequired += requiredForSection;

      // Eligible questions: active, approved, matching filters, NOT in rotation cooldown, NOT globally allocated
      const eligibleQuestions = await this.queryEligibleQuestions(
        section,
        Array.from(globallyAllocatedIds),
        assessment
      );

      // Active questions matching criteria BUT blocked by rotation rule
      const rotationBlockedQuestions = await this.queryRotationBlockedQuestions(
        section,
        rotationIneligibleIds,
        assessment
      );

      const availableCount = eligibleQuestions.length;
      totalEligible += availableCount;
      totalIneligibleDueToRotation += rotationBlockedQuestions.length;

      // Calculate eligible questions separately for each topic and difficulty
      const sectionTopicBreakdown: TopicAvailabilityBreakdown[] = [];
      const topicsList =
        section.topics && section.topics.length > 0
          ? section.topics
          : COMPONENT_TOPICS_MAP[section.component]
          ? [...COMPONENT_TOPICS_MAP[section.component]]
          : ['General'];

      const requiredPerTopic = Math.max(1, Math.ceil(requiredForSection / topicsList.length));

      for (const topic of topicsList) {
        const topicEligible = eligibleQuestions.filter(
          (q) => q.topic.toLowerCase() === topic.toLowerCase()
        ).length;
        const topicRotationBlocked = rotationBlockedQuestions.filter(
          (q) => q.topic.toLowerCase() === topic.toLowerCase()
        ).length;
        const topicMissing = Math.max(0, requiredPerTopic - topicEligible);

        const breakdownItem: TopicAvailabilityBreakdown = {
          topic,
          difficulty: section.difficulty || 'ANY',
          category: COMPONENT_CATEGORY_MAP[section.component],
          component: section.component,
          required: requiredPerTopic,
          eligible: topicEligible,
          ineligibleDueToRotation: topicRotationBlocked,
          missing: topicMissing,
        };
        sectionTopicBreakdown.push(breakdownItem);
        allTopicBreakdowns.push(breakdownItem);
      }

      if (availableCount < requiredForSection) {
        const missing = requiredForSection - availableCount;
        totalMissing += missing;
        shortages.push({
          sectionName: section.name,
          component: section.component,
          category: COMPONENT_CATEGORY_MAP[section.component],
          topics: section.topics,
          difficulty: section.difficulty || 'ANY',
          questionType: section.questionType || 'ANY',
          required: requiredForSection,
          available: availableCount,
          ineligibleDueToRotation: rotationBlockedQuestions.length,
          missing,
          topicBreakdown: sectionTopicBreakdown,
        });
      } else {
        // Reserve these question IDs for subsequent sections to prevent duplicates
        eligibleQuestions.slice(0, requiredForSection).forEach((q) => globallyAllocatedIds.add(q.id));
      }
    }

    const suggestions: string[] = [];
    if (shortages.length > 0) {
      for (const s of shortages) {
        suggestions.push(
          `Section '${s.sectionName}': Upload or approve at least ${s.missing} additional questions for topic(s) [${s.topics.join(
            ', '
          )}] with difficulty ${s.difficulty}.`
        );
      }
      if (totalIneligibleDueToRotation > 0) {
        suggestions.push(
          `${totalIneligibleDueToRotation} question(s) match requirements but are temporarily locked under the 5-Assessment Rotation Rule cooldown.`
        );
      }
      suggestions.push('Review Question Bank for pending questions awaiting admin approval.');
      suggestions.push('Alternatively, adjust section question counts or expand configured topics.');
    }

    return {
      assessmentId: assessment.id,
      isSufficient: shortages.length === 0,
      totalRequired,
      totalEligible,
      totalMissing,
      totalIneligibleDueToRotation,
      rotationCooldownRule: rotationCooldown,
      shortages,
      topicBreakdown: allTopicBreakdowns,
      suggestions,
    };
  }

  /**
   * Main Selection Engine Pipeline:
   * 1. 5-Assessment Rotation Rule Filter
   * 2. Eligibility & Availability Validation (Fail-Fast Rule)
   * 3. Question Selection without duplicates
   * 4. Multi-paper distribution
   * 5. Zero usage recorded on failure
   */
  async generatePapers(
    assessment: AssessmentDto,
    sections: AssessmentSectionDto[],
    rotationCooldown: number = DEFAULT_ROTATION_COOLDOWN
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

    // 1. VALIDATE AVAILABILITY & 5-ASSESSMENT ROTATION RULE
    const validation = await this.validateQuestionAvailability(assessment, sections, rotationCooldown);

    if (!validation.isSufficient) {
      throw new InsufficientQuestionsError({
        message: `Insufficient eligible questions in Question Bank. Required: ${validation.totalRequired}, Available: ${validation.totalEligible}, Missing: ${validation.totalMissing}${
          validation.totalIneligibleDueToRotation > 0
            ? ` (${validation.totalIneligibleDueToRotation} questions ineligible under 5-assessment rotation rule)`
            : ''
        }`,
        error: 'INSUFFICIENT_QUESTIONS',
        required: validation.totalRequired,
        available: validation.totalEligible,
        missing: validation.totalMissing,
        ineligibleDueToRotation: validation.totalIneligibleDueToRotation,
        shortages: validation.shortages,
        topicBreakdown: validation.topicBreakdown,
        suggestions: validation.suggestions,
      });
    }

    // 2. RETRIEVE ROTATION INELIGIBLE IDS AND TRACK ALLOCATIONS
    const rotationIneligibleIds = await this.getRotationIneligibleQuestionIds(assessment, rotationCooldown);
    const globallyUsedQuestionIds = new Set<string>(rotationIneligibleIds);
    const sectionPools: Map<string, QuestionDto[]> = new Map();

    for (const section of sections) {
      const requiredForSection = numberOfPapers * section.questionsCount;

      const eligibleQuestions = await this.queryEligibleQuestions(
        section,
        Array.from(globallyUsedQuestionIds),
        assessment
      );

      const selectedPool = assessment.randomQuestions
        ? shuffleArray(eligibleQuestions).slice(0, requiredForSection)
        : eligibleQuestions.slice(0, requiredForSection);

      sectionPools.set(section.id, selectedPool);
      selectedPool.forEach((q) => globallyUsedQuestionIds.add(q.id));
    }

    // 3. DISTRIBUTE QUESTIONS ACROSS PAPERS (NO DUPLICATES)
    const papers: AssessmentPaperDto[] = [];
    const usageRecords: { questionId: string; usageMonth: number; usageYear: number }[] = [];
    const paperLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

    for (let paperIdx = 0; paperIdx < numberOfPapers; paperIdx++) {
      const paperCode =
        numberOfPapers === 1 ? 'SET-A' : `SET-${paperLetters[paperIdx] || paperIdx + 1}`;
      const paperId = `paper-${Date.now()}-${paperIdx + 1}-${Math.random().toString(36).substring(2, 6)}`;
      const paperQuestions: AssessmentQuestionDto[] = [];
      let questionOrderCounter = 1;

      for (const section of sections) {
        const sectionPool = sectionPools.get(section.id)!;
        const paperQuestionsForSection = sectionPool.slice(
          paperIdx * section.questionsCount,
          (paperIdx + 1) * section.questionsCount
        );

        for (const rawQuestion of paperQuestionsForSection) {
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
            imageUrl: rawQuestion.imageUrl || null,
            explanation: rawQuestion.explanation || null,
            correctAnswer: rawQuestion.correctAnswer || null,
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

    // 4. PREVENT DUPLICATES: Strict uniqueness check across entire assessment
    const allSelectedQuestionIds: string[] = [];
    for (const p of papers) {
      for (const q of p.questions || []) {
        allSelectedQuestionIds.push(q.questionId);
      }
    }
    const uniqueSelected = new Set(allSelectedQuestionIds);
    if (uniqueSelected.size !== allSelectedQuestionIds.length) {
      throw new Error(
        `Duplicate question detected across papers in assessment generation. Total allocated: ${allSelectedQuestionIds.length}, Unique: ${uniqueSelected.size}`
      );
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
   * Database-side filtered query for eligible questions:
   * Category Filter -> Topic Filter -> Difficulty Filter -> Question Type Filter -> Status: ACTIVE
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

  /**
   * Queries active questions that match section criteria BUT are locked under the rotation cooldown
   */
  private async queryRotationBlockedQuestions(
    section: AssessmentSectionDto,
    rotationIneligibleIds: string[],
    _assessment?: AssessmentDto
  ): Promise<QuestionDto[]> {
    if (rotationIneligibleIds.length === 0) return [];
    const category = COMPONENT_CATEGORY_MAP[section.component];

    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(questionRepository.memStore.questions.values());
      list = list.filter((q) => q.status === 'ACTIVE' && q.category === category);
      if (section.topics && section.topics.length > 0) {
        list = list.filter((q) => section.topics.includes(q.topic));
      }
      if (section.difficulty) {
        list = list.filter((q) => q.difficulty === section.difficulty);
      }
      if (section.questionType) {
        list = list.filter((q) => q.questionType === section.questionType);
      }
      list = list.filter((q) => rotationIneligibleIds.includes(q.id));
      return list;
    }

    const whereClause: Record<string, unknown> = {
      category,
      status: 'ACTIVE',
      id: { in: rotationIneligibleIds },
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

    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        options: { orderBy: { optionOrder: 'asc' } },
        companyQuestions: true,
      },
    });

    return questions as unknown as QuestionDto[];
  }
}

export const questionSelectionEngine = new QuestionSelectionEngine();
