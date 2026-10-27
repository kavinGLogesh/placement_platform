import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SORT_FIELDS = ['name', 'registerNumber', 'collegeEmail', 'cgpa', 'year', 'createdAt'];

export const validateCollegeInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { code, name, contactEmail } = req.body || {};

  if (!code || typeof code !== 'string' || !code.trim()) {
    return next(new AppError('College code is required', 400));
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('College name is required', 400));
  }
  if (contactEmail && !EMAIL_REGEX.test(contactEmail.trim())) {
    return next(new AppError('Invalid contact email format', 400));
  }

  next();
};

export const validateCollegeUpdateInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { code, name, contactEmail } = req.body || {};

  if (code !== undefined && (typeof code !== 'string' || !code.trim())) {
    return next(new AppError('College code cannot be empty', 400));
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return next(new AppError('College name cannot be empty', 400));
  }
  if (contactEmail && !EMAIL_REGEX.test(contactEmail.trim())) {
    return next(new AppError('Invalid contact email format', 400));
  }

  next();
};

export const validateDepartmentInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { collegeId, code, name } = req.body || {};

  if (!collegeId || typeof collegeId !== 'string' || !collegeId.trim()) {
    return next(new AppError('College ID is required', 400));
  }
  if (!code || typeof code !== 'string' || !code.trim()) {
    return next(new AppError('Department code is required', 400));
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Department name is required', 400));
  }

  next();
};

export const validateCourseInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { departmentId, code, name, durationYears } = req.body || {};

  if (!departmentId || typeof departmentId !== 'string' || !departmentId.trim()) {
    return next(new AppError('Department ID is required', 400));
  }
  if (!code || typeof code !== 'string' || !code.trim()) {
    return next(new AppError('Course code is required', 400));
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Course name is required', 400));
  }
  if (durationYears !== undefined && (typeof durationYears !== 'number' || durationYears <= 0 || durationYears > 6)) {
    return next(new AppError('Course duration must be between 1 and 6 years', 400));
  }

  next();
};

export const validateClassInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { departmentId, courseId, batchYear, currentYear } = req.body || {};

  if (!departmentId || typeof departmentId !== 'string' || !departmentId.trim()) {
    return next(new AppError('Department ID is required', 400));
  }
  if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
    return next(new AppError('Course ID is required', 400));
  }
  if (!batchYear || typeof batchYear !== 'number' || batchYear < 2000 || batchYear > 2100) {
    return next(new AppError('Valid batch year is required (e.g. 2026)', 400));
  }
  if (!currentYear || typeof currentYear !== 'number' || currentYear < 1 || currentYear > 6) {
    return next(new AppError('Current year must be between 1 and 6', 400));
  }

  next();
};

export const validateSectionInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { classId, name } = req.body || {};

  if (!classId || typeof classId !== 'string' || !classId.trim()) {
    return next(new AppError('Class ID is required', 400));
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Section name is required (e.g. A, B, C)', 400));
  }

  next();
};

