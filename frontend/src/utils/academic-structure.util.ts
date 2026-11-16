export type AcademicStreamType = 'ARTS_AND_SCIENCE_UG' | 'ENGINEERING_UG' | 'POSTGRADUATE' | 'OTHER';

export interface AcademicStructureInfo {
  streamType: AcademicStreamType;
  streamLabel: string;
  degreeLevel: 'UG' | 'PG';
  durationYears: number;
  totalSemesters: number;
  semesterNumbers: number[];
}

/**
 * Resolves the academic stream, duration, and semester count dynamically
 * based on degree level, degree name, course code, department code, and course duration.
 *
 * Rules:
 * - Arts & Science UG: 3 Years, 6 Semesters only.
 * - PG (Postgraduate): 2 Years, 4 Semesters only.
 * - Engineering UG: 4 Years, 8 Semesters.
 */
export function getAcademicStructure(params: {
  degreeLevel?: string | null;
  degreeName?: string | null;
  courseName?: string | null;
  courseCode?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  durationYears?: number | null;
}): AcademicStructureInfo {
  const levelUpper = (params.degreeLevel || '').toUpperCase().trim();
  const degree = (params.degreeName || '').toUpperCase().trim();
  const course = (params.courseName || '').toUpperCase().trim();
  const courseCode = (params.courseCode || '').toUpperCase().trim();
  const dept = (params.departmentName || '').toUpperCase().trim();
  const deptCode = (params.departmentCode || '').toUpperCase().trim();

  const combined = `${degree} ${course} ${courseCode} ${dept} ${deptCode}`;

  // 1. Postgraduate Check (2 Years, 4 Semesters)
  const isPg =
    levelUpper === 'PG' ||
    /^(M\.?SC|M\.?COM|MBA|MCA|M\.?TECH|M\.?E|M\.?A|POSTGRADUATE|MASTER)/i.test(degree) ||
    /^(M\.?SC|M\.?COM|MBA|MCA|M\.?TECH|M\.?E|M\.?A)/i.test(courseCode) ||
    /^(M\.?SC|M\.?COM|MBA|MCA|M\.?TECH|M\.?E|M\.?A)/i.test(deptCode) ||
    combined.includes('MBA') ||
    combined.includes('MCA') ||
    combined.includes('M.SC') ||
    combined.includes('M.COM') ||
    combined.includes('MASTER');

  if (isPg) {
    return {
      streamType: 'POSTGRADUATE',
      streamLabel: 'Postgraduate (PG) - 2 Years',
      degreeLevel: 'PG',
      durationYears: 2,
      totalSemesters: 4,
      semesterNumbers: [1, 2, 3, 4],
    };
  }

  // 2. Engineering UG Check (4 Years, 8 Semesters)
  const isEngineering =
    /^(B\.?TECH|B\.?E\.?|ENGINEERING|TECHNOLOGY)/i.test(degree) ||
    /^(B\.?TECH|B\.?E\.?)/i.test(courseCode) ||
    combined.includes('B.TECH') ||
    combined.includes('B.E.') ||
    combined.includes('B.E ') ||
    combined.includes('ENGINEERING') ||
    params.durationYears === 4;

  if (isEngineering) {
    return {
      streamType: 'ENGINEERING_UG',
      streamLabel: 'Undergraduate Engineering (UG) - 4 Years',
      degreeLevel: 'UG',
      durationYears: 4,
      totalSemesters: 8,
      semesterNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    };
  }

  // 3. Default: Arts & Science UG (3 Years, 6 Semesters only)
  return {
    streamType: 'ARTS_AND_SCIENCE_UG',
    streamLabel: 'Undergraduate Arts & Science (UG) - 3 Years',
    degreeLevel: 'UG',
    durationYears: 3,
    totalSemesters: 6,
    semesterNumbers: [1, 2, 3, 4, 5, 6],
  };
}

