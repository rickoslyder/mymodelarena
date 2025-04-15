import React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast'; // Import toast
import * as api from '../lib/api';
import EvalRunConfig from '../features/EvalExecution/EvalRunConfig';
// EvalRunProgress might be removed if table handles status
// import EvalRunProgress from '../features/EvalExecution/EvalRunProgress'; 
import EvalResultsTable from '../features/EvalExecution/EvalResultsTable'; // Import results table
import ErrorMessage from '../components/common/ErrorMessage';
import Spinner from '../components/common/Spinner'; // Import Spinner
import Button from '../components/common/Button'; // Import Button
import Modal from '../components/common/Modal'; // Import Modal
import LLMScoreConfig, { LLMScoreConfigData } from '../features/ResponseScoring/LLMScoreConfig'; // Import LLMScoreConfig
import styles from './EvalRunPage.module.css'; // Import styles

interface CreateEvalRunResponse {
    evalRunId: string;
}

interface TriggerLlmScoringResponse {
    message: string;
}

function EvalRunPage() {
    const { id: evalId, runId: routeRunId } = useParams<{ id: string; runId?: string }>();

    // State tracks the ID of the run initiated *on this page load*
    const [initiatedRunId, setInitiatedRunId] = React.useState<string | null>(null);
    const [isScoringModalOpen, setIsScoringModalOpen] = React.useState(false);

    // Determine which run ID to display results for
    // Priority: run just initiated on this page > run ID from route param
    const displayRunId = initiatedRunId || routeRunId;

    const createRunMutation = useMutation<CreateEvalRunResponse, Error, { evalId: string; modelIds: string[] }>({
        mutationFn: api.createEvalRun,
        onSuccess: (data) => {
            console.log("Eval run started successfully, Run ID:", data.evalRunId);
            toast.success('Evaluation run started!'); // Toast success
            setInitiatedRunId(data.evalRunId);
            // Optional: Could navigate to /evals/:id/run/:runId here, but 
            // showing results directly is also fine.
        },
        onError: (error) => {
            console.error("Failed to start eval run:", error.message);
            toast.error(`Failed to start run: ${error.message}`); // Toast error
        }
    });

    const triggerScoringMutation = useMutation<TriggerLlmScoringResponse, Error, LLMScoreConfigData & { evalRunId: string }>({
        mutationFn: api.triggerLlmScoring,
        onSuccess: (data) => {
            console.log("LLM scoring trigger successful:", data.message);
            toast.success(data.message || 'LLM scoring initiated.');
            handleCloseScoringModal();
            // Note: We don't invalidate results here, as scoring happens async.
            // UI might need polling or websockets later to update scores in real-time.
        },
        onError: (error) => {
            console.error("Failed to trigger LLM scoring:", error.message);
            toast.error(`Failed to trigger LLM scoring: ${error.message}`); // Toast error
        }
    });

    const handleStartRun = (modelIds: string[]) => {
        if (!evalId) return;
        console.log(`Requesting run start for Eval ${evalId} with models:`, modelIds);
        setInitiatedRunId(null); // Clear previous initiated run ID
        createRunMutation.mutate({ evalId, modelIds });
    };

    const handleOpenScoringModal = () => setIsScoringModalOpen(true);
    const handleCloseScoringModal = () => {
        setIsScoringModalOpen(false);
        triggerScoringMutation.reset(); // Reset mutation state on close
    };

    const handleScoringSubmit = (configData: LLMScoreConfigData) => {
        if (!displayRunId) return;
        console.log('Submitting LLM scoring request:', { ...configData, evalRunId: displayRunId });
        triggerScoringMutation.mutate({ ...configData, evalRunId: displayRunId });
    };

    // If no evalId is found, show error
    if (!evalId) {
        return <ErrorMessage message="Evaluation ID not found in URL." />;
    }

    // If neither a run was just initiated nor a run ID was provided in the route, 
    // only show the config section.
    const shouldShowResults = !!displayRunId;
    const isTriggeringScore = triggerScoringMutation.isPending;

    return (
        <div className={styles.container}>
            {/* Remove H1, Header component handles title */}
            {/* <h1>Run Evaluation</h1> */}

            <div className={styles.configSection}>
                {!initiatedRunId && (
                    <EvalRunConfig
                        evalId={evalId!}
                        onStartRun={handleStartRun}
                        isRunning={createRunMutation.isPending}
                    />
                )}
            </div>

            {/* Spinner while initiating run */}
            {createRunMutation.isPending && (
                <div className={styles.statusSection}><Spinner /> Starting evaluation run...</div>
            )}

            {/* Display Results Table and Scoring Button */}
            {shouldShowResults && displayRunId && (
                <div className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <h2 className={styles.resultsTitle}>Run Results</h2>
                        <Button
                            onClick={handleOpenScoringModal}
                            disabled={isTriggeringScore}
                            isLoading={isTriggeringScore}
                        >
                            Score Responses with LLM
                        </Button>
                    </div>
                    <EvalResultsTable runId={displayRunId} />
                </div>
            )}

            {/* Optional: Add a button to start a new run if viewing results from route param? */}
            {routeRunId && !initiatedRunId && (
                <div style={{ marginTop: '2rem' }}>
                    {/* Button to potentially clear routeRunId and show config again? */}
                </div>
            )}

            {/* --- LLM Scoring Modal --- */}
            {displayRunId && (
                <Modal
                    isOpen={isScoringModalOpen}
                    onClose={handleCloseScoringModal}
                    title="Configure LLM Scoring"
                >
                    <LLMScoreConfig
                        evalRunId={displayRunId}
                        onSubmit={handleScoringSubmit}
                        onClose={handleCloseScoringModal}
                        isSubmitting={triggerScoringMutation.isPending}
                    />
                </Modal>
            )}
        </div>
    );
}

export default EvalRunPage; 