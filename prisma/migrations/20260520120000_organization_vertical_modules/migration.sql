-- ERP multissetorial: módulos verticais por organização

CREATE TYPE "ErpVerticalModule" AS ENUM ('LOGISTICS', 'MARKETS', 'SERVICES', 'HOSPITALS', 'INDUSTRY');

ALTER TABLE "Organization" ADD COLUMN "enabledModules" "ErpVerticalModule"[] NOT NULL DEFAULT ARRAY['LOGISTICS', 'SERVICES', 'INDUSTRY']::"ErpVerticalModule"[];
