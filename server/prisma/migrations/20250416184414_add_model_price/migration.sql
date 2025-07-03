-- CreateTable
CREATE TABLE "ModelPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "Provider" TEXT NOT NULL,
    "ModelID" TEXT NOT NULL,
    "CanonicalID" TEXT NOT NULL,
    "ContextWindow" INTEGER NOT NULL,
    "InputUSDPer1M" REAL NOT NULL,
    "OutputUSDPer1M" REAL NOT NULL,
    "Notes" TEXT,
    "Date" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ModelPrice_ModelID_idx" ON "ModelPrice"("ModelID");

-- CreateIndex
CREATE INDEX "ModelPrice_CanonicalID_idx" ON "ModelPrice"("CanonicalID");

-- CreateIndex
CREATE INDEX "ModelPrice_Date_idx" ON "ModelPrice"("Date");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPrice_ModelID_Date_key" ON "ModelPrice"("ModelID", "Date");
