-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'CLINIC');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "clinicVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PATIENT';
