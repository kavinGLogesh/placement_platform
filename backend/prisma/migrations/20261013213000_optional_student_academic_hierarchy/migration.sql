ALTER TABLE `students`
    DROP FOREIGN KEY `students_courseId_fkey`,
    DROP FOREIGN KEY `students_classId_fkey`,
    DROP FOREIGN KEY `students_sectionId_fkey`;

ALTER TABLE `students`
    MODIFY COLUMN `courseId` VARCHAR(191) NULL,
    MODIFY COLUMN `classId` VARCHAR(191) NULL,
    MODIFY COLUMN `sectionId` VARCHAR(191) NULL;

ALTER TABLE `students`
    ADD CONSTRAINT `students_courseId_fkey`
        FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `students_classId_fkey`
        FOREIGN KEY (`classId`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `students_sectionId_fkey`
        FOREIGN KEY (`sectionId`) REFERENCES `sections` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
