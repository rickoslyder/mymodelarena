import React from 'react';
import { EvalGenWizardData, EvalGenOptions } from '../EvalGenWizard';
import { Model } from '../../../types';
import QuestionTypeSelector from '../../../components/advanced/QuestionTypeSelector';
import styles from '../EvalGenWizard.module.css';

interface TypeSelectionStepProps {
  formData: EvalGenWizardData;
  updateFormData: (updates: Partial<EvalGenWizardData>) => void;
  updateOptions: (updates: Partial<EvalGenOptions>) => void;
  models: Model[];
  onNext: () => void;
  onPrevious: () => void;
}

const QUESTION_TYPES = [
  {
    id: 'logic',
    title: 'Logic & Reasoning',
    description: 'Logical puzzles, deductive reasoning, pattern recognition',
    icon: '🧠',
    examples: ['Solve this logical sequence', 'Identify the pattern', 'Deductive reasoning puzzle']
  },
  {
    id: 'coding',
    title: 'Programming',
    description: 'Code completion, debugging, algorithm design',
    icon: '💻',
    examples: ['Write a function to...', 'Debug this code', 'Optimize this algorithm']
  },
  {
    id: 'creative',
    title: 'Creative Writing',
    description: 'Storytelling, poetry, creative expression',
    icon: '✍️',
    examples: ['Write a short story about...', 'Create a poem with...', 'Describe a scene where...']
  },
  {
    id: 'knowledge',
    title: 'Factual Knowledge',
    description: 'Science, history, geography, general knowledge',
    icon: '📚',
    examples: ['What is the capital of...', 'Explain the process of...', 'When did X happen?']
  },
  {
    id: 'analysis',
    title: 'Analysis & Synthesis',
    description: 'Text analysis, summarization, comparison',
    icon: '🔍',
    examples: ['Analyze this argument', 'Compare these concepts', 'Summarize the main points']
  },
  {
    id: 'math',
    title: 'Mathematics',
    description: 'Arithmetic, algebra, geometry, word problems',
    icon: '🔢',
    examples: ['Solve this equation', 'Calculate the area of...', 'Word problem involving...']
  },
  {
    id: 'ethics',
    title: 'Ethics & Philosophy',
    description: 'Moral reasoning, philosophical questions, ethical dilemmas',
    icon: '⚖️',
    examples: ['Is it ethical to...', 'What would you do if...', 'Argue for or against...']
  },
  {
    id: 'language',
    title: 'Language & Grammar',
    description: 'Translation, grammar correction, language understanding',
    icon: '🌍',
    examples: ['Translate this text', 'Correct the grammar', 'Explain this idiom']
  }
];

const TypeSelectionStep: React.FC<TypeSelectionStepProps> = ({
  formData,
  updateOptions,
}) => {

  // Skip this step in advanced mode or when template is selected
  if (formData.mode === 'advanced') {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Question Types</h2>
          <p className={styles.stepSubtitle}>
            In Advanced Mode, you'll define question types through your custom prompt
          </p>
        </div>
        
        <div className={styles.formSection}>
          <p>You can proceed to the next step to configure other options and write your custom prompt.</p>
        </div>
      </div>
    );
  }

  // Show template info if one is selected
  if (formData.template) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Question Types (From Template)</h2>
          <p className={styles.stepSubtitle}>
            Your selected template has predefined question types. You can modify them if needed.
          </p>
        </div>
        
        <div className={styles.formSection}>
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-4)'
          }}>
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }}>
              Template Question Types:
            </h4>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
              {formData.options.questionTypes.length > 0 
                ? formData.options.questionTypes.map(typeId => {
                    const type = QUESTION_TYPES.find(t => t.id === typeId);
                    return type?.title;
                  }).filter(Boolean).join(', ')
                : 'No specific types defined by template'
              }
            </p>
          </div>
          <p>You can continue to the next step or modify the selection below.</p>
        </div>

        {/* Still show type selection for modification */}
        <QuestionTypeSelector
          selectedTypes={formData.options.questionTypes}
          onChange={(selectedTypes) => updateOptions({ questionTypes: selectedTypes })}
          label="Modify Question Types (Optional)"
          showCategories={true}
          maxSelections={6}
        />
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Select Question Types</h2>
        <p className={styles.stepSubtitle}>
          Choose what types of questions you want to generate (select multiple)
        </p>
      </div>

      <QuestionTypeSelector
        selectedTypes={formData.options.questionTypes}
        onChange={(selectedTypes) => updateOptions({ questionTypes: selectedTypes })}
        showCategories={true}
        maxSelections={6}
        required={true}
      />
    </div>
  );
};

export default TypeSelectionStep;