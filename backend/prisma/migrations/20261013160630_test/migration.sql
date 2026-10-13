-- AlterTable
ALTER TABLE `assessment_attempts` ADD COLUMN `terminationReason` VARCHAR(255) NULL,
    ADD COLUMN `violationCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `attempt_violations` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `violationType` VARCHAR(64) NOT NULL,
    `details` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attempt_violations_attemptId_idx`(`attemptId`),
    INDEX `attempt_violations_studentId_idx`(`studentId`),
    INDEX `attempt_violations_violationType_idx`(`violationType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attempt_violations` ADD CONSTRAINT `attempt_violations_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `assessment_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attempt_violations` ADD CONSTRAINT `attempt_violations_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
