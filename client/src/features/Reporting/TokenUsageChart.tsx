import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { CostReportItemWithTokens } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';

// Placeholder: Define data structure expected for the chart
interface TokenChartData {
    name: string; // e.g., Model Name
    inputTokens: number;
    outputTokens: number;
}

const TokenUsageChart: React.FC = () => {

    // Fetch the combined cost and token data
    const { data: reportData, isLoading, error, isError } = useQuery<CostReportItemWithTokens[], Error>({
        queryKey: ['costReport'], // Reuse costReport query key as it now contains token data
        queryFn: api.getCostReportData,
        staleTime: 1000 * 60 * 15, // Use same stale time as CostReport
    });

    // Transform data for the chart using useMemo
    const chartData = useMemo((): TokenChartData[] => {
        if (!reportData) return [];
        return reportData.map(item => ({
            name: item.modelName,
            inputTokens: item.totalInputTokens || 0, // Default to 0 if null
            outputTokens: item.totalOutputTokens || 0 // Default to 0 if null
        }));
    }, [reportData]);


    if (isLoading) return <Spinner />;
    if (isError) return <ErrorMessage message={error?.message || 'Failed to load token usage data.'} />;

    return (
        <div style={{ marginTop: 'var(--space-8)', height: '400px' }}> {/* Ensure container has height */}
            <h2>Token Usage (by Model)</h2>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="inputTokens" name="Input Tokens" fill="#8884d8" />
                        <Bar dataKey="outputTokens" name="Output Tokens" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <p>No token usage data available to display chart.</p>
            )}
        </div>
    );
};

export default TokenUsageChart; 