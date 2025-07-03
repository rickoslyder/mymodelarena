import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { EvalRunResults, ResponseResult, Question } from '../../types';
import ErrorMessage from '../../components/common/ErrorMessage';
import ManualScoreInput from '../ResponseScoring/ManualScoreInput';
import ScoreDisplay from '../ResponseScoring/ScoreDisplay';
import LLMScoreConfig, { LLMScoreConfigData } from '../ResponseScoring/LLMScoreConfig';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import styles from './EvalResultsTable.module.css';

interface EvalResultsTableProps {
    results: EvalRunResults;
}

const formatCost = (cost: number | null | undefined): string => {
    if (cost === null || cost === undefined) return 'N/A';
    return `$${cost.toFixed(5)}`;
};

const EvalResultsTable: React.FC<EvalResultsTableProps> = ({ results }) => {

    const queryClient = useQueryClient();

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
    const [isLLMScoreModalOpen, setIsLLMScoreModalOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteResponse(id),
        onSuccess: () => {
            console.log("Response deleted successfully");
            queryClient.invalidateQueries({ queryKey: ['evalRunResults', results.id] });
            queryClient.invalidateQueries({ queryKey: ['latestEvalRunResults', results.eval.id] });
            handleCloseConfirmModal();
        },
        onError: (error) => {
            console.error("Error deleting response:", error);
            alert(`Failed to delete response: ${error.message}`);
        },
    });

    const llmScoreMutation = useMutation({
        mutationFn: (data: LLMScoreConfigData & { evalRunId: string }) => api.triggerLlmScoring(data),
        onSuccess: () => {
            console.log("LLM scoring initiated successfully");
            queryClient.invalidateQueries({ queryKey: ['evalRunResults', results.id] });
            queryClient.invalidateQueries({ queryKey: ['latestEvalRunResults', results.eval.id] });
            setIsLLMScoreModalOpen(false);
        },
        onError: (error) => {
            console.error("Error starting LLM scoring:", error);
            alert(`Failed to start LLM scoring: ${error.message}`);
        },
    });

    const handleOpenConfirmModal = (responseId: string) => {
        setResponseToDelete(responseId);
        setIsConfirmModalOpen(true);
    };

    const handleCloseConfirmModal = () => {
        setResponseToDelete(null);
        setIsConfirmModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (responseToDelete) {
            deleteMutation.mutate(responseToDelete);
        }
    };

    const handleOpenLLMScoreModal = () => {
        setIsLLMScoreModalOpen(true);
    };

    const handleCloseLLMScoreModal = () => {
        setIsLLMScoreModalOpen(false);
    };

    const handleLLMScoreSubmit = (configData: LLMScoreConfigData) => {
        llmScoreMutation.mutate({ ...configData, evalRunId: results.id });
    };

    const processedData = useMemo(() => {
        type ProcessedQuestion = Pick<Question, 'id' | 'text' | 'createdAt'>;
        const initialState = {
            questions: [] as ProcessedQuestion[],
            modelIds: [] as string[],
            modelNames: [] as string[],
            responsesByQuestion: {} as Record<string, Record<string, ResponseResult>>
        };
        if (!results?.responses) return initialState;

        const questionsMap = new Map<string, ProcessedQuestion>();
        const modelIdsSet = new Set<string>();
        const responsesByQuestion: Record<string, Record<string, ResponseResult>> = {};

        results.responses.forEach(response => {
            if (!questionsMap.has(response.questionId)) {
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

    if (!results) return <ErrorMessage message={`No results data provided.`} />;

    if (results.status === 'PENDING' || results.status === 'RUNNING') {
        return (
            <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed var(--color-border)' }}>
                Evaluation run is currently {results.status.toLowerCase()}. Results will appear here once completed.
            </div>
        );
    }
    if (results.responses.length === 0 && results.status === 'COMPLETED') {
        return <ErrorMessage message={`Run ${results.id} completed successfully, but no responses were generated (check run logs or model errors).`} />;
    }
    if (results.status === 'FAILED') {
        return <ErrorMessage message={`Run ${results.id} failed. Check server logs for details.`} />;
    }

    const { questions, modelIds, modelNames, responsesByQuestion } = processedData;
    const runId = results.id;

    return (
        <div className={styles.resultsTableContainer}>
            <div className={styles.resultsHeader}>
                <h3>Results for Eval: {results.eval?.name || 'Unknown Eval'} (Run ID: {runId})</h3>
                <div className={styles.headerActions}>
                    <Button
                        onClick={handleOpenLLMScoreModal}
                        variant="secondary"
                        size="sm"
                        disabled={llmScoreMutation.isPending || results.responses.length === 0}
                    >
                        Score with LLM
                    </Button>
                </div>
            </div>
            <table className={styles.resultsTable}>
                <thead>
                    <tr>
                        <th className={styles.questionColumn}>Question</th>
                        {modelNames.map((name, index) => (
                            <th key={modelIds[index]} className={styles.modelColumn}>{name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {questions.map(question => (
                        <tr key={question.id}>
                            <td className={styles.questionColumn}>{question.text}</td>
                            {modelIds.map(modelId => {
                                const questionResponses = responsesByQuestion[question.id];
                                const response = questionResponses?.[modelId];
                                const currentScore = response?.scores?.[0];
                                const isCostError = response?.error?.toLowerCase().includes('cost') || response?.error?.toLowerCase().includes('pricing');
                                const llmError = response?.error && !isCostError ? response.error : null;
                                const costError = isCostError ? response?.error : null;

                                return (
                                    <td key={modelId}>
                                        {response ? (
                                            <div className={styles.cellContent}>
                                                {(response.responseText || llmError) && (
                                                    <div className={styles.responseTextContainer}>
                                                        {llmError ? (
                                                            <div className={styles.errorCell}>{llmError}</div>
                                                        ) : (
                                                            <pre className={styles.responseText}>{response.responseText || '[No Response]'}</pre>
                                                        )}
                                                    </div>
                                                )}
                                                <div className={styles.metaContainer}>
                                                    <div className={styles.tokenCell}>
                                                        <span>Tokens: {response.inputTokens ?? '-'} / {response.outputTokens ?? '-'}</span>
                                                    </div>
                                                    <div className={styles.costCell}>
                                                        <span>Cost: {formatCost(response.cost)}</span>
                                                        {costError && <span className={styles.costError}> ({costError})</span>}
                                                    </div>
                                                </div>
                                                <div className={styles.scoringContainer}>
                                                    <ScoreDisplay
                                                        responseId={response.id}
                                                        evalRunId={runId}
                                                        scores={response.scores || []}
                                                    />
                                                    <ManualScoreInput
                                                        responseId={response.id}
                                                        evalRunId={runId}
                                                        currentScore={currentScore}
                                                    />
                                                </div>
                                                <div className={styles.actionContainer}>
                                                    <Button
                                                        onClick={() => handleOpenConfirmModal(response.id)}
                                                        variant="danger"
                                                        size="sm"
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={styles.noResponse}>N/A</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={handleCloseConfirmModal}
                onConfirm={handleConfirmDelete}
                title="Confirm Delete Response"
                message="Are you sure you want to permanently delete this model response? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
            />

            <Modal
                isOpen={isLLMScoreModalOpen}
                onClose={handleCloseLLMScoreModal}
                title="Configure LLM Scoring"
            >
                <LLMScoreConfig
                    evalRunId={results.id}
                    onSubmit={handleLLMScoreSubmit}
                    onClose={handleCloseLLMScoreModal}
                    isSubmitting={llmScoreMutation.isPending}
                />
            </Modal>
        </div>
    );
};

export default EvalResultsTable; 