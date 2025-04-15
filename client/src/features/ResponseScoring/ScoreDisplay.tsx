import React from 'react';
import { Score } from '../../types';
import ManualScoreInput from './ManualScoreInput'; // Import for interaction
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
    responseId: string;
    evalRunId: string;
    scores: Score[]; // Array of scores (might have multiple types)
}

// Helper to find the most relevant score (e.g., prefer manual, then latest LLM)
const getDisplayScore = (scores: Score[]): Score | null => {
    if (!scores || scores.length === 0) return null;
    const manualScore = scores.find(s => s.scorerType === 'manual');
    if (manualScore) return manualScore;
    // Find latest LLM score if no manual score
    const llmScores = scores.filter(s => s.scorerType === 'llm');
    if (llmScores.length > 0) {
        return llmScores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }
    return null; // Should not happen if array not empty, but for safety
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ responseId, evalRunId, scores }) => {
    const displayScore = getDisplayScore(scores);

    return (
        <div className={styles.container}>
            <ManualScoreInput
                responseId={responseId}
                evalRunId={evalRunId}
                currentScore={displayScore}
            />
            {displayScore && displayScore.scorerType === 'llm' && (
                <div style={{ marginTop: 'var(--space-1)' }}>
                    <span className={styles.scoreInfo}>LLM Scored:</span>
                    <span className={styles.scoreValue}>{displayScore.scoreValue?.toFixed(1) ?? 'N/A'}</span>
                    {displayScore.justification && (
                        <div className={styles.justification}>"{displayScore.justification}"</div>
                    )}
                </div>
            )}
            {/* Optionally show older scores or allow toggling? */}
        </div>
    );
};

export default ScoreDisplay; 