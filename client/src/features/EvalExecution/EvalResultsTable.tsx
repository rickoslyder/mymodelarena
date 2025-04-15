import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { EvalRunResults, ResponseResult, Question } from '../../types';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ManualScoreInput from '../ResponseScoring/ManualScoreInput';
import ScoreDisplay from '../ResponseScoring/ScoreDisplay';
import styles from './EvalResultsTable.module.css';
// Import ManualScoreInput later

interface EvalResultsTableProps {
    runId: string;
}

// Helper function to format cost (optional)
const formatCost = (cost: number | null | undefined): string => {
    if (cost === null || cost === undefined) return 'N/A';
    return `$${cost.toFixed(5)}`; // Display cost with 5 decimal places
};

const EvalResultsTable: React.FC<EvalResultsTableProps> = ({ runId }) => {

    const { data: results, isLoading, error, isError } = useQuery<EvalRunResults, Error>({
        queryKey: ['evalRunResults', runId],
        queryFn: () => api.getEvalRunResults(runId),
        enabled: !!runId,
    });

    // Process results data for table rendering
    const processedData = useMemo(() => {
        // Define the specific type for question data needed
        type ProcessedQuestion = Pick<Question, 'id' | 'text' | 'createdAt'>;
        const initialState = {
            questions: [] as ProcessedQuestion[],
            modelIds: [] as string[],
            modelNames: [] as string[], // Initialize modelNames
            responsesByQuestion: {} as Record<string, Record<string, ResponseResult>>
        };
        if (!results?.responses) return initialState;

        // Use the specific type for the map value
        const questionsMap = new Map<string, ProcessedQuestion>();
        const modelIdsSet = new Set<string>();
        const responsesByQuestion: Record<string, Record<string, ResponseResult>> = {};

        results.responses.forEach(response => {
            if (!questionsMap.has(response.questionId)) {
                // Store necessary fields
                questionsMap.set(response.questionId, {
                    id: response.question.id,
                    text: response.question.text,
                    createdAt: response.question.createdAt
                });
            }
            modelIdsSet.add(response.modelId);
            if (!responsesByQuestion[response.questionId]) {
                responsesByQuestion[response.questionId] = {};
            }
            responsesByQuestion[response.questionId][response.modelId] = response;
        });

        const questions = Array.from(questionsMap.values()).sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const modelIds = Array.from(modelIdsSet).sort();
        const modelNames = modelIds.map(id => results.responses.find(r => r.modelId === id)?.model.name || id);

        return { questions, modelIds, modelNames, responsesByQuestion };

    }, [results]);

    // Handle loading and error states first
    if (isLoading) return <Spinner />;
    if (isError) return <ErrorMessage message={error?.message || `Failed to load results for run ${runId}.`} />;

    // Check if results object exists before accessing properties
    if (!results) return <ErrorMessage message={`Could not load data for run ${runId}.`} />;

    // Check run status only after confirming results exist
    if (results.status === 'PENDING' || results.status === 'RUNNING') {
        return (
            <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed var(--color-border)' }}>
                Evaluation run is currently {results.status.toLowerCase()}. Results will appear here once completed.
            </div>
        );
    }
    if (results.responses.length === 0 && results.status === 'COMPLETED') {
        return <ErrorMessage message={`Run ${runId} completed successfully, but no responses were generated (check run logs or model errors).`} />;
    }
    if (results.status === 'FAILED') {
        return <ErrorMessage message={`Run ${runId} failed. Check server logs for details.`} />;
    }

    const { questions, modelIds, modelNames, responsesByQuestion } = processedData;

    return (
        <div className={styles.resultsTableContainer}>
            <h3>Results for Eval: {results.eval.name} (Run ID: {runId})</h3>
            <table className={styles.resultsTable}>
                <thead>
                    <tr>
                        <th className={styles.questionColumn}>Question</th>
                        {modelNames.map((name, index) => (
                            <th key={modelIds[index]} className={styles.modelColumn}>{name}</th>
                        ))}
                        {/* Add Score column later if using manual scoring primarily */}
                        {/* <th className={styles.scoreCell}>Score</th> */}
                    </tr>
                </thead>
                <tbody>
                    {questions.map(question => (
                        <tr key={question.id}>
                            <td className={styles.questionColumn}>{question.text}</td>
                            {modelIds.map(modelId => {
                                // Ensure question entry exists before indexing modelId
                                const questionResponses = responsesByQuestion[question.id];
                                const response = questionResponses?.[modelId]; // Access safely
                                // Get the first score, if any (assuming one score per response for now)
                                const currentScore = response?.scores?.[0];

                                return (
                                    <td key={modelId}>
                                        {response ? (
                                            <div>
                                                {response.error ? (
                                                    <div className={styles.errorCell}>{response.error}</div>
                                                ) : (
                                                    <div className={styles.responseCell}>{response.responseText || '[No Response]'}</div>
                                                )}
                                                <div className={styles.tokenCell}>
                                                    Tokens: {response.inputTokens ?? '-'} / {response.outputTokens ?? '-'}
                                                </div>
                                                <div className={styles.costCell}>
                                                    Cost: {formatCost(response.cost)}
                                                </div>
                                                {/* Render ManualScoreInput */}
                                                <ManualScoreInput
                                                    responseId={response.id}
                                                    evalRunId={runId} // Pass runId for query invalidation
                                                    currentScore={currentScore}
                                                />
                                                {/* Add ScoreDisplay/ManualScoreInput here in Step 46/49 */}
                                                <div className={styles.scoreCell}>
                                                    <ScoreDisplay
                                                        responseId={response.id}
                                                        evalRunId={runId}
                                                        scores={response.scores || []}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            '-' // No response recorded for this model/question
                                        )}
                                    </td>
                                );
                            })}
                            {/* Add Score cell later */}
                            {/* <td></td> */}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EvalResultsTable; 