-- AlterTable
ALTER TABLE `students` ADD COLUMN `personalEmail` VARCHAR(191) NULL,
    ADD COLUMN `isPersonalEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `personalEmailVerificationToken` VARCHAR(191) NULL,
    ADD COLUMN `personalEmailVerificationExpiry` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `students_personalEmail_key` ON `students`(`personalEmail`);

-- CreateIndex
CREATE INDEX `students_personalEmail_idx` ON `students`(`personalEmail`);

-- CreateTable
CREATE TABLE `student_academic_records` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `tenthBoard` VARCHAR(191) NULL,
    `tenthPassingYear` INTEGER NULL,
    `tenthTotalMarks` DOUBLE NULL,
    `tenthObtainedMarks` DOUBLE NULL,
    `tenthPercentage` DOUBLE NULL,
    `tenthMarksheetPath` VARCHAR(191) NULL,
    `tenthMarksheetName` VARCHAR(191) NULL,
    `tenthMarksheetMime` VARCHAR(191) NULL,
    `twelfthBoard` VARCHAR(191) NULL,
    `twelfthPassingYear` INTEGER NULL,
    `twelfthTotalMarks` DOUBLE NULL,
    `twelfthObtainedMarks` DOUBLE NULL,
    `twelfthPercentage` DOUBLE NULL,
    `twelfthMarksheetPath` VARCHAR(191) NULL,
    `twelfthMarksheetName` VARCHAR(191) NULL,
    `twelfthMarksheetMime` VARCHAR(191) NULL,
    `ugDegree` VARCHAR(191) NULL,
    `ugBranch` VARCHAR(191) NULL,
    `currentCgpa` DOUBLE NULL,
    `activeBacklogs` INTEGER NOT NULL DEFAULT 0,
    `historyOfBacklogs` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_academic_records_studentId_key`(`studentId`),
    INDEX `student_academic_records_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_semester_records` (
    `id` VARCHAR(191) NOT NULL,
    `academicRecordId` VARCHAR(191) NOT NULL,
    `semesterNumber` INTEGER NOT NULL,
    `sgpa` DOUBLE NULL,
    `cgpa` DOUBLE NULL,
    `totalCredits` DOUBLE NULL,
    `creditsEarned` DOUBLE NULL,
    `backlogsCount` INTEGER NOT NULL DEFAULT 0,
    `marksheetPath` VARCHAR(191) NULL,
    `marksheetName` VARCHAR(191) NULL,
    `marksheetMime` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `student_semester_records_academicRecordId_idx`(`academicRecordId`),
    UNIQUE INDEX `student_semester_records_academicRecordId_semesterNumber_key`(`academicRecordId`, `semesterNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `fieldChanged` VARCHAR(191) NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `details` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `student_audit_logs_studentId_idx`(`studentId`),
    INDEX `student_audit_logs_performedBy_idx`(`performedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_academic_records` ADD CONSTRAINT `student_academic_records_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_semester_records` ADD CONSTRAINT `student_semester_records_academicRecordId_fkey` FOREIGN KEY (`academicRecordId`) REFERENCES `student_academic_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_audit_logs` ADD CONSTRAINT `student_audit_logs_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
