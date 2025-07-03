import React, { useState } from 'react';
import styles from './DifficultySelector.module.css';

export interface DifficultyLevel {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  indicators: {
    complexity: number; // 1-5 scale
    timeRequired: string;
    skillLevel: string;
    examples: string[];
  };
}

interface DifficultySelectorProps {
  selectedDifficulty: string;
  onChange: (difficulty: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  showDetails?: boolean;
  variant?: 'cards' | 'slider' | 'buttons';
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Basic concepts and straightforward questions',
    color: '#10b981',
    icon: '🌱',
    indicators: {
      complexity: 1,
      timeRequired: '1-3 minutes',
      skillLevel: 'No prior experience needed',
      examples: [
        'What is the capital of France?',
        'True or False: Python is a programming language',
        'Which of these is a primary color?'
      ]
    }
  },
  {
    id: 'easy',
    name: 'Easy',
    description: 'Simple problems requiring basic understanding',
    color: '#84cc16',
    icon: '📖',
    indicators: {
      complexity: 2,
      timeRequired: '3-5 minutes',
      skillLevel: 'Basic knowledge required',
      examples: [
        'Explain the difference between a list and array',
        'Calculate: 25% of 80',
        'What is the main idea of this paragraph?'
      ]
    }
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Moderate complexity requiring analysis and reasoning',
    color: '#f59e0b',
    icon: '🎯',
    indicators: {
      complexity: 3,
      timeRequired: '5-10 minutes',
      skillLevel: 'Intermediate understanding',
      examples: [
        'Debug this code snippet and explain the error',
        'Analyze the cause and effect in this scenario',
        'Design a simple algorithm to solve this problem'
      ]
    }
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Complex problems requiring deep understanding',
    color: '#f97316',
    icon: '🔥',
    indicators: {
      complexity: 4,
      timeRequired: '10-20 minutes',
      skillLevel: 'Advanced knowledge required',
      examples: [
        'Optimize this algorithm for better performance',
        'Evaluate competing theories and argue for one',
        'Design a system architecture for this requirement'
      ]
    }
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Advanced challenges for domain experts',
    color: '#ef4444',
    icon: '🏆',
    indicators: {
      complexity: 5,
      timeRequired: '20+ minutes',
      skillLevel: 'Expert-level knowledge',
      examples: [
        'Research and synthesize multiple academic papers',
        'Design and implement a novel solution approach',
        'Provide detailed technical leadership recommendations'
      ]
    }
  }
];

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  selectedDifficulty,
  onChange,
  label = "Difficulty Level",
  disabled = false,
  required = false,
  showDetails = true,
  variant = 'cards',
}) => {
  const [showDetailFor, setShowDetailFor] = useState<string | null>(null);

  const selectedLevel = DIFFICULTY_LEVELS.find(level => level.id === selectedDifficulty);

  const renderComplexityIndicator = (complexity: number) => {
    return (
      <div className={styles.complexityIndicator}>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className={`${styles.complexityDot} ${
              index < complexity ? styles.filled : ''
            }`}
            style={{
              backgroundColor: index < complexity ? selectedLevel?.color : '#e5e7eb'
            }}
          />
        ))}
      </div>
    );
  };

  const renderCardVariant = () => (
    <div className={styles.cardGrid}>
      {DIFFICULTY_LEVELS.map((level) => {
        const isSelected = selectedDifficulty === level.id;
        
        return (
          <div
            key={level.id}
            className={`${styles.difficultyCard} ${
              isSelected ? styles.selected : ''
            } ${disabled ? styles.disabled : ''}`}
            onClick={() => !disabled && onChange(level.id)}
            style={{
              borderColor: isSelected ? level.color : undefined,
              boxShadow: isSelected ? `0 0 0 2px ${level.color}20` : undefined,
            }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>{level.icon}</div>
              <div className={styles.cardTitle} style={{ color: level.color }}>
                {level.name}
              </div>
            </div>
            
            <div className={styles.cardDescription}>
              {level.description}
            </div>

            {showDetails && (
              <div className={styles.cardIndicators}>
                <div className={styles.indicatorRow}>
                  <span className={styles.indicatorLabel}>Complexity:</span>
                  {renderComplexityIndicator(level.indicators.complexity)}
                </div>
                <div className={styles.indicatorRow}>
                  <span className={styles.indicatorLabel}>Time:</span>
                  <span className={styles.indicatorValue}>{level.indicators.timeRequired}</span>
                </div>
                <div className={styles.indicatorRow}>
                  <span className={styles.indicatorLabel}>Skill:</span>
                  <span className={styles.indicatorValue}>{level.indicators.skillLevel}</span>
                </div>
              </div>
            )}

            {showDetails && (
              <div className={styles.cardFooter}>
                <button
                  className={styles.examplesButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailFor(showDetailFor === level.id ? null : level.id);
                  }}
                >
                  {showDetailFor === level.id ? 'Hide' : 'Show'} Examples
                </button>
              </div>
            )}

            {showDetailFor === level.id && (
              <div className={styles.cardExamples}>
                <h5>Example Questions:</h5>
                <ul>
                  {level.indicators.examples.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderSliderVariant = () => (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderTrack}>
        {DIFFICULTY_LEVELS.map((level, index) => {
          const isSelected = selectedDifficulty === level.id;
          
          return (
            <div
              key={level.id}
              className={`${styles.sliderStep} ${isSelected ? styles.selected : ''}`}
              onClick={() => !disabled && onChange(level.id)}
              style={{
                left: `${(index / (DIFFICULTY_LEVELS.length - 1)) * 100}%`,
              }}
            >
              <div
                className={styles.sliderDot}
                style={{
                  backgroundColor: isSelected ? level.color : '#d1d5db',
                  transform: isSelected ? 'scale(1.5)' : 'scale(1)',
                }}
              />
              <div className={styles.sliderLabel}>{level.name}</div>
              {isSelected && (
                <div className={styles.sliderTooltip} style={{ backgroundColor: level.color }}>
                  <div className={styles.tooltipContent}>
                    <strong>{level.name}</strong>
                    <br />
                    {level.description}
                    <br />
                    Complexity: {renderComplexityIndicator(level.indicators.complexity)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderButtonVariant = () => (
    <div className={styles.buttonGroup}>
      {DIFFICULTY_LEVELS.map((level) => {
        const isSelected = selectedDifficulty === level.id;
        
        return (
          <button
            key={level.id}
            className={`${styles.difficultyButton} ${
              isSelected ? styles.selected : ''
            }`}
            onClick={() => !disabled && onChange(level.id)}
            disabled={disabled}
            style={{
              backgroundColor: isSelected ? level.color : undefined,
              borderColor: isSelected ? level.color : undefined,
              color: isSelected ? 'white' : undefined,
            }}
          >
            <span className={styles.buttonIcon}>{level.icon}</span>
            <span className={styles.buttonText}>{level.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={styles.container}>
      {label && (
        <div className={styles.header}>
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
          {selectedLevel && (
            <div className={styles.selectedInfo}>
              <span className={styles.selectedIcon}>{selectedLevel.icon}</span>
              <span className={styles.selectedName} style={{ color: selectedLevel.color }}>
                {selectedLevel.name}
              </span>
            </div>
          )}
        </div>
      )}

      {variant === 'cards' && renderCardVariant()}
      {variant === 'slider' && renderSliderVariant()}
      {variant === 'buttons' && renderButtonVariant()}

      {!selectedDifficulty && required && (
        <div className={styles.error}>
          Please select a difficulty level
        </div>
      )}
    </div>
  );
};

export default DifficultySelector;