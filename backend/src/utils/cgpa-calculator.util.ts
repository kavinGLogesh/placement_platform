export interface SemesterGradeInput {
  semesterNumber: number;
  sgpa?: number | null;
  cgpa?: number | null;
  totalCredits?: number | null;
  creditsEarned?: number | null;
  backlogsCount?: number;
}

/**
 * Calculates overall CGPA strictly according to standard university grading rules
 * (e.g. AICTE / Anna University / VTU CBCS regulations):
 *
 * Overall CGPA = (Sum of [SGPA_i * Credits_i]) / (Sum of Credits_i)
 * for all completed semesters where SGPA is declared.
 *
 * If credit values are not specified or equal 0, the standard arithmetic mean
 * of completed semester SGPAs is utilized:
 * Overall CGPA = (Sum of SGPA_i) / (Number of completed semesters)
 *
 * Note: Marksheet upload is never required to calculate CGPA.
 * Rounded to 2 decimal places (0.00 - 10.00 scale).
 */
export function calculateUniversityCgpa(semesters: SemesterGradeInput[] | undefined | null): number | null {
  if (!semesters || semesters.length === 0) return null;

  const validSemesters = semesters.filter(
    (s) =>
      s.sgpa !== undefined &&
      s.sgpa !== null &&
      !isNaN(Number(s.sgpa)) &&
      Number(s.sgpa) > 0 &&
      Number(s.sgpa) <= 10
  );

  if (validSemesters.length === 0) return null;

  let totalCreditPoints = 0;
  let totalCredits = 0;
  let hasValidCredits = false;

  for (const s of validSemesters) {
    const sgpa = Number(s.sgpa);
    const credits = s.totalCredits ? Number(s.totalCredits) : 0;
    if (credits > 0) {
      hasValidCredits = true;
      totalCreditPoints += sgpa * credits;
      totalCredits += credits;
    }
  }

  if (hasValidCredits && totalCredits > 0) {
    const cgpa = totalCreditPoints / totalCredits;
    return parseFloat(cgpa.toFixed(2));
  }

  const sumSgpa = validSemesters.reduce((acc, s) => acc + Number(s.sgpa), 0);
  const avgCgpa = sumSgpa / validSemesters.length;
  return parseFloat(avgCgpa.toFixed(2));
}

/**
 * Calculates overall percentage from CGPA according to standard university conversion rules
 * (e.g., AICTE, Anna University, CBSE, VTU):
 *
 * Direct conversion: Percentage = CGPA * 10
 * AICTE conversion: Percentage = (CGPA - 0.75) * 10
 *
 * Default is direct conversion (CGPA * 10), clamped between 0% and 100%.
 */
export function calculateUniversityPercentage(
  cgpa: number | null | undefined,
  rule: 'DIRECT_10' | 'AICTE' = 'DIRECT_10'
): number | null {
  if (cgpa === null || cgpa === undefined || isNaN(Number(cgpa)) || Number(cgpa) <= 0) {
    return null;
  }
  const numericCgpa = Number(cgpa);
  if (rule === 'AICTE') {
    const raw = (numericCgpa - 0.75) * 10;
    return parseFloat(Math.max(0, Math.min(100, raw)).toFixed(2));
  }
  const raw = numericCgpa * 10;
  return parseFloat(Math.max(0, Math.min(100, raw)).toFixed(2));
}
