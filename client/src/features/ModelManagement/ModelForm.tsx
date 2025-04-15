import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import * as api from '../../lib/api'; // Import api
import { Model, ProviderModelListItem } from '../../types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select'; // Import Select
import ErrorMessage from '../../components/common/ErrorMessage';
import styles from './ModelForm.module.css';

// Define Providers
const PROVIDERS = [
    { value: 'custom', label: 'Custom (OpenAI Compatible)' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google Gemini' },
    { value: 'mistral', label: 'Mistral AI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'groq', label: 'Groq' },
    { value: 'grok', label: 'xAI Grok' },
    // Add others as supported by backend
];

// Mapping of providers to their default environment variable names
// Ensure these names match the *server's* expected environment variables
const PROVIDER_DEFAULT_ENV_VARS: Record<string, string> = {
    openai: 'OPENAI_API_KEY', // Default name, user might override in .env if needed
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GEMINI_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    groq: 'GROQ_API_KEY',
    grok: 'XAI_API_KEY',
};

// Mapping of providers to their default base URLs
const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1', // Check if correct endpoint structure
    google: 'https://generativelanguage.googleapis.com/v1beta', // Base path, specific model in call?
    mistral: 'https://api.mistral.ai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    groq: 'https://api.groq.com/openai/v1', // Note: Groq uses openai path
    grok: 'https://api.x.ai/v1', // Check if correct endpoint structure
};

export interface ModelFormData {
    name: string;
    provider: string; // Added
    modelIdentifier?: string; // Added (optional for custom)
    baseUrl: string; // Keep for custom, maybe prefill for others
    apiKeyEnvVar: string;
    inputTokenCost: number | string; // Use string temporarily for input field
    outputTokenCost: number | string;
}

// Re-define FormErrors type
type FormErrors = {
    [K in keyof ModelFormData]?: string;
};

interface ModelFormProps {
    modelToEdit?: Model | null;
    onSubmit: (data: ModelFormData) => void; // Will be useMutation's mutate function
    onClose: () => void;
    isSubmitting?: boolean; // Loading state from useMutation
}

const ModelForm: React.FC<ModelFormProps> = ({
    modelToEdit,
    onSubmit,
    onClose,
    isSubmitting = false,
}) => {
    const [formData, setFormData] = useState<ModelFormData>({
        name: '',
        provider: 'custom', // Default to custom
        modelIdentifier: '',
        baseUrl: '',
        apiKeyEnvVar: '',
        inputTokenCost: '',
        outputTokenCost: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    // Add state for cost units
    const [inputCostUnit, setInputCostUnit] = useState<'1k' | '1m'>('1k');
    const [outputCostUnit, setOutputCostUnit] = useState<'1k' | '1m'>('1k');

    const selectedProvider = formData.provider;
    const isCustomProvider = selectedProvider === 'custom';

    // Fetch provider models when provider changes (and isn't custom)
    const {
        data: providerModels,
        isLoading: isLoadingProviderModels,
        error: providerModelsError,
        isError: isProviderModelsError
    } = useQuery<ProviderModelListItem[], Error>({
        queryKey: ['providerModels', selectedProvider], // Include provider in key
        queryFn: () => api.listProviderModels(selectedProvider),
        enabled: !isCustomProvider, // Only run if provider is not custom
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
        retry: false, // Don't retry aggressively if API key is wrong
    });

    // Populate form if editing
    useEffect(() => {
        if (modelToEdit) {
            setFormData({
                name: modelToEdit.name,
                provider: modelToEdit.provider || 'custom',
                modelIdentifier: modelToEdit.modelIdentifier || '',
                baseUrl: modelToEdit.baseUrl,
                apiKeyEnvVar: modelToEdit.apiKeyEnvVar,
                inputTokenCost: String(modelToEdit.inputTokenCost), // Convert to string for input
                outputTokenCost: String(modelToEdit.outputTokenCost),
            });
            setErrors({}); // Clear errors when populating form for edit
            // Reset units to default when editing
            setInputCostUnit('1k');
            setOutputCostUnit('1k');
        } else {
            // Reset form if creating a new model (e.g., modal opened after editing)
            setFormData({
                name: '',
                provider: 'custom',
                modelIdentifier: '',
                baseUrl: '',
                apiKeyEnvVar: '',
                inputTokenCost: '',
                outputTokenCost: '',
            });
            setErrors({});
            setOutputCostUnit('1k');
        }
    }, [modelToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData((prev) => {
            const newState = {
                ...prev,
                [name]: type === 'number' ? parseFloat(value) || '' : value,
            };

            // --- PRE-FILL LOGIC ---
            if (name === 'provider') {
                newState.modelIdentifier = ''; // Reset model selection
                const defaultEnvVar = PROVIDER_DEFAULT_ENV_VARS[value];
                if (defaultEnvVar) {
                    newState.apiKeyEnvVar = defaultEnvVar; // Pre-fill known env var
                    // Clear error for apiKeyEnvVar if it was previously set
                    // Need to clear error outside the setFormData scope
                } else {
                    // It's 'custom' or an unknown provider
                    newState.apiKeyEnvVar = ''; // Clear env var field for custom
                }
                // Optionally prefill baseUrl based on provider?
                // if (value === 'openai') newState.baseUrl = 'https://api.openai.com/v1'; else newState.baseUrl = '';
            }
            // --- END PRE-FILL LOGIC ---

            // If modelIdentifier changes for a known provider, maybe update name?
            if (name === 'modelIdentifier' && !isCustomProvider && providerModels) {
                const selectedModel = providerModels.find(m => m.id === value);
                if (selectedModel && (!prev.name || prev.name === prev.modelIdentifier)) { // Auto-fill name if empty or was same as previous id
                    newState.name = selectedModel.name;
                    // Clear name error if it was set
                    // Need to clear error outside the setFormData scope
                }
            }
            return newState;
        });

        // Clear the specific error when the user starts typing in a field
        // Also clear related errors when changing provider
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
        // Clear API key error if provider changes and default is set
        if (name === 'provider' && PROVIDER_DEFAULT_ENV_VARS[value] && errors.apiKeyEnvVar) {
            setErrors(prevErrors => ({ ...prevErrors, apiKeyEnvVar: undefined }));
        }
        // Clear name error if modelIdentifier change auto-fills name
        if (name === 'modelIdentifier' && !isCustomProvider && providerModels) {
            const selectedModel = providerModels.find(m => m.id === value);
            if (selectedModel && (!formData.name || formData.name === formData.modelIdentifier) && errors.name) {
                setErrors(prevErrors => ({ ...prevErrors, name: undefined }));
            }
        }
    };

    // Map provider models for Select component
    const providerModelOptions = useMemo(() => {
        return providerModels?.map(m => ({ value: m.id, label: m.name })) ?? [];
    }, [providerModels]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}; // Use FormErrors type
        if (isCustomProvider && !formData.name.trim()) newErrors.name = 'Display Name is required for Custom provider.';
        if (!formData.provider) newErrors.provider = 'Provider is required.';
        if (!isCustomProvider && !formData.modelIdentifier) newErrors.modelIdentifier = 'Model selection is required for this provider.';
        if (isCustomProvider && !formData.baseUrl.trim()) {
            newErrors.baseUrl = 'Base URL is required for Custom provider.';
        } else if (isCustomProvider) {
            // Validate URL format only if custom and not empty
            try { new URL(formData.baseUrl); } catch { newErrors.baseUrl = 'Invalid URL format.'; }
        }
        if (!formData.apiKeyEnvVar.trim()) newErrors.apiKeyEnvVar = 'API Key Env Variable name is required.';

        const inputCost = parseFloat(String(formData.inputTokenCost));
        if (isNaN(inputCost) || inputCost <= 0) {
            newErrors.inputTokenCost = 'Input cost must be a positive number.';
        }
        const outputCost = parseFloat(String(formData.outputTokenCost));
        if (isNaN(outputCost) || outputCost <= 0) {
            newErrors.outputTokenCost = 'Output cost must be a positive number.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            // Prepare data for submission (convert costs back to numbers)
            let inputCost = parseFloat(String(formData.inputTokenCost));
            let outputCost = parseFloat(String(formData.outputTokenCost));

            // Normalize costs based on selected units
            if (inputCostUnit === '1m') {
                inputCost = inputCost / 1000;
            }
            if (outputCostUnit === '1m') {
                outputCost = outputCost / 1000;
            }

            const submissionData: ModelFormData = {
                ...formData,
                inputTokenCost: inputCost, // Send normalized cost
                outputTokenCost: outputCost, // Send normalized cost
                // Set baseUrl based on provider if not custom
                baseUrl: isCustomProvider
                    ? formData.baseUrl
                    : PROVIDER_DEFAULT_BASE_URLS[selectedProvider] || '', // Use default or empty string if somehow unknown
                // Only set modelIdentifier if not custom
                modelIdentifier: !isCustomProvider ? formData.modelIdentifier : undefined,
            };
            onSubmit(submissionData);
            // Note: onClose() is typically called by the mutation's onSuccess callback
        }
    };

    // Handlers for unit toggles
    const handleInputUnitToggle = () => {
        setInputCostUnit(prev => prev === '1k' ? '1m' : '1k');
    };

    const handleOutputUnitToggle = () => {
        setOutputCostUnit(prev => prev === '1k' ? '1m' : '1k');
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Provider Selection */}
            <Select
                label="Provider"
                name="provider"
                options={PROVIDERS}
                value={formData.provider}
                onChange={handleChange}
                error={errors.provider}
                disabled={isSubmitting}
                required
            />

            {/* Model Selection (Conditional) */}
            {!isCustomProvider && (
                <Select
                    label="Model"
                    name="modelIdentifier"
                    options={providerModelOptions}
                    value={formData.modelIdentifier}
                    onChange={handleChange}
                    error={errors.modelIdentifier}
                    disabled={isSubmitting || isLoadingProviderModels || !providerModels}
                    isLoading={isLoadingProviderModels} // Show loading indicator?
                    placeholderOption={isLoadingProviderModels ? "Loading models..." : "-- Select Model --"}
                    required
                />
            )}
            {isProviderModelsError && (
                <ErrorMessage message={`Failed to load models for ${selectedProvider}: ${providerModelsError?.message}`} />
            )}

            {/* Custom Fields (Conditional) */}
            {isCustomProvider && (
                <Input
                    label="Base URL"
                    name="baseUrl"
                    type="url"
                    value={formData.baseUrl}
                    onChange={handleChange}
                    error={errors.baseUrl}
                    placeholder="e.g., https://api.openai.com/v1 (must be OpenAI compatible)"
                    required
                    disabled={isSubmitting}
                />
            )}

            {/* Standard Fields */}
            <Input
                label="Display Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder={isCustomProvider ? "My Custom GPT-4" : "(Optional, defaults to model name)"}
                required={isCustomProvider}
                disabled={isSubmitting}
            />
            <Input
                label="API Key Environment Variable Name"
                name="apiKeyEnvVar"
                value={formData.apiKeyEnvVar}
                onChange={handleChange}
                error={errors.apiKeyEnvVar}
                placeholder="e.g., OPENAI_API_KEY (Must exist on server)"
                required
                disabled={isSubmitting}
            />
            <div className={styles.costInputContainer}>
                <Input
                    label="Input Token Cost"
                    name="inputTokenCost"
                    type="number"
                    step="any"
                    value={formData.inputTokenCost}
                    onChange={handleChange}
                    error={errors.inputTokenCost}
                    placeholder="e.g., 0.001 (per 1k) or 1.00 (per 1m)"
                    required
                    disabled={isSubmitting}
                    className={styles.costInput} // Add class for specific styling if needed
                />
                <span onClick={handleInputUnitToggle} className={styles.unitToggle} role="button" aria-label={`Toggle input cost unit to per ${inputCostUnit === '1k' ? 'million' : 'thousand'} tokens`}>
                    / {inputCostUnit === '1k' ? '1k' : '1M'} tokens
                </span>
            </div>
            <div className={styles.costInputContainer}>
                <Input
                    label="Output Token Cost"
                    name="outputTokenCost"
                    type="number"
                    step="any"
                    value={formData.outputTokenCost}
                    onChange={handleChange}
                    error={errors.outputTokenCost}
                    placeholder="e.g., 0.002 (per 1k) or 2.00 (per 1m)"
                    required
                    disabled={isSubmitting}
                    className={styles.costInput}
                />
                <span onClick={handleOutputUnitToggle} className={styles.unitToggle} role="button" aria-label={`Toggle output cost unit to per ${outputCostUnit === '1k' ? 'million' : 'thousand'} tokens`}>
                    / {outputCostUnit === '1k' ? '1k' : '1M'} tokens
                </span>
            </div>

            {/* ... formActions ... */}
            <div className={styles.formActions}>
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                    {modelToEdit ? 'Update Model' : 'Create Model'}
                </Button>
            </div>
        </form>
    );
};

export default ModelForm; 