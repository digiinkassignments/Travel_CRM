-- =============================================================================
-- Digiink Solutions Travel CRM — full database (single shared schema)
-- Import directly in phpMyAdmin / XAMPP, or: mysql -u root digiink_crm < digiink_crm.sql
--
-- ARCHITECTURE NOTE: originally spec'd as one isolated MySQL database per
-- client. This build intentionally uses ONE shared database instead, with
-- every tenant table carrying a `clientId` column, to work on XAMPP/MariaDB
-- for local development. Isolation is enforced in application code (every
-- query scoped by clientId — see backend/src/guards/tenant-scope.guard.ts)
-- rather than structurally by separate databases.
-- MySQL 8 / MariaDB 10.4+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `digiink_crm` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `digiink_crm`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- plans
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `plans`;
CREATE TABLE `plans` (
  `id`                      VARCHAR(191) NOT NULL,
  `name`                    VARCHAR(191) NOT NULL,
  `priceInPaise`            INT NOT NULL,
  `entitlements`            LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`entitlements`)),
  `maxUsers`                INT DEFAULT NULL,
  `maxEnquiriesPerMonth`    INT DEFAULT NULL,
  `maxBranches`             INT DEFAULT NULL,
  `isActive`                TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`               DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`               DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plans_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id`                   VARCHAR(191) NOT NULL,
  `clientCode`           VARCHAR(191) NOT NULL,
  `businessName`         VARCHAR(191) NOT NULL,
  `ownerName`            VARCHAR(191) NOT NULL,
  `email`                VARCHAR(191) NOT NULL,
  `phone`                VARCHAR(191) NOT NULL,
  `planId`               VARCHAR(191) NOT NULL,
  `subscriptionStatus`   ENUM('ACTIVE','EXPIRING_SOON','GRACE','LOCKED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  `subscriptionStart`    DATETIME(3) NOT NULL,
  `subscriptionExpiry`   DATETIME(3) NOT NULL,
  `graceEndsAt`          DATETIME(3) DEFAULT NULL,
  `lockedAt`             DATETIME(3) DEFAULT NULL,
  `deletedAt`            DATETIME(3) DEFAULT NULL,
  `onboardingCompleted`  TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`            DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clients_clientCode_key` (`clientCode`),
  UNIQUE KEY `clients_email_key` (`email`),
  KEY `clients_subscriptionStatus_idx` (`subscriptionStatus`),
  KEY `clients_planId_fkey` (`planId`),
  CONSTRAINT `clients_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- company_profiles — onboarding wizard steps 1+2, one row per client
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `company_profiles`;
CREATE TABLE `company_profiles` (
  `id`            VARCHAR(191) NOT NULL,
  `clientId`      VARCHAR(191) NOT NULL,
  `companyName`   VARCHAR(191) DEFAULT NULL,
  `logoUrl`       VARCHAR(500) DEFAULT NULL,
  `address`       VARCHAR(500) DEFAULT NULL,
  `gstNumber`     VARCHAR(50)  DEFAULT NULL,
  `phone`         VARCHAR(32)  DEFAULT NULL,
  `email`         VARCHAR(191) DEFAULT NULL,
  `businessType`  VARCHAR(100) DEFAULT NULL,
  `currency`      VARCHAR(10)  DEFAULT 'INR',
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_profiles_clientId_key` (`clientId`),
  CONSTRAINT `company_profiles_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- branches — onboarding step 3, only meaningful for Enterprise (multi_branch)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
  `id`         VARCHAR(191) NOT NULL,
  `clientId`   VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `address`    VARCHAR(500) DEFAULT NULL,
  `isActive`   TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `branches_clientId_idx` (`clientId`),
  CONSTRAINT `branches_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- login_otps — short-lived email OTP codes for client-user login (Phase 1
-- email-only OTP per SRS). Only a hash of the code is ever stored.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `login_otps`;
CREATE TABLE `login_otps` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NOT NULL,
  `codeHash`   VARCHAR(191) NOT NULL,
  `expiresAt`  DATETIME(3) NOT NULL,
  `consumed`   TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `login_otps_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- password_reset_otps — short-lived password reset codes. Only a hash of the
-- code is stored; userId is intentionally not a foreign key because reset
-- requests can target either a Super Admin or a client user.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `password_reset_otps`;
CREATE TABLE `password_reset_otps` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NOT NULL,
  `codeHash`   VARCHAR(191) NOT NULL,
  `expiresAt`  DATETIME(3) NOT NULL,
  `consumed`   TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `password_reset_otps_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_logs
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payment_logs`;
CREATE TABLE `payment_logs` (
  `id`             VARCHAR(191) NOT NULL,
  `clientId`       VARCHAR(191) NOT NULL,
  `amountInPaise`  INT NOT NULL,
  `date`           DATETIME(3) NOT NULL,
  `mode`           VARCHAR(191) NOT NULL,
  `reference`      VARCHAR(191) DEFAULT NULL,
  `note`           VARCHAR(191) DEFAULT NULL,
  `confirmedBy`    VARCHAR(191) NOT NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payment_logs_clientId_idx` (`clientId`),
  CONSTRAINT `payment_logs_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_notices
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payment_notices`;
CREATE TABLE `payment_notices` (
  `id`          VARCHAR(191) NOT NULL,
  `clientId`    VARCHAR(191) NOT NULL,
  `message`     VARCHAR(191) DEFAULT NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt`  DATETIME(3) DEFAULT NULL,
  `reviewedBy`  VARCHAR(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payment_notices_clientId_idx` (`clientId`),
  CONSTRAINT `payment_notices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- super_admin_users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `super_admin_users`;
CREATE TABLE `super_admin_users` (
  `id`            VARCHAR(191) NOT NULL,
  `email`         VARCHAR(191) NOT NULL,
  `passwordHash`  VARCHAR(191) NOT NULL,
  `name`          VARCHAR(191) NOT NULL,
  `isActive`      TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `super_admin_users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- password_reset_tokens
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NOT NULL,
  `userType`   ENUM('SUPER_ADMIN', 'CLIENT_USER') NOT NULL,
  `tokenHash`  VARCHAR(191) NOT NULL,
  `expiresAt`  DATETIME(3) NOT NULL,
  `consumed`   TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `password_reset_tokens_userId_userType_idx` (`userId`, `userType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- super_admin_audit_logs
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `super_admin_audit_logs`;
CREATE TABLE `super_admin_audit_logs` (
  `id`              VARCHAR(191) NOT NULL,
  `actorId`         VARCHAR(191) NOT NULL,
  `actorEmail`      VARCHAR(191) NOT NULL,
  `action`          VARCHAR(191) NOT NULL,
  `targetClientId`  VARCHAR(191) DEFAULT NULL,
  `metadata`        LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ipAddress`       VARCHAR(191) DEFAULT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `super_admin_audit_logs_targetClientId_idx` (`targetClientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- system_settings
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `key`    VARCHAR(191) NOT NULL,
  `value`  LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- roles
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id`                VARCHAR(191) NOT NULL,
  `clientId`          VARCHAR(191) NOT NULL,
  `name`              VARCHAR(191) NOT NULL,
  `permissionsJson`   LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissionsJson`)),
  `isSystemRole`      TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_clientId_name_key` (`clientId`, `name`),
  KEY `roles_clientId_idx` (`clientId`),
  CONSTRAINT `roles_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`                  VARCHAR(191) NOT NULL,
  `clientId`            VARCHAR(191) NOT NULL,
  `name`                VARCHAR(191) NOT NULL,
  `email`               VARCHAR(191) NOT NULL,
  `passwordHash`        VARCHAR(191) NOT NULL,
  `roleId`              VARCHAR(191) NOT NULL,
  `branchId`            VARCHAR(191) DEFAULT NULL,
  `isClientAdmin`       TINYINT(1) NOT NULL DEFAULT 0,
  `isActive`            TINYINT(1) NOT NULL DEFAULT 1,
  `mustChangePassword`  TINYINT(1) NOT NULL DEFAULT 1,
  `lastLoginAt`         DATETIME(3) DEFAULT NULL,
  `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_clientId_idx` (`clientId`),
  KEY `users_roleId_fkey` (`roleId`),
  KEY `users_branchId_fkey` (`branchId`),
  CONSTRAINT `users_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`),
  CONSTRAINT `users_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id`          VARCHAR(191) NOT NULL,
  `clientId`    VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `phone`       VARCHAR(191) NOT NULL,
  `email`       VARCHAR(191) DEFAULT NULL,
  `address`     VARCHAR(191) DEFAULT NULL,
  `notes`       VARCHAR(191) DEFAULT NULL,
  `branchId`    VARCHAR(191) DEFAULT NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customers_clientId_idx` (`clientId`),
  KEY `customers_branchId_fkey` (`branchId`),
  CONSTRAINT `customers_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `customers_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- enquiries
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `enquiries`;
CREATE TABLE `enquiries` (
  `id`             VARCHAR(191) NOT NULL,
  `clientId`       VARCHAR(191) NOT NULL,
  `customerId`     VARCHAR(191) NOT NULL,
  `source`         VARCHAR(191) DEFAULT NULL,
  `destination`    VARCHAR(191) DEFAULT NULL,
  `travelDate`     DATETIME(3) DEFAULT NULL,
  `status`         ENUM('NEW','CONTACTED','QUOTED','NEGOTIATION','WON','LOST') NOT NULL DEFAULT 'NEW',
  `assignedToId`   VARCHAR(191) DEFAULT NULL,
  `branchId`       VARCHAR(191) DEFAULT NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `enquiries_clientId_idx` (`clientId`),
  KEY `enquiries_clientId_status_idx` (`clientId`, `status`),
  KEY `enquiries_customerId_fkey` (`customerId`),
  KEY `enquiries_assignedToId_fkey` (`assignedToId`),
  KEY `enquiries_branchId_fkey` (`branchId`),
  CONSTRAINT `enquiries_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `enquiries_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`),
  CONSTRAINT `enquiries_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users` (`id`),
  CONSTRAINT `enquiries_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- follow_ups
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `follow_ups`;
CREATE TABLE `follow_ups` (
  `id`             VARCHAR(191) NOT NULL,
  `clientId`       VARCHAR(191) NOT NULL,
  `enquiryId`      VARCHAR(191) NOT NULL,
  `loggedById`     VARCHAR(191) NOT NULL,
  `activityType`   VARCHAR(191) NOT NULL,
  `description`    VARCHAR(191) DEFAULT NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `follow_ups_clientId_idx` (`clientId`),
  KEY `follow_ups_enquiryId_idx` (`enquiryId`),
  KEY `follow_ups_loggedById_fkey` (`loggedById`),
  CONSTRAINT `follow_ups_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `follow_ups_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `enquiries` (`id`),
  CONSTRAINT `follow_ups_loggedById_fkey` FOREIGN KEY (`loggedById`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- quotations
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `quotations`;
CREATE TABLE `quotations` (
  `id`                    VARCHAR(191) NOT NULL,
  `clientId`              VARCHAR(191) NOT NULL,
  `enquiryId`             VARCHAR(191) NOT NULL,
  `customerId`            VARCHAR(191) NOT NULL,
  `version`               INT NOT NULL DEFAULT 1,
  `itineraryJson`         LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`itineraryJson`)),
  `markupInPaise`         INT NOT NULL DEFAULT 0,
  `discountInPaise`       INT NOT NULL DEFAULT 0,
  `taxInPaise`            INT NOT NULL DEFAULT 0,
  `totalInPaise`          INT NOT NULL,
  `termsAndConditions`    TEXT DEFAULT NULL,
  `pdfFileUrl`            VARCHAR(191) DEFAULT NULL,
  `status`                ENUM('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `quotations_clientId_idx` (`clientId`),
  KEY `quotations_enquiryId_fkey` (`enquiryId`),
  KEY `quotations_customerId_fkey` (`customerId`),
  CONSTRAINT `quotations_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `quotations_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `enquiries` (`id`),
  CONSTRAINT `quotations_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- drivers
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `drivers`;
CREATE TABLE `drivers` (
  `id`               VARCHAR(191) NOT NULL,
  `clientId`         VARCHAR(191) NOT NULL,
  `name`             VARCHAR(191) NOT NULL,
  `licenseNumber`    VARCHAR(191) NOT NULL,
  `contact`          VARCHAR(191) NOT NULL,
  `isAvailable`      TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drivers_clientId_idx` (`clientId`),
  CONSTRAINT `drivers_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles` (
  `id`                    VARCHAR(191) NOT NULL,
  `clientId`              VARCHAR(191) NOT NULL,
  `vehicleType`           VARCHAR(191) NOT NULL,
  `registrationNumber`    VARCHAR(191) NOT NULL,
  `capacity`              INT NOT NULL,
  `isAvailable`           TINYINT(1) NOT NULL DEFAULT 1,
  `rcExpiry`              DATETIME(3) DEFAULT NULL,
  `insuranceExpiry`       DATETIME(3) DEFAULT NULL,
  `permitExpiry`          DATETIME(3) DEFAULT NULL,
  `assignedDriverId`      VARCHAR(191) DEFAULT NULL,
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicles_clientId_registrationNumber_key` (`clientId`, `registrationNumber`),
  KEY `vehicles_clientId_idx` (`clientId`),
  KEY `vehicles_assignedDriverId_fkey` (`assignedDriverId`),
  CONSTRAINT `vehicles_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `vehicles_assignedDriverId_fkey` FOREIGN KEY (`assignedDriverId`) REFERENCES `drivers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id`               VARCHAR(191) NOT NULL,
  `clientId`         VARCHAR(191) NOT NULL,
  `quotationId`      VARCHAR(191) NOT NULL,
  `customerId`       VARCHAR(191) NOT NULL,
  `travelStart`      DATETIME(3) DEFAULT NULL,
  `travelEnd`        DATETIME(3) DEFAULT NULL,
  `amountInPaise`    INT NOT NULL,
  `status`           ENUM('CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  `voucherPdfUrl`    VARCHAR(191) DEFAULT NULL,
  `paymentDueDate`   DATETIME(3) DEFAULT NULL,
  `branchId`         VARCHAR(191) DEFAULT NULL,
  `driverId`         VARCHAR(191) DEFAULT NULL,
  `vehicleId`        VARCHAR(191) DEFAULT NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bookings_quotationId_key` (`quotationId`),
  KEY `bookings_clientId_idx` (`clientId`),
  KEY `bookings_customerId_fkey` (`customerId`),
  KEY `bookings_driverId_fkey` (`driverId`),
  KEY `bookings_vehicleId_fkey` (`vehicleId`),
  KEY `bookings_branchId_fkey` (`branchId`),
  CONSTRAINT `bookings_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `bookings_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations` (`id`),
  CONSTRAINT `bookings_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`),
  CONSTRAINT `bookings_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`),
  CONSTRAINT `bookings_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `bookings_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- trips
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
  `id`               VARCHAR(191) NOT NULL,
  `clientId`         VARCHAR(191) NOT NULL,
  `bookingId`        VARCHAR(191) NOT NULL,
  `startDate`        DATETIME(3) DEFAULT NULL,
  `endDate`          DATETIME(3) DEFAULT NULL,
  `pickup`           VARCHAR(191) DEFAULT NULL,
  `drop`             VARCHAR(191) DEFAULT NULL,
  `itineraryNotes`   TEXT DEFAULT NULL,
  `driverId`         VARCHAR(191) DEFAULT NULL,
  `vehicleId`        VARCHAR(191) DEFAULT NULL,
  `status`           ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trips_bookingId_key` (`bookingId`),
  KEY `trips_clientId_idx` (`clientId`),
  KEY `trips_driverId_fkey` (`driverId`),
  KEY `trips_vehicleId_fkey` (`vehicleId`),
  CONSTRAINT `trips_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `trips_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings` (`id`),
  CONSTRAINT `trips_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`),
  CONSTRAINT `trips_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id`               VARCHAR(191) NOT NULL,
  `clientId`         VARCHAR(191) NOT NULL,
  `bookingId`        VARCHAR(191) NOT NULL,
  `customerId`       VARCHAR(191) NOT NULL,
  `amountInPaise`    INT NOT NULL,
  `mode`             VARCHAR(191) NOT NULL,
  `paymentDate`      DATETIME(3) NOT NULL,
  `reference`        VARCHAR(191) DEFAULT NULL,
  `recordedById`     VARCHAR(191) NOT NULL,
  `notes`            VARCHAR(191) DEFAULT NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payments_clientId_idx` (`clientId`),
  KEY `payments_bookingId_fkey` (`bookingId`),
  KEY `payments_customerId_fkey` (`customerId`),
  CONSTRAINT `payments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings` (`id`),
  CONSTRAINT `payments_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- invoices
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id`                 VARCHAR(191) NOT NULL,
  `clientId`           VARCHAR(191) NOT NULL,
  `bookingId`          VARCHAR(191) NOT NULL,
  `customerId`         VARCHAR(191) NOT NULL,
  `hsnSac`             VARCHAR(191) DEFAULT NULL,
  `subtotalInPaise`    INT NOT NULL,
  `gstInPaise`         INT NOT NULL,
  `totalInPaise`       INT NOT NULL,
  `pdfFileUrl`         VARCHAR(191) DEFAULT NULL,
  `createdAt`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `invoices_clientId_idx` (`clientId`),
  KEY `invoices_bookingId_fkey` (`bookingId`),
  KEY `invoices_customerId_fkey` (`customerId`),
  CONSTRAINT `invoices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `invoices_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings` (`id`),
  CONSTRAINT `invoices_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id`           VARCHAR(191) NOT NULL,
  `clientId`     VARCHAR(191) NOT NULL,
  `customerId`   VARCHAR(191) DEFAULT NULL,
  `driverId`     VARCHAR(191) DEFAULT NULL,
  `vehicleId`    VARCHAR(191) DEFAULT NULL,
  `type`         VARCHAR(191) NOT NULL,
  `fileUrl`      VARCHAR(191) NOT NULL,
  `fileKey`      VARCHAR(191) NOT NULL,
  `fileSize`     INT DEFAULT NULL,
  `expiryDate`   DATETIME(3) DEFAULT NULL,
  `uploadedBy`   VARCHAR(191) DEFAULT NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `documents_clientId_idx` (`clientId`),
  KEY `documents_customerId_fkey` (`customerId`),
  KEY `documents_driverId_fkey` (`driverId`),
  KEY `documents_vehicleId_fkey` (`vehicleId`),
  CONSTRAINT `documents_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `documents_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`),
  CONSTRAINT `documents_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`),
  CONSTRAINT `documents_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- audit_log
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id`          VARCHAR(191) NOT NULL,
  `clientId`    VARCHAR(191) NOT NULL,
  `userId`      VARCHAR(191) DEFAULT NULL,
  `action`      VARCHAR(191) NOT NULL,
  `target`      VARCHAR(191) DEFAULT NULL,
  `metadata`    LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ipAddress`   VARCHAR(191) DEFAULT NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_log_clientId_idx` (`clientId`),
  KEY `audit_log_userId_fkey` (`userId`),
  CONSTRAINT `audit_log_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `audit_log_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- automation_rules — no-code Workflow Automation (Business+ only)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `automation_rules`;
CREATE TABLE `automation_rules` (
  `id`             VARCHAR(191) NOT NULL,
  `clientId`       VARCHAR(191) NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `isActive`       TINYINT(1) NOT NULL DEFAULT 1,
  `triggerType`    VARCHAR(100) NOT NULL,
  `triggerConfig`  LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`triggerConfig`)),
  `actionType`     VARCHAR(100) NOT NULL,
  `actionConfig`   LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`actionConfig`)),
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_rules_clientId_idx` (`clientId`),
  CONSTRAINT `automation_rules_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- automation_logs — execution history + de-duplication for the engine
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `automation_logs`;
CREATE TABLE `automation_logs` (
  `id`          VARCHAR(191) NOT NULL,
  `clientId`    VARCHAR(191) NOT NULL,
  `ruleId`      VARCHAR(191) NOT NULL,
  `targetType`  VARCHAR(50)  NOT NULL,
  `targetId`    VARCHAR(191) NOT NULL,
  `message`     VARCHAR(500) DEFAULT NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `automation_logs_clientId_idx` (`clientId`),
  KEY `automation_logs_ruleId_targetId_idx` (`ruleId`, `targetId`),
  CONSTRAINT `automation_logs_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `automation_logs_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `automation_rules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- whatsapp_configs — one row per client; populated once real Meta Business
-- API credentials are connected (Enterprise only)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `whatsapp_configs`;
CREATE TABLE `whatsapp_configs` (
  `id`                    VARCHAR(191) NOT NULL,
  `clientId`              VARCHAR(191) NOT NULL,
  `phoneNumberId`         VARCHAR(191) DEFAULT NULL,
  `businessAccountId`     VARCHAR(191) DEFAULT NULL,
  `accessTokenEncrypted`  TEXT DEFAULT NULL,
  `webhookVerifyToken`    VARCHAR(191) DEFAULT NULL,
  `isActive`              TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_configs_clientId_key` (`clientId`),
  CONSTRAINT `whatsapp_configs_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- whatsapp_messages — message log, both directions
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `whatsapp_messages`;
CREATE TABLE `whatsapp_messages` (
  `id`          VARCHAR(191) NOT NULL,
  `clientId`    VARCHAR(191) NOT NULL,
  `enquiryId`   VARCHAR(191) DEFAULT NULL,
  `direction`   VARCHAR(20) NOT NULL,
  `fromNumber`  VARCHAR(32) NOT NULL,
  `toNumber`    VARCHAR(32) NOT NULL,
  `body`        TEXT NOT NULL,
  `status`      VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `whatsapp_messages_clientId_idx` (`clientId`),
  KEY `whatsapp_messages_enquiryId_idx` (`enquiryId`),
  CONSTRAINT `whatsapp_messages_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- custom_field_definitions / custom_field_values — no-code Custom Module
-- framework (Enterprise only), scoped to "add fields to an existing module"
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `custom_field_definitions`;
CREATE TABLE `custom_field_definitions` (
  `id`         VARCHAR(191) NOT NULL,
  `clientId`   VARCHAR(191) NOT NULL,
  `module`     VARCHAR(50)  NOT NULL,
  `fieldKey`   VARCHAR(100) NOT NULL,
  `label`      VARCHAR(191) NOT NULL,
  `fieldType`  VARCHAR(20)  NOT NULL,
  `isActive`   TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `custom_field_definitions_clientId_module_fieldKey_key` (`clientId`, `module`, `fieldKey`),
  KEY `custom_field_definitions_clientId_idx` (`clientId`),
  CONSTRAINT `custom_field_definitions_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `custom_field_values`;
CREATE TABLE `custom_field_values` (
  `id`            VARCHAR(191) NOT NULL,
  `clientId`      VARCHAR(191) NOT NULL,
  `definitionId`  VARCHAR(191) NOT NULL,
  `recordId`      VARCHAR(191) NOT NULL,
  `value`         LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value`)),
  `updatedAt`     DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `custom_field_values_definitionId_recordId_key` (`definitionId`, `recordId`),
  KEY `custom_field_values_clientId_idx` (`clientId`),
  CONSTRAINT `custom_field_values_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`),
  CONSTRAINT `custom_field_values_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `custom_field_definitions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Seed data: the four plans from the SRS feature matrix
-- =============================================================================
INSERT INTO `plans` (`id`, `name`, `priceInPaise`, `entitlements`, `maxUsers`, `maxEnquiriesPerMonth`, `maxBranches`, `isActive`, `createdAt`, `updatedAt`)
VALUES
('plan_starter', 'Starter', 199900,
  '{"enquiry_crm":true,"bookings":true,"quotation":false,"drivers":false,"vehicles":false,"payments":false,"basic_reports":false,"advanced_reports":false,"workflow_automation":false,"enhanced_controls":false,"multi_branch":false,"integrations":false,"custom_modules":false}',
  3, 100, 1, 1, NOW(3), NOW(3)),
('plan_professional', 'Professional', 399900,
  '{"enquiry_crm":true,"bookings":true,"quotation":true,"drivers":true,"vehicles":true,"payments":true,"basic_reports":true,"advanced_reports":false,"workflow_automation":false,"enhanced_controls":false,"multi_branch":false,"integrations":false,"custom_modules":false}',
  10, NULL, 1, 1, NOW(3), NOW(3)),
('plan_business', 'Business', 699900,
  '{"enquiry_crm":true,"bookings":true,"quotation":true,"drivers":true,"vehicles":true,"payments":true,"basic_reports":true,"advanced_reports":true,"workflow_automation":true,"enhanced_controls":true,"multi_branch":false,"integrations":false,"custom_modules":false}',
  25, NULL, 1, 1, NOW(3), NOW(3)),
('plan_enterprise', 'Enterprise', 999900,
  '{"enquiry_crm":true,"bookings":true,"quotation":true,"drivers":true,"vehicles":true,"payments":true,"basic_reports":true,"advanced_reports":true,"workflow_automation":true,"enhanced_controls":true,"multi_branch":true,"integrations":true,"custom_modules":true}',
  NULL, NULL, NULL, 1, NOW(3), NOW(3));

-- Note: super_admin_users is intentionally left empty here — create your
-- Super Admin login by running `npm run seed` from backend/ (reads
-- SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD), since the password
-- must be Argon2-hashed by the app, not hardcoded in this SQL file.
