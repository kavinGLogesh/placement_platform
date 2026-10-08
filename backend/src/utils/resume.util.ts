import fs from 'fs';
import path from 'path';
import { StudentResumeMetadataDto } from '../types/analytics.types.js';

export const resumeUploadDir = path.resolve(process.cwd(), 'uploads', 'resumes');
if (!fs.existsSync(resumeUploadDir)) {
  fs.mkdirSync(resumeUploadDir, { recursive: true });
}

export const getResumeFilePath = (studentId: string): string => {
  return path.join(resumeUploadDir, `${studentId}_resume.pdf`);
};

export const getResumeMetaFilePath = (studentId: string): string => {
  return path.join(resumeUploadDir, `${studentId}_meta.json`);
};

export const getStudentResumeDetails = (
  studentId: string,
  registerNumber?: string,
  defaultDate?: string | Date
): StudentResumeMetadataDto => {
  const resumeFile = getResumeFilePath(studentId);
  const metaFile = getResumeMetaFilePath(studentId);

  if (!fs.existsSync(resumeFile)) {
    return {
      exists: false,
      status: 'NOT_UPLOADED',
      fileUrl: null,
      message: 'No verified placement resume uploaded.',
    };
  }

  let fileName = registerNumber ? `${registerNumber}_Resume.pdf` : 'Resume.pdf';
  let uploadedAt = defaultDate ? new Date(defaultDate).toISOString() : new Date().toISOString();
  let status = 'VERIFIED';
  let fileSize = '245 KB';

  if (fs.existsSync(metaFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      if (meta.studentId && meta.studentId !== studentId) {
        // IDOR mismatch safeguard
        return {
          exists: false,
          status: 'NOT_UPLOADED',
          fileUrl: null,
          message: 'No verified placement resume uploaded.',
        };
      }
      if (meta.fileName) fileName = meta.fileName;
      if (meta.uploadedAt) uploadedAt = meta.uploadedAt;
      if (meta.status) status = meta.status;
      if (meta.fileSize) fileSize = meta.fileSize;
    } catch {
      // fallback
    }
  } else {
    try {
      const stat = fs.statSync(resumeFile);
      uploadedAt = stat.mtime.toISOString();
      fileSize =
        stat.size > 1024 * 1024
          ? `${(stat.size / (1024 * 1024)).toFixed(2)} MB`
          : `${(stat.size / 1024).toFixed(1)} KB`;
    } catch {
      // fallback
    }
  }

  return {
    exists: true,
    fileName,
    fileUrl: `/api/students/${studentId}/resume/download`,
    uploadedAt,
    status,
    fileSize,
  };
};
