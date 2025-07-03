import axios from "axios";
import { Model } from "../types"; // Import the Model type
import { ModelFormData } from "../features/ModelManagement/ModelForm"; // Import form data type
import { EvalGenFormData } from "../features/EvalGeneration/EvalGenForm"; // Import type
import {
  Eval,
  EvalListItem,
  Question,
  Tag,
  EvalRunResults,
  Score,
  JudgmentsByQuestion,
  LeaderboardEntry,
  CostReportItemWithTokens,
} from "../types"; // Assuming Eval type will be defined in types/index.ts soon
import { LLMScoreConfigData } from "../features/ResponseScoring/LLMScoreConfig"; // Import type
import { JudgeModeConfigData } from "../features/JudgeMode/JudgeModeConfig"; // Import type

// Determine the base URL for the API
// In development, this usually points to your local server.
// In production, this would point to your deployed backend URL.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Generic error handler for API calls.
 * Attempts to extract a meaningful error message from the response.
 */
const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Error from backend (structured error response)
    if (
      error.response &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.message
    ) {
      return error.response.data.error.message;
    }
    // Network error or other Axios error
    return error.message;
  } else if (error instanceof Error) {
    // Standard JavaScript error
    return error.message;
  }
  // Fallback for unknown errors
  return "An unknown error occurred";
};

// --- API Functions ---

