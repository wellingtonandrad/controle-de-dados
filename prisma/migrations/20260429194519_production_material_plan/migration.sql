-- CreateTable
CREATE TABLE "ProductionMaterialPlan" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "componentProductId" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "consumedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionMaterialPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionMaterialPlan_productionOrderId_idx" ON "ProductionMaterialPlan"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionMaterialPlan_productionOrderId_componentProductId_key" ON "ProductionMaterialPlan"("productionOrderId", "componentProductId");

-- AddForeignKey
ALTER TABLE "ProductionMaterialPlan" ADD CONSTRAINT "ProductionMaterialPlan_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionMaterialPlan" ADD CONSTRAINT "ProductionMaterialPlan_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
