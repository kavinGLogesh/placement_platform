import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '../types/auth.types';
import { codingController } from '../controllers/coding.controller';

export const codingRouter = Router({ mergeParams: true });

// Require authentication and STUDENT role
codingRouter.use(authenticateToken);
codingRouter.use(requireRole(Role.STUDENT));

// Detail of a specific submission
codingRouter.get('/submissions/:submissionId', codingController.getSubmissionDetail);

// Coding question data & actions
codingRouter.get('/:questionId', codingController.getCodingQuestion);
codingRouter.post('/:questionId/run', codingController.runCode);
codingRouter.post('/:questionId/submit', codingController.submitCode);
codingRouter.get('/:questionId/submissions', codingController.getSubmissions);
