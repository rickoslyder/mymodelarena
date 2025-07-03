import React, { useState } from 'react';
import { EvalGenWizardData } from '../EvalGenWizard';
import { Model } from '../../../types';
import { EvalTemplate } from '../../../lib/api';
import EvalTemplateSelector from './EvalTemplateSelector';
import styles from '../EvalGenWizard.module.css';

interface ModeSelectionStepProps {
  formData: EvalGenWizardData;
  updateFormData: (updates: Partial<EvalGenWizardData>) => void;
  models: Model[];
  onNext: () => void;
  onPrevious: () => void;
}

const ModeSelectionStep: React.FC<ModeSelectionStepProps> = ({
  formData,
  updateFormData,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EvalTemplate | undefined>();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const handleModeSelect = (mode: 'guided' | 'advanced') => {
    updateFormData({ mode });
    if (mode === 'guided') {
      setShowTemplateSelector(true);
    } else {
      setShowTemplateSelector(false);
      setSelectedTemplate(undefined);
    }
  };

  const handleTemplateSelect = (template: EvalTemplate | undefined) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: EvalTemplate) => {
    // Apply template settings to form data
    updateFormData({
      template: template.id,
      userPrompt: template.prompt,
      evalName: template.name,
      evalDescription: template.description,
      options: {
        ...formData.options,
        questionTypes: template.defaultQuestionTypes,
        difficulty: template.defaultDifficulty as 'easy' | 'medium' | 'hard' | 'expert',
        format: template.defaultFormat as 'open-ended' | 'multiple-choice' | 'true-false' | 'code-completion',
        count: template.defaultCount
      }
    });
    setSelectedTemplate(template);
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Choose Generation Mode</h2>
        <p className={styles.stepSubtitle}>
          Select how you'd like to create your evaluation set
        </p>
      </div>

      <div className={styles.selectionGrid}>
        <div 
          className={`${styles.selectionCard} ${formData.mode === 'guided' ? styles.selected : ''}`}
          onClick={() => handleModeSelect('guided')}
        >
          <div className={styles.cardIcon}>🧭</div>
          <div className={styles.cardTitle}>Guided Mode</div>
          <div className={styles.cardDescription}>
            Step-by-step wizard with templates and smart suggestions. 
            Perfect for beginners or quick generation.
          </div>
        </div>

        <div 
          className={`${styles.selectionCard} ${formData.mode === 'advanced' ? styles.selected : ''}`}
          onClick={() => handleModeSelect('advanced')}
        >
          <div className={styles.cardIcon}>⚙️</div>
          <div className={styles.cardTitle}>Advanced Mode</div>
          <div className={styles.cardDescription}>
            Full control over prompt engineering and generation parameters. 
            Ideal for power users and custom scenarios.
          </div>
        </div>
      </div>

      {/* Template Selection for Guided Mode */}
      {formData.mode === 'guided' && showTemplateSelector && (
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Choose a Template (Optional)</h3>
          <p className={styles.sectionDescription}>
            Select a pre-built template to get started quickly, or choose custom configuration to build from scratch.
          </p>
          
          <EvalTemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            onUseTemplate={handleUseTemplate}
          />
        </div>
      )}

      {/* Benefits Section */}
      {!showTemplateSelector && (
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>What you'll get:</h3>
          <div className={styles.sectionDescription}>
            {formData.mode === 'guided' ? (
              <ul>
                <li>Pre-built templates for common evaluation types</li>
                <li>Structured options for question types and difficulty</li>
                <li>Smart prompt enhancement behind the scenes</li>
                <li>Quality validation and suggestions</li>
              </ul>
            ) : (
              <ul>
                <li>Direct prompt control with syntax highlighting</li>
                <li>Advanced generation parameters</li>
                <li>Multi-model generation support</li>
                <li>Template variables and prompt engineering helpers</li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeSelectionStep;