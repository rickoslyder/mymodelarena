import React, { useState, FormEvent, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Model } from '../../types';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import styles from './LLMScoreConfig.module.css'; // Create this CSS module

export interface LLMScoreConfigData {
    scorerModelId: string;
    scoringPrompt: string;
}

interface LLMScoreConfigProps {
    evalRunId: string;
    onSubmit: (data: LLMScoreConfigData) => void;
    onClose: () => void; // If used in a modal
    isSubmitting?: boolean;
}

const LLMScoreConfig: React.FC<LLMScoreConfigProps> = ({
    onSubmit,
    onClose,
    isSubmitting = false,
}) => {
    const [formData, setFormData] = useState<LLMScoreConfigData>({
        scorerModelId: '',
        scoringPrompt: 'Score the response from 1-5 based on clarity and relevance. Provide a brief justification.',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const formErrorId = 'llm-score-form-error'; // ID for aria-describedby

    // Fetch available models for the dropdown
    const { data: models, isLoading: isLoadingModels, error: modelsError, isError: isModelsError } = useQuery<Model[], Error>({
        queryKey: ['models'],
        queryFn: api.getModels,
        staleTime: 1000 * 60 * 5,
    });

    // Map models to options format
    const modelOptions = useMemo(() => {
        return models?.map(model => ({ value: model.id, label: model.name })) ?? [];
    }, [models]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError(null);
    };

    const validateForm = (): boolean => {
        let hasError = false;
        if (!formData.scorerModelId) {
            setFormError('Please select a scoring model.');
            hasError = true;
        }
        if (!formData.scoringPrompt.trim()) {
            setFormError('Please provide a scoring prompt/rubric.');
            hasError = true;
        }
        if (!hasError) setFormError(null);
        return !hasError;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
            // Parent (using mutation) might close modal on success
        }
    };

    if (isLoadingModels) return <Spinner />;
    if (isModelsError) return <ErrorMessage message={modelsError?.message || 'Failed to load models.'} />;

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <div className={styles.fieldGroup}>
                    <label htmlFor="scorerModelId">Scoring Judge Model</label>
                    <Select
                        label="Scoring Judge Model"
                        id="scorerModelId"
                        name="scorerModelId"
                        value={formData.scorerModelId}
                        onChange={handleChange}
                        options={modelOptions}
                        placeholderOption="-- Select Scorer --"
                        required
                        disabled={isSubmitting || !models || models.length === 0}
                        aria-describedby={formError && formData.scorerModelId === '' ? formErrorId : undefined}
                        aria-invalid={!!(formError && formData.scorerModelId === '')}
                        error={formError && formData.scorerModelId === '' ? formError : undefined}
                    />
                    {(!models || models.length === 0) && <p className={styles.errorMessage}>No models available.</p>}
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="scoringPrompt">Scoring Prompt/Rubric</label>
                    <Textarea
                        id="scoringPrompt"
                        name="scoringPrompt"
                        value={formData.scoringPrompt}
                        onChange={handleChange}
                        placeholder="Instruct the LLM on how to score... Remember to ask for JSON output { score: number, justification: string }."
                        required
                        disabled={isSubmitting}
                        rows={8}
                        aria-describedby={formError && formData.scoringPrompt.trim() === '' ? formErrorId : undefined}
                        aria-invalid={!!(formError && formData.scoringPrompt.trim() === '')}
                        error={formError && formData.scoringPrompt.trim() === '' ? formError : undefined}
                    />
                </div>

                {formError && <ErrorMessage id={formErrorId} message={formError} />}

                <div className={styles.formActions}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || !models || models.length === 0}>
                        Start LLM Scoring
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default LLMScoreConfig; 