import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';

export const assessmentRouter = Router();

// Assessment builder & operational management routes are strictly restricted to PLACEMENT_ADMIN
assessmentRouter.use(authenticateToken);
assessmentRouter.use(requireRole(Role.PLACEMENT_ADMIN));

// Assessment CRUD
assessmentRouter.post('/', assessmentController.createAssessment);
assessmentRouter.get('/', assessmentController.getAssessments);
assessmentRouter.get('/:id', assessmentController.getAssessmentById);
assessmentRouter.put('/:id', assessmentController.updateAssessment);
assessmentRouter.delete('/:id', assessmentController.deleteAssessment);

// Selection Engine & Paper Generation
assessmentRouter.post('/:id/generate', assessmentController.generatePapers);
assessmentRouter.post('/:id/generate-papers', assessmentController.generatePapers);
assessmentRouter.get('/:id/papers', assessmentController.getAssessmentPapers);

// Lifecycle & Scheduling
assessmentRouter.post('/:id/publish', assessmentController.publishAssessment);
assessmentRouter.patch('/:id/publish', assessmentController.publishAssessment);
assessmentRouter.post('/:id/unpublish', assessmentController.unpublishAssessment);
assessmentRouter.patch('/:id/schedule', assessmentController.scheduleAssessment);

// Student Assignment
assessmentRouter.post('/:id/assign', assessmentController.assignStudents);
assessmentRouter.get('/:id/assignments', assessmentController.getAssessmentAssignments);
