import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEvalRunStatus } from '../../lib/api';
import Spinner from '../../components/common/Spinner';
import LoadingState from '../../components/common/LoadingState';
import styles from './EvalRunProgress.module.css';

interface EvalRunProgressProps {
    runId: string;
    onStatusChange?: (status: string) => void;
    refreshInterval?: number; // ms
}

interface EvalRunStatus {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    updatedAt: string;
    eval: {
        id: string;
        name: string;
    };
    progress: {
        percentage: number;
        totalQuestions: number;
        totalResponses: number;
        successfulResponses: number;
        failedResponses: number;
    };
}

const EvalRunProgress: React.FC<EvalRunProgressProps> = ({ 
    runId, 
    onStatusChange,
    refreshInterval = 2000 // Default: poll every 2 seconds
}) => {
    const [previousStatus, setPreviousStatus] = useState<string>('');

    const { data: statusData, isLoading, error } = useQuery<EvalRunStatus>({
        queryKey: ['evalRunStatus', runId],
        queryFn: () => getEvalRunStatus(runId),
        refetchInterval: (query) => {
            // Stop polling if the run is completed or failed
            if (query.state.data?.status === 'COMPLETED' || query.state.data?.status === 'FAILED') {
                return false;
            }
            return refreshInterval;
        },
        refetchIntervalInBackground: true,
        staleTime: 1000, // Consider data stale after 1 second
    });

    // Call onStatusChange when status changes
    useEffect(() => {
        if (statusData?.status && statusData.status !== previousStatus) {
            setPreviousStatus(statusData.status);
            onStatusChange?.(statusData.status);
        }
    }, [statusData?.status, previousStatus, onStatusChange]);

    if (isLoading && !statusData) {
        return <LoadingState message="Loading run status..." />;
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>Failed to load run status: {error.message}</p>
            </div>
        );
    }

    if (!statusData) {
        return (
            <div className={styles.error}>
                <p>No status data available for run {runId}</p>
            </div>
        );
    }

    const { status, eval: evalInfo, progress } = statusData;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#6b7280'; // gray
            case 'RUNNING': return '#3b82f6'; // blue
            case 'COMPLETED': return '#10b981'; // green
            case 'FAILED': return '#ef4444'; // red
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return '⏳';
            case 'RUNNING': return '🔄';
            case 'COMPLETED': return '✅';
            case 'FAILED': return '❌';
            default: return '⏳';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.statusBadge} style={{ backgroundColor: getStatusColor(status) }}>
                    <span className={styles.statusIcon}>{getStatusIcon(status)}</span>
                    <span className={styles.statusText}>{status}</span>
                </div>
                <div className={styles.evalInfo}>
                    <h3 className={styles.evalName}>{evalInfo.name}</h3>
                    <p className={styles.runId}>Run ID: {runId}</p>
                </div>
            </div>

            {status === 'RUNNING' && (
                <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill} 
                            style={{ 
                                width: `${progress.percentage}%`,
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>
                    <div className={styles.progressText}>
                        {progress.percentage}% Complete ({progress.totalResponses} / {progress.totalQuestions} questions)
                    </div>
                </div>
            )}

            <div className={styles.metrics}>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Total Questions:</span>
                    <span className={styles.metricValue}>{progress.totalQuestions}</span>
                </div>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Completed:</span>
                    <span className={styles.metricValue}>{progress.totalResponses}</span>
                </div>
                <div className={styles.metric}>
                    <span className={styles.metricLabel}>Successful:</span>
                    <span className={styles.metricValue} style={{ color: '#10b981' }}>
                        {progress.successfulResponses}
                    </span>
                </div>
                {progress.failedResponses > 0 && (
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Failed:</span>
                        <span className={styles.metricValue} style={{ color: '#ef4444' }}>
                            {progress.failedResponses}
                        </span>
                    </div>
                )}
            </div>

            {status === 'RUNNING' && (
                <div className={styles.liveIndicator}>
                    <Spinner size="sm" />
                    <span>Live updates every {refreshInterval / 1000}s</span>
                </div>
            )}
        </div>
    );
};

export default EvalRunProgress; 