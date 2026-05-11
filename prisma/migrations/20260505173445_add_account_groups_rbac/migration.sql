-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGroupPermission" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountGroupPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMemberGroup" (
    "id" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "accountGroupId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMemberGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "AccountGroup_organizationId_idx" ON "AccountGroup"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroup_organizationId_name_key" ON "AccountGroup"("organizationId", "name");

-- CreateIndex
CREATE INDEX "AccountGroupPermission_permissionId_idx" ON "AccountGroupPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroupPermission_groupId_permissionId_key" ON "AccountGroupPermission"("groupId", "permissionId");

-- CreateIndex
CREATE INDEX "OrganizationMemberGroup_organizationId_organizationMemberId_idx" ON "OrganizationMemberGroup"("organizationId", "organizationMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMemberGroup_organizationMemberId_accountGroupId_key" ON "OrganizationMemberGroup"("organizationMemberId", "accountGroupId");

-- AddForeignKey
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroupPermission" ADD CONSTRAINT "AccountGroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGroupPermission" ADD CONSTRAINT "AccountGroupPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMemberGroup" ADD CONSTRAINT "OrganizationMemberGroup_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMemberGroup" ADD CONSTRAINT "OrganizationMemberGroup_accountGroupId_fkey" FOREIGN KEY ("accountGroupId") REFERENCES "AccountGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMemberGroup" ADD CONSTRAINT "OrganizationMemberGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
