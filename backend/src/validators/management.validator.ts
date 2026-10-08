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
  const {
    registerNumber,
    name,
    collegeEmail,
    departmentId,
    courseId,
    classId,
    sectionId,
    year,
    cgpa,
  } = req.body || {};

  if (!registerNumber || typeof registerNumber !== 'string' || !registerNumber.trim()) {
    return next(new AppError('Register Number is required', 400));
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Student name is required', 400));
  }
  if (!collegeEmail || typeof collegeEmail !== 'string' || !EMAIL_REGEX.test(collegeEmail.trim())) {
    return next(new AppError('Valid College Email is required', 400));
  }
  if (departmentId !== undefined && (typeof departmentId !== 'string' || !departmentId.trim())) {
    return next(new AppError('Invalid Department ID', 400));
  }
  if (courseId !== undefined && (typeof courseId !== 'string' || !courseId.trim())) {
    return next(new AppError('Invalid Course ID', 400));
  }
  if (classId !== undefined && (typeof classId !== 'string' || !classId.trim())) {
    return next(new AppError('Invalid Class ID', 400));
  }
  if (sectionId !== undefined && (typeof sectionId !== 'string' || !sectionId.trim())) {
    return next(new AppError('Invalid Section ID', 400));
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
