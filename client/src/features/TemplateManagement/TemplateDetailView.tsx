import React from 'react';
import { EvalTemplate } from '../../lib/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import TagChip from '../../components/common/TagChip';
import styles from './TemplateDetailView.module.css';

interface TemplateDetailViewProps {
  template: EvalTemplate;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  onUse?: () => void;
}

const TemplateDetailView: React.FC<TemplateDetailViewProps> = ({
  template,
  onEdit,
  onDelete,
  onClose,
  onUse,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          {template.icon && (
            <span className={styles.icon}>{template.icon}</span>
          )}
          <div>
            <h1 className={styles.title}>{template.name}</h1>
            <div className={styles.metadata}>
              <span className={styles.category}>{template.category}</span>
              {template.isBuiltIn && (
                <span className={styles.builtInBadge}>Built-in</span>
              )}
              {template.isPublic && (
                <span className={styles.publicBadge}>Public</span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {onUse && (
            <Button onClick={onUse}>
              Use Template
            </Button>
          )}
          {onEdit && !template.isBuiltIn && (
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDelete && !template.isBuiltIn && (
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <Card className={styles.section}>
          <h3 className={styles.sectionTitle}>Description</h3>
          <p className={styles.description}>{template.description}</p>
        </Card>

        <Card className={styles.section}>
          <h3 className={styles.sectionTitle}>Prompt</h3>
          <div className={styles.promptContainer}>
            <pre className={styles.prompt}>{template.prompt}</pre>
          </div>
        </Card>

        <div className={styles.twoColumn}>
          <Card className={styles.section}>
            <h3 className={styles.sectionTitle}>Default Settings</h3>
            <div className={styles.settingsGrid}>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Question Count:</span>
                <span className={styles.settingValue}>{template.defaultCount}</span>
              </div>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Difficulty:</span>
                <span className={styles.settingValue}>{template.defaultDifficulty}</span>
              </div>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Format:</span>
                <span className={styles.settingValue}>{template.defaultFormat}</span>
              </div>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Usage Count:</span>
                <span className={styles.settingValue}>{template.usageCount} times</span>
              </div>
            </div>
          </Card>

          <Card className={styles.section}>
            <h3 className={styles.sectionTitle}>Question Types</h3>
            <div className={styles.questionTypes}>
              {template.defaultQuestionTypes.map((type, index) => (
                <span key={index} className={styles.questionType}>
                  {type.replace('-', ' ')}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {template.tags.length > 0 && (
          <Card className={styles.section}>
            <h3 className={styles.sectionTitle}>Tags</h3>
            <div className={styles.tags}>
              {template.tags.map((tag, index) => (
                <TagChip key={index} label={tag} />
              ))}
            </div>
          </Card>
        )}

        {template.examples.length > 0 && (
          <Card className={styles.section}>
            <h3 className={styles.sectionTitle}>Example Questions</h3>
            <div className={styles.examples}>
              {template.examples.map((example, index) => (
                <div key={index} className={styles.example}>
                  <span className={styles.exampleNumber}>{index + 1}.</span>
                  <span className={styles.exampleText}>{example}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className={styles.section}>
          <h3 className={styles.sectionTitle}>Template Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Created:</span>
              <span className={styles.infoValue}>
                {new Date(template.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Last Updated:</span>
              <span className={styles.infoValue}>
                {new Date(template.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Template ID:</span>
              <span className={styles.infoValue}>{template.id}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TemplateDetailView;