import React, { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import styles from './Alert.module.css';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  autoClose?: boolean;
  autoCloseDelay?: number; // in milliseconds
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  dismissible = true,
  actions = [],
  autoClose = false,
  autoCloseDelay = 5000,
  onClose,
  className,
  icon,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 200); // Animation duration
  }, [onClose]);

  useEffect(() => {
    if (autoClose && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, handleClose]);

  const getDefaultIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  if (!isVisible) {
    return null;
  }

  const alertClasses = [
    styles.alert,
    styles[type],
    isClosing ? styles.closing : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={alertClasses} role="alert">
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          {icon || (
            <span 
              className={styles.defaultIcon}
              style={{ color: getIconColor() }}
            >
              {getDefaultIcon()}
            </span>
          )}
        </div>

        <div className={styles.textContainer}>
          {title && (
            <div className={styles.title}>{title}</div>
          )}
          <div className={styles.message}>{message}</div>
        </div>

        <div className={styles.actionsContainer}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              className={styles.actionButton}
            >
              {action.label}
            </Button>
          ))}

          {dismissible && (
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close alert"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {autoClose && autoCloseDelay > 0 && (
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              animationDuration: `${autoCloseDelay}ms`,
              animationPlayState: isClosing ? 'paused' : 'running'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Alert;