import { AssessmentComparisonDto, CategoryComparisonDto } from '../types/analytics.types.js';

export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  QUANTITATIVE_APTITUDE: 'Quantitative Aptitude',
  LOGICAL_REASONING: 'Logical Reasoning',
  VERBAL_ABILITY: 'Verbal Ability',
  TECHNICAL_MCQ: 'Technical MCQ',
  CODING: 'Coding',
};

export function computePerformanceProgress(
  results: Array<{
    id?: string;
    attemptId?: string;
    assessmentId: string;
    assessmentTitle: string;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    createdAt: string | Date;
  }>,
  categoryComparison?: CategoryComparisonDto[]
): AssessmentComparisonDto {
  if (!results || results.length === 0) {
    return {
      hasCompletedAssessments: false,
      canCompare: false,
      statusMessage: 'No completed assessment data available.',
    };
  }

  // Chronological descending sort (latest assessment first)
  const sorted = [...results].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const current = sorted[0];
  const currentTest = {
    assessmentId: current.assessmentId,
    assessmentTitle: current.assessmentTitle,
    date: new Date(current.createdAt).toISOString(),
    score: Number(current.obtainedMarks.toFixed(2)),
    totalMarks: Number(current.totalMarks.toFixed(2)),
    percentage: Number(current.percentage.toFixed(2)),
  };

  if (sorted.length === 1) {
    return {
      hasCompletedAssessments: true,
      canCompare: false,
      statusMessage: 'Previous assessment comparison is not available.',
      currentTest,
    };
  }

  const previous = sorted[1];
  const previousTest = {
    assessmentId: previous.assessmentId,
    assessmentTitle: previous.assessmentTitle,
    date: new Date(previous.createdAt).toISOString(),
    score: Number(previous.obtainedMarks.toFixed(2)),
    totalMarks: Number(previous.totalMarks.toFixed(2)),
    percentage: Number(previous.percentage.toFixed(2)),
  };

  const scoreDiff = current.obtainedMarks - previous.obtainedMarks;
  const scoreChange = Number(scoreDiff.toFixed(2));

  let percentageChange: number | null = null;
  let percentageChangeDisplay = '0% Change';
  let status: 'Improved' | 'Decreased' | 'No Change' = 'No Change';

  if (previous.obtainedMarks === 0) {
    percentageChange = null;
    percentageChangeDisplay = 'Percentage change unavailable.';
    if (current.obtainedMarks > 0) {
      status = 'Improved';
    } else if (current.obtainedMarks < 0) {
      status = 'Decreased';
    } else {
      status = 'No Change';
      percentageChangeDisplay = '0% Change';
    }
  } else {
    const rawPct =
      ((current.obtainedMarks - previous.obtainedMarks) / previous.obtainedMarks) * 100;
    percentageChange = Number(rawPct.toFixed(2));
    if (percentageChange > 0) {
      percentageChangeDisplay = `+${percentageChange.toFixed(2)}%`;
      status = 'Improved';
    } else if (percentageChange < 0) {
      percentageChangeDisplay = `${percentageChange.toFixed(2)}%`;
      status = 'Decreased';
    } else {
      percentageChangeDisplay = '0% Change';
      status = 'No Change';
    }
  }

  return {
    hasCompletedAssessments: true,
    canCompare: true,
    previousTest,
    currentTest,
    scoreChange,
    percentageChange,
    percentageChangeDisplay,
    status,
    categoryComparison: categoryComparison || [],
  };
}
