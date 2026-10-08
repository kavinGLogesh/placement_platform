import { Router } from 'express';
import multer from 'multer';
import { companyController } from '../controllers/company.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '../types/auth.types.js';
import {
  validateCreateCompany,
  validateUpdateCompany,
  validateCompanyQuery,
} from '../validators/company.validator.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const companyRouter = Router();

// All company routes require authentication
companyRouter.use(authenticateToken);

// Duplicate review candidate management (placed before /:id to avoid collision)
companyRouter.get(
  '/duplicates',
  requireRole(Role.PLACEMENT_ADMIN),
  companyController.getDuplicateCandidates
);

companyRouter.patch(
  '/duplicates/:candidateId',
  requireRole(Role.PLACEMENT_ADMIN),
  companyController.resolveDuplicateCandidate
);

// Read companies: open to PLACEMENT_ADMIN, SUPER_ADMIN, and STUDENT (for practice assessment directory & filters)
companyRouter.get(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN, Role.STUDENT),
  validateCompanyQuery,
  companyController.getCompanies
);

companyRouter.get(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN, Role.STUDENT),
  companyController.getCompanyById
);

// Company Question Intelligence (SUPER_ADMIN read-only monitoring and PLACEMENT_ADMIN)
companyRouter.get(
  '/:id/intelligence',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  companyController.getCompanyIntelligence
);

// Company Questions list with filters
companyRouter.get(
  '/:id/questions',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  companyController.getCompanyQuestions
);

// Company-Specific Question Upload (Strictly PLACEMENT_ADMIN authoring)
companyRouter.post(
  '/:id/questions/upload',
  requireRole(Role.PLACEMENT_ADMIN),
  upload.single('file'),
  companyController.uploadCompanyQuestions
);

// Company duplicate review per company
companyRouter.get(
  '/:id/duplicates',
  requireRole(Role.PLACEMENT_ADMIN),
  companyController.getDuplicateCandidates
);

// Company activation/deactivation status toggle
companyRouter.patch(
  '/:id/status',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  companyController.updateCompanyStatus
);

// Manage companies: restricted to operational PLACEMENT_ADMIN and SUPER_ADMIN
companyRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  validateCreateCompany,
  companyController.createCompany
);

companyRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  validateUpdateCompany,
  companyController.updateCompany
);

companyRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PLACEMENT_ADMIN),
  companyController.deleteCompany
);
