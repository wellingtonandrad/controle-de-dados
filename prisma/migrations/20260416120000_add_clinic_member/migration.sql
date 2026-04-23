-- CreateEnum
CREATE TYPE "ClinicMemberRole" AS ENUM ('OWNER', 'RECEPTION', 'DENTIST');

-- CreateTable
CREATE TABLE "ClinicMember" (
    "id" TEXT NOT NULL,
    "clinicOwnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClinicMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicMember_clinicOwnerId_userId_key" ON "ClinicMember"("clinicOwnerId", "userId");

-- AddForeignKey
ALTER TABLE "ClinicMember" ADD CONSTRAINT "ClinicMember_clinicOwnerId_fkey" FOREIGN KEY ("clinicOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicMember" ADD CONSTRAINT "ClinicMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dono da clínica como membro OWNER (um registro por conta CLINIC existente)
INSERT INTO "ClinicMember" ("id", "clinicOwnerId", "userId", "role", "createdAt", "updatedAt")
SELECT
  'cm_owner_' || u."id",
  u."id",
  u."id",
  'OWNER'::"ClinicMemberRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'CLINIC'
  AND NOT EXISTS (
    SELECT 1 FROM "ClinicMember" m WHERE m."clinicOwnerId" = u."id" AND m."userId" = u."id"
  );
