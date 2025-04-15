import React from 'react';
import Spinner from '../../components/common/Spinner'; // Corrected path
import styles from './EvalRunProgress.module.css'; // Create this CSS module

interface EvalRunProgressProps {
    runId: string;
    status?: string; // Optional status from parent
    // Add more props later for detailed progress (e.g., current question, percentage)
}

const EvalRunProgress: React.FC<EvalRunProgressProps> = ({ runId, status }) => {
    // Basic placeholder - enhance later with real-time updates or polling
    let content = <p>Run {runId} is in progress...</p>;

    if (status === 'RUNNING') {
        content = (
            <div className={styles.progressContainer}>
                <Spinner size="md" />
                <p>Evaluation Run <strong>{runId}</strong> is currently running...</p>
                {/* Add detailed progress info here later */}
            </div>
        );
    } else if (status === 'COMPLETED') {
        content = <p>Evaluation Run <strong>{runId}</strong> completed successfully.</p>;
    } else if (status === 'FAILED') {
        content = <p>Evaluation Run <strong>{runId}</strong> failed.</p>;
    } // Add PENDING or other statuses if needed

    return (
        <div className={styles.container}>
            {content}
            {/* Add link to results table later */}
        </div>
    );
};

export default EvalRunProgress; 