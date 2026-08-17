-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "canton" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "parroquia" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "provincia" TEXT;

-- CreateIndex
CREATE INDEX "Tenant_provincia_idx" ON "Tenant"("provincia");

-- CreateIndex
CREATE INDEX "Tenant_canton_idx" ON "Tenant"("canton");
