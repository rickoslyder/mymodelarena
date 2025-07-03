import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';
import { EvalRunResults } from '../types';
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EvalResultsTable from '../features/EvalExecution/EvalResultsTable';
import styles from './EvalRunPage.module.css'; // Make sure this file exists

function EvalRunPage() {
    // Get both evalId and runId from URL parameters
    const { evalId, runId } = useParams<{ evalId: string; runId: string }>();

    // Fetch Eval Run Results
    const { data: results, isLoading, error, isError } = useQuery<
        EvalRunResults,
        Error
    >({
        queryKey: ['evalRunResults', runId], // Use runId in the query key
        queryFn: () => api.getEvalRunResults(runId!),
        enabled: !!runId, // Only run query if runId exists
        // Optional: Add refetching/polling logic if needed for runs that might still be in progress
        // refetchInterval: data => (data?.status === 'RUNNING' || data?.status === 'PENDING') ? 5000 : false,
    });

    // Render Logic
    if (!evalId || !runId) {
        return <ErrorMessage message="Missing Evaluation ID or Run ID in URL." />;
    }

    return (
        <div className={styles.container}>
            {/* Add link back to eval detail page */}
            <Link to={`/evals/${evalId}`} className={styles.backLink}>&larr; Back to Eval Details</Link>
            <h2>Evaluation Run Results</h2>
            {/* Display eval name if available in results? results?.eval?.name */}
            {/* <p>Evaluation: {results?.eval?.name || evalId}</p> */}
            <p>Run ID: {runId}</p>

            {isLoading && <Spinner />}
            {isError && <ErrorMessage message={error?.message || `Failed to load results for run ${runId}.`} />}
            {/* Pass results to the table component */}
            {results && <EvalResultsTable results={results} />}
        </div>
    );
}

export default EvalRunPage;

// CSS needed for styles.container, styles.backLink
/*
.container {
    padding: 1rem; // Minimal padding
}

.backLink {
    display: inline-block;
    margin-bottom: 1rem;
    color: var(--color-primary);
    text-decoration: none;
}
.backLink:hover {
    text-decoration: underline;
}
*/ 