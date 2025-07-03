import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Link } from 'react-router-dom';
import * as api from '../lib/api';
import { EvalListItem } from '../types';
import EvalList from '../features/EvalManagement/EvalList';
import LoadingState from '../components/common/LoadingState';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button';
import EvalFilter, { EvalFilterOptions } from '../components/advanced/EvalFilter';
import { useAppAlerts } from '../hooks/useAppAlerts';
import styles from './EvalsListPage.module.css';

function EvalsListPage() {
    const [filters, setFilters] = useState<EvalFilterOptions>({
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [debouncedSearch] = useDebounce(filters.search, 300);
    const alerts = useAppAlerts();

    // Create debounced filters for API call
    const debouncedFilters = useMemo(() => ({
        ...filters,
        search: debouncedSearch,
    }), [filters, debouncedSearch]);

    const { data: evals, isLoading, error, isError } = useQuery<EvalListItem[], Error>({
        queryKey: ['evals', debouncedFilters],
        queryFn: () => api.getEvals({ 
            searchQuery: debouncedFilters.search,
            status: debouncedFilters.status,
            difficulty: debouncedFilters.difficulty,
            type: debouncedFilters.type,
            tags: debouncedFilters.tags,
            sortBy: debouncedFilters.sortBy,
            sortOrder: debouncedFilters.sortOrder,
            dateRange: debouncedFilters.dateRange,
        }),
        placeholderData: (prevData) => prevData,
        onError: (error: Error) => {
            console.error('Failed to fetch evaluations:', error);
            alerts.showError('Failed to load evaluations. Please try again.');
        },
    });

    // Mock available tags - in real app this would come from API
    const availableTags = useMemo(() => [
        'programming', 'mathematics', 'science', 'language', 'logic', 
        'creative', 'analysis', 'beginner', 'advanced'
    ], []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1 className={styles.title}>Evaluations</h1>
                    <p className={styles.subtitle}>
                        Manage and run your evaluation sets
                    </p>
                </div>
                <Link to="/evals/generate">
                    <Button variant="primary">
                        Generate New Eval
                    </Button>
                </Link>
            </div>

            <EvalFilter
                filters={filters}
                onFiltersChange={setFilters}
                availableTags={availableTags}
                showAdvanced={showAdvancedFilters}
                onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
            />

            {isLoading && (
                <LoadingState 
                    message="Loading evaluations..." 
                    submessage="Fetching your evaluation sets"
                />
            )}
            
            {isError && (
                <ErrorMessage 
                    message={error?.message || 'Failed to load evaluations.'} 
                />
            )}

            {evals && evals.length > 0 && (
                <div className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <span className={styles.resultsCount}>
                            {evals.length} evaluation{evals.length !== 1 ? 's' : ''} found
                        </span>
                    </div>
                    <EvalList evals={evals} />
                </div>
            )}

            {evals && evals.length === 0 && !isLoading && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📝</div>
                    <h3>No evaluations found</h3>
                    <p>No evaluation sets match your current filters. Try adjusting your search criteria or create a new evaluation.</p>
                    <Link to="/evals/generate">
                        <Button>Generate Your First Evaluation</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default EvalsListPage; 