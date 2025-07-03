import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { JudgmentsByQuestion, JudgmentResult } from '../../types';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import styles from './JudgeResultsDisplay.module.css';

interface JudgeResultsDisplayProps {
    evalId: string;
}

const JudgeResultsDisplay: React.FC<JudgeResultsDisplayProps> = ({ evalId }) => {

    const queryClient = useQueryClient();

    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [judgmentToDeleteId, setJudgmentToDeleteId] = useState<string | null>(null);

    const { data: judgmentsData, isLoading, error, isError } = useQuery<JudgmentsByQuestion, Error>({
        queryKey: ['judgments', evalId],
        queryFn: () => api.getJudgmentsForEval(evalId),
        enabled: !!evalId,
    });

    const deleteJudgmentMutation = useMutation<void, Error, string>({
        mutationFn: api.deleteJudgment,
        onSuccess: () => {
            console.log("Judgment deleted successfully");
            queryClient.invalidateQueries({ queryKey: ['judgments', evalId] });
            handleCloseConfirmDeleteModal();
        },
        onError: (error) => {
            console.error("Error deleting judgment:", error);
            alert(`Failed to delete judgment: ${error.message}`);
        },
    });

    const handleOpenConfirmDeleteModal = (judgmentId: string) => {
        setJudgmentToDeleteId(judgmentId);
        setIsConfirmDeleteModalOpen(true);
    };

    const handleCloseConfirmDeleteModal = () => {
        setJudgmentToDeleteId(null);
        setIsConfirmDeleteModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (judgmentToDeleteId) {
            deleteJudgmentMutation.mutate(judgmentToDeleteId);
        }
    };

    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen(!isOpen);

    const aggregateScore = judgmentsData
        ? Object.values(judgmentsData).reduce((acc, entry) => {
            const validJudgments = entry.judgments.filter((j: JudgmentResult) => typeof j.overallScore === 'number');
            const avgScoreForQuestion = validJudgments.length > 0
                ? validJudgments.reduce((sum, j: JudgmentResult) => sum + (j.overallScore || 0), 0) / validJudgments.length
                : 0;
            return acc + avgScoreForQuestion;
        }, 0) / Object.keys(judgmentsData).length
        : null;

    if (isLoading && !judgmentsData) return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Judge Results</h3>
                <Spinner size='sm' />
            </div>
        </div>
    );

    if (isError && !judgmentsData) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Judge Results</h3>
                </div>
                <div className={styles.content}>
                    <ErrorMessage message={error?.message || 'Failed to load judgments.'} />
                </div>
            </div>
        );
    }

    const questionIds = judgmentsData ? Object.keys(judgmentsData) : [];
    if (!judgmentsData || questionIds.length === 0) {
        return (
            <div className={styles.judgeResultsContainer}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Judge Results</h3>
                    <span className={styles.statusCollapsed}>(No judgments yet)</span>
                </div>
            </div>
        );
    }

    const judgeModelName = judgmentsData?.[questionIds[0]]?.judgments?.[0]?.judgeModel?.name || 'N/A';

    return (
        <>
            <div className={styles.judgeResultsContainer}>
                <button onClick={toggleOpen} className={`${styles.header} ${styles.toggleButton}`}>
                    <div className={styles.titleContainer}>
                        <h3 className={styles.title}>
                            Judge Results ({judgeModelName})
                        </h3>
                        {aggregateScore !== null && (
                            <span className={styles.aggregateScore}>(Avg Score: {aggregateScore.toFixed(2)})</span>
                        )}
                    </div>
                    <span className={styles.toggleIndicator}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                    <div className={styles.content}>
                        {isLoading && <Spinner size="sm" />}
                        {isError && <ErrorMessage message={`Failed to refresh judgments: ${error?.message}`} />}

                        {!isLoading && !isError && questionIds.map(qId => {
                            const entry = judgmentsData[qId];
                            if (!entry) return null;
                            return (
                                <div key={qId} className={styles.questionBlock}>
                                    <p className={styles.questionText}><strong>Q:</strong> {entry.question.text}</p>
                                    <div className={styles.judgmentsGrid}>
                                        {entry.judgments.length > 0 ? (
                                            entry.judgments.map((judgment: JudgmentResult) => (
                                                <div key={judgment.id} className={styles.judgmentCard}>
                                                    <div className={styles.judgeInfo}>
                                                        <span className={styles.judgeName}>{judgment.judgeModel.name}</span>
                                                        <span className={styles.judgeScore}>{judgment.overallScore?.toFixed(1) ?? 'N/A'}</span>
                                                    </div>
                                                    {judgment.justification && (
                                                        <p className={styles.judgeJustification}>"{judgment.justification}"</p>
                                                    )}
                                                    <div className={styles.judgmentActions}>
                                                        <Button
                                                            onClick={() => handleOpenConfirmDeleteModal(judgment.id)}
                                                            variant="danger"
                                                            size="sm"
                                                            disabled={deleteJudgmentMutation.isPending}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className={styles.noJudgments}>No judgments recorded for this question.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isConfirmDeleteModalOpen}
                onClose={handleCloseConfirmDeleteModal}
                onConfirm={handleConfirmDelete}
                title="Confirm Delete Judgment"
                message="Are you sure you want to permanently delete this judgment? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
};

export default JudgeResultsDisplay; 