-- AlterTable
ALTER TABLE `assessments` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD COLUMN `isCompanyAssessment` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `questions` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD COLUMN `exactHash` VARCHAR(64) NULL,
    ADD COLUMN `imageUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `students` ADD COLUMN `dob` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_questions` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NULL,
    `year` INTEGER NULL,
    `occurrenceCount` INTEGER NOT NULL DEFAULT 1,
    `label` VARCHAR(64) NOT NULL DEFAULT 'Company Tagged',
    `isReported` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `company_questions_companyId_idx`(`companyId`),
    INDEX `company_questions_questionId_idx`(`questionId`),
    INDEX `company_questions_year_idx`(`year`),
    INDEX `company_questions_label_idx`(`label`),
    UNIQUE INDEX `company_questions_companyId_questionId_key`(`companyId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_duplicate_candidates` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `originalQuestionId` VARCHAR(191) NOT NULL,
    `candidateQuestionId` VARCHAR(191) NULL,
    `candidateText` TEXT NOT NULL,
    `similarityScore` DOUBLE NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `question_duplicate_candidates_companyId_idx`(`companyId`),
    INDEX `question_duplicate_candidates_originalQuestionId_idx`(`originalQuestionId`),
    INDEX `question_duplicate_candidates_candidateQuestionId_idx`(`candidateQuestionId`),
    INDEX `question_duplicate_candidates_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_ai_classifications` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `suggestedCategory` ENUM('QUANTITATIVE_APTITUDE', 'LOGICAL_REASONING', 'VERBAL_ABILITY', 'TECHNICAL_MCQ', 'CODING') NOT NULL,
    `suggestedTopic` VARCHAR(191) NOT NULL,
    `suggestedDifficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    `suggestedQuestionType` ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'DESCRIPTIVE') NOT NULL,
    `categoryConfidence` DOUBLE NOT NULL DEFAULT 0.0,
    `topicConfidence` DOUBLE NOT NULL DEFAULT 0.0,
    `difficultyConfidence` DOUBLE NOT NULL DEFAULT 0.0,
    `typeConfidence` DOUBLE NOT NULL DEFAULT 0.0,
    `overallConfidence` DOUBLE NOT NULL DEFAULT 0.0,
    `reasoning` TEXT NULL,
    `status` ENUM('AI_PENDING', 'CLASSIFIED', 'NEEDS_REVIEW', 'AI_FAILED') NOT NULL DEFAULT 'AI_PENDING',
    `rawAiResponse` TEXT NULL,
    `errorMessage` TEXT NULL,
    `modelName` VARCHAR(64) NULL,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `question_ai_classifications_questionId_key`(`questionId`),
    INDEX `question_ai_classifications_questionId_idx`(`questionId`),
    INDEX `question_ai_classifications_status_idx`(`status`),
    INDEX `question_ai_classifications_isApproved_idx`(`isApproved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gd_rounds` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `topic` TEXT NOT NULL,
    `instructions` TEXT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 30,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `evaluatorId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `courseId` VARCHAR(191) NULL,
    `batchYear` INTEGER NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gd_rounds_status_idx`(`status`),
    INDEX `gd_rounds_evaluatorId_idx`(`evaluatorId`),
    INDEX `gd_rounds_scheduledDate_idx`(`scheduledDate`),
    INDEX `gd_rounds_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gd_criteria` (
    `id` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxMarks` DOUBLE NOT NULL DEFAULT 10.0,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gd_criteria_roundId_idx`(`roundId`),
    UNIQUE INDEX `gd_criteria_roundId_name_key`(`roundId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gd_participants` (
    `id` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `attendance` ENUM('PRESENT', 'ABSENT', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gd_participants_roundId_idx`(`roundId`),
    INDEX `gd_participants_studentId_idx`(`studentId`),
    INDEX `gd_participants_attendance_idx`(`attendance`),
    UNIQUE INDEX `gd_participants_roundId_studentId_key`(`roundId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gd_evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `evaluatorId` VARCHAR(191) NOT NULL,
    `totalScore` DOUBLE NOT NULL,
    `maxPossibleMarks` DOUBLE NOT NULL,
    `percentage` DOUBLE NOT NULL,
    `feedback` TEXT NULL,
    `status` ENUM('PENDING', 'DRAFT', 'EVALUATED') NOT NULL DEFAULT 'EVALUATED',
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `gd_evaluations_participantId_key`(`participantId`),
    INDEX `gd_evaluations_evaluatorId_idx`(`evaluatorId`),
    INDEX `gd_evaluations_evaluatedAt_idx`(`evaluatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gd_criterion_scores` (
    `id` VARCHAR(191) NOT NULL,
    `evaluationId` VARCHAR(191) NOT NULL,
    `criterionId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `maxMarks` DOUBLE NOT NULL,
    `comment` TEXT NULL,

    INDEX `gd_criterion_scores_evaluationId_idx`(`evaluationId`),
    INDEX `gd_criterion_scores_criterionId_idx`(`criterionId`),
    UNIQUE INDEX `gd_criterion_scores_evaluationId_criterionId_key`(`evaluationId`, `criterionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_rounds` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `interviewType` ENUM('MOCK', 'HR', 'TECHNICAL', 'MANAGERIAL') NOT NULL DEFAULT 'TECHNICAL',
    `instructions` TEXT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 30,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `evaluatorId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `courseId` VARCHAR(191) NULL,
    `batchYear` INTEGER NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `interview_rounds_status_idx`(`status`),
    INDEX `interview_rounds_interviewType_idx`(`interviewType`),
    INDEX `interview_rounds_evaluatorId_idx`(`evaluatorId`),
    INDEX `interview_rounds_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_criteria` (
    `id` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxMarks` DOUBLE NOT NULL DEFAULT 10.0,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `interview_criteria_roundId_idx`(`roundId`),
    UNIQUE INDEX `interview_criteria_roundId_name_key`(`roundId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_participants` (
    `id` VARCHAR(191) NOT NULL,
    `roundId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `attendance` ENUM('PRESENT', 'ABSENT', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `interview_participants_roundId_idx`(`roundId`),
    INDEX `interview_participants_studentId_idx`(`studentId`),
    INDEX `interview_participants_attendance_idx`(`attendance`),
    UNIQUE INDEX `interview_participants_roundId_studentId_key`(`roundId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `evaluatorId` VARCHAR(191) NOT NULL,
    `totalScore` DOUBLE NOT NULL,
    `maxPossibleMarks` DOUBLE NOT NULL,
    `percentage` DOUBLE NOT NULL,
    `strengths` TEXT NULL,
    `areasForImprovement` TEXT NULL,
    `overallFeedback` TEXT NULL,
    `status` ENUM('PENDING', 'DRAFT', 'EVALUATED') NOT NULL DEFAULT 'EVALUATED',
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `interview_evaluations_participantId_key`(`participantId`),
    INDEX `interview_evaluations_evaluatorId_idx`(`evaluatorId`),
    INDEX `interview_evaluations_evaluatedAt_idx`(`evaluatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_criterion_scores` (
    `id` VARCHAR(191) NOT NULL,
    `evaluationId` VARCHAR(191) NOT NULL,
    `criterionId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `maxMarks` DOUBLE NOT NULL,
    `comment` TEXT NULL,

    INDEX `interview_criterion_scores_evaluationId_idx`(`evaluationId`),
    INDEX `interview_criterion_scores_criterionId_idx`(`criterionId`),
    UNIQUE INDEX `interview_criterion_scores_evaluationId_criterionId_key`(`evaluationId`, `criterionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `assessmentTitle` VARCHAR(191) NOT NULL,
    `notAttendedCount` INTEGER NOT NULL,
    `assignedCount` INTEGER NOT NULL,
    `alertMessage` TEXT NOT NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `reminderSentCount` INTEGER NOT NULL DEFAULT 0,
    `lastReminderAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendance_notifications_assessmentId_key`(`assessmentId`),
    INDEX `attendance_notifications_isResolved_idx`(`isResolved`),
    INDEX `attendance_notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `emailType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `subject` VARCHAR(191) NOT NULL,
    `messageBody` TEXT NOT NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_email_logs_assessmentId_idx`(`assessmentId`),
    INDEX `attendance_email_logs_studentId_idx`(`studentId`),
    INDEX `attendance_email_logs_emailType_idx`(`emailType`),
    INDEX `attendance_email_logs_sentAt_idx`(`sentAt`),
    UNIQUE INDEX `attendance_email_logs_assessmentId_studentId_emailType_key`(`assessmentId`, `studentId`, `emailType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_automation_configs` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `isEmailReminderEnabled` BOOLEAN NOT NULL DEFAULT true,
    `autoClosureReminder` BOOLEAN NOT NULL DEFAULT false,
    `sendClosingSoonReminder` BOOLEAN NOT NULL DEFAULT false,
    `closingSoonHours` INTEGER NOT NULL DEFAULT 2,
    `reminderSubjectTemplate` VARCHAR(191) NULL,
    `reminderBodyTemplate` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendance_automation_configs_assessmentId_key`(`assessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_import_history` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `uploadedByEmail` VARCHAR(191) NOT NULL,
    `totalRecords` INTEGER NOT NULL,
    `importedCount` INTEGER NOT NULL,
    `duplicateCount` INTEGER NOT NULL,
    `invalidCount` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `detailsJson` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `assessments_companyId_idx` ON `assessments`(`companyId`);

-- CreateIndex
CREATE INDEX `assessments_isCompanyAssessment_idx` ON `assessments`(`isCompanyAssessment`);

-- CreateIndex
CREATE INDEX `questions_companyId_idx` ON `questions`(`companyId`);

-- CreateIndex
CREATE INDEX `questions_exactHash_idx` ON `questions`(`exactHash`);

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_questions` ADD CONSTRAINT `company_questions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_questions` ADD CONSTRAINT `company_questions_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_duplicate_candidates` ADD CONSTRAINT `question_duplicate_candidates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_duplicate_candidates` ADD CONSTRAINT `question_duplicate_candidates_originalQuestionId_fkey` FOREIGN KEY (`originalQuestionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_duplicate_candidates` ADD CONSTRAINT `question_duplicate_candidates_candidateQuestionId_fkey` FOREIGN KEY (`candidateQuestionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_ai_classifications` ADD CONSTRAINT `question_ai_classifications_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_ai_classifications` ADD CONSTRAINT `question_ai_classifications_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_rounds` ADD CONSTRAINT `gd_rounds_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_rounds` ADD CONSTRAINT `gd_rounds_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_rounds` ADD CONSTRAINT `gd_rounds_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_rounds` ADD CONSTRAINT `gd_rounds_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_criteria` ADD CONSTRAINT `gd_criteria_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `gd_rounds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_participants` ADD CONSTRAINT `gd_participants_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `gd_rounds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_participants` ADD CONSTRAINT `gd_participants_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_evaluations` ADD CONSTRAINT `gd_evaluations_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `gd_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_evaluations` ADD CONSTRAINT `gd_evaluations_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_criterion_scores` ADD CONSTRAINT `gd_criterion_scores_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `gd_evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gd_criterion_scores` ADD CONSTRAINT `gd_criterion_scores_criterionId_fkey` FOREIGN KEY (`criterionId`) REFERENCES `gd_criteria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_rounds` ADD CONSTRAINT `interview_rounds_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_rounds` ADD CONSTRAINT `interview_rounds_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_rounds` ADD CONSTRAINT `interview_rounds_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_rounds` ADD CONSTRAINT `interview_rounds_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_criteria` ADD CONSTRAINT `interview_criteria_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `interview_rounds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_participants` ADD CONSTRAINT `interview_participants_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `interview_rounds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_participants` ADD CONSTRAINT `interview_participants_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_evaluations` ADD CONSTRAINT `interview_evaluations_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `interview_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_evaluations` ADD CONSTRAINT `interview_evaluations_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_criterion_scores` ADD CONSTRAINT `interview_criterion_scores_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `interview_evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_criterion_scores` ADD CONSTRAINT `interview_criterion_scores_criterionId_fkey` FOREIGN KEY (`criterionId`) REFERENCES `interview_criteria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_notifications` ADD CONSTRAINT `attendance_notifications_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_email_logs` ADD CONSTRAINT `attendance_email_logs_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_email_logs` ADD CONSTRAINT `attendance_email_logs_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_automation_configs` ADD CONSTRAINT `attendance_automation_configs_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
