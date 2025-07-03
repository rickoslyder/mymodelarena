import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTemplate,
  updateTemplate,
  EvalTemplate,
  CreateTemplateData,
} from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import Checkbox from '../../components/common/Checkbox';
import ErrorMessage from '../../components/common/ErrorMessage';
import AdvancedPromptEditor from '../../components/advanced/AdvancedPromptEditor';
import QuestionTypeSelector from '../../components/advanced/QuestionTypeSelector';
import DifficultySelector from '../../components/advanced/DifficultySelector';
import { BUILT_IN_PROMPT_TEMPLATES } from '../../components/advanced/promptTemplates';
import styles from './TemplateForm.module.css';

interface TemplateFormProps {
  template?: EvalTemplate;
  onClose: () => void;
  onSuccess?: (template: EvalTemplate) => void;
}

const CATEGORIES = [
  'Programming',
  'Mathematics',
  'Science',
  'Language',
  'Logic',
  'General Knowledge',
  'Creative Writing',
  'Problem Solving',
  'Other',
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const FORMAT_OPTIONS = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'code-completion', label: 'Code Completion' },
  { value: 'debugging', label: 'Debugging' },
  { value: 'true-false', label: 'True/False' },
];

const QUESTION_TYPE_OPTIONS = [
  'coding',
  'multiple-choice',
  'short-answer',
  'essay',
  'true-false',
  'problem-solving',
  'creative',
  'analytical',
];

const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    description: '',
    category: 'Programming',
    icon: '',
    prompt: '',
    isPublic: false,
    defaultQuestionTypes: [],
    defaultDifficulty: 'medium',
    defaultFormat: 'multiple-choice',
    defaultCount: 10,
    tags: [],
    examples: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [exampleInput, setExampleInput] = useState('');

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      onSuccess?.(newTemplate);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create template:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTemplateData> }) =>
      updateTemplate(id, data),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', template?.id] });
      onSuccess?.(updatedTemplate);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update template:', error);
    },
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon || '',
        prompt: template.prompt,
        isPublic: template.isPublic,
        defaultQuestionTypes: template.defaultQuestionTypes,
        defaultDifficulty: template.defaultDifficulty,
        defaultFormat: template.defaultFormat,
        defaultCount: template.defaultCount,
        tags: template.tags,
        examples: template.examples,
      });
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (template) {
      updateMutation.mutate({ id: template.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof CreateTemplateData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      defaultQuestionTypes: prev.defaultQuestionTypes.includes(type)
        ? prev.defaultQuestionTypes.filter(t => t !== type)
        : [...prev.defaultQuestionTypes, type],
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const addExample = () => {
    if (exampleInput.trim() && !formData.examples.includes(exampleInput.trim())) {
      setFormData(prev => ({
        ...prev,
        examples: [...prev.examples, exampleInput.trim()],
      }));
      setExampleInput('');
    }
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index),
    }));
  };

  const mutation = template ? updateMutation : createMutation;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h2>{template ? 'Edit Template' : 'Create Template'}</h2>
      </div>

      {mutation.error && (
        <ErrorMessage message={mutation.error.message} />
      )}

      <div className={styles.grid}>
        <div className={styles.field}>
          <Input
            label="Name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
            required
            placeholder="Template name"
          />
        </div>

        <div className={styles.field}>
          <Select
            label="Category"
            value={formData.category}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('category', e.target.value)}
            required
            options={CATEGORIES.map(category => ({ value: category, label: category }))}
          />
        </div>

        <div className={styles.field}>
          <Input
            label="Icon (emoji)"
            value={formData.icon}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('icon', e.target.value)}
            placeholder="🔥"
            maxLength={2}
          />
        </div>

        <div className={styles.field}>
          <Checkbox
            label="Public Template"
            checked={formData.isPublic}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('isPublic', e.target.checked)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
          required
          placeholder="Brief description of what this template generates..."
          rows={3}
        />
      </div>

      <div className={styles.field}>
        <AdvancedPromptEditor
          label="Prompt"
          value={formData.prompt}
          onChange={(value) => handleInputChange('prompt', value)}
          placeholder="The main prompt that will be used to generate questions..."
          variables={{
            count: formData.defaultCount,
            difficulty: formData.defaultDifficulty,
            format: formData.defaultFormat,
          }}
          templates={BUILT_IN_PROMPT_TEMPLATES}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <DifficultySelector
            selectedDifficulty={formData.defaultDifficulty}
            onChange={(difficulty) => handleInputChange('defaultDifficulty', difficulty)}
            label="Default Difficulty"
            variant="buttons"
            showDetails={false}
            required={true}
          />
        </div>

        <div className={styles.field}>
          <Select
            label="Default Format"
            value={formData.defaultFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('defaultFormat', e.target.value)}
            options={FORMAT_OPTIONS}
          />
        </div>

        <div className={styles.field}>
          <Input
            label="Default Count"
            type="number"
            value={formData.defaultCount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('defaultCount', parseInt(e.target.value))}
            min={1}
            max={100}
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <QuestionTypeSelector
          selectedTypes={formData.defaultQuestionTypes}
          onChange={(selectedTypes) => handleInputChange('defaultQuestionTypes', selectedTypes)}
          label="Default Question Types"
          showCategories={true}
          maxSelections={8}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Tags</label>
        <div className={styles.tagInput}>
          <Input
            value={tagInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
            placeholder="Add a tag..."
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag} size="sm">
            Add
          </Button>
        </div>
        <div className={styles.tags}>
          {formData.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className={styles.removeTag}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Examples</label>
        <div className={styles.tagInput}>
          <Input
            value={exampleInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExampleInput(e.target.value)}
            placeholder="Add an example question..."
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addExample())}
          />
          <Button type="button" onClick={addExample} size="sm">
            Add
          </Button>
        </div>
        <div className={styles.examples}>
          {formData.examples.map((example, index) => (
            <div key={index} className={styles.example}>
              <span>{example}</span>
              <button
                type="button"
                onClick={() => removeExample(index)}
                className={styles.removeExample}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};

export default TemplateForm;