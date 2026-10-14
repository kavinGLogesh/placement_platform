import { Router } from 'express';
import multer from 'multer';
import { managementController } from '../controllers/management.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import {
  validateCollegeInput,
  validateCollegeUpdateInput,
  validateDepartmentInput,
  validateCourseInput,
  validateClassInput,
  validateSectionInput,
  validateStudentInput,
  validateStudentQuery,
} from '../validators/management.validator.js';
import { AppError } from '../middleware/errorHandler.js';
import { academicController } from '../controllers/academic.controller.js';
import { resolveStudentId } from '../controllers/attempt.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
});

const marksheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const isAllowedExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype.toLowerCase()) || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF documents (.pdf) or image files (.png, .jpg, .jpeg, .webp) are allowed', 400));
    }
  },
});

const handleMarksheetUpload = (req: any, res: any, next: any) => {
  marksheetUpload.any()(req, res, (err: any) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

export const collegeRouter = Router();
export const departmentRouter = Router();
export const courseRouter = Router();
export const classRouter = Router();
export const sectionRouter = Router();
export const studentManagementRouter = Router();

// Enforce authentication & admin authorization for all management routes
const adminAuth = [authenticateToken, requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN)];

// =============================================================================
// 1. COLLEGES (/api/colleges)
// =============================================================================
collegeRouter.use(...adminAuth);
collegeRouter.get('/', managementController.getColleges);
collegeRouter.post('/', validateCollegeInput, managementController.createCollege);
collegeRouter.get('/:id', managementController.getCollegeById);
collegeRouter.put('/:id', validateCollegeUpdateInput, managementController.updateCollege);
collegeRouter.delete('/:id', managementController.deleteCollege);

// =============================================================================
// 2. DEPARTMENTS (/api/departments)
// =============================================================================
departmentRouter.use(...adminAuth);
departmentRouter.get('/', managementController.getDepartments);
departmentRouter.post('/', validateDepartmentInput, managementController.createDepartment);
departmentRouter.get('/:id', managementController.getDepartmentById);
departmentRouter.put('/:id', managementController.updateDepartment);
departmentRouter.delete('/:id', managementController.deleteDepartment);

// =============================================================================
// 3. COURSES (/api/courses)
// =============================================================================
courseRouter.use(...adminAuth);
courseRouter.get('/', managementController.getCourses);
courseRouter.post('/', validateCourseInput, managementController.createCourse);
courseRouter.get('/:id', managementController.getCourseById);
courseRouter.put('/:id', managementController.updateCourse);
courseRouter.delete('/:id', managementController.deleteCourse);

// =============================================================================
// 4. CLASSES (/api/classes)
// =============================================================================
classRouter.use(...adminAuth);
classRouter.get('/', managementController.getClasses);
classRouter.post('/', validateClassInput, managementController.createClass);
classRouter.get('/:id', managementController.getClassById);
classRouter.put('/:id', managementController.updateClass);
classRouter.delete('/:id', managementController.deleteClass);

// =============================================================================
// 5. SECTIONS (/api/sections)
// =============================================================================
sectionRouter.use(...adminAuth);
sectionRouter.get('/', managementController.getSections);
sectionRouter.post('/', validateSectionInput, managementController.createSection);
sectionRouter.get('/:id', managementController.getSectionById);
sectionRouter.put('/:id', managementController.updateSection);
sectionRouter.delete('/:id', managementController.deleteSection);

// =============================================================================
// 6. STUDENTS & BULK IMPORT (/api/students)
// =============================================================================

// Bulk import & templates (strictly admin only)
studentManagementRouter.post('/import', ...adminAuth, upload.single('file'), managementController.importStudents);
studentManagementRouter.get('/import/template', ...adminAuth, managementController.downloadTemplate);
studentManagementRouter.post('/import/error-report', ...adminAuth, managementController.downloadErrorReport);

// AI Student Import & Organization routes (strictly admin only)
studentManagementRouter.post('/ai-import/preview', ...adminAuth, upload.single('file'), managementController.getAiImportPreview);
studentManagementRouter.post('/ai-import/confirm', ...adminAuth, managementController.confirmAiImport);
studentManagementRouter.get('/import-history', ...adminAuth, managementController.getImportHistory);
studentManagementRouter.get('/import-history/:id', ...adminAuth, managementController.getImportHistoryById);

// Academic Records Excel Bulk Import (strictly admin only)
studentManagementRouter.post('/academic-records/bulk-import/preview', ...adminAuth, upload.single('file'), academicController.previewAcademicImport);
studentManagementRouter.post('/academic-records/bulk-import/confirm', ...adminAuth, academicController.confirmAcademicImport);

// Student self-profile endpoint (/api/students/me)
studentManagementRouter.get('/me', authenticateToken, requireRole(Role.STUDENT), async (req, res, next) => {
  try {
    const studentId = await resolveStudentId(req);
    req.params.id = studentId;
    return managementController.getStudentById(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Admin-only verified placement resume endpoints (SUPER_ADMIN, PLACEMENT_ADMIN)
studentManagementRouter.get('/:id/resume', ...adminAuth, managementController.getStudentResume);
studentManagementRouter.get('/:id/resume/download', ...adminAuth, managementController.downloadStudentResume);

// Single student lookup with strict ownership check
studentManagementRouter.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized: User not authenticated', 401);
    }
    const userRole = req.user.role;
    if (userRole === Role.SUPER_ADMIN || userRole === Role.PLACEMENT_ADMIN) {
      return managementController.getStudentById(req, res, next);
    }
    if (userRole === Role.STUDENT) {
      const studentId = await resolveStudentId(req);
      if (req.params.id === studentId) {
        return managementController.getStudentById(req, res, next);
      }
      throw new AppError("Forbidden: Role 'STUDENT' does not have permission to access other student records", 403);
    }
    throw new AppError(`Forbidden: Role '${userRole}' does not have permission to access this resource`, 403);
  } catch (error) {
    next(error);
  }
});

// Server-side paginated & filtered CRUD (strictly admin only)
studentManagementRouter.get('/', ...adminAuth, validateStudentQuery, managementController.getStudents);
studentManagementRouter.post('/', ...adminAuth, validateStudentInput, managementController.createStudent);
studentManagementRouter.put('/:id', ...adminAuth, managementController.updateStudent);
studentManagementRouter.delete('/:id', ...adminAuth, managementController.deleteStudent);
studentManagementRouter.post('/:id/reset-password', ...adminAuth, managementController.resetStudentPassword);

// Phase 10: Academic Records & Marksheets
studentManagementRouter.get('/:id/academic-records', authenticateToken, academicController.getAcademicRecord);
studentManagementRouter.put('/:id/academic-records', ...adminAuth, academicController.upsertAcademicRecord);
studentManagementRouter.post('/:id/academic-records/documents/:docType', ...adminAuth, handleMarksheetUpload, academicController.uploadMarksheet);
studentManagementRouter.get('/:id/academic-records/documents/:docType', authenticateToken, academicController.downloadMarksheet);

// Phase 10: Personal Email & Audit Logs (Admin)
studentManagementRouter.put('/:id/personal-email', ...adminAuth, academicController.adminUpdatePersonalEmail);
studentManagementRouter.get('/:id/audit-logs', ...adminAuth, academicController.getAuditLogs);

// Phase 11: Student Skills (Admin)
studentManagementRouter.get('/:id/skills', ...adminAuth, managementController.getStudentSkills);
studentManagementRouter.post('/:id/skills', ...adminAuth, managementController.addStudentSkill);
studentManagementRouter.put('/:id/skills/:skillId', ...adminAuth, managementController.updateStudentSkill);
studentManagementRouter.delete('/:id/skills/:skillId', ...adminAuth, managementController.deleteStudentSkill);


