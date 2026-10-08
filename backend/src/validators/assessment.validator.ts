import {
  AssessmentComponent,
  QuestionDifficulty,
  QuestionType,
  CreateAssessmentDto,
  CreateAssessmentSectionDto,
  UpdateAssessmentDto,
  COMPONENT_TOPICS_MAP,
} from '../types/assessment.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class AssessmentValidationError extends AppError {
  public readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super('Assessment validation failed', 400, errors);
    this.name = 'AssessmentValidationError';
    this.errors = errors;
  }
}

const VALID_COMPONENTS: AssessmentComponent[] = [
  'APTITUDE',
  'LOGICAL_REASONING',
  'VERBAL_ABILITY',
  'TECHNICAL_MCQ',
  'CODING',
  'COMMUNICATION',
  'PSYCHOMETRIC',
];

const VALID_DIFFICULTIES: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const VALID_QUESTION_TYPES: QuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'FILL_BLANK',
  'DESCRIPTIVE',
];

export function validateCreateAssessment(data: unknown): CreateAssessmentDto {
  if (!data || typeof data !== 'object') {
    throw new AssessmentValidationError({ body: 'Request body must be a valid JSON object' });
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Name
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.name = 'Assessment name is required and cannot be blank';
  } else if (payload.name.trim().length < 3 || payload.name.trim().length > 255) {
    errors.name = 'Assessment name must be between 3 and 255 characters';
  }

  // Duration
  if (typeof payload.duration !== 'number' || isNaN(payload.duration) || payload.duration <= 0) {
    errors.duration = 'Duration must be a positive integer in minutes';
  }

  // Maximum Attempts
  let maximumAttempts = 1;
  if (payload.maximumAttempts !== undefined && payload.maximumAttempts !== null) {
    if (
      typeof payload.maximumAttempts !== 'number' ||
      !Number.isInteger(payload.maximumAttempts) ||
      payload.maximumAttempts < 1
    ) {
      errors.maximumAttempts = 'Maximum attempts must be an integer of at least 1';
    } else {
      maximumAttempts = payload.maximumAttempts;
    }
  }

  // Passing Percentage
  let passingPercentage = 50.0;
  if (payload.passingPercentage !== undefined && payload.passingPercentage !== null) {
    if (
      typeof payload.passingPercentage !== 'number' ||
      isNaN(payload.passingPercentage) ||
      payload.passingPercentage < 0 ||
      payload.passingPercentage > 100
    ) {
      errors.passingPercentage = 'Passing percentage must be a number between 0 and 100';
    } else {
      passingPercentage = payload.passingPercentage;
    }
  }

  // Number of Papers
  let numberOfPapers = 1;
  if (payload.numberOfPapers !== undefined && payload.numberOfPapers !== null) {
    if (
      typeof payload.numberOfPapers !== 'number' ||
      !Number.isInteger(payload.numberOfPapers) ||
      payload.numberOfPapers < 1 ||
      payload.numberOfPapers > 20
    ) {
      errors.numberOfPapers = 'Number of papers must be an integer between 1 and 20';
    } else {
      numberOfPapers = payload.numberOfPapers;
    }
  }

  // Dates
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (payload.startDate) {
    const d = new Date(payload.startDate as string);
    if (isNaN(d.getTime())) {
      errors.startDate = 'Start date must be a valid ISO date';
    } else {
      startDate = d;
    }
  }

  if (payload.endDate) {
    const d = new Date(payload.endDate as string);
    if (isNaN(d.getTime())) {
      errors.endDate = 'End date must be a valid ISO date';
    } else {
      endDate = d;
    }
  }

  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    errors.endDate = 'End date must be strictly after start date';
  }

  // Department Targeting
  let departmentTargeting: 'ALL' | 'SPECIFIC' = 'ALL';
  let departmentIds: string[] = [];
  if (payload.departmentTargeting !== undefined && payload.departmentTargeting !== null) {
    if (payload.departmentTargeting !== 'ALL' && payload.departmentTargeting !== 'SPECIFIC') {
      errors.departmentTargeting = "Department targeting must be either 'ALL' or 'SPECIFIC'";
    } else {
      departmentTargeting = payload.departmentTargeting as 'ALL' | 'SPECIFIC';
    }
  }
  if (departmentTargeting === 'SPECIFIC') {
    if (!Array.isArray(payload.departmentIds) || payload.departmentIds.length === 0) {
      errors.departmentIds = 'At least one department must be selected when targeting specific departments';
    } else {
      departmentIds = (payload.departmentIds as unknown[]).filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      if (departmentIds.length === 0) {
        errors.departmentIds = 'Valid department IDs must be provided when targeting specific departments';
      }
    }
  }

  // Sections
  if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
    errors.sections = 'Assessment must contain at least one section';
  }

  const validatedSections: CreateAssessmentSectionDto[] = [];

  if (Array.isArray(payload.sections)) {
    payload.sections.forEach((sec: unknown, index: number) => {
      if (!sec || typeof sec !== 'object') {
        errors[`sections[${index}]`] = 'Section must be a valid object';
        return;
      }

      const s = sec as Record<string, unknown>;

      // Component
      if (!s.component || !VALID_COMPONENTS.includes(s.component as AssessmentComponent)) {
        errors[`sections[${index}].component`] = `Component must be one of: ${VALID_COMPONENTS.join(', ')}`;
        return;
      }
      const component = s.component as AssessmentComponent;

      // Section Name
      const sectionName = typeof s.name === 'string' && s.name.trim().length > 0
        ? s.name.trim()
        : `${component} Section`;

      // Topics
      if (!Array.isArray(s.topics) || s.topics.length === 0) {
        errors[`sections[${index}].topics`] = `At least one topic must be selected for component ${component}`;
      } else {
        const allowedTopics = COMPONENT_TOPICS_MAP[component];
        const invalidTopics = (s.topics as string[]).filter(
          (t) => typeof t !== 'string' || !allowedTopics.includes(t as never)
        );
        if (invalidTopics.length > 0) {
          errors[`sections[${index}].topics`] = `Invalid topic(s) for ${component}: ${invalidTopics.join(', ')}`;
        }
      }

      // Difficulty
      let difficulty: QuestionDifficulty | null = null;
      if (s.difficulty !== undefined && s.difficulty !== null && s.difficulty !== '') {
        if (!VALID_DIFFICULTIES.includes(s.difficulty as QuestionDifficulty)) {
          errors[`sections[${index}].difficulty`] = `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`;
        } else {
          difficulty = s.difficulty as QuestionDifficulty;
        }
      }

      // Question Type
      let questionType: QuestionType | null = null;
      if (s.questionType !== undefined && s.questionType !== null && s.questionType !== '') {
        if (!VALID_QUESTION_TYPES.includes(s.questionType as QuestionType)) {
          errors[`sections[${index}].questionType`] = `Question type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`;
        } else {
          questionType = s.questionType as QuestionType;
        }
      }

      // Questions Count
      if (typeof s.questionsCount !== 'number' || !Number.isInteger(s.questionsCount) || s.questionsCount < 1) {
        errors[`sections[${index}].questionsCount`] = 'Questions count must be an integer of at least 1';
      }

      // Marks
      const marksPerQuestion = typeof s.marksPerQuestion === 'number' && s.marksPerQuestion > 0
        ? s.marksPerQuestion
        : 1.0;

      const negativeMarks = typeof s.negativeMarks === 'number' && s.negativeMarks >= 0
        ? s.negativeMarks
        : 0.0;

      validatedSections.push({
        component,
        name: sectionName,
        sectionOrder: index + 1,
        duration: typeof s.duration === 'number' && s.duration > 0 ? s.duration : null,
        topics: (s.topics as string[]) || [],
        difficulty,
        questionType,
        questionsCount: (s.questionsCount as number) || 1,
        marksPerQuestion,
        negativeMarks,
      });
    });
  }

  if (Object.keys(errors).length > 0) {
    throw new AssessmentValidationError(errors);
  }

  return {
    name: (payload.name as string).trim(),
    description: typeof payload.description === 'string' ? payload.description.trim() : null,
    duration: payload.duration as number,
    maximumAttempts,
    negativeMarking: Boolean(payload.negativeMarking),
    randomQuestions: Boolean(payload.randomQuestions),
    randomOptions: Boolean(payload.randomOptions),
    passingPercentage,
    startDate,
    endDate,
    numberOfPapers,
    companyId: typeof payload.companyId === 'string' && payload.companyId.trim() ? payload.companyId.trim() : null,
    isCompanyAssessment: payload.isCompanyAssessment !== undefined ? Boolean(payload.isCompanyAssessment) : (Boolean(payload.companyId)),
    departmentTargeting,
    departmentIds,
    sections: validatedSections,
  };
}

