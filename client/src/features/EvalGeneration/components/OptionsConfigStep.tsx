import React from 'react';
import { EvalGenWizardData, EvalGenOptions } from '../EvalGenWizard';
import { Model } from '../../../types';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Textarea from '../../../components/common/Textarea';
import styles from '../EvalGenWizard.module.css';

interface OptionsConfigStepProps {
  formData: EvalGenWizardData;
  updateFormData: (updates: Partial<EvalGenWizardData>) => void;
  updateOptions: (updates: Partial<EvalGenOptions>) => void;
  models: Model[];
  onNext: () => void;
  onPrevious: () => void;
}

const DIFFICULTY_LEVELS = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Basic questions suitable for general knowledge testing',
    icon: '🟢'
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Moderate difficulty requiring some reasoning or specialized knowledge',
    icon: '🟡'
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Challenging questions requiring deep thinking or expertise',
    icon: '🟠'
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'Very difficult questions for testing advanced capabilities',
    icon: '🔴'
  }
];

const QUESTION_FORMATS = [
  {
    value: 'open-ended',
    label: 'Open-ended',
    description: 'Free-form text responses',
    icon: '📝'
  },
  {
    value: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Questions with predefined answer options',
    icon: '☑️'
  },
  {
    value: 'true-false',
    label: 'True/False',
    description: 'Binary true or false questions',
    icon: '✅'
  },
  {
    value: 'code-completion',
    label: 'Code Completion',
    description: 'Programming tasks requiring code output',
    icon: '💻'
  }
];

const OptionsConfigStep: React.FC<OptionsConfigStepProps> = ({
  formData,
  updateFormData,
  updateOptions,
  models,
}) => {
  const modelOptions = models.map(model => ({ 
    value: model.id, 
    label: model.name 
  }));

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
    updateFormData({ generatorModelIds: selectedIds });
  };

  const handleSingleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFormData({ generatorModelIds: e.target.value ? [e.target.value] : [] });
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard' | 'expert') => {
    updateOptions({ difficulty });
  };

  const handleFormatSelect = (format: 'open-ended' | 'multiple-choice' | 'true-false' | 'code-completion') => {
    updateOptions({ format });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Configure Generation Options</h2>
        <p className={styles.stepSubtitle}>
          Set up the parameters for your evaluation generation
        </p>
      </div>

      {/* Model Selection */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Generator Model</h3>
        <p className={styles.sectionDescription}>
          Choose which LLM will generate your evaluation questions
        </p>
        
        <Select
          label="Select Model"
          id="generatorModel"
          name="generatorModel"
          value={formData.generatorModelIds[0] || ''}
          onChange={handleSingleModelChange}
          options={modelOptions}
          placeholderOption="-- Select a Model --"
          required
        />
        
        {formData.generatorModelIds.length === 0 && (
          <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
            Please select a model to continue
          </p>
        )}
      </div>

      {/* Basic Settings */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Basic Settings</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <Input
            label="Number of Questions"
            id="questionCount"
            name="questionCount"
            type="number"
            value={formData.options.count}
            onChange={(e) => updateOptions({ count: parseInt(e.target.value) || 10 })}
            min="1"
            max="50"
            required
          />
          
          <Input
            label="Domain/Topic (Optional)"
            id="domain"
            name="domain"
            type="text"
            value={formData.options.domain || ''}
            onChange={(e) => updateOptions({ domain: e.target.value })}
            placeholder="e.g., machine learning, history, biology"
          />
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Difficulty Level</h3>
        <p className={styles.sectionDescription}>
          Choose the target difficulty for generated questions
        </p>
        
        <div className={styles.selectionGrid}>
          {DIFFICULTY_LEVELS.map((level) => (
            <div 
              key={level.value}
              className={`${styles.selectionCard} ${
                formData.options.difficulty === level.value ? styles.selected : ''
              }`}
              onClick={() => handleDifficultySelect(level.value as any)}
            >
              <div className={styles.cardIcon}>{level.icon}</div>
              <div className={styles.cardTitle}>{level.label}</div>
              <div className={styles.cardDescription}>{level.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Format */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Question Format</h3>
        <p className={styles.sectionDescription}>
          Select the format for generated questions
        </p>
        
        <div className={styles.selectionGrid}>
          {QUESTION_FORMATS.map((format) => (
            <div 
              key={format.value}
              className={`${styles.selectionCard} ${
                formData.options.format === format.value ? styles.selected : ''
              }`}
              onClick={() => handleFormatSelect(format.value as any)}
            >
              <div className={styles.cardIcon}>{format.icon}</div>
              <div className={styles.cardTitle}>{format.label}</div>
              <div className={styles.cardDescription}>{format.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Info */}
      {formData.template && (
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Template Configuration</h3>
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-4)'
          }}>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              📝 Settings have been pre-configured based on your selected template. You can modify them below if needed.
            </p>
          </div>
        </div>
      )}

      {/* Optional Eval Metadata */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Evaluation Set Details {formData.template ? '(From Template)' : '(Optional)'}</h3>
        
        <Input
          label="Evaluation Set Name"
          id="evalName"
          name="evalName"
          type="text"
          value={formData.evalName || ''}
          onChange={(e) => updateFormData({ evalName: e.target.value })}
          placeholder="e.g., Python Basics Assessment"
        />
        
        <Textarea
          label="Description"
          id="evalDescription"
          name="evalDescription"
          value={formData.evalDescription || ''}
          onChange={(e) => updateFormData({ evalDescription: e.target.value })}
          placeholder="Describe the purpose and scope of this evaluation set"
          rows={3}
        />
      </div>
    </div>
  );
};

export default OptionsConfigStep;