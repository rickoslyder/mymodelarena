import React from 'react';
import { EvalTemplate } from '../../lib/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import TagChip from '../../components/common/TagChip';
import styles from './TemplateListItem.module.css';

interface TemplateListItemProps {
  template: EvalTemplate;
  onEdit?: (template: EvalTemplate) => void;
  onDelete?: (template: EvalTemplate) => void;
  onView?: (template: EvalTemplate) => void;
}

const TemplateListItem: React.FC<TemplateListItemProps> = ({
  template,
  onEdit,
  onDelete,
  onView,
}) => {
  const handleEdit = () => onEdit?.(template);
  const handleDelete = () => onDelete?.(template);
  const handleView = () => onView?.(template);

  return (
    <Card className={styles.templateCard}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          {template.icon && (
            <span className={styles.icon}>{template.icon}</span>
          )}
          <div>
            <h3 className={styles.title}>{template.name}</h3>
            <span className={styles.category}>{template.category}</span>
          </div>
        </div>
        <div className={styles.badges}>
          {template.isBuiltIn && (
            <span className={styles.builtInBadge}>Built-in</span>
          )}
          {template.isPublic && (
            <span className={styles.publicBadge}>Public</span>
          )}
        </div>
      </div>

      <p className={styles.description}>{template.description}</p>

      <div className={styles.metadata}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Default Count:</span>
          <span>{template.defaultCount}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Difficulty:</span>
          <span className={styles.difficulty}>{template.defaultDifficulty}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Format:</span>
          <span>{template.defaultFormat}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Usage:</span>
          <span>{template.usageCount} times</span>
        </div>
      </div>

      {template.tags.length > 0 && (
        <div className={styles.tags}>
          {template.tags.map((tag, index) => (
            <TagChip key={index} label={tag} />
          ))}
        </div>
      )}

      {template.defaultQuestionTypes.length > 0 && (
        <div className={styles.questionTypes}>
          <span className={styles.typesLabel}>Question Types:</span>
          <div className={styles.types}>
            {template.defaultQuestionTypes.map((type, index) => (
              <span key={index} className={styles.type}>
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {onView && (
          <Button variant="secondary" size="sm" onClick={handleView}>
            View
          </Button>
        )}
        {onEdit && !template.isBuiltIn && (
          <Button variant="secondary" size="sm" onClick={handleEdit}>
            Edit
          </Button>
        )}
        {onDelete && !template.isBuiltIn && (
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
};

export default TemplateListItem;