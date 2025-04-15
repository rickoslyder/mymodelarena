import React from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { CostReportItemWithTokens } from '../../types';
import Table, { ColumnDefinition } from '../../components/common/Table';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
// Import styles if needed

// Helper to format cost (reuse or define again)
const formatCost = (cost: number | null | undefined): string => {
    if (cost === null || cost === undefined) return 'N/A';
    return `$${cost.toFixed(5)}`;
};

const CostReport: React.FC = () => {

    const { data: costData, isLoading, error, isError } = useQuery<CostReportItemWithTokens[], Error>({
        queryKey: ['costReport'],
        queryFn: api.getCostReportData,
        staleTime: 1000 * 60 * 15, // 15 minutes
    });

    // Define columns for the table
    const columns: ColumnDefinition<CostReportItemWithTokens>[] = [
        { key: 'modelName', header: 'Model', sortable: true },
        {
            key: 'totalCost',
            header: 'Total Est. Cost',
            render: (item) => formatCost(item.totalCost),
            sortable: true
        },
        { key: 'responseCount', header: 'Response Count', sortable: true },
        // Add average cost per response later if needed
        {
            key: 'totalInputTokens',
            header: 'Input Tokens',
            render: (item) => item.totalInputTokens?.toLocaleString() ?? 'N/A',
            sortable: true
        },
        {
            key: 'totalOutputTokens',
            header: 'Output Tokens',
            render: (item) => item.totalOutputTokens?.toLocaleString() ?? 'N/A',
            sortable: true
        }
    ];

    if (isLoading) return <Spinner />;
    if (isError) return <ErrorMessage message={error?.message || 'Failed to load cost report data.'} />;

    return (
        <div style={{ marginTop: 'var(--space-8)' }}> {/* Add spacing */}
            <h2>Cost Report (by Model)</h2>
            <Table
                columns={columns}
                data={costData || []}
                keyExtractor={(item) => item.modelId} // Use modelId as key
            />
        </div>
    );
};

export default CostReport; 