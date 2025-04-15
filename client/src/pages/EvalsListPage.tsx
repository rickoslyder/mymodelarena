import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { Link } from 'react-router-dom';
import * as api from '../lib/api';
import { EvalListItem } from '../types';
import EvalList from '../features/EvalManagement/EvalList';
import Spinner from '../components/common/Spinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import styles from './EvalsListPage.module.css';

function EvalsListPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
    // Add state for tag filters later

    const { data: evals, isLoading, error, isError } = useQuery<EvalListItem[], Error>({
        queryKey: ['evals', { search: debouncedSearchQuery }],
        queryFn: () => api.getEvals({ searchQuery: debouncedSearchQuery }),
        placeholderData: (prevData) => prevData,
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ flexGrow: 1 }}></div>
                <Link to="/evals/generate">
                    <Button variant="primary">
                        Generate New Eval
                    </Button>
                </Link>
            </div>

            <div className={styles.controls}>
                <div className={styles.searchControl}>
                    <Input
                        placeholder="Search evals by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {/* Add Filter Dropdowns/MultiSelect here later */}
            </div>

            {isLoading && <Spinner />}
            {isError && <ErrorMessage message={error?.message || 'Failed to load evaluations.'} />}

            {evals && evals.length > 0 && <EvalList evals={evals} />}

            {evals && evals.length === 0 && !isLoading && (
                <div className={styles.emptyState}>
                    No evaluation sets found matching your criteria. Try generating one!
                </div>
            )}
        </div>
    );
}

export default EvalsListPage; 