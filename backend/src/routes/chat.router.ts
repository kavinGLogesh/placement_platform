import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { chatController } from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';

export const chatRouter = Router();

// -----------------------------------------------------------------------------
// CHAT ATTACHMENTS STORAGE CONFIGURATION
// -----------------------------------------------------------------------------
const chatUploadDir = path.resolve(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
]);

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max attachment
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('File format not supported for chat attachment', 400));
    }
  },
});

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// SSE stream (supports ?token=... for EventSource or standard Bearer header)
chatRouter.get('/stream', (req, res, next) => {
  chatController.streamChatEvents(req, res, next);
});

// Authenticated Endpoints
chatRouter.use(authenticateToken);

// Group Management
chatRouter.get('/groups', (req, res, next) => chatController.getGroups(req, res, next));
chatRouter.post('/groups', (req, res, next) => chatController.createGroup(req, res, next));
chatRouter.get('/groups/:groupId', (req, res, next) => chatController.getGroupDetails(req, res, next));
chatRouter.put('/groups/:groupId', (req, res, next) => chatController.updateGroup(req, res, next));
chatRouter.delete('/groups/:groupId', (req, res, next) => chatController.deleteGroup(req, res, next));

// Department Mapping & Membership Synchronization
chatRouter.post('/groups/:groupId/departments', (req, res, next) =>
  chatController.addDepartment(req, res, next)
);
chatRouter.delete('/groups/:groupId/departments/:departmentId', (req, res, next) =>
  chatController.removeDepartment(req, res, next)
);
chatRouter.post('/groups/:groupId/departments/sync', (req, res, next) =>
  chatController.syncDepartments(req, res, next)
);

// Member Management
chatRouter.get('/groups/:groupId/members', (req, res, next) =>
  chatController.getMembers(req, res, next)
);
chatRouter.post('/groups/:groupId/members', (req, res, next) =>
  chatController.addMembers(req, res, next)
);
chatRouter.delete('/groups/:groupId/members/:userId', (req, res, next) =>
  chatController.removeMember(req, res, next)
);

// Messages & Read Receipts
chatRouter.get('/groups/:groupId/messages', (req, res, next) =>
  chatController.getMessages(req, res, next)
);
chatRouter.post('/groups/:groupId/messages', (req, res, next) =>
  chatController.sendMessage(req, res, next)
);
chatRouter.post('/groups/:groupId/read', (req, res, next) =>
  chatController.markAsRead(req, res, next)
);

// Attachments Upload
chatRouter.post('/upload', chatUpload.single('file'), (req, res, next) =>
  chatController.uploadAttachment(req, res, next)
);

// Utility lookups for Admin Group Creation
chatRouter.get('/departments', (req, res, next) =>
  chatController.getDepartments(req, res, next)
);
chatRouter.get('/users', (req, res, next) =>
  chatController.searchUsers(req, res, next)
);