export const validateStudentInput = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  for (const field of ['courseId', 'classId', 'sectionId'] as const) {
    if (typeof body[field] === 'string' && !body[field].trim()) {
      delete body[field];
    }
  }

  const {
    registerNumber,
    name,
    collegeEmail,
    departmentId,
    year,
    cgpa,
  } = body;

  if (!registerNumber || typeof registerNumber !== 'string' || !registerNumber.trim()) {
    return next(new AppError('Register Number is required', 400));
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Student name is required', 400));
  }
  if (!collegeEmail || typeof collegeEmail !== 'string' || !EMAIL_REGEX.test(collegeEmail.trim())) {
    return next(new AppError('Valid College Email is required', 400));
  }
  if (!departmentId || typeof departmentId !== 'string' || !departmentId.trim()) {
    return next(new AppError('Department ID is required', 400));
  }
  if (!year || typeof year !== 'number' || year < 1 || year > 6) {
    return next(new AppError('Year must be between 1 and 6', 400));
  }
  if (cgpa !== undefined && (typeof cgpa !== 'number' || cgpa < 0 || cgpa > 10)) {
    return next(new AppError('CGPA must be between 0.00 and 10.00', 400));
  }
  if (req.body?.password !== undefined && req.body?.password !== null && req.body?.password !== '') {
    if (typeof req.body.password !== 'string' || req.body.password.trim().length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }
  }

  // 10th Standard Validations
  const {
    tenthObtainedMarks,
    tenthTotalMarks,
    tenthPercentage,
    twelfthObtainedMarks,
    twelfthTotalMarks,
    twelfthPercentage,
    ugCgpa,
    ugPercentage,
    pgCgpa,
    pgPercentage,
  } = body;

  if (tenthTotalMarks !== undefined && tenthTotalMarks !== null && tenthTotalMarks !== '') {
    const total = Number(tenthTotalMarks);
    if (isNaN(total) || total <= 0) {
      return next(new AppError('10th Total Marks must be greater than 0', 400));
    }
  }

  if (tenthObtainedMarks !== undefined && tenthObtainedMarks !== null && tenthObtainedMarks !== '') {
    const obtained = Number(tenthObtainedMarks);
    const total = tenthTotalMarks ? Number(tenthTotalMarks) : undefined;
    if (isNaN(obtained) || obtained < 0) {
      return next(new AppError('10th Marks Obtained must be 0 or greater', 400));
    }
    if (total !== undefined && !isNaN(total) && obtained > total) {
      return next(new AppError('10th Marks Obtained cannot exceed Total Marks', 400));
    }
  }

  if (tenthPercentage !== undefined && tenthPercentage !== null && tenthPercentage !== '') {
    const pct = Number(tenthPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return next(new AppError('10th Percentage must be between 0 and 100', 400));
    }
  }

  // 12th Standard Validations
  if (twelfthTotalMarks !== undefined && twelfthTotalMarks !== null && twelfthTotalMarks !== '') {
    const total = Number(twelfthTotalMarks);
    if (isNaN(total) || total <= 0) {
      return next(new AppError('12th Total Marks must be greater than 0', 400));
    }
  }

  if (twelfthObtainedMarks !== undefined && twelfthObtainedMarks !== null && twelfthObtainedMarks !== '') {
    const obtained = Number(twelfthObtainedMarks);
    const total = twelfthTotalMarks ? Number(twelfthTotalMarks) : undefined;
    if (isNaN(obtained) || obtained < 0) {
      return next(new AppError('12th Marks Obtained must be 0 or greater', 400));
    }
    if (total !== undefined && !isNaN(total) && obtained > total) {
      return next(new AppError('12th Marks Obtained cannot exceed Total Marks', 400));
    }
  }

  if (twelfthPercentage !== undefined && twelfthPercentage !== null && twelfthPercentage !== '') {
    const pct = Number(twelfthPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return next(new AppError('12th Percentage must be between 0 and 100', 400));
    }
  }

  // UG Validations
  if (ugCgpa !== undefined && ugCgpa !== null && ugCgpa !== '') {
    const cgpaVal = Number(ugCgpa);
    if (isNaN(cgpaVal) || cgpaVal < 0 || cgpaVal > 10) {
      return next(new AppError('UG CGPA must be between 0.00 and 10.00', 400));
    }
  }

  if (ugPercentage !== undefined && ugPercentage !== null && ugPercentage !== '') {
    const pct = Number(ugPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return next(new AppError('UG Percentage must be between 0 and 100', 400));
    }
  }

  // PG Validations (Optional)
  if (pgCgpa !== undefined && pgCgpa !== null && pgCgpa !== '') {
    const cgpaVal = Number(pgCgpa);
    if (isNaN(cgpaVal) || cgpaVal < 0 || cgpaVal > 10) {
      return next(new AppError('PG CGPA must be between 0.00 and 10.00', 400));
    }
  }

  if (pgPercentage !== undefined && pgPercentage !== null && pgPercentage !== '') {
    const pct = Number(pgPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return next(new AppError('PG Percentage must be between 0 and 100', 400));
    }
  }

  next();
};

export const validateStudentQuery = (req: Request, _res: Response, next: NextFunction): void => {
  const { page, limit, sortBy, sortOrder } = req.query;

  if (page !== undefined) {
    const p = Number(page);
    if (isNaN(p) || p < 1) {
      return next(new AppError('Query parameter "page" must be an integer >= 1', 400));
    }
  }

  if (limit !== undefined) {
    const l = Number(limit);
    if (isNaN(l) || l < 1 || l > 100) {
      return next(new AppError('Query parameter "limit" must be an integer between 1 and 100', 400));
    }
  }

  if (sortBy !== undefined) {
    const s = String(sortBy);
    if (!ALLOWED_SORT_FIELDS.includes(s)) {
      return next(
        new AppError(
          `Invalid sortBy parameter "${s}". Allowed fields: ${ALLOWED_SORT_FIELDS.join(', ')}`,
          400
        )
      );
    }
  }

  if (sortOrder !== undefined) {
    const o = String(sortOrder).toLowerCase();
    if (o !== 'asc' && o !== 'desc') {
      return next(new AppError('Query parameter "sortOrder" must be "asc" or "desc"', 400));
    }
  }

  next();
};
