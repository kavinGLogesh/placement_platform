import {
  evaluationRepository,
  EvaluationRepository,
} from '../repositories/evaluation.repository.js';
import { managementRepository } from '../repositories/management.repository.js';
import {
  CreateGdRoundDto,
  UpdateGdRoundDto,
  SubmitGdEvaluationDto,
  CreateInterviewRoundDto,
  UpdateInterviewRoundDto,
  SubmitInterviewEvaluationDto,
  AttendanceStatus,
  GdRoundDto,
  GdEvaluationDto,
  InterviewRoundDto,
  InterviewEvaluationDto,
  EvaluationComparisonDto,
  StudentHumanEvaluationSummaryDto,
  BulkEvaluationResultDto,
} from '../types/evaluation.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateBulkEvaluationInput } from '../validators/evaluation.validator.js';

export class EvaluationService {
  constructor(private readonly repo: EvaluationRepository = evaluationRepository) {}

  // ===========================================================================
  // COMPARISON UTILITY: Previous Score -> Current Score -> Improvement
  // ===========================================================================

  public computeComparison(
    previousScore: number | null,
    currentScore: number,
    prevDate?: string | Date | null,
    currDate?: string | Date | null
  ): EvaluationComparisonDto {
    if (previousScore === null || previousScore === undefined) {
      return {
        previousScore: null,
        currentScore: Math.round(currentScore * 100) / 100,
        improvement: null,
        displayText: 'No previous evaluation available.',
        previousEvaluationDate: null,
        currentEvaluationDate: currDate ? new Date(currDate).toISOString() : new Date().toISOString(),
      };
    }

    const prevNorm = Math.round(previousScore * 100) / 100;
    const currNorm = Math.round(currentScore * 100) / 100;
    const diff = Math.round((currNorm - prevNorm) * 100) / 100;
    const diffSign = diff > 0 ? `+${diff}` : `${diff}`;

    return {
      previousScore: prevNorm,
      currentScore: currNorm,
      improvement: diff,
      displayText: `${prevNorm} → ${currNorm} = ${diffSign} points`,
      previousEvaluationDate: prevDate ? new Date(prevDate).toISOString() : null,
      currentEvaluationDate: currDate ? new Date(currDate).toISOString() : new Date().toISOString(),
    };
  }

  // ===========================================================================
  // GD ROUNDS (PLACEMENT ADMIN & EVALUATOR)
  // ===========================================================================

  async createGdRound(dto: CreateGdRoundDto, creatorUserId?: string): Promise<GdRoundDto> {
    let finalStudentIds = dto.studentIds ? [...dto.studentIds] : [];

    // Validate provided student IDs exist
    if (finalStudentIds.length > 0) {
      for (const sid of finalStudentIds) {
        const student = await managementRepository.findStudentById(sid);
        if (!student) {
          throw new AppError(`Student with ID '${sid}' does not exist`, 404);
        }
      }
    } else if (dto.departmentId || dto.courseId || dto.batchYear) {
      // If studentIds wasn't manually filled, auto-target matching students from institutional hierarchy
      const targetedStudents = await managementRepository.findStudents({
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        page: 1,
        limit: 1000,
      });

      const matched = (targetedStudents.data || [])
        .filter((s: any) => !dto.batchYear || s.year === dto.batchYear)
        .map((s: any) => s.id);

      finalStudentIds = Array.from(new Set(matched));
    }

    const payload = {
      ...dto,
      studentIds: finalStudentIds,
    };

    return this.repo.createGdRound(payload, creatorUserId);
  }

  async getGdRounds(filters?: {
    status?: string;
    evaluatorId?: string;
    departmentId?: string;
    studentId?: string;
  }): Promise<GdRoundDto[]> {
    return this.repo.getGdRounds(filters);
  }

  async getGdRoundById(id: string): Promise<GdRoundDto> {
    const round = await this.repo.getGdRoundById(id);
    if (!round) {
      throw new AppError('GD round not found', 404);
    }
    return round;
  }

  async updateGdRound(id: string, dto: UpdateGdRoundDto): Promise<GdRoundDto> {
    await this.getGdRoundById(id);
    return this.repo.updateGdRound(id, dto);
  }

