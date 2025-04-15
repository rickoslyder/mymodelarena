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
    const response = await apiClient.post<{ success: boolean; data: Eval }>(
      "/evals/generate",
      data
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
  tags?: string[];
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

// Add updateEval, deleteEval later
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
    // Backend responds with 202 Accepted
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>("/judgments", data);
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
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: JudgmentsByQuestion;
    }>(`/evals/${evalId}/judgments`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(
      "Failed to fetch judgments or backend returned unsuccessful status."
    );
  } catch (error) {
    throw new Error(handleApiError(error));
  }
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

export default apiClient;
