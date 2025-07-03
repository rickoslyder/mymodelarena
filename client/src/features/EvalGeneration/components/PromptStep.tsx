import React, { useMemo } from 'react';
import { EvalGenWizardData, EvalGenOptions } from '../EvalGenWizard';
import { Model } from '../../../types';
import Textarea from '../../../components/common/Textarea';
import Button from '../../../components/common/Button';
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

          <Textarea
            label="Customize Prompt (Optional)"
            id="customPrompt"
            name="customPrompt"
            value={formData.userPrompt || ''}
            onChange={handlePromptChange}
            placeholder="You can modify the auto-generated prompt above or write your own..."
            rows={8}
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
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Custom Prompt</h2>
        <p className={styles.stepSubtitle}>
          Write your custom prompt for question generation
        </p>
      </div>

      <div className={styles.formSection}>
        <Textarea
          label="Generation Prompt"
          id="userPrompt"
          name="userPrompt"
          value={formData.userPrompt || ''}
          onChange={handlePromptChange}
          placeholder="Write detailed instructions for the LLM on how to generate evaluation questions..."
          rows={12}
          required
        />
        
        <div style={{ marginTop: 'var(--space-3)' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
              Prompt Engineering Tips
            </summary>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <ul>
                <li>Be specific about the type of questions you want</li>
                <li>Include examples of good questions if possible</li>
                <li>Specify the difficulty level and target audience</li>
                <li>Mention the format (open-ended, multiple choice, etc.)</li>
                <li>Add constraints to ensure quality (no duplicates, proper difficulty)</li>
                <li>The system will automatically add JSON formatting instructions</li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Template Variables</h3>
        <p className={styles.sectionDescription}>
          You can use these variables in your prompt:
        </p>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'monospace'
        }}>
          <div><code>{`{{count}}`}</code> - Number of questions ({formData.options.count})</div>
          <div><code>{`{{difficulty}}`}</code> - Difficulty level ({formData.options.difficulty})</div>
          <div><code>{`{{format}}`}</code> - Question format ({formData.options.format})</div>
          {formData.options.domain && <div><code>{`{{domain}}`}</code> - Domain ({formData.options.domain})</div>}
        </div>
      </div>
    </div>
  );
};

export default PromptStep;