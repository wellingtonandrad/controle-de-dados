-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELED');

-- AlterTable
ALTER TABLE "Appointment"
ADD COLUMN "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED';
