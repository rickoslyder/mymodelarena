import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Model } from '../../types';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import styles from './EvalRunConfig.module.css';

interface EvalRunConfigProps {
    evalId: string; // Keep in props definition for parent component usage
    onStartRun: (modelIds: string[]) => void; // Callback when starting run
    isRunning?: boolean; // Disable button while a run is in progress
}

const EvalRunConfig: React.FC<EvalRunConfigProps> = ({ /* evalId, */ onStartRun, isRunning = false }) => {
    const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
    const [errorMsg, setErrorMsg] = useState<string | null>(null); // State for error message

    // Fetch available models
    const { data: models, isLoading: isLoadingModels, error: modelsError, isError: isModelsError } = useQuery<Model[], Error>({
        queryKey: ['models'],
        queryFn: api.getModels,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;
        setSelectedModelIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(value);
            } else {
                newSet.delete(value);
            }
            return newSet;
        });
        setErrorMsg(null); // Clear error on change
    };

    const handleStartClick = () => {
        if (selectedModelIds.size === 0) {
            setErrorMsg('Please select at least one model to run the evaluation against.');
        } else {
            setErrorMsg(null); // Clear error message
            onStartRun(Array.from(selectedModelIds));
        }
    };

    if (isLoadingModels) return <Spinner />;
    if (isModelsError) return <ErrorMessage message={modelsError?.message || 'Failed to load models for configuration.'} />;
    if (!models || models.length === 0) return <ErrorMessage message="No models available to run evaluation." />;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Run Evaluation: Select Target Models</h2>
            <div className={styles.modelList}>
                {models.map(model => (
                    <div key={model.id} className={styles.modelItem}>
                        <label htmlFor={`model-${model.id}`}>
                            <input
                                type="checkbox"
                                id={`model-${model.id}`}
                                value={model.id}
                                checked={selectedModelIds.has(model.id)}
                                onChange={handleCheckboxChange}
                                disabled={isRunning}
                            />
                            {model.name}
                        </label>
                    </div>
                ))}
            </div>
            {errorMsg && <ErrorMessage message={errorMsg} />}
            <div className={styles.actions}>
                <Button
                    variant="primary"
                    onClick={handleStartClick}
                    disabled={selectedModelIds.size === 0 || isRunning}
                    isLoading={isRunning} // Show loading state on button if parent indicates run is starting/in progress
                >
                    Start Run
                </Button>
            </div>
        </div>
    );
};

export default EvalRunConfig; 