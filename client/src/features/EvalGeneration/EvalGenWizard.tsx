import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { Model } from '../../types';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import styles from './EvalGenWizard.module.css';

// Step Components
import StepIndicator from './components/StepIndicator';
import ModeSelectionStep from './components/ModeSelectionStep';
import TypeSelectionStep from './components/TypeSelectionStep';
import OptionsConfigStep from './components/OptionsConfigStep';
import PromptStep from './components/PromptStep';
import ReviewStep from './components/ReviewStep';

export interface EvalGenOptions {
  questionTypes: string[];
  domain?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  format: 'open-ended' | 'multiple-choice' | 'true-false' | 'code-completion';
  count: number;
  examples?: string[];
}

export interface EvalGenWizardData {
  mode: 'guided' | 'advanced';
  generatorModelIds: string[];
  userPrompt?: string;
  template?: string;
  options: EvalGenOptions;
  evalName?: string;
  evalDescription?: string;
}

interface EvalGenWizardProps {
  onSubmit: (data: EvalGenWizardData) => void;
  isSubmitting?: boolean;
}

const STEPS = [
  { id: 'mode', title: 'Mode', description: 'Choose generation approach' },
  { id: 'type', title: 'Type', description: 'Select question types' },
  { id: 'options', title: 'Options', description: 'Configure settings' },
  { id: 'prompt', title: 'Prompt', description: 'Define or review prompt' },
  { id: 'review', title: 'Review', description: 'Confirm and generate' }
];

const EvalGenWizard: React.FC<EvalGenWizardProps> = ({ onSubmit, isSubmitting = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EvalGenWizardData>({
    mode: 'guided',
    generatorModelIds: [],
    options: {
      questionTypes: [],
      difficulty: 'medium',
      format: 'open-ended',
      count: 10,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch available models
  const { data: models, isLoading: isLoadingModels, error: modelsError, isError: isModelsError } = useQuery<Model[], Error>({
    queryKey: ['models'],
    queryFn: api.getModels,
    staleTime: 1000 * 60 * 5,
  });

  const updateFormData = (updates: Partial<EvalGenWizardData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setFormError(null);
  };

  const updateOptions = (updates: Partial<EvalGenOptions>) => {
    setFormData(prev => ({
      ...prev,
      options: { ...prev.options, ...updates }
    }));
    setFormError(null);
  };

  const canProceedToNext = useMemo(() => {
    switch (currentStep) {
      case 0: // Mode selection
        return formData.mode !== undefined;
      case 1: // Type selection
        return formData.mode === 'advanced' || formData.options.questionTypes.length > 0;
      case 2: // Options
        return formData.generatorModelIds.length > 0;
      case 3: // Prompt
        // In guided mode, always allow proceeding (prompt will be auto-generated)
        // In advanced mode, require a custom prompt
        return formData.mode === 'guided' || (formData.userPrompt && formData.userPrompt.trim().length > 0);
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const canSubmit = useMemo(() => {
    return (
      formData.generatorModelIds.length > 0 &&
      // In guided mode, prompt will be auto-generated, so no need to check userPrompt
      // In advanced mode, require custom prompt
      (formData.mode === 'guided' || (formData.userPrompt && formData.userPrompt.trim().length > 0)) &&
      // In advanced mode, no need to check question types (defined in prompt)
      // In guided mode, require question types unless using template
      (formData.mode === 'advanced' || formData.template || formData.options.questionTypes.length > 0)
    );
  }, [formData]);

  const handleNext = () => {
    if (canProceedToNext && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(formData);
    } else {
      setFormError('Please complete all required fields before generating.');
    }
  };

  const renderCurrentStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      updateOptions,
      models: models || [],
      onNext: handleNext,
      onPrevious: handlePrevious,
    };

    switch (currentStep) {
      case 0:
        return <ModeSelectionStep {...stepProps} />;
      case 1:
        return <TypeSelectionStep {...stepProps} />;
      case 2:
        return <OptionsConfigStep {...stepProps} />;
      case 3:
        return <PromptStep {...stepProps} />;
      case 4:
        return <ReviewStep {...stepProps} onSubmit={handleSubmit} canSubmit={canSubmit} isSubmitting={!!isSubmitting} />;
      default:
        return null;
    }
  };

  if (isLoadingModels) return <Spinner />;
  if (isModelsError) return <ErrorMessage message={modelsError?.message || 'Failed to load models.'} />;

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>Generate New Evaluation Set</h1>
        <StepIndicator 
          steps={STEPS} 
          currentStep={currentStep} 
          onStepClick={setCurrentStep}
          completedSteps={currentStep}
        />
      </div>

      <div className={styles.wizardContent}>
        {renderCurrentStep()}
      </div>

      <div className={styles.wizardActions}>
        <div className={styles.stepNavigation}>
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
          >
            Previous
          </Button>
          
          {currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceedToNext || isSubmitting}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              isLoading={isSubmitting}
            >
              Generate Evaluation Set
            </Button>
          )}
        </div>
      </div>

      {formError && (
        <div className={styles.errorContainer}>
          <ErrorMessage message={formError} />
        </div>
      )}
    </div>
  );
};

export default EvalGenWizard;