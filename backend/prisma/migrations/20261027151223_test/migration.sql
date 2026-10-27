-- AlterTable
ALTER TABLE `student_academic_records` ADD COLUMN `currentSemester` INTEGER NULL DEFAULT 1,
    ADD COLUMN `degreeLevel` VARCHAR(191) NULL DEFAULT 'UG',
    ADD COLUMN `overallPercentage` DOUBLE NULL,
    ADD COLUMN `pgCgpa` DOUBLE NULL,
    ADD COLUMN `pgDegree` VARCHAR(191) NULL,
    ADD COLUMN `pgPercentage` DOUBLE NULL,
    ADD COLUMN `pgStatus` VARCHAR(191) NULL,
    ADD COLUMN `studyStatus` VARCHAR(191) NULL DEFAULT 'STUDYING',
    ADD COLUMN `ugCgpa` DOUBLE NULL,
    ADD COLUMN `ugPercentage` DOUBLE NULL,
    ADD COLUMN `ugStatus` VARCHAR(191) NULL DEFAULT 'STUDYING';

-- CreateTable
CREATE TABLE `student_skills` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'TECHNICAL',
    `level` VARCHAR(191) NOT NULL DEFAULT 'INTERMEDIATE',
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `student_skills_studentId_idx`(`studentId`),
    UNIQUE INDEX `student_skills_studentId_name_key`(`studentId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placement_drives` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `jobRole` VARCHAR(191) NOT NULL,
    `jobDescription` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `packageDetails` VARCHAR(191) NULL,
    `vacancies` INTEGER NULL DEFAULT 1,
    `driveDate` DATETIME(3) NOT NULL,
    `registrationDeadline` DATETIME(3) NOT NULL,
    `status` ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
    `minTenthPercentage` DOUBLE NULL,
    `minTwelfthPercentage` DOUBLE NULL,
    `minCgpa` DOUBLE NULL,
    `maxActiveBacklogs` INTEGER NULL DEFAULT 0,
    `eligibleDepartments` JSON NULL,
    `eligibleBatchYears` JSON NULL,
    `requiredSkills` JSON NULL,
    `selectionProcess` JSON NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `placement_drives_status_idx`(`status`),
    INDEX `placement_drives_driveDate_idx`(`driveDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drive_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `driveId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `registeredBy` VARCHAR(191) NOT NULL,
    `currentStage` ENUM('REGISTERED', 'ASSESSMENT_SHORTLISTED', 'TECHNICAL_ROUND', 'HR_ROUND', 'SELECTED', 'REJECTED', 'OPTED_OUT') NOT NULL DEFAULT 'REGISTERED',
    `stageRemarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drive_registrations_driveId_idx`(`driveId`),
    INDEX `drive_registrations_studentId_idx`(`studentId`),
    INDEX `drive_registrations_currentStage_idx`(`currentStage`),
    UNIQUE INDEX `drive_registrations_driveId_studentId_key`(`driveId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_skills` ADD CONSTRAINT `student_skills_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_drives` ADD CONSTRAINT `placement_drives_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drive_registrations` ADD CONSTRAINT `drive_registrations_driveId_fkey` FOREIGN KEY (`driveId`) REFERENCES `placement_drives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drive_registrations` ADD CONSTRAINT `drive_registrations_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