  async deleteGdRound(id: string): Promise<void> {
    await this.getGdRoundById(id);
    await this.repo.deleteGdRound(id);
  }

  async assignStudentsToGd(roundId: string, studentIds: string[]): Promise<{ assignedCount: number }> {
    await this.getGdRoundById(roundId);
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('studentIds must be a non-empty array of student IDs', 400);
    }
    const cleanIds = Array.from(new Set(studentIds.map((s) => String(s).trim()).filter(Boolean)));
    if (cleanIds.length === 0) {
      throw new AppError('No valid student IDs provided', 400);
    }
    // Verify all students exist in the system (server-side IDOR / invalid ID protection)
    for (const sid of cleanIds) {
      const student = await managementRepository.findStudentById(sid);
      if (!student) {
        throw new AppError(`Student with ID '${sid}' does not exist`, 404);
      }
    }
    const assignedCount = await this.repo.assignStudentsToGdRound(roundId, cleanIds);
    return { assignedCount };
  }

  async removeParticipantFromGd(roundId: string, participantId: string): Promise<void> {
    const round = await this.getGdRoundById(roundId);
    const part = round.participants?.find((p) => p.id === participantId);
    if (!part) {
      throw new AppError('Participant not found in this GD round', 404);
    }
    await this.repo.removeParticipantFromGd(participantId);
  }

  async updateGdAttendance(participantId: string, attendance: AttendanceStatus): Promise<void> {
    const participant = await this.repo.getGdParticipantById(participantId);
    if (!participant) {
      throw new AppError('Participant not found', 404);
    }
    await this.repo.updateGdAttendance(participantId, attendance);
  }

  async batchUpdateGdAttendance(
    records: Array<{ participantId: string; attendance: AttendanceStatus }>
  ): Promise<void> {
    await this.repo.batchUpdateGdAttendance(records);
  }

  async evaluateGdParticipant(
    dto: SubmitGdEvaluationDto,
    evaluatorUserId: string,
    isPlacementAdmin: boolean
  ): Promise<GdEvaluationDto> {
    const participant = await this.repo.getGdParticipantById(dto.participantId);
    if (!participant) {
      throw new AppError('Participant not found for evaluation', 404);
    }

    const round = participant.round;
    if (!round) {
      throw new AppError('Associated GD round not found', 404);
    }

    // Authorization: Evaluator must be assigned evaluator OR user must be Placement Admin
    if (!isPlacementAdmin && round.evaluatorId && round.evaluatorId !== evaluatorUserId) {
      throw new AppError('Forbidden: You are not the assigned evaluator for this GD round', 403);
    }

    // Backend authoritative scoring
    const criteria: any[] = round.criteria || [];
    const critMap = new Map(criteria.map((c: any) => [c.id, c]));

    let totalScore = 0;
    let maxPossibleMarks = 0;

    const validatedCriterionScores = dto.criterionScores.map((cs) => {
      const c = critMap.get(cs.criterionId);
      if (!c) {
        throw new AppError(`Criterion with ID '${cs.criterionId}' not found in this GD round`, 400);
      }
      const maxMarks = Number(c.maxMarks) || 10;
      const score = Math.max(0, Math.min(cs.score, maxMarks));
      totalScore += score;
      maxPossibleMarks += maxMarks;
      return {
        criterionId: cs.criterionId,
        score,
        maxMarks,
        comment: cs.comment,
      };
    });

    if (maxPossibleMarks <= 0) {
      throw new AppError('Maximum possible marks for this round must be greater than zero', 400);
    }

    const percentage = Math.round((totalScore / maxPossibleMarks) * 100 * 100) / 100;

    // Save evaluation in database
    const saved = await this.repo.saveGdEvaluation({
      participantId: dto.participantId,
      evaluatorId: evaluatorUserId,
      feedback: dto.feedback,
      criterionScores: validatedCriterionScores,
      totalScore: Math.round(totalScore * 100) / 100,
      maxPossibleMarks: Math.round(maxPossibleMarks * 100) / 100,
      percentage,
    });

    // Compute previous score comparison
    const history = await this.repo.getGdEvaluationsForStudent(participant.studentId);
    const completedEvaluations = history
      .filter((h) => h.evaluation && h.participantId !== dto.participantId)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const previousEval =
      completedEvaluations.length > 0
        ? completedEvaluations[completedEvaluations.length - 1].evaluation
        : null;

    saved.comparison = this.computeComparison(
      previousEval ? previousEval.percentage : null,
      saved.percentage,
      previousEval ? previousEval.evaluatedAt : null,
      saved.evaluatedAt
    );

    return saved;
  }

  async bulkEvaluateGd(
    roundId: string,
    evaluatorUserId: string,
    isPlacementAdmin: boolean,
    body: any
  ): Promise<BulkEvaluationResultDto> {
    const round = await this.repo.getGdRoundById(roundId);
    if (!round) {
      throw new AppError('GD round not found', 404);
    }

    if (!isPlacementAdmin && round.evaluatorId && round.evaluatorId !== evaluatorUserId) {
      throw new AppError('Forbidden: You are not the assigned evaluator for this GD round', 403);
    }

    const validatedPayload = validateBulkEvaluationInput(body, round, 'GD');

    const criteriaMap = new Map((round.criteria || []).map((c) => [c.id, c]));
    const maxPossibleMarksForRound = (round.criteria || []).reduce(
      (sum, c) => sum + (Number(c.maxMarks) || 10),
      0
    );

    if (!validatedPayload.isDraft && maxPossibleMarksForRound <= 0) {
      throw new AppError('Maximum possible marks for this round must be greater than zero', 400);
    }

    const processedEvaluations = validatedPayload.evaluations.map((item) => {
      let totalScore = 0;
      const itemScores = item.criterionScores || item.scores || [];
      const validatedScores = itemScores.map((cs) => {
        const crit = criteriaMap.get(cs.criterionId);
        const maxMarks = crit ? Number(crit.maxMarks) || 10 : 10;
        const score = Math.max(0, Math.min(cs.score, maxMarks));
        totalScore += score;
        return {
          criterionId: cs.criterionId,
          score,
          maxMarks,
          comment: cs.comment,
        };
      });

      const maxPossibleMarks = maxPossibleMarksForRound;
      const percentage =
        maxPossibleMarks > 0
          ? Math.round((totalScore / maxPossibleMarks) * 100 * 100) / 100
          : 0;

      return {
        studentId: item.studentId,
        participantId: item.participantId,
        feedback: item.feedback,
        criterionScores: validatedScores,
        totalScore: Math.round(totalScore * 100) / 100,
        maxPossibleMarks,
        percentage,
      };
    });

    return this.repo.bulkSaveGdEvaluations({
      roundId,
      evaluatorId: evaluatorUserId,
      isDraft: validatedPayload.isDraft || false,
      evaluations: processedEvaluations,
    });
  }

  // ===========================================================================
  // INTERVIEW ROUNDS (PLACEMENT ADMIN & EVALUATOR)
  // ===========================================================================

  async createInterviewRound(dto: CreateInterviewRoundDto, creatorUserId?: string): Promise<InterviewRoundDto> {
    let finalStudentIds = dto.studentIds ? [...dto.studentIds] : [];

    // Validate provided student IDs exist
    if (finalStudentIds.length > 0) {
      for (const sid of finalStudentIds) {
        const student = await managementRepository.findStudentById(sid);
        if (!student) {
          throw new AppError(`Student with ID '${sid}' does not exist`, 404);
        }
      }
    } else if (dto.departmentId || dto.courseId || dto.batchYear) {
      // If studentIds wasn't manually filled, auto-target matching students from institutional hierarchy
      const targetedStudents = await managementRepository.findStudents({
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        page: 1,
        limit: 1000,
      });

      const matched = (targetedStudents.data || [])
        .filter((s: any) => !dto.batchYear || s.year === dto.batchYear)
        .map((s: any) => s.id);

      finalStudentIds = Array.from(new Set(matched));
    }

    const payload = {
      ...dto,
      studentIds: finalStudentIds,
    };

    return this.repo.createInterviewRound(payload, creatorUserId);
  }

  async getInterviewRounds(filters?: {
    status?: string;
    interviewType?: string;
    evaluatorId?: string;
    departmentId?: string;
    studentId?: string;
  }): Promise<InterviewRoundDto[]> {
    return this.repo.getInterviewRounds(filters);
  }

  async getInterviewRoundById(id: string): Promise<InterviewRoundDto> {
    const round = await this.repo.getInterviewRoundById(id);
    if (!round) {
      throw new AppError('Interview round not found', 404);
    }
    return round;
  }

  async updateInterviewRound(id: string, dto: UpdateInterviewRoundDto): Promise<InterviewRoundDto> {
    await this.getInterviewRoundById(id);
    return this.repo.updateInterviewRound(id, dto);
  }

  async deleteInterviewRound(id: string): Promise<void> {
    await this.getInterviewRoundById(id);
    await this.repo.deleteInterviewRound(id);
  }

  async assignStudentsToInterview(roundId: string, studentIds: string[]): Promise<{ assignedCount: number }> {
    await this.getInterviewRoundById(roundId);
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('studentIds must be a non-empty array of student IDs', 400);
    }
    const cleanIds = Array.from(new Set(studentIds.map((s) => String(s).trim()).filter(Boolean)));
    if (cleanIds.length === 0) {
      throw new AppError('No valid student IDs provided', 400);
    }
    // Verify all students exist in the system (server-side IDOR / invalid ID protection)
    for (const sid of cleanIds) {
      const student = await managementRepository.findStudentById(sid);
      if (!student) {
        throw new AppError(`Student with ID '${sid}' does not exist`, 404);
      }
    }
    const assignedCount = await this.repo.assignStudentsToInterviewRound(roundId, cleanIds);
    return { assignedCount };
  }

  async removeParticipantFromInterview(roundId: string, participantId: string): Promise<void> {
    const round = await this.getInterviewRoundById(roundId);
    const part = round.participants?.find((p) => p.id === participantId);
    if (!part) {
      throw new AppError('Participant not found in this interview round', 404);
    }
    await this.repo.removeParticipantFromInterview(participantId);
  }

  async updateInterviewAttendance(participantId: string, attendance: AttendanceStatus): Promise<void> {
    const participant = await this.repo.getInterviewParticipantById(participantId);
    if (!participant) {
      throw new AppError('Participant not found', 404);
    }
    await this.repo.updateInterviewAttendance(participantId, attendance);
  }

  async batchUpdateInterviewAttendance(
    records: Array<{ participantId: string; attendance: AttendanceStatus }>
  ): Promise<void> {
    await this.repo.batchUpdateInterviewAttendance(records);
  }

  async evaluateInterviewParticipant(
    dto: SubmitInterviewEvaluationDto,
    evaluatorUserId: string,
    isPlacementAdmin: boolean
  ): Promise<InterviewEvaluationDto> {
    const participant = await this.repo.getInterviewParticipantById(dto.participantId);
    if (!participant) {
      throw new AppError('Participant not found for evaluation', 404);
    }

    const round = participant.round;
    if (!round) {
      throw new AppError('Associated Interview round not found', 404);
    }

    if (!isPlacementAdmin && round.evaluatorId && round.evaluatorId !== evaluatorUserId) {
      throw new AppError('Forbidden: You are not the assigned interviewer for this round', 403);
    }

    const criteria: any[] = round.criteria || [];
    const critMap = new Map(criteria.map((c: any) => [c.id, c]));

    let totalScore = 0;
    let maxPossibleMarks = 0;

    const validatedCriterionScores = dto.criterionScores.map((cs) => {
      const c = critMap.get(cs.criterionId);
      if (!c) {
        throw new AppError(`Criterion with ID '${cs.criterionId}' not found in this interview round`, 400);
      }
      const maxMarks = Number(c.maxMarks) || 10;
      const score = Math.max(0, Math.min(cs.score, maxMarks));
      totalScore += score;
      maxPossibleMarks += maxMarks;
      return {
        criterionId: cs.criterionId,
        score,
        maxMarks,
        comment: cs.comment,
      };
    });

    if (maxPossibleMarks <= 0) {
      throw new AppError('Maximum possible marks for this round must be greater than zero', 400);
    }

    const percentage = Math.round((totalScore / maxPossibleMarks) * 100 * 100) / 100;

    const saved = await this.repo.saveInterviewEvaluation({
      participantId: dto.participantId,
      evaluatorId: evaluatorUserId,
      strengths: dto.strengths,
      areasForImprovement: dto.areasForImprovement,
      overallFeedback: dto.overallFeedback,
      criterionScores: validatedCriterionScores,
      totalScore: Math.round(totalScore * 100) / 100,
      maxPossibleMarks: Math.round(maxPossibleMarks * 100) / 100,
      percentage,
    });

    // Previous evaluation comparison
    const history = await this.repo.getInterviewEvaluationsForStudent(participant.studentId);
    const completedEvaluations = history
      .filter((h) => h.evaluation && h.participantId !== dto.participantId)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const previousEval =
      completedEvaluations.length > 0
        ? completedEvaluations[completedEvaluations.length - 1].evaluation
        : null;

    saved.comparison = this.computeComparison(
      previousEval ? previousEval.percentage : null,
      saved.percentage,
      previousEval ? previousEval.evaluatedAt : null,
      saved.evaluatedAt
    );

    return saved;
  }

  async bulkEvaluateInterview(
    roundId: string,
    evaluatorUserId: string,
    isPlacementAdmin: boolean,
    body: any
  ): Promise<BulkEvaluationResultDto> {
    const round = await this.repo.getInterviewRoundById(roundId);
    if (!round) {
      throw new AppError('Interview round not found', 404);
    }

    if (!isPlacementAdmin && round.evaluatorId && round.evaluatorId !== evaluatorUserId) {
      throw new AppError('Forbidden: You are not the assigned evaluator for this Interview round', 403);
    }

    const validatedPayload = validateBulkEvaluationInput(body, round, 'INTERVIEW');

    const criteriaMap = new Map((round.criteria || []).map((c) => [c.id, c]));
    const maxPossibleMarksForRound = (round.criteria || []).reduce(
      (sum, c) => sum + (Number(c.maxMarks) || 10),
      0
    );

    if (!validatedPayload.isDraft && maxPossibleMarksForRound <= 0) {
      throw new AppError('Maximum possible marks for this round must be greater than zero', 400);
    }

    const processedEvaluations = validatedPayload.evaluations.map((item) => {
      let totalScore = 0;
      const itemScores = item.criterionScores || item.scores || [];
      const validatedScores = itemScores.map((cs) => {
        const crit = criteriaMap.get(cs.criterionId);
        const maxMarks = crit ? Number(crit.maxMarks) || 10 : 10;
        const score = Math.max(0, Math.min(cs.score, maxMarks));
        totalScore += score;
        return {
          criterionId: cs.criterionId,
          score,
          maxMarks,
          comment: cs.comment,
        };
      });

      const maxPossibleMarks = maxPossibleMarksForRound;
      const percentage =
        maxPossibleMarks > 0
          ? Math.round((totalScore / maxPossibleMarks) * 100 * 100) / 100
          : 0;

      return {
        studentId: item.studentId,
        participantId: item.participantId,
        strengths: item.strengths,
        areasForImprovement: item.areasForImprovement,
        overallFeedback: item.overallFeedback,
        criterionScores: validatedScores,
        totalScore: Math.round(totalScore * 100) / 100,
        maxPossibleMarks,
        percentage,
      };
    });

    return this.repo.bulkSaveInterviewEvaluations({
      roundId,
      evaluatorId: evaluatorUserId,
      isDraft: validatedPayload.isDraft || false,
      evaluations: processedEvaluations,
    });
  }

  // ===========================================================================
  // STUDENT PORTAL INTEGRATION (READ-ONLY FOR STUDENT OWN DATA)
  // ===========================================================================

  async getStudentGdRounds(studentId: string): Promise<any[]> {
    const history = await this.repo.getGdEvaluationsForStudent(studentId);

    // Compute previous/current improvement sequentially across the student's chronological history
    let prevPercentage: number | null = null;
    let prevDate: any = null;

    const enriched = history.map((item) => {
      if (item.evaluation) {
        const comparison = this.computeComparison(
          prevPercentage,
          item.evaluation.percentage,
          prevDate,
          item.evaluation.evaluatedAt
        );
        item.evaluation.comparison = comparison;
        prevPercentage = item.evaluation.percentage;
        prevDate = item.evaluation.evaluatedAt;
      }
      return item;
    });

    return enriched;
  }

  async getStudentInterviewRounds(studentId: string): Promise<any[]> {
    const history = await this.repo.getInterviewEvaluationsForStudent(studentId);

    let prevPercentage: number | null = null;
    let prevDate: any = null;

    const enriched = history.map((item) => {
      if (item.evaluation) {
        const comparison = this.computeComparison(
          prevPercentage,
          item.evaluation.percentage,
          prevDate,
          item.evaluation.evaluatedAt
        );
        item.evaluation.comparison = comparison;
        prevPercentage = item.evaluation.percentage;
        prevDate = item.evaluation.evaluatedAt;
      }
      return item;
    });

    return enriched;
  }

  async getStudentHumanEvaluationSummary(studentId: string): Promise<StudentHumanEvaluationSummaryDto> {
    const gdHistory = await this.getStudentGdRounds(studentId);
    const interviewHistory = await this.getStudentInterviewRounds(studentId);

    // GD Summary
    const gdEvaluated = gdHistory.filter((g) => g.evaluation);
    const gdAvg =
      gdEvaluated.length > 0
        ? Math.round(
            (gdEvaluated.reduce((acc, g) => acc + g.evaluation.percentage, 0) / gdEvaluated.length) * 100
          ) / 100
        : 0;

    const latestGd = gdEvaluated.length > 0 ? gdEvaluated[gdEvaluated.length - 1] : null;
    const prevGd = gdEvaluated.length >= 2 ? gdEvaluated[gdEvaluated.length - 2] : null;

    const gdComparison = this.computeComparison(
      prevGd ? prevGd.evaluation.percentage : null,
      latestGd ? latestGd.evaluation.percentage : 0,
      prevGd ? prevGd.evaluation.evaluatedAt : null,
      latestGd ? latestGd.evaluation.evaluatedAt : null
    );

    // Interview Summary
    const interviewEvaluated = interviewHistory.filter((i) => i.evaluation);
    const interviewAvg =
      interviewEvaluated.length > 0
        ? Math.round(
            (interviewEvaluated.reduce((acc, i) => acc + i.evaluation.percentage, 0) /
              interviewEvaluated.length) *
              100
          ) / 100
        : 0;

    const latestInterview =
      interviewEvaluated.length > 0 ? interviewEvaluated[interviewEvaluated.length - 1] : null;
    const prevInterview =
      interviewEvaluated.length >= 2 ? interviewEvaluated[interviewEvaluated.length - 2] : null;

    const interviewComparison = this.computeComparison(
      prevInterview ? prevInterview.evaluation.percentage : null,
      latestInterview ? latestInterview.evaluation.percentage : 0,
      prevInterview ? prevInterview.evaluation.evaluatedAt : null,
      latestInterview ? latestInterview.evaluation.evaluatedAt : null
    );

    return {
      gd: {
        totalAssigned: gdHistory.length,
        totalAttended: gdHistory.filter((g) => g.attendance === 'PRESENT').length,
        totalEvaluated: gdEvaluated.length,
        averagePercentage: gdAvg,
        latestScore: latestGd ? latestGd.evaluation.percentage : null,
        comparison: gdComparison,
        history: gdHistory,
      },
      interview: {
        totalAssigned: interviewHistory.length,
        totalAttended: interviewHistory.filter((i) => i.attendance === 'PRESENT').length,
        totalEvaluated: interviewEvaluated.length,
        averagePercentage: interviewAvg,
        latestScore: latestInterview ? latestInterview.evaluation.percentage : null,
        comparison: interviewComparison,
        history: interviewHistory,
      },
    };
  }
}

export const evaluationService = new EvaluationService();
