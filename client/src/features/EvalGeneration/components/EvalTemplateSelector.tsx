import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EvalTemplate, getTemplates } from '../../../lib/api';
import { TEMPLATE_CATEGORIES, getTemplatesByCategory } from '../templates/evalTemplates';
import Spinner from '../../../components/common/Spinner';
import ErrorMessage from '../../../components/common/ErrorMessage';
import styles from '../EvalGenWizard.module.css';

interface EvalTemplateSelectorProps {
  selectedTemplate?: EvalTemplate;
  onTemplateSelect: (template: EvalTemplate | undefined) => void;
  onUseTemplate: (template: EvalTemplate) => void;
}

const EvalTemplateSelector: React.FC<EvalTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onUseTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState<EvalTemplate | null>(null);

  // Fetch templates from API
  const { data: allTemplates, isLoading, error } = useQuery<EvalTemplate[], Error>({
    queryKey: ['templates'],
    queryFn: () => getTemplates(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const templates = allTemplates ? getTemplatesByCategory(allTemplates, selectedCategory) : [];

  const handleTemplateClick = (template: EvalTemplate) => {
    if (selectedTemplate?.id === template.id) {
      // If clicking the same template, deselect it
      onTemplateSelect(undefined);
    } else {
      onTemplateSelect(template);
    }
  };

  const handlePreview = (template: EvalTemplate, event: React.MouseEvent) => {
    event.stopPropagation();
    setPreviewTemplate(template);
  };

  const handleUseTemplate = (template: EvalTemplate) => {
    onUseTemplate(template);
    setPreviewTemplate(null);
  };

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className={styles.templateSelector}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.templateSelector}>
        <ErrorMessage message={error?.message || 'Failed to load templates'} />
      </div>
    );
  }

  return (
    <div className={styles.templateSelector}>
      {/* Category Filter */}
      <div className={styles.categoryFilter}>
        <h3 className={styles.sectionTitle}>Browse Templates</h3>
        <div className={styles.categoryTabs}>
          {TEMPLATE_CATEGORIES.map((category) => (
            <button
              key={category}
              className={`${styles.categoryTab} ${
                selectedCategory === category ? styles.active : ''
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className={styles.templateGrid}>
        {templates.map((template) => (
          <div
            key={template.id}
            className={`${styles.templateCard} ${
              selectedTemplate?.id === template.id ? styles.selected : ''
            }`}
            onClick={() => handleTemplateClick(template)}
          >
            <div className={styles.templateHeader}>
              <div className={styles.templateIcon}>{template.icon}</div>
              <div className={styles.templateInfo}>
                <h4 className={styles.templateName}>{template.name}</h4>
                <p className={styles.templateCategory}>{template.category}</p>
              </div>
              <button
                className={styles.previewButton}
                onClick={(e) => handlePreview(template, e)}
                title="Preview template"
              >
                👁️
              </button>
            </div>
            <p className={styles.templateDescription}>{template.description}</p>
            <div className={styles.templateMeta}>
              <span className={styles.templateDifficulty}>
                {template.defaultDifficulty}
              </span>
              <span className={styles.templateCount}>
                {template.defaultCount} questions
              </span>
              <span className={styles.templateFormat}>
                {template.defaultFormat.replace('-', ' ')}
              </span>
            </div>
            <div className={styles.templateTags}>
              {template.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className={styles.templateTag}>
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className={styles.templateTag}>
                  +{template.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Template Option */}
      <div className={styles.customTemplateSection}>
        <div
          className={`${styles.templateCard} ${styles.customTemplate} ${
            selectedTemplate === undefined ? styles.selected : ''
          }`}
          onClick={() => onTemplateSelect(undefined)}
        >
          <div className={styles.templateHeader}>
            <div className={styles.templateIcon}>🛠️</div>
            <div className={styles.templateInfo}>
              <h4 className={styles.templateName}>Custom Configuration</h4>
              <p className={styles.templateCategory}>Build Your Own</p>
            </div>
          </div>
          <p className={styles.templateDescription}>
            Start from scratch and configure your evaluation generation exactly as you need it.
          </p>
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className={styles.modalOverlay} onClick={() => setPreviewTemplate(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{previewTemplate.icon} {previewTemplate.name}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setPreviewTemplate(null)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.previewSection}>
                <h4>Description</h4>
                <p>{previewTemplate.description}</p>
              </div>

              <div className={styles.previewSection}>
                <h4>Generation Prompt</h4>
                <div className={styles.promptPreview}>
                  {previewTemplate.prompt}
                </div>
              </div>

              <div className={styles.previewSection}>
                <h4>Default Settings</h4>
                <div className={styles.settingsGrid}>
                  <div>
                    <strong>Question Types:</strong>{' '}
                    {previewTemplate.defaultQuestionTypes.join(', ')}
                  </div>
                  <div>
                    <strong>Difficulty:</strong> {previewTemplate.defaultDifficulty}
                  </div>
                  <div>
                    <strong>Format:</strong> {previewTemplate.defaultFormat.replace('-', ' ')}
                  </div>
                  <div>
                    <strong>Count:</strong> {previewTemplate.defaultCount} questions
                  </div>
                </div>
              </div>

              <div className={styles.previewSection}>
                <h4>Example Questions</h4>
                <ul className={styles.examplesList}>
                  {previewTemplate.examples.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.previewSection}>
                <h4>Tags</h4>
                <div className={styles.templateTags}>
                  {previewTemplate.tags.map((tag: string) => (
                    <span key={tag} className={styles.templateTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.useTemplateButton}
                onClick={() => handleUseTemplate(previewTemplate)}
              >
                Use This Template
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setPreviewTemplate(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvalTemplateSelector;