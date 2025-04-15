import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Score } from '../../types';
import styles from './ManualScoreInput.module.css';

interface ManualScoreInputProps {
    responseId: string;
    evalRunId: string; // Needed for query invalidation key
    currentScore?: Score | null;
}

// Example: Use a 1-5 rating scale
const SCORE_OPTIONS = [1, 2, 3, 4, 5];

const ManualScoreInput: React.FC<ManualScoreInputProps> = ({ responseId, evalRunId, currentScore }) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<Score, Error, { responseId: string; scoreValue: number }>({
        mutationFn: api.addManualScore, // Assumes api.addManualScore exists
        onSuccess: (newScore) => {
            // Optimistically update the cache or refetch
            console.log('Manual score saved:', newScore);
            // Invalidate the results query to show the update
            queryClient.invalidateQueries({ queryKey: ['evalRunResults', evalRunId] });
        },
        onError: (error) => {
            console.error("Failed to save manual score:", error.message);
            alert(`Failed to save score: ${error.message}`);
        }
    });

    const handleScoreClick = (scoreValue: number) => {
        if (mutation.isPending) return; // Prevent multiple clicks while submitting
        // Avoid resubmitting the same score (optional)
        if (currentScore?.scorerType === 'manual' && currentScore?.scoreValue === scoreValue) return;

        mutation.mutate({ responseId, scoreValue });
    };

    const manualScoreValue = currentScore?.scorerType === 'manual' ? currentScore?.scoreValue : null;

    return (
        <div className={styles.container}>
            <div className={styles.buttons}>
                {SCORE_OPTIONS.map(value => (
                    <button
                        key={value}
                        type="button"
                        className={`${styles.scoreButton} ${manualScoreValue === value ? styles.active : ''} ${mutation.isPending && mutation.variables?.scoreValue === value ? styles.loading : ''}`}
                        onClick={() => handleScoreClick(value)}
                        disabled={mutation.isPending} // Disable all buttons while submitting
                        aria-pressed={manualScoreValue === value}
                        title={`Score ${value}`}
                    >
                        {value}
                    </button>
                ))}
            </div>
            {currentScore && currentScore.scorerType !== 'manual' && (
                <span className={styles.scoreInfo}>LLM Score: {currentScore.scoreValue}</span>
            )}
            {mutation.isError && (
                <span className={`${styles.scoreInfo} ${styles.error}`}>Error saving!</span>
            )}
        </div>
    );
};

export default ManualScoreInput; 