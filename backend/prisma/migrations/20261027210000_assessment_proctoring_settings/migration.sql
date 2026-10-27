-- AlterTable
ALTER TABLE `assessments`
    ADD COLUMN `enableMobileDetection` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `maxViolations` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `terminationAction` VARCHAR(32) NOT NULL DEFAULT 'AUTO_SUBMIT';
