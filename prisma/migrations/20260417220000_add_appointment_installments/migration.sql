-- CreateTable
CREATE TABLE "AppointmentInstallment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentInstallment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentInstallment_appointmentId_sequence_key" ON "AppointmentInstallment"("appointmentId", "sequence");

CREATE INDEX "AppointmentInstallment_appointmentId_idx" ON "AppointmentInstallment"("appointmentId");

ALTER TABLE "AppointmentInstallment" ADD CONSTRAINT "AppointmentInstallment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Concluídos existentes: 1 parcela = valor do serviço, já “recebida” na data em que concluíram (comportamento legado)
INSERT INTO "AppointmentInstallment" ("id", "appointmentId", "sequence", "amountCents", "dueDate", "paidAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  a."id",
  1,
  s."price",
  a."appointmentDate",
  a."updatedAt",
  NOW(),
  NOW()
FROM "Appointment" a
INNER JOIN "Service" s ON s."id" = a."serviceId"
WHERE a."status" = 'COMPLETED'
  AND NOT EXISTS (
    SELECT 1 FROM "AppointmentInstallment" i WHERE i."appointmentId" = a."id"
  );
