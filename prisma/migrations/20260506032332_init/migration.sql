-- CreateTable
CREATE TABLE "Marketplace" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketplaceId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "imtId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "authorName" TEXT,
    "authorRegion" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    "hasVideo" BOOLEAN NOT NULL DEFAULT false,
    "sellerReply" TEXT,
    "sellerReplyAt" DATETIME,
    "rawJson" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isComplaint" BOOLEAN NOT NULL DEFAULT false,
    "complaintData" TEXT,
    "bitrixCommentId" TEXT,
    "aiDraftReply" TEXT,
    "aiReplyStatus" TEXT,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketplaceId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "productsScanned" INTEGER NOT NULL DEFAULT 0,
    "reviewsAdded" INTEGER NOT NULL DEFAULT 0,
    "reviewsUpdated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "SyncLog_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_code_key" ON "Marketplace"("code");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_marketplaceId_externalId_key" ON "Product"("marketplaceId", "externalId");

-- CreateIndex
CREATE INDEX "Review_publishedAt_idx" ON "Review"("publishedAt");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_isComplaint_idx" ON "Review"("isComplaint");

-- CreateIndex
CREATE UNIQUE INDEX "Review_productId_externalId_key" ON "Review"("productId", "externalId");
