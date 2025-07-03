export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', icon: '🟢', color: '#22c55e' },
  { value: 'medium', label: 'Medium', icon: '🟡', color: '#eab308' },
  { value: 'hard', label: 'Hard', icon: '🔴', color: '#ef4444' },
  { value: 'expert', label: 'Expert', icon: '🟣', color: '#a855f7' },
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]['value'];