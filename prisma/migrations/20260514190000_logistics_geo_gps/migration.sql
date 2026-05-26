-- Logística: camadas geográficas (KMZ/KML) e rastreamento GPS por entrega

CREATE TYPE "GeoMapLayerCategory" AS ENUM (
  'DELIVERY_REGION',
  'FACTORY_SITE',
  'NEIGHBORHOOD_BOUNDARY',
  'PLANNED_ROUTE'
);

CREATE TYPE "GpsSubjectType" AS ENUM ('DELIVERER', 'COMPANY_VEHICLE');

CREATE TYPE "DeliveryProgressStatus" AS ENUM (
  'SCHEDULED',
  'LOADING',
  'OUT_FOR_DELIVERY',
  'IN_TRANSIT',
  'AT_CUSTOMER',
  'DELIVERED',
  'EXCEPTION',
  'RETURNING',
  'CANCELLED'
);

CREATE TYPE "DeliveryTripStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "GeoMapLayer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GeoMapLayerCategory" NOT NULL,
    "geoJson" JSONB NOT NULL,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoMapLayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryTrip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT,
    "referenceCode" TEXT,
    "description" TEXT,
    "driverLabel" TEXT,
    "vehicleLabel" TEXT,
    "status" "DeliveryTripStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GpsTrackPoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "subject" "GpsSubjectType" NOT NULL,
    "deliveryStatus" "DeliveryProgressStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsTrackPoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeoMapLayer_organizationId_category_idx" ON "GeoMapLayer"("organizationId", "category");

CREATE INDEX "DeliveryTrip_organizationId_status_createdAt_idx" ON "DeliveryTrip"("organizationId", "status", "createdAt");

CREATE INDEX "DeliveryTrip_saleId_idx" ON "DeliveryTrip"("saleId");

CREATE INDEX "GpsTrackPoint_tripId_recordedAt_idx" ON "GpsTrackPoint"("tripId", "recordedAt");

ALTER TABLE "GeoMapLayer" ADD CONSTRAINT "GeoMapLayer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryTrip" ADD CONSTRAINT "DeliveryTrip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryTrip" ADD CONSTRAINT "DeliveryTrip_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GpsTrackPoint" ADD CONSTRAINT "GpsTrackPoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "DeliveryTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
