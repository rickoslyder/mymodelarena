import React, { useState, useRef, useEffect } from 'react';
import Button from '../common/Button';
import styles from './AdvancedPromptEditor.module.css';

interface AdvancedPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  variables?: Record<string, string | number>;
  templates?: PromptTemplate[];
  onTemplateSelect?: (template: PromptTemplate) => void;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables?: string[];
}

const AdvancedPromptEditor: React.FC<AdvancedPromptEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your prompt here...",
  label,
  disabled = false,
  variables = {},
  templates = [],
  onTemplateSelect,
}) => {
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(textarea.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const insertVariable = (variableName: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const variableText = `{{${variableName}}}`;
    
    const newValue = value.substring(0, startPos) + variableText + value.substring(endPos);
    onChange(newValue);
    
    // Focus and set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + variableText.length, startPos + variableText.length);
    }, 0);
  };

  const insertTemplate = (template: PromptTemplate) => {
    onChange(template.content);
    onTemplateSelect?.(template);
    setIsTemplateDropdownOpen(false);
  };

  const formatPrompt = () => {
    // Basic prompt formatting - clean up spacing and structure
    const lines = value.split('\n');
    const formatted = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
    onChange(formatted);
  };

  const renderPreview = () => {
    // Replace variables with their actual values
    let preview = value;
    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, String(val));
    });
    return preview;
  };

  const getHighlightedText = () => {
    // Simple syntax highlighting for variables
    return value.replace(/\{\{([^}]+)\}\}/g, '<span class="' + styles.variable + '">{{$1}}</span>');
  };

  const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = value.length;

  return (
    <div className={styles.editorContainer}>
      {label && <label className={styles.label}>{label}</label>}
      
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {templates.length > 0 && (
            <div className={styles.templateDropdown}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              >
                Templates ▼
              </Button>
              {isTemplateDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {templates.map(template => (
                    <button
                      key={template.id}
                      className={styles.dropdownItem}
                      onClick={() => insertTemplate(template)}
                    >
                      <div className={styles.templateName}>{template.name}</div>
                      <div className={styles.templateDescription}>{template.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowVariables(!showVariables)}
          >
            Variables
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={formatPrompt}
            disabled={disabled || !value.trim()}
          >
            Format
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!value.trim()}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>
        
        <div className={styles.toolbarRight}>
          <span className={styles.stats}>
            {wordCount} words, {charCount} chars
          </span>
        </div>
      </div>

      {showVariables && Object.keys(variables).length > 0 && (
        <div className={styles.variablesPanel}>
          <h4 className={styles.variablesTitle}>Available Variables</h4>
          <div className={styles.variablesList}>
            {Object.entries(variables).map(([key, value]) => (
              <button
                key={key}
                className={styles.variableButton}
                onClick={() => insertVariable(key)}
                disabled={disabled}
              >
                <code>{`{{${key}}}`}</code>
                <span className={styles.variableValue}>{String(value)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.editorWrapper}>
        {showPreview ? (
          <div className={styles.preview}>
            <div className={styles.previewContent}>
              {renderPreview() || placeholder}
            </div>
          </div>
        ) : (
          <div className={styles.textareaWrapper}>
            <div 
              className={styles.highlightLayer}
              dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
            />
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              spellCheck={false}
            />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.tips}>
          <details className={styles.tipsDetails}>
            <summary>💡 Prompt Engineering Tips</summary>
            <ul className={styles.tipsList}>
              <li>Be specific and clear about what you want</li>
              <li>Use examples to demonstrate the desired format</li>
              <li>Include constraints and requirements</li>
              <li>Use variables like <code>{`{{count}}`}</code> for dynamic values</li>
              <li>Test your prompt with the preview feature</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPromptEditor;