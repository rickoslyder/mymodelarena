import React from 'react';
import { EvalGenWizardData, EvalGenOptions } from '../EvalGenWizard';
import { Model } from '../../../types';
import Button from '../../../components/common/Button';
import styles from '../EvalGenWizard.module.css';

interface ReviewStepProps {
  formData: EvalGenWizardData;
  updateFormData: (updates: Partial<EvalGenWizardData>) => void;
  updateOptions: (updates: Partial<EvalGenOptions>) => void;
  models: Model[];
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  models,
  onSubmit,
  canSubmit,
  isSubmitting,
}) => {
  const selectedModel = models.find(m => m.id === formData.generatorModelIds[0]);
  
  const getQuestionTypeLabels = () => {
    const typeLabels = {
      logic: 'Logic & Reasoning',
      coding: 'Programming',
      creative: 'Creative Writing',
      knowledge: 'Factual Knowledge',
      analysis: 'Analysis & Synthesis',
      math: 'Mathematics',
      ethics: 'Ethics & Philosophy',
      language: 'Language & Grammar'
    };
    
    return formData.options.questionTypes
      .map(type => typeLabels[type as keyof typeof typeLabels])
      .filter(Boolean)
      .join(', ');
  };

  const getDifficultyLabel = () => {
    const labels = {
      easy: 'Easy',
      medium: 'Medium', 
      hard: 'Hard',
      expert: 'Expert'
    };
    return labels[formData.options.difficulty];
  };

  const getFormatLabel = () => {
    const labels = {
      'open-ended': 'Open-ended',
      'multiple-choice': 'Multiple Choice',
      'true-false': 'True/False',
      'code-completion': 'Code Completion'
    };
    return labels[formData.options.format];
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Review & Generate</h2>
        <p className={styles.stepSubtitle}>
          Review your configuration and generate the evaluation set
        </p>
      </div>

      {/* Configuration Summary */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Configuration Summary</h3>
        
        <div style={{ 
          display: 'grid', 
          gap: 'var(--space-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
        }}>
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Generation Mode
            </h4>
            <p style={{ margin: 0, textTransform: 'capitalize' }}>
              {formData.mode} Mode
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Generator Model
            </h4>
            <p style={{ margin: 0 }}>
              {selectedModel?.name || 'No model selected'}
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Question Count
            </h4>
            <p style={{ margin: 0 }}>
              {formData.options.count} questions
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Difficulty
            </h4>
            <p style={{ margin: 0 }}>
              {getDifficultyLabel()}
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Format
            </h4>
            <p style={{ margin: 0 }}>
              {getFormatLabel()}
            </p>
          </div>

          {formData.options.domain && (
            <div style={{ 
              backgroundColor: 'var(--color-background)', 
              padding: 'var(--space-4)', 
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
                Domain
              </h4>
              <p style={{ margin: 0 }}>
                {formData.options.domain}
              </p>
            </div>
          )}
        </div>

        {formData.mode === 'guided' && formData.options.questionTypes.length > 0 && (
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)',
            marginTop: 'var(--space-4)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Question Types
            </h4>
            <p style={{ margin: 0 }}>
              {getQuestionTypeLabels()}
            </p>
          </div>
        )}

        {(formData.evalName || formData.evalDescription) && (
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)',
            marginTop: 'var(--space-4)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Evaluation Set Details
            </h4>
            {formData.evalName && (
              <p style={{ margin: '0 0 var(--space-1) 0', fontWeight: 500 }}>
                Name: {formData.evalName}
              </p>
            )}
            {formData.evalDescription && (
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                {formData.evalDescription}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Prompt Preview */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Generation Prompt</h3>
        <div style={{ 
          backgroundColor: 'var(--color-background-alt)', 
          padding: 'var(--space-4)', 
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--color-border)',
          fontFamily: 'monospace',
          fontSize: 'var(--font-size-sm)',
          whiteSpace: 'pre-wrap',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {formData.userPrompt || 'Auto-generated prompt will be used'}
        </div>
      </div>

      {/* Validation Messages */}
      {!canSubmit && (
        <div className={styles.formSection}>
          <div style={{ 
            backgroundColor: 'var(--color-warning-light)', 
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--border-radius-md)',
            padding: 'var(--space-4)'
          }}>
            <h4 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-warning-dark)' }}>
              Please complete the following:
            </h4>
            <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', color: 'var(--color-warning-dark)' }}>
              {formData.generatorModelIds.length === 0 && <li>Select a generator model</li>}
              {formData.mode === 'advanced' && (!formData.userPrompt || formData.userPrompt.trim().length === 0) && (
                <li>Provide a generation prompt</li>
              )}
              {formData.mode === 'guided' && formData.options.questionTypes.length === 0 && (
                <li>Select at least one question type</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Generation Action */}
      <div className={styles.formSection}>
        <div style={{ textAlign: 'center' }}>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            style={{ minWidth: '200px' }}
          >
            {isSubmitting ? 'Generating Questions...' : 'Generate Evaluation Set'}
          </Button>
        </div>
        
        {canSubmit && (
          <p style={{ 
            textAlign: 'center', 
            marginTop: 'var(--space-3)', 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--color-text-secondary)' 
          }}>
            This will create {formData.options.count} new evaluation questions using {selectedModel?.name}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewStep;