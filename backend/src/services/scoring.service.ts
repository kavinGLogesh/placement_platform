import { AssessmentDto, AssessmentPaperDto } from '../types/assessment.types.js';
import { AttemptAnswerDto } from '../types/attempt.types.js';

export interface QuestionGradingDetail {
  questionId: string;
  marksAwarded: number;
  isCorrect: boolean;
}

export interface CodingSubmissionGradingDto {
  passedTestCount: number;
  totalTestCount: number;
  status: string;
}

export interface CalculatedScore {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  isPassed: boolean;
  questionGrades?: Map<string, QuestionGradingDetail>;
}

export class ScoringService {
  /**
   * Authoritatively evaluates student answers against the assigned Phase 5 examination paper
   */
  calculateScore(
    assessment: AssessmentDto,
    paper: AssessmentPaperDto,
    answers: AttemptAnswerDto[],
    codingSubmissions?: Map<string, CodingSubmissionGradingDto>
  ): CalculatedScore {
    let totalMarks = 0;
    let rawScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    const questionGrades = new Map<string, QuestionGradingDetail>();

    const answerMap = new Map<string, AttemptAnswerDto>();
    for (const ans of answers) {
      answerMap.set(ans.questionId, ans);
    }

    const questions = paper.questions || [];

    for (const q of questions) {
      const qMarks = q.marks ?? 1.0;
      const qNegative = assessment.negativeMarking ? (q.negativeMarks ?? 0.0) : 0.0;
      totalMarks += qMarks;

      // 0. Coding Questions (Evaluated via Judge0 hidden test execution outcomes)
      if (q.category === 'CODING') {
        const sub = codingSubmissions?.get(q.questionId);
        if (!sub || sub.totalTestCount === 0) {
          unansweredCount++;
          questionGrades.set(q.questionId, {
            questionId: q.questionId,
            marksAwarded: 0,
            isCorrect: false,
          });
          continue;
        }

        const passRatio = sub.passedTestCount / sub.totalTestCount;
        const earned = Math.round((qMarks * passRatio) * 100) / 100;
        rawScore += earned;

        if (passRatio === 1) {
          correctCount++;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: earned, isCorrect: true });
        } else if (passRatio > 0) {
          correctCount++;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: earned, isCorrect: true });
        } else {
          incorrectCount++;
          rawScore -= qNegative;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: 0, isCorrect: false });
        }
        continue;
      }

      const ans = answerMap.get(q.questionId);

      const hasSelectedOptions = Array.isArray(ans?.selectedOptionIds) && ans.selectedOptionIds.length > 0;
      const hasTextAnswer = typeof ans?.textAnswer === 'string' && ans.textAnswer.trim().length > 0;

      if (!ans || (!hasSelectedOptions && !hasTextAnswer)) {
        unansweredCount++;
        questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: 0, isCorrect: false });
        continue;
      }

      // 1. Single Choice & True/False
      if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'TRUE_FALSE') {
        const correctOpt = (q.randomizedOptions || []).find((opt) => opt.isCorrect);
        const studentSelected = ans.selectedOptionIds ? ans.selectedOptionIds[0] : null;

        if (correctOpt && studentSelected === correctOpt.id) {
          correctCount++;
          rawScore += qMarks;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: qMarks, isCorrect: true });
        } else {
          incorrectCount++;
          rawScore -= qNegative;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: 0, isCorrect: false });
        }
      }
      // 2. Multiple Choice
      else if (q.questionType === 'MULTIPLE_CHOICE') {
        const correctOptIds = new Set(
          (q.randomizedOptions || []).filter((opt) => opt.isCorrect).map((opt) => opt.id)
        );
        const studentSelectedIds = new Set(ans.selectedOptionIds || []);

        const isExactMatch =
          correctOptIds.size === studentSelectedIds.size &&
          Array.from(correctOptIds).every((id) => studentSelectedIds.has(id));

        if (isExactMatch) {
          correctCount++;
          rawScore += qMarks;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: qMarks, isCorrect: true });
        } else {
          incorrectCount++;
          rawScore -= qNegative;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: 0, isCorrect: false });
        }
      }
      // 3. Fill in Blank
      else if (q.questionType === 'FILL_BLANK') {
        const correctText = (q.randomizedOptions || []).find((opt) => opt.isCorrect)?.optionText || '';
        const studentText = ans.textAnswer ? ans.textAnswer.trim().toLowerCase() : '';

        if (correctText && studentText === correctText.trim().toLowerCase()) {
          correctCount++;
          rawScore += qMarks;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: qMarks, isCorrect: true });
        } else {
          incorrectCount++;
          rawScore -= qNegative;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: 0, isCorrect: false });
        }
      }
      // 4. Other types (Default objective check)
      else {
        const correctOpt = (q.randomizedOptions || []).find((opt) => opt.isCorrect);
        if (correctOpt && ans.selectedOptionIds && ans.selectedOptionIds.includes(correctOpt.id)) {
          correctCount++;
          rawScore += qMarks;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: qMarks, isCorrect: true });
        } else {
          incorrectCount++;
          rawScore -= qNegative;
          questionGrades.set(q.questionId, { questionId: q.questionId, marksAwarded: 0, isCorrect: false });
        }
      }
    }

    const obtainedMarks = Math.max(0, Math.round(rawScore * 100) / 100);
    const roundedTotalMarks = Math.round(totalMarks * 100) / 100;
    const percentage =
      roundedTotalMarks > 0
        ? Math.max(0, Math.min(100, Math.round(((obtainedMarks / roundedTotalMarks) * 100) * 100) / 100))
        : 0;

    const totalAnswered = correctCount + incorrectCount;
    const accuracy =
      totalAnswered > 0 ? Math.round(((correctCount / totalAnswered) * 100) * 100) / 100 : 0;

    const isPassed = percentage >= (assessment.passingPercentage ?? 50.0);

    return {
      totalMarks: roundedTotalMarks,
      obtainedMarks,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      accuracy,
      isPassed,
      questionGrades,
    };
  }
}

export const scoringService = new ScoringService();