export function validateUpdateAssessment(data: unknown): UpdateAssessmentDto {
  if (!data || typeof data !== 'object') {
    throw new AssessmentValidationError({ body: 'Request body must be a valid JSON object' });
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
      errors.name = 'Assessment name cannot be blank';
    } else if (payload.name.trim().length < 3 || payload.name.trim().length > 255) {
      errors.name = 'Assessment name must be between 3 and 255 characters';
    }
  }

  if (payload.duration !== undefined) {
    if (typeof payload.duration !== 'number' || isNaN(payload.duration) || payload.duration <= 0) {
      errors.duration = 'Duration must be a positive integer in minutes';
    }
  }

  if (payload.maximumAttempts !== undefined) {
    if (
      typeof payload.maximumAttempts !== 'number' ||
      !Number.isInteger(payload.maximumAttempts) ||
      payload.maximumAttempts < 1
    ) {
      errors.maximumAttempts = 'Maximum attempts must be an integer of at least 1';
    }
  }

  if (payload.passingPercentage !== undefined) {
    if (
      typeof payload.passingPercentage !== 'number' ||
      isNaN(payload.passingPercentage) ||
      payload.passingPercentage < 0 ||
      payload.passingPercentage > 100
    ) {
      errors.passingPercentage = 'Passing percentage must be between 0 and 100';
    }
  }

  if (payload.numberOfPapers !== undefined) {
    if (
      typeof payload.numberOfPapers !== 'number' ||
      !Number.isInteger(payload.numberOfPapers) ||
      payload.numberOfPapers < 1 ||
      payload.numberOfPapers > 20
    ) {
      errors.numberOfPapers = 'Number of papers must be between 1 and 20';
    }
  }

  let startDate: Date | null | undefined = undefined;
  let endDate: Date | null | undefined = undefined;

  if (payload.startDate !== undefined) {
    if (payload.startDate === null) {
      startDate = null;
    } else {
      const d = new Date(payload.startDate as string);
      if (isNaN(d.getTime())) {
        errors.startDate = 'Start date must be a valid ISO date';
      } else {
        startDate = d;
      }
    }
  }

  if (payload.endDate !== undefined) {
    if (payload.endDate === null) {
      endDate = null;
    } else {
      const d = new Date(payload.endDate as string);
      if (isNaN(d.getTime())) {
        errors.endDate = 'End date must be a valid ISO date';
      } else {
        endDate = d;
      }
    }
  }

  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    errors.endDate = 'End date must be strictly after start date';
  }

  let validatedSections: CreateAssessmentSectionDto[] | undefined = undefined;
  if (payload.sections !== undefined) {
    if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
      errors.sections = 'Assessment sections cannot be empty if provided';
    } else {
      validatedSections = [];
      payload.sections.forEach((sec: unknown, index: number) => {
        if (!sec || typeof sec !== 'object') {
          errors[`sections[${index}]`] = 'Section must be a valid object';
          return;
        }

        const s = sec as Record<string, unknown>;
        if (!s.component || !VALID_COMPONENTS.includes(s.component as AssessmentComponent)) {
          errors[`sections[${index}].component`] = `Component must be one of: ${VALID_COMPONENTS.join(', ')}`;
          return;
        }
        const component = s.component as AssessmentComponent;

        if (!Array.isArray(s.topics) || s.topics.length === 0) {
          errors[`sections[${index}].topics`] = `At least one topic must be selected for component ${component}`;
        } else {
          const allowedTopics = COMPONENT_TOPICS_MAP[component];
          const invalidTopics = (s.topics as string[]).filter(
            (t) => typeof t !== 'string' || !allowedTopics.includes(t as never)
          );
          if (invalidTopics.length > 0) {
            errors[`sections[${index}].topics`] = `Invalid topic(s) for ${component}: ${invalidTopics.join(', ')}`;
          }
        }

        let difficulty: QuestionDifficulty | null = null;
        if (s.difficulty) {
          if (!VALID_DIFFICULTIES.includes(s.difficulty as QuestionDifficulty)) {
            errors[`sections[${index}].difficulty`] = `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`;
          } else {
            difficulty = s.difficulty as QuestionDifficulty;
          }
        }

        let questionType: QuestionType | null = null;
        if (s.questionType) {
          if (!VALID_QUESTION_TYPES.includes(s.questionType as QuestionType)) {
            errors[`sections[${index}].questionType`] = `Question type must be one of: ${VALID_QUESTION_TYPES.join(', ')}`;
          } else {
            questionType = s.questionType as QuestionType;
          }
        }

        if (typeof s.questionsCount !== 'number' || !Number.isInteger(s.questionsCount) || s.questionsCount < 1) {
          errors[`sections[${index}].questionsCount`] = 'Questions count must be an integer of at least 1';
        }

        validatedSections?.push({
          component,
          name: typeof s.name === 'string' && s.name.trim().length > 0 ? s.name.trim() : `${component} Section`,
          sectionOrder: index + 1,
          duration: typeof s.duration === 'number' && s.duration > 0 ? s.duration : null,
          topics: (s.topics as string[]) || [],
          difficulty,
          questionType,
          questionsCount: (s.questionsCount as number) || 1,
          marksPerQuestion: typeof s.marksPerQuestion === 'number' && s.marksPerQuestion > 0 ? s.marksPerQuestion : 1.0,
          negativeMarks: typeof s.negativeMarks === 'number' && s.negativeMarks >= 0 ? s.negativeMarks : 0.0,
        });
      });
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new AssessmentValidationError(errors);
  }

  const result: UpdateAssessmentDto = {};
  if (payload.name !== undefined) result.name = (payload.name as string).trim();
  if (payload.description !== undefined) result.description = payload.description ? (payload.description as string).trim() : null;
  if (payload.duration !== undefined) result.duration = payload.duration as number;
  if (payload.maximumAttempts !== undefined) result.maximumAttempts = payload.maximumAttempts as number;
  if (payload.negativeMarking !== undefined) result.negativeMarking = Boolean(payload.negativeMarking);
  if (payload.randomQuestions !== undefined) result.randomQuestions = Boolean(payload.randomQuestions);
  if (payload.randomOptions !== undefined) result.randomOptions = Boolean(payload.randomOptions);
  if (payload.passingPercentage !== undefined) result.passingPercentage = payload.passingPercentage as number;
  if (startDate !== undefined) result.startDate = startDate;
  if (endDate !== undefined) result.endDate = endDate;
  if (payload.numberOfPapers !== undefined) result.numberOfPapers = payload.numberOfPapers as number;
  if (payload.companyId !== undefined) {
    result.companyId = typeof payload.companyId === 'string' && payload.companyId.trim() ? payload.companyId.trim() : null;
  }
  if (payload.isCompanyAssessment !== undefined) {
    result.isCompanyAssessment = Boolean(payload.isCompanyAssessment);
  }
  if (validatedSections !== undefined) result.sections = validatedSections;

  return result;
}

export function validateScheduleAssessment(data: unknown): { startDate: Date; endDate: Date } {
  if (!data || typeof data !== 'object') {
    throw new AssessmentValidationError({ body: 'Request body must be an object' });
  }
  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!payload.startDate) {
    errors.startDate = 'Start date is required';
  }
  if (!payload.endDate) {
    errors.endDate = 'End date is required';
  }

  const start = new Date(payload.startDate as string);
  const end = new Date(payload.endDate as string);

  if (isNaN(start.getTime())) {
    errors.startDate = 'Invalid start date format';
  }
  if (isNaN(end.getTime())) {
    errors.endDate = 'Invalid end date format';
  }

  if (!errors.startDate && !errors.endDate && end.getTime() <= start.getTime()) {
    errors.endDate = 'End date must be strictly after start date';
  }

  if (Object.keys(errors).length > 0) {
    throw new AssessmentValidationError(errors);
  }

  return { startDate: start, endDate: end };
}
