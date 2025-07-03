import React, { useMemo } from 'react';
import { EvalGenWizardData, EvalGenOptions } from '../EvalGenWizard';
import { Model } from '../../../types';
import Textarea from '../../../components/common/Textarea';
import Button from '../../../components/common/Button';
import AdvancedPromptEditor from '../../../components/advanced/AdvancedPromptEditor';
import { BUILT_IN_PROMPT_TEMPLATES } from '../../../components/advanced/promptTemplates';
import styles from '../EvalGenWizard.module.css';

interface PromptStepProps {
  formData: EvalGenWizardData;
  updateFormData: (updates: Partial<EvalGenWizardData>) => void;
  updateOptions: (updates: Partial<EvalGenOptions>) => void;
  models: Model[];
  onNext: () => void;
  onPrevious: () => void;
}

const PromptStep: React.FC<PromptStepProps> = ({
  formData,
  updateFormData,
  models,
}) => {
  // Generate enhanced prompt for guided mode
  const enhancedPrompt = useMemo(() => {
    if (formData.mode === 'advanced') return '';

    const { questionTypes, domain, difficulty, format, count } = formData.options;
    
    let prompt = `Generate ${count} ${difficulty} difficulty evaluation questions`;
    
    if (questionTypes.length > 0) {
      const typeDescriptions = {
        logic: 'logical reasoning and pattern recognition',
        coding: 'programming and algorithm design',
        creative: 'creative writing and expression',
        knowledge: 'factual knowledge and general information',
        analysis: 'text analysis and synthesis',
        math: 'mathematics and problem solving',
        ethics: 'ethical reasoning and philosophy',
        language: 'language understanding and grammar'
      };
      
      const types = questionTypes.map(type => typeDescriptions[type as keyof typeof typeDescriptions]).filter(Boolean);
      prompt += ` focusing on ${types.join(', ')}`;
    }
    
    if (domain) {
      prompt += ` in the domain of ${domain}`;
    }
    
    prompt += `. Format: ${format.replace('-', ' ')} questions.`;
    
    // Add specific instructions based on format
    switch (format) {
      case 'multiple-choice':
        prompt += ' Include 4 answer options (A, B, C, D) with one correct answer.';
        break;
      case 'true-false':
        prompt += ' Design statements that are clearly true or false.';
        break;
      case 'code-completion':
        prompt += ' Provide programming tasks that require code solutions.';
        break;
      default:
        prompt += ' Design questions that require thoughtful, detailed responses.';
    }
    
    prompt += ' Ensure questions are distinct, challenging, and properly test the intended capabilities.';
    
    return prompt;
  }, [formData.mode, formData.options]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ userPrompt: e.target.value });
  };

  const useEnhancedPrompt = () => {
    updateFormData({ userPrompt: enhancedPrompt });
  };

  if (formData.mode === 'guided') {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>
            {formData.template ? 'Template Prompt' : 'Generated Prompt'}
          </h2>
          <p className={styles.stepSubtitle}>
            {formData.template 
              ? 'Your selected template includes a pre-built prompt. You can customize it if needed.'
              : 'Based on your selections, we\'ve created an optimized prompt. You can customize it if needed.'
            }
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
            <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
              {formData.template ? 'Template Prompt:' : 'Auto-generated Prompt:'}
            </h4>
            <p style={{ 
              fontSize: 'var(--font-size-sm)', 
              lineHeight: 1.5, 
              color: 'var(--color-text-secondary)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}>
              {formData.template && formData.userPrompt ? formData.userPrompt : enhancedPrompt}
            </p>
          </div>

          <AdvancedPromptEditor
            label="Customize Prompt (Optional)"
            value={formData.userPrompt || ''}
            onChange={(value) => updateFormData({ userPrompt: value })}
            placeholder="You can modify the auto-generated prompt above or write your own..."
            variables={{
              count: formData.options.count,
              difficulty: formData.options.difficulty,
              format: formData.options.format,
              ...(formData.options.domain && { domain: formData.options.domain }),
            }}
            templates={BUILT_IN_PROMPT_TEMPLATES.filter(t => t.category === 'Question Types')}
          />

          {!formData.template && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Button
                variant="secondary"
                onClick={useEnhancedPrompt}
                disabled={!enhancedPrompt}
              >
                Use Auto-generated Prompt
              </Button>
            </div>
          )}
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Prompt Preview</h3>
          <p className={styles.sectionDescription}>
            The final prompt that will be sent to the LLM:
          </p>
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
            {formData.userPrompt || enhancedPrompt || 'No prompt defined yet'}
          </div>
        </div>
      </div>
    );
  }

  // Advanced mode
  const promptVariables = {
    count: formData.options.count,
    difficulty: formData.options.difficulty,
    format: formData.options.format,
    ...(formData.options.domain && { domain: formData.options.domain }),
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Advanced Prompt Editor</h2>
        <p className={styles.stepSubtitle}>
          Create custom prompts with templates, variables, and syntax highlighting
        </p>
      </div>

      <div className={styles.formSection}>
        <AdvancedPromptEditor
          label="Generation Prompt"
          value={formData.userPrompt || ''}
          onChange={(value) => updateFormData({ userPrompt: value })}
          placeholder="Write detailed instructions for the LLM on how to generate evaluation questions..."
          variables={promptVariables}
          templates={BUILT_IN_PROMPT_TEMPLATES}
          onTemplateSelect={(template) => {
            // Could add analytics or other side effects here
            console.log('Template selected:', template.name);
          }}
        />
      </div>
    </div>
  );
};

export default PromptStep;