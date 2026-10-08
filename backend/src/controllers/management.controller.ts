import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ManagementService, managementService } from '../services/management.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateErrorReportCsv, generateTemplateExcelBuffer } from '../utils/excel.util.js';
import { ExcelImportRowError, StudentQueryFilters } from '../types/management.types.js';
import {
  getStudentResumeDetails,
  getResumeFilePath,
  getResumeMetaFilePath,
} from '../utils/resume.util.js';
import { aiStudentImportService } from '../services/ai/ai-student-import.service.js';

export class ManagementController {
  constructor(private readonly service: ManagementService = managementService) {}

  // ===========================================================================
  // 1. COLLEGE
  // ===========================================================================
  createCollege = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createCollege(req.body);
      sendSuccess(res, 'College created successfully', data, 201);
    } catch (error) {
      next(error);
    }
  };

  getColleges = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getColleges();
      sendSuccess(res, 'Colleges retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  getCollegeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getCollegeById(id);
      sendSuccess(res, 'College details retrieved', data);
    } catch (error) {
      next(error);
    }
  };

  updateCollege = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.updateCollege(id, req.body);
      sendSuccess(res, 'College updated successfully', data);
    } catch (error) {
      next(error);
    }
  };

  deleteCollege = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteCollege(id);
      sendSuccess(res, 'College deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 2. DEPARTMENT
  // ===========================================================================
  createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createDepartment(req.body);
      sendSuccess(res, 'Department created successfully', data, 201);
    } catch (error) {
      next(error);
    }
  };

  getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const collegeId = req.query.collegeId ? String(req.query.collegeId) : undefined;
      const data = await this.service.getDepartments(collegeId);
      sendSuccess(res, 'Departments retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  getDepartmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getDepartmentById(id);
      sendSuccess(res, 'Department details retrieved', data);
    } catch (error) {
      next(error);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.updateDepartment(id, req.body);
      sendSuccess(res, 'Department updated successfully', data);
    } catch (error) {
      next(error);
    }
  };

  deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteDepartment(id);
      sendSuccess(res, 'Department deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 3. COURSE
  // ===========================================================================
  createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createCourse(req.body);
      sendSuccess(res, 'Course created successfully', data, 201);
    } catch (error) {
      next(error);
    }
  };

  getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
      const data = await this.service.getCourses(departmentId);
      sendSuccess(res, 'Courses retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  getCourseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getCourseById(id);
      sendSuccess(res, 'Course details retrieved', data);
    } catch (error) {
      next(error);
    }
  };

  updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.updateCourse(id, req.body);
      sendSuccess(res, 'Course updated successfully', data);
    } catch (error) {
      next(error);
    }
  };

  deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteCourse(id);
      sendSuccess(res, 'Course deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 4. CLASS
  // ===========================================================================
  createClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createClass(req.body);
      sendSuccess(res, 'Class created successfully', data, 201);
    } catch (error) {
      next(error);
    }
  };

  getClasses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = req.query.courseId ? String(req.query.courseId) : undefined;
      const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
      const data = await this.service.getClasses(courseId, departmentId);
      sendSuccess(res, 'Classes retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  getClassById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getClassById(id);
      sendSuccess(res, 'Class details retrieved', data);
    } catch (error) {
      next(error);
    }
  };

  updateClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.updateClass(id, req.body);
      sendSuccess(res, 'Class updated successfully', data);
    } catch (error) {
      next(error);
    }
  };

  deleteClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteClass(id);
      sendSuccess(res, 'Class deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 5. SECTION
  // ===========================================================================
  createSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createSection(req.body);
      sendSuccess(res, 'Section created successfully', data, 201);
    } catch (error) {
      next(error);
    }
  };

  getSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const classId = req.query.classId ? String(req.query.classId) : undefined;
      const data = await this.service.getSections(classId);
      sendSuccess(res, 'Sections retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  };

  getSectionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getSectionById(id);
      sendSuccess(res, 'Section details retrieved', data);
    } catch (error) {
      next(error);
    }
  };

  updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.updateSection(id, req.body);
      sendSuccess(res, 'Section updated successfully', data);
    } catch (error) {
      next(error);
    }
  };

  deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteSection(id);
      sendSuccess(res, 'Section deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 6. STUDENT CRUD & SERVER-SIDE PAGINATION/FILTERS
  // ===========================================================================
  createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.createStudent(req.body);
      sendSuccess(res, 'Student created successfully', data, 201);
    } catch (error) {
      next(error);
    }
  };

  getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: StudentQueryFilters = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        courseId: req.query.courseId ? String(req.query.courseId) : undefined,
        classId: req.query.classId ? String(req.query.classId) : undefined,
        sectionId: req.query.sectionId ? String(req.query.sectionId) : undefined,
        year: req.query.year ? Number(req.query.year) : undefined,
        status: req.query.status as StudentQueryFilters['status'],
        sortBy: req.query.sortBy as StudentQueryFilters['sortBy'],
        sortOrder: req.query.sortOrder as StudentQueryFilters['sortOrder'],
      };
      const result = await this.service.getStudents(filters);
      sendSuccess(res, 'Students retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  };

  getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getStudentById(id);
      sendSuccess(res, 'Student details retrieved', data);
    } catch (error) {
      next(error);
    }
  };

  getStudentResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const student = await this.service.getStudentById(id);
      const resume = getStudentResumeDetails(student.id, student.registerNumber, student.updatedAt);
      sendSuccess(res, 'Student resume details retrieved', resume);
    } catch (error) {
      next(error);
    }
  };

  downloadStudentResume = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const student = await this.service.getStudentById(id);
      const resumeFile = getResumeFilePath(student.id);

      if (!fs.existsSync(resumeFile)) {
        throw new AppError('No verified placement resume uploaded.', 404);
      }

      const metaFile = getResumeMetaFilePath(student.id);
      let downloadName = `${student.registerNumber}_Resume.pdf`;
      if (fs.existsSync(metaFile)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
          if (meta.studentId && meta.studentId !== student.id) {
            throw new AppError('Unauthorized: Resume ownership mismatch', 403);
          }
          if (meta.fileName) downloadName = meta.fileName;
        } catch (e) {
          if (e instanceof AppError) throw e;
        }
      }

      const stat = fs.statSync(resumeFile);
      const inline = req.query.inline === 'true';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader(
        'Content-Disposition',
        `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(downloadName)}"`
      );

      const stream = fs.createReadStream(resumeFile);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  };

  updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.updateStudent(id, req.body);
      sendSuccess(res, 'Student updated successfully', data);
    } catch (error) {
      next(error);
    }
  };

  deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteStudent(id);
      sendSuccess(res, 'Student deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  resetStudentPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const data = await this.service.resetStudentPassword(id);
      sendSuccess(res, 'Student password reset successfully', data, 200);
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 7. EXCEL BULK IMPORT & REPORTING
  // ===========================================================================
  importStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file || !req.file.buffer) {
        throw new AppError('No file uploaded. Please upload a valid .xlsx, .xls, or .csv file.', 400);
      }

      const result = await this.service.importStudentsFromExcel(req.file.buffer);
      sendSuccess(res, 'Bulk import completed', result, 200);
    } catch (error) {
      next(error);
    }
  };

  downloadTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buffer = generateTemplateExcelBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Students_Import_Template.xlsx"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  downloadErrorReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: ExcelImportRowError[] = req.body?.errors || [];
      const csvContent = generateErrorReportCsv(errors);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="Import_Errors_Report.csv"');
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  };

  // ===========================================================================
  // 8. AI STUDENT IMPORT & ORGANIZATION
  // ===========================================================================
  getAiImportPreview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file || !req.file.buffer) {
        throw new AppError('No file uploaded. Please upload a valid .xlsx, .xls, or .csv file.', 400);
      }
      const preview = await aiStudentImportService.generateImportPreview(
        req.file.buffer,
        req.file.originalname || 'students_upload.xlsx'
      );
      sendSuccess(res, 'AI student import preview generated', preview, 200);
    } catch (error) {
      next(error);
    }
  };

  confirmAiImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { importSessionId, fileName, selectedStudentIds, skipDuplicates } = req.body || {};
      if (!importSessionId) {
        throw new AppError('importSessionId is required', 400);
      }
      const adminEmail = (req as any).user?.email || 'admin@placement.edu';
      const result = await aiStudentImportService.confirmImport(
        { importSessionId, fileName, selectedStudentIds, skipDuplicates },
        adminEmail
      );
      sendSuccess(res, 'AI student import confirmed and completed', result, 201);
    } catch (error) {
      next(error);
    }
  };

  getImportHistory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await aiStudentImportService.getImportHistory();
      sendSuccess(res, 'Student import history retrieved', history, 200);
    } catch (error) {
      next(error);
    }
  };

  getImportHistoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const record = await aiStudentImportService.getImportHistoryById(id);
      if (!record) {
        throw new AppError('Import history record not found', 404);
      }
      sendSuccess(res, 'Import history record retrieved', record, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const managementController = new ManagementController();

