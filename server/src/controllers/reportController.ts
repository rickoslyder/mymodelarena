import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { Prisma, Model } from "@prisma/client";

// --- Leaderboard ---
// Structure for leaderboard data point
interface LeaderboardEntry {
  modelId: string;
  modelName: string;
  averageScore?: number | null;
  totalRuns: number;
  totalResponses: number;
  totalCost?: number | null;
}

// Type for the result of the score query
type ScoreWithModelInfo = Prisma.ScoreGetPayload<{
  select: {
    scoreValue: true;
    response: {
      select: {
        modelId: true;
        model: { select: { name: true } };
      };
    };
  };
}>;

// Type for the result of the cost groupBy query - add token sums
type CostAndTokenAggregate = {
  modelId: string;
  _sum: {
    cost: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
  };
  _count: { id: number };
};

// Type for the minimal response info for run counting
type RunResponseInfo = {
  modelId: string;
  evalRunId: string;
};

// Type for the final cost report item - add token sums
interface CostReportItemWithTokens {
  modelId: string;
  modelName: string;
  totalCost: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  responseCount: number;
}

export const getLeaderboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Basic Leaderboard: Average score per model across all COMPLETED runs
  try {
    // 1. Aggregate response count per model per run (Removed problematic _avg score aggregation)
    const responseCounts = await prisma.response.groupBy({
      by: ["modelId", "evalRunId"],
      where: {
        evalRun: { status: "COMPLETED" },
        error: null,
        // scores: { some: {} } // Keep filter if you only want runs with scores counted
      },
      // REMOVED _avg block for scores
      _count: {
        id: true, // Count number of responses per model per run
      },
    });

    // Fetch all relevant scores and calculate average in code (existing code)
    const allScores: ScoreWithModelInfo[] = await prisma.score.findMany({
      where: {
        response: {
          evalRun: { status: "COMPLETED" },
          error: null, // Only score successful responses
        },
        scoreValue: { not: null }, // Only consider non-null scores
      },
      select: {
        scoreValue: true,
        response: {
          select: {
            modelId: true,
            model: { select: { name: true } }, // Get model name
          },
        },
      },
    });

    // Calculate average score per model
    const scoresByModel: Record<
      string,
      { totalScore: number; count: number; modelName: string }
    > = {};
    allScores.forEach((score: ScoreWithModelInfo) => {
      const modelId = score.response.modelId;
      const modelName = score.response.model.name;
      if (!scoresByModel[modelId]) {
        scoresByModel[modelId] = {
          totalScore: 0,
          count: 0,
          modelName: modelName,
        };
      }
      scoresByModel[modelId].totalScore += score.scoreValue!;
      scoresByModel[modelId].count++;
    });

    // 2. Aggregate total cost and response count per model
    const costAndTokenAggregates = await prisma.response.groupBy({
      by: ["modelId"],
      where: {
        evalRun: { status: "COMPLETED" },
      },
      _sum: { cost: true, inputTokens: true, outputTokens: true }, // Added token sums
      _count: { id: true },
    });

    // 3. Aggregate total runs per model
    const runsPerModel = await prisma.response.groupBy({
      by: ["modelId"],
      where: {
        evalRun: { status: "COMPLETED" },
      },
      _count: {
        evalRunId: true, // Count distinct runs? This counts responses per run. Need distinct.
      },
    });
    // Getting distinct run count per model with groupBy is tricky.
    // Alternative: Fetch all responses and count unique runs in code.
    const allRunResponses: RunResponseInfo[] = await prisma.response.findMany({
      where: { evalRun: { status: "COMPLETED" } },
      select: { modelId: true, evalRunId: true },
    });
    const distinctRunsByModel: Record<string, Set<string>> = {};
    allRunResponses.forEach((r: RunResponseInfo) => {
      if (!distinctRunsByModel[r.modelId]) {
        distinctRunsByModel[r.modelId] = new Set();
      }
      distinctRunsByModel[r.modelId].add(r.evalRunId);
    });

    // 4. Combine the data
    const leaderboard: LeaderboardEntry[] = Object.keys(scoresByModel).map(
      (modelId) => {
        const scoreData = scoresByModel[modelId];
        const costData = costAndTokenAggregates.find(
          (agg) => agg.modelId === modelId
        );
        const totalRuns = distinctRunsByModel[modelId]?.size || 0;

        return {
          modelId: modelId,
          modelName: scoreData.modelName,
          averageScore:
            scoreData.count > 0 ? scoreData.totalScore / scoreData.count : null,
          totalRuns: totalRuns,
          totalResponses: costData?._count.id || 0,
          totalCost: costData?._sum.cost,
        };
      }
    );

    // Sort leaderboard (e.g., by average score descending)
    leaderboard.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));

    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

// --- Cost Reporting ---
export const getCostReportData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Remove explicit type annotation
    const costAndTokenData = await prisma.response.groupBy({
      by: ["modelId"],
      where: {
        cost: { not: null }, // Or filter based on tokens existing?
      },
      _sum: {
        cost: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: { id: true },
    });

    // Add model names
    const models: Pick<Model, "id" | "name">[] = await prisma.model.findMany({
      select: { id: true, name: true },
    });
    const modelMap = new Map(
      models.map((m: Pick<Model, "id" | "name">) => [m.id, m.name])
    );

    // Use the correct types here
    const report: CostReportItemWithTokens[] = costAndTokenData
      .map((item) => ({
        modelId: item.modelId,
        modelName: modelMap.get(item.modelId) || item.modelId,
        totalCost: item._sum.cost,
        totalInputTokens: item._sum.inputTokens,
        totalOutputTokens: item._sum.outputTokens,
        responseCount: item._count.id,
      }))
      .sort(
        (a: CostReportItemWithTokens, b: CostReportItemWithTokens) =>
          (b.totalCost ?? 0) - (a.totalCost ?? 0)
      );

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
