-- =============================================================================
-- COLLEGE PLACEMENT ASSESSMENT PLATFORM
-- Database Initialization Script (MySQL 8.x)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `college_placement_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `college_placement_db`;

-- Connectivity Verification Table
CREATE TABLE IF NOT EXISTS `_system_health` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_name` VARCHAR(100) NOT NULL DEFAULT 'college-placement-api',
  `status` VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
  `checked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial record for testing connectivity
INSERT INTO `_system_health` (`service_name`, `status`)
VALUES ('college-placement-api', 'HEALTHY')
ON DUPLICATE KEY UPDATE `checked_at` = CURRENT_TIMESTAMP;
