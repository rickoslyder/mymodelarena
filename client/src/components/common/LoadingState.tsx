import React from 'react';
import Spinner from './Spinner';
import styles from './LoadingState.module.css';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  variant?: 'default' | 'overlay' | 'inline' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progress?: number; // 0-100
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  submessage,
  variant = 'default',
  size = 'md',
  showProgress = false,
  progress = 0,
  className,
}) => {
  const containerClasses = [
    styles.loadingState,
    styles[variant],
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  const renderProgress = () => {
    if (!showProgress) return null;
    
    return (
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className={styles.progressText}>{Math.round(progress)}%</span>
      </div>
    );
  };

  if (variant === 'minimal') {
    return (
      <div className={containerClasses}>
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={containerClasses}>
        <Spinner size="sm" />
        <span className={styles.inlineMessage}>{message}</span>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {variant === 'overlay' && <div className={styles.overlay} />}
      
      <div className={styles.content}>
        <div className={styles.spinnerContainer}>
          <Spinner size={size} />
        </div>
        
        <div className={styles.textContainer}>
          <div className={styles.message}>{message}</div>
          {submessage && (
            <div className={styles.submessage}>{submessage}</div>
          )}
        </div>

        {renderProgress()}
      </div>
    </div>
  );
};

export default LoadingState;