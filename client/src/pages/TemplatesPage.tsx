import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAlerts } from '../App';
import {
  getTemplates,
  getTemplateCategories,
  deleteTemplate,
  EvalTemplate,
} from '../lib/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import TemplateList from '../features/TemplateManagement/TemplateList';
import TemplateForm from '../features/TemplateManagement/TemplateForm';
import TemplateDetailView from '../features/TemplateManagement/TemplateDetailView';
import PageWrapper from '../components/layout/PageWrapper';
import styles from './TemplatesPage.module.css';

const TemplatesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'builtin'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EvalTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<EvalTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EvalTemplate | null>(null);

  const queryClient = useQueryClient();
  const alerts = useAppAlerts();

  // Fetch templates with filters
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['templates', { 
      search: searchTerm, 
      category: selectedCategory,
      isPublic: filterType === 'public' ? true : undefined,
      isBuiltIn: filterType === 'builtin' ? true : undefined,
    }],
    queryFn: () => getTemplates({
      search: searchTerm || undefined,
      category: selectedCategory || undefined,
      isPublic: filterType === 'public' ? true : undefined,
      isBuiltIn: filterType === 'builtin' ? true : undefined,
    }),
    onError: (error: any) => {
      console.error('Failed to fetch templates:', error);
      alerts.showError('Failed to load templates. Please refresh the page.');
    },
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['template-categories'],
    queryFn: getTemplateCategories,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
      setDeletingTemplate(null);
      alerts.showSuccess('Template deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete template:', error);
      alerts.showError('Failed to delete template. Please try again.');
    },
  });

  const handleCreateTemplate = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditTemplate = (template: EvalTemplate) => {
    setEditingTemplate(template);
    setViewingTemplate(null);
  };

  const handleViewTemplate = (template: EvalTemplate) => {
    setViewingTemplate(template);
  };

  const handleDeleteTemplate = (template: EvalTemplate) => {
    setDeletingTemplate(template);
  };

  const confirmDelete = () => {
    if (deletingTemplate) {
      deleteMutation.mutate(deletingTemplate.id);
    }
  };

  const handleUseTemplate = (template: EvalTemplate) => {
    // Navigate to eval generation page with this template pre-selected
    // This would typically use React Router to navigate
    console.log('Using template:', template.id);
    // Example: navigate(`/generate?template=${template.id}`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setFilterType('all');
  };

  const filteredCount = templates.length;
  const totalCount = templates.length; // This would ideally come from a separate query without filters

  return (
    <PageWrapper>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Evaluation Templates</h1>
            <p className={styles.subtitle}>
              Manage and organize your evaluation templates for generating questions
            </p>
          </div>
          <Button onClick={handleCreateTemplate} className={styles.createButton}>
            Create Template
          </Button>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchSection}>
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterSection}>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.filterSelect}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((category) => ({
                  value: category.name,
                  label: `${category.name} (${category.count})`
                }))
              ]}
            />

            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'public' | 'builtin')}
              className={styles.filterSelect}
              options={[
                { value: 'all', label: 'All Templates' },
                { value: 'public', label: 'Public Only' },
                { value: 'builtin', label: 'Built-in Only' }
              ]}
            />

            {(searchTerm || selectedCategory || filterType !== 'all') && (
              <Button variant="secondary" onClick={resetFilters} size="sm">
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <span className={styles.count}>
              {filteredCount} template{filteredCount !== 1 ? 's' : ''}
              {searchTerm || selectedCategory || filterType !== 'all' ? ' found' : ' total'}
            </span>
          </div>

          <TemplateList
            templates={templates}
            isLoading={isLoading}
            error={error?.message}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            onView={handleViewTemplate}
          />
        </div>

        {/* Create Template Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Template"
        >
          <TemplateForm
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => setIsCreateModalOpen(false)}
          />
        </Modal>

        {/* Edit Template Modal */}
        <Modal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          title="Edit Template"
        >
          {editingTemplate && (
            <TemplateForm
              template={editingTemplate}
              onClose={() => setEditingTemplate(null)}
              onSuccess={() => setEditingTemplate(null)}
            />
          )}
        </Modal>

        {/* View Template Modal */}
        <Modal
          isOpen={!!viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          title="Template Details"
        >
          {viewingTemplate && (
            <TemplateDetailView
              template={viewingTemplate}
              onClose={() => setViewingTemplate(null)}
              onEdit={() => handleEditTemplate(viewingTemplate)}
              onDelete={() => handleDeleteTemplate(viewingTemplate)}
              onUse={() => handleUseTemplate(viewingTemplate)}
            />
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deletingTemplate}
          onClose={() => setDeletingTemplate(null)}
          onConfirm={confirmDelete}
          title="Delete Template"
          message={`Are you sure you want to delete "${deletingTemplate?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          isConfirming={deleteMutation.isPending}
        />
      </div>
    </PageWrapper>
  );
};

export default TemplatesPage;