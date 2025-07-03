import React, { useState } from 'react';
import { Model } from '../../types';
import Button from '../../components/common/Button';
import Checkbox from '../../components/common/Checkbox'; // Assuming Checkbox component exists
import ErrorMessage from '../../components/common/ErrorMessage';
import Spinner from '../../components/common/Spinner';
import styles from './EvalRunConfig.module.css';

interface EvalRunConfigProps {
    evalId: string;
    availableModels: Model[];
    isLoadingModels: boolean;
    modelsError?: string | null;
    onSubmit: (selectedModelIds: string[]) => void;
    onClose: () => void;
    isSubmitting: boolean;
}

function EvalRunConfig({
    availableModels,
    isLoadingModels,
    modelsError,
    onSubmit,
    onClose,
    isSubmitting,
}: EvalRunConfigProps) {
    const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const handleCheckboxChange = (modelId: string, isChecked: boolean) => {
        setError(null); // Clear error on selection change
        setSelectedModelIds((prev) => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(modelId);
            } else {
                newSet.delete(modelId);
            }
            return newSet;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedModelIds.size === 0) {
            setError('Please select at least one model to run the evaluation against.');
            return;
        }
        setError(null);
        onSubmit(Array.from(selectedModelIds));
        // onClose will typically be called by the mutation's onSuccess handler in the parent
    };

    return (
        <form onSubmit={handleSubmit} className={styles.configForm}>
            <h4>Select Target Models</h4>
            <div className={styles.modelList}>
                {isLoadingModels && <Spinner />}
                {modelsError && <ErrorMessage message={modelsError} />}
                {!isLoadingModels && !modelsError && availableModels.length === 0 && (
                    <p>No models configured yet. Please add models first.</p>
                )}
                {!isLoadingModels && !modelsError && availableModels.map((model) => (
                    <Checkbox
                        key={model.id}
                        label={model.name}
                        id={`model-${model.id}`}
                        checked={selectedModelIds.has(model.id)}
                        onChange={(e) => handleCheckboxChange(model.id, e.target.checked)}
                        disabled={isSubmitting}
                    />
                ))}
            </div>

            {error && <ErrorMessage message={error} />}

            <div className={styles.formActions}>
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={isSubmitting || isLoadingModels || availableModels.length === 0}
                >
                    Start Run
                </Button>
            </div>
        </form>
    );
}

export default EvalRunConfig;

// Basic CSS (Create EvalRunConfig.module.css)
/*
.configForm {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.modelList {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 1rem;
    background-color: var(--color-background-secondary);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.formActions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
}
*/ 