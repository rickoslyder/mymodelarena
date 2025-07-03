import React, { useState } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import TagChip from '../common/TagChip';
import styles from './EvalFilter.module.css';

export interface EvalFilterOptions {
  search?: string;
  status?: string;
  difficulty?: string;
  type?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface EvalFilterProps {
  filters: EvalFilterOptions;
  onFiltersChange: (filters: EvalFilterOptions) => void;
  availableTags?: string[];
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'All Difficulties' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'code-completion', label: 'Code Completion' },
  { value: 'debugging', label: 'Debugging' },
  { value: 'mixed', label: 'Mixed Types' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'questionCount', label: 'Question Count' },
  { value: 'difficulty', label: 'Difficulty' },
];

const EvalFilter: React.FC<EvalFilterProps> = ({
  filters,
  onFiltersChange,
  availableTags = [],
  showAdvanced = false,
  onToggleAdvanced,
}) => {
  const [tagInput, setTagInput] = useState('');

  const updateFilter = (key: keyof EvalFilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const addTag = (tag: string) => {
    if (tag && !filters.tags?.includes(tag)) {
      updateFilter('tags', [...(filters.tags || []), tag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    updateFilter('tags', filters.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setTagInput('');
  };

  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      filters.status ||
      filters.difficulty ||
      filters.type ||
      filters.tags?.length ||
      filters.dateRange?.start ||
      filters.dateRange?.end
    );
  };

  return (
    <div className={styles.filterContainer}>
      {/* Basic Filters */}
      <div className={styles.basicFilters}>
        <div className={styles.searchSection}>
          <Input
            placeholder="Search evaluations..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.quickFilters}>
          <Select
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            options={STATUS_OPTIONS}
            className={styles.filterSelect}
          />

          <Select
            value={filters.difficulty || ''}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
            options={DIFFICULTY_OPTIONS}
            className={styles.filterSelect}
          />

          <Select
            value={filters.type || ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            options={TYPE_OPTIONS}
            className={styles.filterSelect}
          />
        </div>

        <div className={styles.actionButtons}>
          {onToggleAdvanced && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleAdvanced}
            >
              {showAdvanced ? 'Simple' : 'Advanced'} Filters
            </Button>
          )}

          {hasActiveFilters() && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className={styles.advancedFilters}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Date Range</label>
              <div className={styles.dateRange}>
                <Input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                  placeholder="Start date"
                />
                <span className={styles.dateSeparator}>to</span>
                <Input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                  placeholder="End date"
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Sort By</label>
              <div className={styles.sortControls}>
                <Select
                  value={filters.sortBy || 'createdAt'}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  options={SORT_OPTIONS}
                />
                <Select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => updateFilter('sortOrder', e.target.value)}
                  options={[
                    { value: 'desc', label: 'Newest First' },
                    { value: 'asc', label: 'Oldest First' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Tag Filters */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Tags</label>
            <div className={styles.tagFilter}>
              <div className={styles.tagInput}>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag filter..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput}
                >
                  Add
                </Button>
              </div>

              {availableTags.length > 0 && (
                <div className={styles.availableTags}>
                  <span className={styles.tagsLabel}>Quick add:</span>
                  {availableTags.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      className={styles.availableTag}
                      onClick={() => addTag(tag)}
                      disabled={filters.tags?.includes(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {filters.tags && filters.tags.length > 0 && (
                <div className={styles.activeTags}>
                  <span className={styles.tagsLabel}>Active filters:</span>
                  <div className={styles.tagList}>
                    {filters.tags.map(tag => (
                      <TagChip
                        key={tag}
                        label={tag}
                        onRemove={() => removeTag(tag)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {hasActiveFilters() && (
        <div className={styles.filterSummary}>
          <span className={styles.summaryText}>
            Active filters: {[
              filters.search && 'search',
              filters.status && 'status',
              filters.difficulty && 'difficulty',
              filters.type && 'type',
              filters.tags?.length && 'tags',
              filters.dateRange?.start && 'date range'
            ].filter(Boolean).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default EvalFilter;