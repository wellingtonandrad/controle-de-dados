-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'APPOINTMENT_CONSUMPTION');

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "currentQuantity" INTEGER NOT NULL DEFAULT 0,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "appointmentId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceStockConsumption" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceStockConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockItem_userId_active_idx" ON "StockItem"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_userId_name_key" ON "StockItem"("userId", "name");

-- CreateIndex
CREATE INDEX "StockMovement_stockItemId_createdAt_idx" ON "StockMovement"("stockItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceStockConsumption_serviceId_stockItemId_key" ON "ServiceStockConsumption"("serviceId", "stockItemId");

-- CreateIndex
CREATE INDEX "ServiceStockConsumption_stockItemId_idx" ON "ServiceStockConsumption"("stockItemId");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStockConsumption" ADD CONSTRAINT "ServiceStockConsumption_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStockConsumption" ADD CONSTRAINT "ServiceStockConsumption_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
