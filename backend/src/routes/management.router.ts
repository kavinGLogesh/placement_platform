import { Router } from 'express';
import multer from 'multer';
import { managementController } from '../controllers/management.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import {
  validateCollegeInput,
  validateDepartmentInput,
  validateCourseInput,
  validateClassInput,
  validateSectionInput,
  validateStudentInput,
  validateStudentQuery,
} from '../validators/management.validator.js';
import { AppError } from '../middleware/errorHandler.js';
import { resolveStudentId } from '../controllers/attempt.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
});

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
collegeRouter.put('/:id', managementController.updateCollege);
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

