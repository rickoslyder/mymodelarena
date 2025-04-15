// Shared TypeScript types for the application

// Matches the Prisma Model schema (excluding sensitive fields if any)
export interface Model {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string; // We show this for reference, not the key itself
  provider?: string | null; // Add optional provider
  modelIdentifier?: string | null; // Add optional modelIdentifier
  inputTokenCost: number;
  outputTokenCost: number;
  createdAt: string; // Dates are typically strings over JSON
  updatedAt: string;
}

// Matches Prisma Question schema
export interface Question {
  id: string;
  evalId: string;
  text: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Matches Prisma Eval schema (adjust as needed)
export interface Eval {
  id: string;
  name?: string | null;
  description?: string | null;
  generationPrompt?: string | null;
  difficulty?: string | null;
  createdAt: string;
  updatedAt: string;
  generatorModelId?: string | null;
  questions?: Question[];
  // Define the shape of the tags relation based on Prisma include
  tags?: {
    evalId: string; // From EvalTag
    tagId: string; // From EvalTag
    tag: Tag; // The actual Tag object
  }[];
}

// Add other types here (Tag, EvalRun, Response, Score, Judgment)
export interface Tag {
  id: string;
  name: string;
}

// Type for the Eval list item, might include less detail than full Eval
export interface EvalListItem extends Omit<Eval, "questions" | "tags"> {
  // Optionally add aggregated data like question count
  _count?: {
    questions?: number;
  };
  // Represent tags simply for the list view
  tags?: { tag: Tag }[];
}

// Add EvalRun type (basic for now)
export interface EvalRun {
  id: string;
  evalId: string;
  status: string; // PENDING, RUNNING, COMPLETED, FAILED
  createdAt: string;
  updatedAt: string;
  // Add responses later
}

// Add types for Eval Run Results, including nested details

// Base Score type (aligns with Prisma)
export interface Score {
  id: string;
  responseId: string;
  scoreValue?: number | null;
  justification?: string | null;
  scorerType: string; // 'manual' or 'llm'
  scorerLlmId?: string | null;
  createdAt: string;
}

// Response type including relations needed for results table
export interface ResponseResult {
  id: string;
  evalRunId: string;
  questionId: string;
  modelId: string;
  responseText?: string | null;
  error?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  executionTimeMs?: number | null;
  createdAt: string;
  question: Pick<Question, "id" | "text" | "createdAt">;
  model: Pick<Model, "id" | "name">;
  scores: Score[];
}

// Type for the overall EvalRun results data fetched from API
export interface EvalRunResults extends EvalRun {
  // Extends the basic EvalRun type
  eval: Pick<Eval, "id" | "name">; // Include basic eval info
  responses: ResponseResult[];
}

// Type for a single judgment entry (excluding redundant question info)
export interface JudgmentResult {
  id: string;
  questionId: string;
  judgeModelId: string;
  overallScore?: number | null;
  clarityScore?: number | null;
  difficultyScore?: number | null;
  relevanceScore?: number | null;
  originalityScore?: number | null;
  justification?: string | null;
  createdAt: string;
  judgeModel: Pick<Model, "id" | "name">; // Include judge model info
}

// Type for the grouped judgments data returned by the API
export interface JudgmentsByQuestion {
  [questionId: string]: {
    question: Pick<Question, "id" | "text">;
    judgments: JudgmentResult[];
  };
}

// Type for Leaderboard entry from backend
export interface LeaderboardEntry {
  modelId: string;
  modelName: string;
  averageScore?: number | null;
  totalRuns: number;
  totalResponses: number;
  totalCost?: number | null;
}

// Rename existing CostReportItem and add token fields
export interface CostReportItemWithTokens {
  modelId: string;
  modelName: string;
  totalCost: number | null;
  totalInputTokens: number | null; // Add token sums
  totalOutputTokens: number | null; // Add token sums
  responseCount: number;
}

// Ensure this is exported
export interface ProviderModelListItem {
  id: string;
  name: string;
}

// Add other types as needed
