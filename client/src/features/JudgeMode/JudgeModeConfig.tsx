import React, { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Model } from '../../types';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import styles from './JudgeModeConfig.module.css';
import Textarea from '../../components/common/Textarea';
import Checkbox from '../../components/common/Checkbox';

export interface JudgeModeConfigData {
    judgeModelIds: string[];
    judgingPrompt: string;
}

interface JudgeModeConfigProps {
    evalId: string; // Keep in props for context
    onSubmit: (data: JudgeModeConfigData) => void;
    isSubmitting?: boolean;
    // Add onClose if used in modal
}

const JudgeModeConfig: React.FC<JudgeModeConfigProps> = ({
    /* evalId, */
    onSubmit,
    isSubmitting = false
}) => {
    const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
    const [judgingPrompt, setJudgingPrompt] = useState(
        'Please rate the quality of the question on a scale of 1-10 (10=best) considering clarity, relevance, and difficulty. Provide a brief justification. Output ONLY JSON: { "overallScore": number, "justification": string }'
    );
    const [formError, setFormError] = useState<string | null>(null);
    const formErrorId = 'judge-mode-form-error'; // ID for aria-describedby

    // Fetch available models
    const { data: models, isLoading: isLoadingModels, error: modelsError, isError: isModelsError } = useQuery<Model[], Error>({
        queryKey: ['models'],
        queryFn: api.getModels,
        staleTime: 1000 * 60 * 5,
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
        setFormError(null); // Clear error on change
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJudgingPrompt(e.target.value);
        setFormError(null); // Clear error on change
    };

    const validateForm = (): boolean => {
        let hasError = false;
        if (selectedModelIds.size === 0) {
            setFormError('Please select at least one judge model.');
            hasError = true;
        }
        if (!judgingPrompt.trim()) {
            setFormError('Please provide judging instructions/prompt.');
            hasError = true;
        }
        if (!hasError) setFormError(null);
        return !hasError;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit({
                judgeModelIds: Array.from(selectedModelIds),
                judgingPrompt: judgingPrompt
            });
        }
    };

    if (isLoadingModels) return <Spinner />;
    if (isModelsError) return <ErrorMessage message={modelsError?.message || 'Failed to load models.'} />;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Judge Question Quality</h2>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <div className={styles.fieldGroup}>
                    <label id="judge-model-group-label">Select Judge Model(s)</label>
                    <div
                        className={styles.modelList}
                        role="group"
                        aria-labelledby="judge-model-group-label"
                        aria-describedby={formError && selectedModelIds.size === 0 ? formErrorId : undefined}
                        aria-invalid={!!(formError && selectedModelIds.size === 0)}
                    >
                        {models && models.length > 0 ? models.map(model => (
                            <Checkbox
                                key={model.id}
                                id={`judge-${model.id}`}
                                label={model.name}
                                value={model.id}
                                checked={selectedModelIds.has(model.id)}
                                onChange={handleCheckboxChange}
                                disabled={isSubmitting}
                            />
                        )) : (
                            <p className={styles.errorMessage}>No models available to act as judges.</p>
                        )}
                    </div>
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="judgingPrompt">Judging Instructions/Prompt</label>
                    <Textarea
                        id="judgingPrompt"
                        name="judgingPrompt"
                        value={judgingPrompt}
                        onChange={handlePromptChange}
                        placeholder="Instruct the judge LLM on how to evaluate the questions..."
                        required
                        disabled={isSubmitting}
                        rows={6}
                        aria-describedby={formError && judgingPrompt.trim() === '' ? formErrorId : undefined}
                        aria-invalid={!!(formError && judgingPrompt.trim() === '')}
                        error={formError && judgingPrompt.trim() === '' ? formError : undefined}
                    />
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                        Remember to ask for JSON output: {'{ "overallScore": number, "justification": string }'}
                    </p>
                </div>

                {/* Add structured criteria options later */}

                {formError && <ErrorMessage id={formErrorId} message={formError} />}

                <div className={styles.formActions}>
                    <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || selectedModelIds.size === 0 || !models || models.length === 0}>
                        Start Judging
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default JudgeModeConfig; 