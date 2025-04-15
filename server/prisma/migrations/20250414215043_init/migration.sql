-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKeyEnvVar" TEXT NOT NULL,
    "inputTokenCost" REAL NOT NULL,
    "outputTokenCost" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Eval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "generationPrompt" TEXT,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "generatorModelId" TEXT,
    CONSTRAINT "Eval_generatorModelId_fkey" FOREIGN KEY ("generatorModelId") REFERENCES "Model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evalId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_evalId_fkey" FOREIGN KEY ("evalId") REFERENCES "Eval" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "EvalTag" (
    "evalId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("evalId", "tagId"),
    CONSTRAINT "EvalTag_evalId_fkey" FOREIGN KEY ("evalId") REFERENCES "Eval" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvalTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvalRun_evalId_fkey" FOREIGN KEY ("evalId") REFERENCES "Eval" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evalRunId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "responseText" TEXT,
    "error" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cost" REAL,
    "executionTimeMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Response_evalRunId_fkey" FOREIGN KEY ("evalRunId") REFERENCES "EvalRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Response_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "scoreValue" REAL,
    "justification" TEXT,
    "scorerType" TEXT NOT NULL,
    "scorerLlmId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_scorerLlmId_fkey" FOREIGN KEY ("scorerLlmId") REFERENCES "Model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Judgment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "judgeModelId" TEXT NOT NULL,
    "overallScore" REAL,
    "clarityScore" REAL,
    "difficultyScore" REAL,
    "relevanceScore" REAL,
    "originalityScore" REAL,
    "justification" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Judgment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Judgment_judgeModelId_fkey" FOREIGN KEY ("judgeModelId") REFERENCES "Model" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Model_name_key" ON "Model"("name");

-- CreateIndex
CREATE INDEX "Eval_generatorModelId_idx" ON "Eval"("generatorModelId");

-- CreateIndex
CREATE INDEX "Question_evalId_idx" ON "Question"("evalId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "EvalTag_tagId_idx" ON "EvalTag"("tagId");

-- CreateIndex
CREATE INDEX "EvalRun_evalId_idx" ON "EvalRun"("evalId");

-- CreateIndex
CREATE INDEX "EvalRun_status_idx" ON "EvalRun"("status");

-- CreateIndex
CREATE INDEX "Response_evalRunId_idx" ON "Response"("evalRunId");

-- CreateIndex
CREATE INDEX "Response_questionId_idx" ON "Response"("questionId");

-- CreateIndex
CREATE INDEX "Response_modelId_idx" ON "Response"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_responseId_key" ON "Score"("responseId");

-- CreateIndex
CREATE INDEX "Score_scorerLlmId_idx" ON "Score"("scorerLlmId");

-- CreateIndex
CREATE INDEX "Judgment_questionId_idx" ON "Judgment"("questionId");

-- CreateIndex
CREATE INDEX "Judgment_judgeModelId_idx" ON "Judgment"("judgeModelId");
