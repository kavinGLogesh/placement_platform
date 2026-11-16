-- CreateTable chat_groups
CREATE TABLE IF NOT EXISTS `chat_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `type` ENUM('DEPARTMENT', 'CROSS_DEPARTMENT', 'UG_ALL', 'PG_ALL', 'CUSTOM', 'BROADCAST', 'PLACEMENT_DRIVE') NOT NULL DEFAULT 'CUSTOM',
    `createdById` VARCHAR(191) NOT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_groups_createdById_idx`(`createdById`),
    INDEX `chat_groups_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable chat_group_departments
CREATE TABLE IF NOT EXISTS `chat_group_departments` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `chat_group_departments_groupId_departmentId_key`(`groupId`, `departmentId`),
    INDEX `chat_group_departments_groupId_idx`(`groupId`),
    INDEX `chat_group_departments_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable chat_group_members
CREATE TABLE IF NOT EXISTS `chat_group_members` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MODERATOR', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDirectAdded` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `chat_group_members_groupId_userId_key`(`groupId`, `userId`),
    INDEX `chat_group_members_groupId_idx`(`groupId`),
    INDEX `chat_group_members_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderName` VARCHAR(191) NULL,
    `senderRole` VARCHAR(191) NULL,
    `content` TEXT NULL,
    `messageType` ENUM('TEXT', 'IMAGE', 'DOCUMENT', 'FILE', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    `fileUrl` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `replyToId` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_messages_groupId_idx`(`groupId`),
    INDEX `chat_messages_senderId_idx`(`senderId`),
    INDEX `chat_messages_replyToId_idx`(`replyToId`),
    INDEX `chat_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable chat_message_receipts
CREATE TABLE IF NOT EXISTS `chat_message_receipts` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `chat_message_receipts_messageId_userId_key`(`messageId`, `userId`),
    INDEX `chat_message_receipts_messageId_idx`(`messageId`),
    INDEX `chat_message_receipts_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKeys
ALTER TABLE `chat_groups` ADD CONSTRAINT `chat_groups_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `chat_group_departments` ADD CONSTRAINT `chat_group_departments_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chat_group_departments` ADD CONSTRAINT `chat_group_departments_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_replyToId_fkey` FOREIGN KEY (`replyToId`) REFERENCES `chat_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `chat_message_receipts` ADD CONSTRAINT `chat_message_receipts_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `chat_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chat_message_receipts` ADD CONSTRAINT `chat_message_receipts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

