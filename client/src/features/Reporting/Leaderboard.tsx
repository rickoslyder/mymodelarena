import React from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { LeaderboardEntry } from '../../types';
import Table, { ColumnDefinition } from '../../components/common/Table';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
// Import styles if needed

// Helper to format score (optional)
const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'N/A';
    return score.toFixed(2); // Display score with 2 decimal places
};

// Helper to format cost (optional, reuse from EvalResultsTable?)
const formatCost = (cost: number | null | undefined): string => {
    if (cost === null || cost === undefined) return 'N/A';
    return `$${cost.toFixed(5)}`;
};

const Leaderboard: React.FC = () => {

    const { data: leaderboardData, isLoading, error, isError } = useQuery<LeaderboardEntry[], Error>({
        queryKey: ['leaderboard'],
        queryFn: api.getLeaderboardData,
        // Leaderboard might not need frequent refetching unless underlying data changes rapidly
        staleTime: 1000 * 60 * 15, // 15 minutes
    });

    // Define columns for the table
    const columns: ColumnDefinition<LeaderboardEntry>[] = [
        { key: 'modelName', header: 'Model', sortable: true },
        {
            key: 'averageScore',
            header: 'Avg. Score',
            render: (item) => formatScore(item.averageScore),
            sortable: true
        },
        { key: 'totalRuns', header: 'Total Runs', sortable: true },
        { key: 'totalResponses', header: 'Total Responses', sortable: true },
        {
            key: 'totalCost',
            header: 'Total Cost',
            render: (item) => formatCost(item.totalCost),
            sortable: true
        },
        // Add more columns as needed
    ];

    if (isLoading) return <Spinner />;
    if (isError) return <ErrorMessage message={error?.message || 'Failed to load leaderboard data.'} />;

    return (
        <div>
            <h2>Model Leaderboard</h2>
            <Table
                columns={columns}
                data={leaderboardData || []}
                keyExtractor={(item) => item.modelId}
            />
        </div>
    );
};

export default Leaderboard; 