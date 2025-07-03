-- CreateTable
CREATE TABLE "EvalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "prompt" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "defaultQuestionTypes" TEXT NOT NULL DEFAULT '[]',
    "defaultDifficulty" TEXT NOT NULL DEFAULT 'medium',
    "defaultFormat" TEXT NOT NULL DEFAULT 'open-ended',
    "defaultCount" INTEGER NOT NULL DEFAULT 10,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "examples" TEXT NOT NULL DEFAULT '[]',
    "createdByUserId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "TemplateTagDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TemplateTag" (
    "templateId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("templateId", "tagId"),
    CONSTRAINT "TemplateTag_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvalTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TemplateTagDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT
);

-- CreateTable
CREATE TABLE "TemplateCollectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TemplateCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Eval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "generationPrompt" TEXT,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "generatorModelId" TEXT,
    "templateId" TEXT,
    "questionTypes" TEXT,
    "generationFormat" TEXT,
    CONSTRAINT "Eval_generatorModelId_fkey" FOREIGN KEY ("generatorModelId") REFERENCES "Model" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Eval_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvalTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Eval" ("createdAt", "description", "difficulty", "generationPrompt", "generatorModelId", "id", "name", "updatedAt") SELECT "createdAt", "description", "difficulty", "generationPrompt", "generatorModelId", "id", "name", "updatedAt" FROM "Eval";
DROP TABLE "Eval";
ALTER TABLE "new_Eval" RENAME TO "Eval";
CREATE INDEX "Eval_generatorModelId_idx" ON "Eval"("generatorModelId");
CREATE INDEX "Eval_templateId_idx" ON "Eval"("templateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EvalTemplate_category_idx" ON "EvalTemplate"("category");

-- CreateIndex
CREATE INDEX "EvalTemplate_isPublic_idx" ON "EvalTemplate"("isPublic");

-- CreateIndex
CREATE INDEX "EvalTemplate_isBuiltIn_idx" ON "EvalTemplate"("isBuiltIn");

-- CreateIndex
CREATE INDEX "EvalTemplate_createdByUserId_idx" ON "EvalTemplate"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateTagDefinition_name_key" ON "TemplateTagDefinition"("name");

-- CreateIndex
CREATE INDEX "TemplateTag_tagId_idx" ON "TemplateTag"("tagId");

-- CreateIndex
CREATE INDEX "TemplateCollection_createdByUserId_idx" ON "TemplateCollection"("createdByUserId");

-- CreateIndex
CREATE INDEX "TemplateCollection_isPublic_idx" ON "TemplateCollection"("isPublic");

-- CreateIndex
CREATE INDEX "TemplateCollectionItem_templateId_idx" ON "TemplateCollectionItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateCollectionItem_collectionId_templateId_key" ON "TemplateCollectionItem"("collectionId", "templateId");
