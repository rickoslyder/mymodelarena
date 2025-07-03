import React, { useState, useMemo } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import TagChip from '../common/TagChip';
import Spinner from '../common/Spinner';
import styles from './GeneratedQuestionsPreview.module.css';

export interface GeneratedQuestion {
  id: string;
  question: string;
  type: string;
  difficulty: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation?: string;
  tags?: string[];
  estimatedTime?: number; // in minutes
  points?: number;
}

interface GeneratedQuestionsPreviewProps {
  questions: GeneratedQuestion[];
  isLoading?: boolean;
  error?: string;
  onRegenerateQuestion?: (questionId: string) => void;
  onEditQuestion?: (question: GeneratedQuestion) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onRegenerate?: () => void;
  onAccept?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
  allowEditing?: boolean;
  compact?: boolean;
}

const GeneratedQuestionsPreview: React.FC<GeneratedQuestionsPreviewProps> = ({
  questions = [],
  isLoading = false,
  error,
  onRegenerateQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onRegenerate,
  onAccept,
  onCancel,
  showActions = true,
  allowEditing = true,
  compact = false,
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const toggleExpanded = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const toggleSelected = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
  };

  const clearSelection = () => {
    setSelectedQuestions(new Set());
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      const typeMatch = filterType === 'all' || question.type === filterType;
      const difficultyMatch = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
      return typeMatch && difficultyMatch;
    });
  }, [questions, filterType, filterDifficulty]);

  const questionTypes = useMemo(() => {
    return Array.from(new Set(questions.map(q => q.type)));
  }, [questions]);

  const difficultyLevels = useMemo(() => {
    return Array.from(new Set(questions.map(q => q.difficulty)));
  }, [questions]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '#10b981';
      case 'easy': return '#84cc16';
      case 'medium': return '#f59e0b';
      case 'hard': return '#f97316';
      case 'expert': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'multiple-choice': return '☑️';
      case 'true-false': return '✓';
      case 'short-answer': return '✏️';
      case 'essay': return '📝';
      case 'code-completion': return '💻';
      case 'debugging': return '🐛';
      case 'mathematical': return '🔢';
      case 'creative-writing': return '🎨';
      default: return '❓';
    }
  };

  const renderQuestion = (question: GeneratedQuestion) => {
    const isExpanded = expandedQuestions.has(question.id);
    const isSelected = selectedQuestions.has(question.id);

    return (
      <Card key={question.id} className={`${styles.questionCard} ${isSelected ? styles.selected : ''}`}>
        <div className={styles.questionHeader}>
          <div className={styles.questionMeta}>
            <div className={styles.typeIndicator}>
              <span className={styles.typeIcon}>{getTypeIcon(question.type)}</span>
              <span className={styles.typeName}>{question.type}</span>
            </div>
            <div 
              className={styles.difficultyBadge}
              style={{ backgroundColor: getDifficultyColor(question.difficulty) }}
            >
              {question.difficulty}
            </div>
            {question.estimatedTime && (
              <div className={styles.timeBadge}>
                ⏱️ {question.estimatedTime}m
              </div>
            )}
            {question.points && (
              <div className={styles.pointsBadge}>
                {question.points} pts
              </div>
            )}
          </div>
          
          {allowEditing && (
            <div className={styles.questionActions}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelected(question.id)}
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleExpanded(question.id)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          )}
        </div>

        <div className={styles.questionContent}>
          <div className={styles.questionText}>
            {question.question}
          </div>

          {question.options && (
            <div className={styles.questionOptions}>
              <h5>Options:</h5>
              <ul>
                {question.options.map((option, index) => (
                  <li 
                    key={index}
                    className={question.correctAnswer === index ? styles.correctOption : ''}
                  >
                    {String.fromCharCode(65 + index)}) {option}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isExpanded && (
            <div className={styles.expandedContent}>
              {question.correctAnswer !== undefined && (
                <div className={styles.answerSection}>
                  <h5>Correct Answer:</h5>
                  <div className={styles.correctAnswer}>
                    {typeof question.correctAnswer === 'number' 
                      ? `${String.fromCharCode(65 + question.correctAnswer)}) ${question.options?.[question.correctAnswer]}`
                      : question.correctAnswer
                    }
                  </div>
                </div>
              )}

              {question.explanation && (
                <div className={styles.explanationSection}>
                  <h5>Explanation:</h5>
                  <div className={styles.explanation}>
                    {question.explanation}
                  </div>
                </div>
              )}

              {question.tags && question.tags.length > 0 && (
                <div className={styles.tagsSection}>
                  <h5>Tags:</h5>
                  <div className={styles.tags}>
                    {question.tags.map((tag, index) => (
                      <TagChip key={index} label={tag} />
                    ))}
                  </div>
                </div>
              )}

              {allowEditing && (
                <div className={styles.editActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditQuestion?.(question)}
                  >
                    Edit Question
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRegenerateQuestion?.(question.id)}
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteQuestion?.(question.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Spinner size="lg" />
          <p>Generating questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Generation Failed</h3>
          <p>{error}</p>
          {onRegenerate && (
            <Button onClick={onRegenerate}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No Questions Generated</h3>
          <p>No questions have been generated yet. Check your configuration and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h2>Generated Questions</h2>
          <div className={styles.summary}>
            {filteredQuestions.length} of {questions.length} questions
            {selectedQuestions.size > 0 && ` • ${selectedQuestions.size} selected`}
          </div>
        </div>

        <div className={styles.filters}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            {questionTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Difficulties</option>
            {difficultyLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
      </div>

      {allowEditing && selectedQuestions.size === 0 && (
        <div className={styles.bulkActions}>
          <Button variant="secondary" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setExpandedQuestions(new Set(filteredQuestions.map(q => q.id)))}>
            Expand All
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setExpandedQuestions(new Set())}>
            Collapse All
          </Button>
        </div>
      )}

      {allowEditing && selectedQuestions.size > 0 && (
        <div className={styles.selectionActions}>
          <div className={styles.selectionInfo}>
            {selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''} selected
          </div>
          <div className={styles.selectionButtons}>
            <Button variant="secondary" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                selectedQuestions.forEach(id => onRegenerateQuestion?.(id));
                clearSelection();
              }}
            >
              Regenerate Selected
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                selectedQuestions.forEach(id => onDeleteQuestion?.(id));
                clearSelection();
              }}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className={`${styles.questionsList} ${compact ? styles.compact : ''}`}>
        {filteredQuestions.map(renderQuestion)}
      </div>

      {showActions && (
        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onRegenerate && (
              <Button variant="secondary" onClick={onRegenerate}>
                Regenerate All
              </Button>
            )}
          </div>
          {onAccept && (
            <Button onClick={onAccept} disabled={questions.length === 0}>
              Accept & Create Evaluation ({questions.length} questions)
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneratedQuestionsPreview;