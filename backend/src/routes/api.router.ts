import { Router } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from './auth.router.js';
import { adminRouter, studentRouter } from './protected-test.router.js';
import {
  collegeRouter,
  departmentRouter,
  courseRouter,
  classRouter,
  sectionRouter,
  studentManagementRouter,
} from './management.router.js';
import { questionRouter } from './question.router.js';
import { assessmentRouter } from './assessment.router.js';
import { studentAssessmentRouter } from './student-assessment.router.js';
import { attemptRouter } from './attempt.router.js';
import { codingRouter } from './coding.router.js';
import { analyticsRouter, resultsRouter } from './analytics.router.js';

import { reportRouter } from './report.router.js';
import {
  gdAdminRouter,
  interviewAdminRouter,
  studentEvaluationRouter,
  evaluationsAdminRouter,
} from './evaluation.router.js';
import { companyRouter } from './company.router.js';
import { attendanceRouter } from './attendance.router.js';

export const apiRouter = Router();

// Company-wise Assessment module: Companies Directory & Management
apiRouter.use('/companies', companyRouter);

// Phase 1 System Health routes
apiRouter.use('/health', healthRouter);

// Phase 2 Authentication & RBAC routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/student', studentRouter);
apiRouter.use('/student', studentAssessmentRouter);

// Phase 3 Institutional Hierarchy & Student Management routes
apiRouter.use('/colleges', collegeRouter);
apiRouter.use('/departments', departmentRouter);
apiRouter.use('/courses', courseRouter);
apiRouter.use('/classes', classRouter);
apiRouter.use('/sections', sectionRouter);
apiRouter.use('/students', studentManagementRouter);

// Phase 4 Question Bank routes
apiRouter.use('/questions', questionRouter);

// Phase 5 Assessment Builder & Question Selection Engine routes
apiRouter.use('/assessments', assessmentRouter);

// Phase 6 Student Assessment Engine & Attempts routes
apiRouter.use('/attempts', attemptRouter);

// Phase 7 Coding Assessment & Secure Execution routes
apiRouter.use('/attempts/:attemptId/coding', codingRouter);
apiRouter.use('/student/attempts/:attemptId/coding', codingRouter);

// Phase 8 Results, Analytics & Dashboards routes
apiRouter.use('/results', resultsRouter);
apiRouter.use('/analytics', analyticsRouter);

// Phase 9 Reports, Export & Printing routes
apiRouter.use('/reports', reportRouter);

// Phase 10 Structured GD + Interview Evaluation routes
apiRouter.use('/gd', gdAdminRouter);
apiRouter.use('/interviews', interviewAdminRouter);
apiRouter.use('/student/evaluations', studentEvaluationRouter);
apiRouter.use('/evaluations', evaluationsAdminRouter);

// Phase 11 Assessment Attendance & Follow-up Automation routes
apiRouter.use('/attendance', attendanceRouter);


