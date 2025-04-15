import React from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { JudgmentsByQuestion } from '../../types';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import styles from './JudgeResultsDisplay.module.css';

interface JudgeResultsDisplayProps {
    evalId: string;
}

const JudgeResultsDisplay: React.FC<JudgeResultsDisplayProps> = ({ evalId }) => {

    const { data: judgmentsData, isLoading, error, isError } = useQuery<JudgmentsByQuestion, Error>({
        queryKey: ['judgments', evalId],
        queryFn: () => api.getJudgmentsForEval(evalId),
        enabled: !!evalId,
        // Add staleTime if judgments aren't expected to change often once generated
        // staleTime: 1000 * 60 * 10, 
    });

    if (isLoading) return <Spinner />;
    // Don't render error here if parent component handles it, or style differently
    if (isError) return <ErrorMessage message={error?.message || 'Failed to load judgments.'} />;

    // Check if data exists and has entries
    const questionIds = judgmentsData ? Object.keys(judgmentsData) : [];
    if (!judgmentsData || questionIds.length === 0) {
        return (
            <div className={styles.container}>
                <h2 className={styles.title}>Judge Results</h2>
                <p className={styles.noJudgments}>No judgments have been generated for this evaluation set yet. Use the "Judge Questions" button to start.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Judge Results</h2>
            {questionIds.map(qId => {
                const entry = judgmentsData[qId];
                if (!entry) return null; // Should not happen
                return (
                    <div key={qId} className={styles.questionBlock}>
                        <p className={styles.questionText}><strong>Q:</strong> {entry.question.text}</p>
                        <div className={styles.judgmentsGrid}>
                            {entry.judgments.length > 0 ? (
                                entry.judgments.map(judgment => (
                                    <div key={judgment.id} className={styles.judgmentCard}>
                                        <div className={styles.judgeInfo}>
                                            <span className={styles.judgeName}>{judgment.judgeModel.name}</span>
                                            <span className={styles.judgeScore}>{judgment.overallScore?.toFixed(1) ?? 'N/A'}</span>
                                        </div>
                                        {judgment.justification && (
                                            <p className={styles.judgeJustification}>"{judgment.justification}"</p>
                                        )}
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
    );
};

export default JudgeResultsDisplay; 