// Health Check (Example)
export const getHealth = async () => {
  try {
    const response = await apiClient.get("/health");
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// --- Model API Functions ---

export const getModels = async (): Promise<Model[]> => {
  try {
    // The backend currently returns { success: true, data: [...] }
    const response = await apiClient.get<{ success: boolean; data: Model[] }>(
      "/models"
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch models or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// Add getModelById later
// export const getModelById = async (id: string): Promise<Model> => { ... }

export const createModel = async (data: ModelFormData): Promise<Model> => {
  try {
    // Backend expects the data structure defined in ModelFormData
    const response = await apiClient.post<{ success: boolean; data: Model }>(
      "/models",
      data
    );
    if (response.data && response.data.success) {
      return response.data.data; // Return the newly created model from backend
    }
    throw new Error(
      "Failed to create model or backend returned unsuccessful status."
    );
  } catch (error) {
    // The error handler will attempt to parse backend validation errors
    throw new Error(handleApiError(error));
  }
};

export const updateModel = async (
  id: string,
  data: ModelFormData
): Promise<Model> => {
  try {
    const response = await apiClient.put<{ success: boolean; data: Model }>(
      `/models/${id}`,
      data
    );
    if (response.data && response.data.success) {
      return response.data.data; // Return the updated model
    }
    throw new Error(
      "Failed to update model or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteModel = async (id: string): Promise<void> => {
  try {
    // Backend returns 204 No Content on success
    await apiClient.delete(`/models/${id}`);
    // No data to return on successful delete
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// --- Eval API Functions ---

export const generateEvalSet = async (data: EvalGenFormData): Promise<Eval> => {
  // Return type might need adjustment based on backend
  try {
    // Transform frontend data format to backend expected format
    const backendData = {
      generatorModelId: data.generatorModelId,
      prompt: data.userPrompt, // Backend expects 'prompt', frontend sends 'userPrompt'
      numQuestions: data.numQuestions,
      evalName: data.evalName,
      evalDescription: data.evalDescription,
    };
    
    const response = await apiClient.post<{ success: boolean; data: Eval }>(
      "/evals",
      backendData
    );
    if (response.data && response.data.success) {
      return response.data.data; // Return the newly created eval set
    }
    throw new Error(
      "Failed to generate eval set or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getEvals = async (params?: {
  searchQuery?: string;
  status?: string;
  difficulty?: string;
  type?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
}): Promise<EvalListItem[]> => {
  try {
    // Pass filter params to backend (backend needs to implement filtering)
    const response = await apiClient.get<{
      success: boolean;
      data: EvalListItem[];
    }>("/evals", { params });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch evals or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getEvalById = async (id: string): Promise<Eval> => {
  try {
    const response = await apiClient.get<{ success: boolean; data: Eval }>(
      `/evals/${id}`
    );
    if (response.data && response.data.success) {
      return response.data.data; // Should include questions based on backend controller
    }
    throw new Error(
      "Failed to fetch eval details or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateEval = async (
  evalId: string,
  data: { name?: string; description?: string; difficulty?: string }
): Promise<Eval> => {
  try {
    const response = await apiClient.put<{ success: boolean; data: Eval }>(
      `/evals/${evalId}`,
      data
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to update evaluation or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// Add question update/delete later
// Add tag functions later

// --- Question API Functions ---

export const updateQuestion = async (
  evalId: string,
  questionId: string,
  data: { text: string }
): Promise<Question> => {
  try {
    const response = await apiClient.put<{ success: boolean; data: Question }>(
      `/evals/${evalId}/questions/${questionId}`,
      data
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to update question or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteQuestion = async (
  evalId: string,
  questionId: string
): Promise<void> => {
  try {
    await apiClient.delete(`/evals/${evalId}/questions/${questionId}`);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// --- Tag API Functions ---

export const getTags = async (): Promise<Tag[]> => {
  try {
    const response = await apiClient.get<{ success: boolean; data: Tag[] }>(
      "/tags"
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch tags or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Creates a new tag.
 */
export const createTag = async (name: string): Promise<Tag> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: Tag }>(
      "/tags",
      { name }
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to create tag or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateEvalTags = async (
  evalId: string,
  tagIds: string[]
): Promise<Eval> => {
  try {
    const response = await apiClient.put<{ success: boolean; data: Eval }>(
      `/evals/${evalId}/tags`,
      { tagIds }
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to update eval tags or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// --- Pricing API Functions ---

// Define the structure returned by the backend pricing endpoint
// Matches the ModelPrice structure from Prisma schema
interface ModelPriceData {
  id: string;
  Provider: string;
  ModelID: string;
  CanonicalID: string;
  ContextWindow: number;
  InputUSDPer1M: number;
  OutputUSDPer1M: number;
  Notes: string | null;
  Date: string; // Dates are typically strings in JSON
}

export const getLatestPricing = async (
  modelId: string
): Promise<ModelPriceData | null> => {
  if (!modelId) {
    return null; // Don't call API if no modelId
  }
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: ModelPriceData;
    }>(`/pricing`, { params: { modelId } });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    // If success is false or data is missing, it might mean no price found (404 handled below)
    // Or it could be another server issue.
    console.warn(
      `Pricing fetch for ${modelId} returned success=false or missing data.`
    );
    return null;
  } catch (error) {
    // Specifically check for 404 errors, which are expected if price isn't found
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // console.log(`No pricing data found for model ID: ${modelId}`);
      return null; // It's not an error, just no data
    }
    // For other errors, re-throw a formatted error message
    throw new Error(handleApiError(error));
  }
};

// --- Eval Run API Functions ---

interface CreateEvalRunPayload {
  evalId: string;
  modelIds: string[];
}

interface CreateEvalRunResponse {
  evalRunId: string;
}

export const createEvalRun = async (
  data: CreateEvalRunPayload
): Promise<CreateEvalRunResponse> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: CreateEvalRunResponse;
    }>("/eval-runs", data);
    if (response.data && response.data.success) {
      return response.data.data; // Returns { evalRunId: '...' }
    }
    throw new Error(
      "Failed to start eval run or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getEvalRunStatus = async (runId: string) => {
  try {
    const response = await apiClient.get(`/eval-runs/${runId}/status`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch eval run status or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getEvalRunResults = async (
  runId: string
): Promise<EvalRunResults> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: EvalRunResults;
    }>(`/eval-runs/${runId}/results`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch eval run results or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// --- Score API Functions ---

interface AddManualScorePayload {
  responseId: string;
  scoreValue: number;
}

export const addManualScore = async (
  data: AddManualScorePayload
): Promise<Score> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: Score }>(
      "/scores/manual",
      data
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to add manual score or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

interface TriggerLlmScoringPayload extends LLMScoreConfigData {
  evalRunId: string;
}

export const triggerLlmScoring = async (
  data: TriggerLlmScoringPayload
): Promise<{ message: string }> => {
  try {
    // Backend responds with 202 Accepted and a message
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>("/scores/llm", data);
    if (response.data && response.data.success) {
      return { message: response.data.message };
    }
    throw new Error(
      "Failed to trigger LLM scoring or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// --- Judgment API Functions ---

interface TriggerJudgingPayload extends JudgeModeConfigData {
  evalId: string;
}

export const triggerJudging = async (
  data: TriggerJudgingPayload
): Promise<{ message: string }> => {
  try {
    // Backend responds with 202 Accepted and a message
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>("/judgments", data); // Endpoint should likely be /judgments based on controller/routes
    if (response.data && response.data.success) {
      return { message: response.data.message };
    }
    throw new Error(
      "Failed to trigger judging or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getJudgmentsForEval = async (
  evalId: string
): Promise<JudgmentsByQuestion> => {
  const response = await apiClient.get(`/evals/${evalId}/judgments`);
  return response.data.data;
};

// --- Reporting API Functions ---

export const getLeaderboardData = async (): Promise<LeaderboardEntry[]> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: LeaderboardEntry[];
    }>("/reports/leaderboard");
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch leaderboard data or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getCostReportData = async (): Promise<
  CostReportItemWithTokens[]
> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: CostReportItemWithTokens[];
    }>("/reports/costs");
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch cost report data or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// Type for the standardized model list from provider endpoint
export interface ProviderModelListItem {
  id: string;
  name: string;
}

// --- Provider API Functions ---

export const listProviderModels = async (
  provider: string
): Promise<ProviderModelListItem[]> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: ProviderModelListItem[];
    }>(`/providers/${provider}/models`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      `Failed to fetch models for provider ${provider} or backend returned unsuccessful status.`
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Fetches the results of the latest completed/failed run for a specific eval.
 */
export const getLatestEvalRunResults = async (
  evalId: string
): Promise<EvalRunResults | null> => {
  const response = await apiClient.get(`/evals/${evalId}/latest-run/results`);
  return response.data.data; // API returns null in data field if no runs found
};

/**
 * Deletes a specific model response.
 */
export const deleteResponse = async (responseId: string): Promise<void> => {
  // DELETE request typically returns 204 No Content on success, so no response body expected.
  await apiClient.delete(`/responses/${responseId}`);
};

/**
 * Deletes a specific judgment.
 */
export const deleteJudgment = async (judgmentId: string): Promise<void> => {
  await apiClient.delete(`/judgments/${judgmentId}`);
};

/**
 * Deletes an entire evaluation set and all related data.
 */
export const deleteEval = async (evalId: string): Promise<void> => {
  await apiClient.delete(`/evals/${evalId}`);
};

/**
 * Regenerates questions for an evaluation set.
 */
export const regenerateEvalQuestions = async (
  evalId: string,
  numQuestions: number
): Promise<Eval> => {
  // Returns the updated Eval object
  const response = await apiClient.post<{ success: boolean; data: Eval }>(
    `/evals/${evalId}/regenerate`,
    { numQuestions } // Send numQuestions in the body
  );
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error(
    "Failed to regenerate questions or backend returned unsuccessful status."
  );
};

/**
 * Generates additional questions for an evaluation set.
 */
export const generateAdditionalEvalQuestions = async (
  evalId: string,
  numQuestions: number
): Promise<Eval> => {
  // Returns the updated Eval object
  const response = await apiClient.post<{ success: boolean; data: Eval }>(
    `/evals/${evalId}/add-questions`,
    { numQuestions } // Send numQuestions in the body
  );
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error(
    "Failed to generate additional questions or backend returned unsuccessful status."
  );
};

// --- Template API Functions ---

export interface EvalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  prompt: string;
  isPublic: boolean;
  isBuiltIn: boolean;
  defaultQuestionTypes: string[];
  defaultDifficulty: string;
  defaultFormat: string;
  defaultCount: number;
  tags: string[];
  examples: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export const getTemplates = async (params?: {
  category?: string;
  isPublic?: boolean;
  isBuiltIn?: boolean;
  search?: string;
}): Promise<EvalTemplate[]> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: EvalTemplate[];
    }>("/templates", { params });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch templates or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getTemplateById = async (id: string): Promise<EvalTemplate> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: EvalTemplate;
    }>(`/templates/${id}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch template or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const getTemplateCategories = async (): Promise<{name: string, count: number}[]> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: {name: string, count: number}[];
    }>("/templates/categories");
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch template categories or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const incrementTemplateUsage = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/templates/${id}/use`);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// Template CRUD operations
export interface CreateTemplateData {
  name: string;
  description: string;
  category: string;
  icon?: string;
  prompt: string;
  isPublic: boolean;
  defaultQuestionTypes: string[];
  defaultDifficulty: string;
  defaultFormat: string;
  defaultCount: number;
  tags: string[];
  examples: string[];
}

export const createTemplate = async (data: CreateTemplateData): Promise<EvalTemplate> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: EvalTemplate;
    }>("/templates", data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to create template or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const updateTemplate = async (
  id: string,
  data: Partial<CreateTemplateData>
): Promise<EvalTemplate> => {
  try {
    const response = await apiClient.put<{
      success: boolean;
      data: EvalTemplate;
    }>(`/templates/${id}`, data);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to update template or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/templates/${id}`);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// Enhanced eval generation
export interface EnhancedEvalGenData {
  generatorModelIds: string[];
  userPrompt?: string;
  templateId?: string;
  numQuestions: number;
  questionTypes?: string[];
  difficulty?: string;
  format?: string;
  evalName?: string;
  evalDescription?: string;
  mode?: 'guided' | 'advanced';
}

export const generateEvalSetEnhanced = async (data: EnhancedEvalGenData): Promise<Eval> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: Eval }>(
      "/evals/enhanced",
      data
    );
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to generate enhanced eval set or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

// Add other API functions as needed...

export default apiClient;
