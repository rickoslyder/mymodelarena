import React from 'react';
import { EvalTemplate } from '../../lib/api';
import TemplateListItem from './TemplateListItem';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import styles from './TemplateList.module.css';

interface TemplateListProps {
  templates: EvalTemplate[];
  isLoading?: boolean;
  error?: string;
  onEdit?: (template: EvalTemplate) => void;
  onDelete?: (template: EvalTemplate) => void;
  onView?: (template: EvalTemplate) => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  isLoading = false,
  error,
  onEdit,
  onDelete,
  onView,
}) => {
  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (templates.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No templates found.</p>
        <p>Create your first template to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.templateList}>
      {templates.map((template) => (
        <TemplateListItem
          key={template.id}
          template={template}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
};

export default TemplateList;