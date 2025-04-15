import React, { useState, FormEvent, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Model } from '../../types';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import styles from './EvalGenForm.module.css';

export interface EvalGenFormData {
    generatorModelId: string;
    userPrompt: string;
    numQuestions: number;
    evalName?: string;
    evalDescription?: string;
    // Add structured options later
}

interface EvalGenFormProps {
    onSubmit: (data: EvalGenFormData) => void; // Will be useMutation's mutate
    isSubmitting?: boolean;
}

const EvalGenForm: React.FC<EvalGenFormProps> = ({ onSubmit, isSubmitting = false }) => {
    const [formData, setFormData] = useState<EvalGenFormData>({
        generatorModelId: '',
        userPrompt: '',
        numQuestions: 10,
        evalName: '',
        evalDescription: '',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const formErrorId = 'eval-gen-form-error'; // ID for aria-describedby

    // Fetch available models for the dropdown
    const { data: models, isLoading: isLoadingModels, error: modelsError, isError: isModelsError } = useQuery<Model[], Error>({
        queryKey: ['models'],
        queryFn: api.getModels,
        // Keep model list relatively fresh, but don't refetch constantly
        staleTime: 1000 * 60 * 5, // 5 minutes 
    });

    // Map models to options format for the Select component
    const modelOptions = useMemo(() => {
        return models?.map(model => ({ value: model.id, label: model.name })) ?? [];
    }, [models]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
        }));
        setFormError(null); // Clear general form error on change
    };

    const validateForm = (): boolean => {
        let hasError = false;
        if (!formData.generatorModelId) {
            setFormError('Please select a generator model.');
            hasError = true;
        }
        if (!formData.userPrompt.trim()) {
            setFormError('Please provide a generation prompt.');
            hasError = true;
        }
        if (formData.numQuestions <= 0) {
            setFormError('Number of questions must be positive.');
            hasError = true;
        }
        if (!hasError) setFormError(null);
        return !hasError;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
            // Reset form potentially handled by parent on mutation success
        }
    };

    if (isLoadingModels) return <Spinner />;
    if (isModelsError) return <ErrorMessage message={modelsError?.message || 'Failed to load models.'} />;

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.formTitle}>Generate New Evaluation Set</h1>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Configuration</h3>
                    {/* Model Selection */}
                    <Select
                        label="Generator Model"
                        id="generatorModelId"
                        name="generatorModelId"
                        value={formData.generatorModelId}
                        onChange={handleChange}
                        options={modelOptions}
                        placeholderOption="-- Select a Model --"
                        required
                        disabled={isSubmitting || !models || models.length === 0}
                        aria-describedby={formError && formData.generatorModelId === '' ? formErrorId : undefined}
                        aria-invalid={!!(formError && formData.generatorModelId === '')}
                        error={formError && formData.generatorModelId === '' ? formError : undefined}
                    />
                    {(!models || models.length === 0) && <p className={styles.errorMessage}>No models available. Please configure a model first.</p>}

                    {/* Number of Questions */}
                    <Input
                        label="Number of Questions"
                        id="numQuestions"
                        name="numQuestions"
                        type="number"
                        value={formData.numQuestions}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={isSubmitting}
                        aria-describedby={formError && formData.numQuestions <= 0 ? formErrorId : undefined}
                        aria-invalid={!!(formError && formData.numQuestions <= 0)}
                        error={formError && formData.numQuestions <= 0 ? formError : undefined}
                    />
                </div>

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Prompt & Details</h3>
                    {/* Prompt Input */}
                    <Textarea
                        label="Generation Prompt"
                        id="userPrompt"
                        name="userPrompt"
                        value={formData.userPrompt}
                        onChange={handleChange}
                        placeholder="Instruct the LLM on how to generate the eval questions (e.g., 'Generate difficult logic puzzles involving spatial reasoning.')"
                        required
                        disabled={isSubmitting}
                        rows={6}
                        aria-describedby={formError && formData.userPrompt.trim() === '' ? formErrorId : undefined}
                        aria-invalid={!!(formError && formData.userPrompt.trim() === '')}
                        error={formError && formData.userPrompt.trim() === '' ? formError : undefined}
                    />

                    {/* Optional Fields */}
                    <Input
                        label="Eval Set Name (Optional)"
                        id="evalName"
                        name="evalName"
                        type="text"
                        value={formData.evalName}
                        onChange={handleChange}
                        placeholder="e.g., Logic Puzzles Set 1"
                        disabled={isSubmitting}
                    />
                    <Textarea
                        label="Description (Optional)"
                        id="evalDescription"
                        name="evalDescription"
                        value={formData.evalDescription}
                        onChange={handleChange}
                        placeholder="Describe the purpose or focus of this eval set."
                        rows={3}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Add Structured Options Section Here Later */}

                {formError && <ErrorMessage id={formErrorId} message={formError} />}

                <div className={styles.formActions}>
                    <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || !models || models.length === 0}>
                        Generate Eval Set
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EvalGenForm; 