export const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: '🔘' },
  { value: 'true-false', label: 'True/False', icon: '✓' },
  { value: 'short-answer', label: 'Short Answer', icon: '✏️' },
  { value: 'essay', label: 'Essay', icon: '📝' },
  { value: 'coding', label: 'Coding Challenge', icon: '💻' },
  { value: 'fill-blank', label: 'Fill in the Blank', icon: '___' },
  { value: 'matching', label: 'Matching', icon: '🔗' },
  { value: 'ranking', label: 'Ranking/Ordering', icon: '📊' },
] as const;

export type QuestionType = typeof QUESTION_TYPES[number]['value'];