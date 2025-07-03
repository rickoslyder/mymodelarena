import React, { useState } from 'react';
import Button from '../common/Button';
import Checkbox from '../common/Checkbox';
import styles from './QuestionTypeSelector.module.css';

export interface QuestionType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'cognitive' | 'technical' | 'creative' | 'analytical';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  examples: string[];
}

interface QuestionTypeSelectorProps {
  selectedTypes: string[];
  onChange: (selectedTypes: string[]) => void;
  label?: string;
  maxSelections?: number;
  showCategories?: boolean;
  disabled?: boolean;
  required?: boolean;
}

const QUESTION_TYPES: QuestionType[] = [
  {
    id: 'multiple-choice',
    name: 'Multiple Choice',
    description: 'Questions with predefined answer options',
    icon: '☑️',
    category: 'cognitive',
    difficulty: 'beginner',
    examples: ['What is the capital of France?', 'Which programming language is known for memory safety?']
  },
  {
    id: 'true-false',
    name: 'True/False',
    description: 'Binary choice questions',
    icon: '✓',
    category: 'cognitive',
    difficulty: 'beginner',
    examples: ['Python is a compiled language', 'The earth orbits the sun']
  },
  {
    id: 'short-answer',
    name: 'Short Answer',
    description: 'Brief written responses (1-3 sentences)',
    icon: '✏️',
    category: 'analytical',
    difficulty: 'intermediate',
    examples: ['Explain the concept of recursion', 'What are the benefits of version control?']
  },
  {
    id: 'essay',
    name: 'Essay',
    description: 'Extended written responses requiring analysis',
    icon: '📝',
    category: 'analytical',
    difficulty: 'advanced',
    examples: ['Analyze the impact of AI on society', 'Compare functional vs object-oriented programming']
  },
  {
    id: 'code-completion',
    name: 'Code Completion',
    description: 'Programming tasks requiring code implementation',
    icon: '💻',
    category: 'technical',
    difficulty: 'intermediate',
    examples: ['Implement a binary search algorithm', 'Write a function to reverse a string']
  },
  {
    id: 'debugging',
    name: 'Code Debugging',
    description: 'Find and fix errors in provided code',
    icon: '🐛',
    category: 'technical',
    difficulty: 'advanced',
    examples: ['Fix the bug in this sorting function', 'Identify memory leaks in this C++ code']
  },
  {
    id: 'algorithm-design',
    name: 'Algorithm Design',
    description: 'Create algorithms to solve complex problems',
    icon: '⚙️',
    category: 'technical',
    difficulty: 'advanced',
    examples: ['Design an efficient pathfinding algorithm', 'Create a data compression algorithm']
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Original creative content generation',
    icon: '🎨',
    category: 'creative',
    difficulty: 'intermediate',
    examples: ['Write a short story about time travel', 'Create dialogue for a character in conflict']
  },
  {
    id: 'problem-solving',
    name: 'Problem Solving',
    description: 'Logic puzzles and reasoning challenges',
    icon: '🧩',
    category: 'analytical',
    difficulty: 'intermediate',
    examples: ['Solve this logic grid puzzle', 'Find the pattern in this sequence']
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Real-world scenario analysis',
    icon: '📊',
    category: 'analytical',
    difficulty: 'advanced',
    examples: ['Analyze this business failure case', 'Evaluate this engineering design decision']
  },
  {
    id: 'mathematical',
    name: 'Mathematical',
    description: 'Math problems and calculations',
    icon: '🔢',
    category: 'analytical',
    difficulty: 'intermediate',
    examples: ['Solve this calculus problem', 'Prove this geometric theorem']
  },
  {
    id: 'visual-analysis',
    name: 'Visual Analysis',
    description: 'Interpret charts, graphs, or images',
    icon: '📈',
    category: 'analytical',
    difficulty: 'intermediate',
    examples: ['Analyze trends in this sales chart', 'Describe patterns in this data visualization']
  }
];

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  selectedTypes,
  onChange,
  label = "Question Types",
  maxSelections,
  showCategories = true,
  disabled = false,
  required = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const categories = Array.from(new Set(QUESTION_TYPES.map(type => type.category)));
  const categoryLabels = {
    cognitive: '🧠 Cognitive',
    technical: '💻 Technical', 
    creative: '🎨 Creative',
    analytical: '📊 Analytical'
  };

  const filteredTypes = activeCategory === 'all' 
    ? QUESTION_TYPES 
    : QUESTION_TYPES.filter(type => type.category === activeCategory);

  const handleTypeToggle = (typeId: string) => {
    if (disabled) return;
    
    const isSelected = selectedTypes.includes(typeId);
    let newSelection: string[];
    
    if (isSelected) {
      newSelection = selectedTypes.filter(id => id !== typeId);
    } else {
      if (maxSelections && selectedTypes.length >= maxSelections) {
        // Replace the first selected item if at max
        newSelection = [...selectedTypes.slice(1), typeId];
      } else {
        newSelection = [...selectedTypes, typeId];
      }
    }
    
    onChange(newSelection);
  };

  const selectAll = () => {
    const allIds = filteredTypes.map(type => type.id);
    const limitedSelection = maxSelections 
      ? allIds.slice(0, maxSelections)
      : allIds;
    onChange(limitedSelection);
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className={styles.container}>
      {label && (
        <div className={styles.header}>
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
          <div className={styles.summary}>
            {selectedTypes.length} selected
            {maxSelections && ` (max ${maxSelections})`}
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={selectAll}
            disabled={disabled}
          >
            Select All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={clearAll}
            disabled={disabled || selectedTypes.length === 0}
          >
            Clear All
          </Button>
        </div>

        {showCategories && (
          <div className={styles.categoryTabs}>
            <button
              className={`${styles.categoryTab} ${activeCategory === 'all' ? styles.active : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Types
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={`${styles.categoryTab} ${activeCategory === category ? styles.active : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {categoryLabels[category as keyof typeof categoryLabels]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.typeGrid}>
        {filteredTypes.map(type => {
          const isSelected = selectedTypes.includes(type.id);
          const isAtMax = Boolean(maxSelections && selectedTypes.length >= maxSelections && !isSelected);
          
          return (
            <div
              key={type.id}
              className={`${styles.typeCard} ${isSelected ? styles.selected : ''} ${isAtMax ? styles.disabled : ''}`}
              onClick={() => handleTypeToggle(type.id)}
            >
              <div className={styles.typeHeader}>
                <div className={styles.typeIcon}>{type.icon}</div>
                <div className={styles.typeInfo}>
                  <div className={styles.typeName}>{type.name}</div>
                  <div 
                    className={styles.typeDifficulty}
                    style={{ color: getDifficultyColor(type.difficulty) }}
                  >
                    {type.difficulty}
                  </div>
                </div>
                <Checkbox
                  label=""
                  checked={isSelected}
                  onChange={() => handleTypeToggle(type.id)}
                  disabled={disabled || (isAtMax && !isSelected)}
                />
              </div>
              
              <div className={styles.typeDescription}>
                {type.description}
              </div>

              <div className={styles.typeFooter}>
                <button
                  className={styles.detailsButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(showDetails === type.id ? null : type.id);
                  }}
                >
                  {showDetails === type.id ? 'Hide' : 'Show'} Examples
                </button>
              </div>

              {showDetails === type.id && (
                <div className={styles.typeExamples}>
                  <h5>Example Questions:</h5>
                  <ul>
                    {type.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTypes.length === 0 && required && (
        <div className={styles.error}>
          Please select at least one question type
        </div>
      )}
    </div>
  );
};

export default QuestionTypeSelector;