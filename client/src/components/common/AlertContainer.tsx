import React from 'react';
import Alert, { AlertProps } from './Alert';
import styles from './AlertContainer.module.css';

interface AlertContainerProps {
  alerts: Array<AlertProps & { id: string }>;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxAlerts?: number;
  className?: string;
}

const AlertContainer: React.FC<AlertContainerProps> = ({
  alerts,
  position = 'top-right',
  maxAlerts = 5,
  className,
}) => {
  // Limit the number of alerts shown
  const visibleAlerts = alerts.slice(-maxAlerts);

  if (visibleAlerts.length === 0) {
    return null;
  }

  const containerClasses = [
    styles.alertContainer,
    styles[position],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} {...alert} />
      ))}
    </div>
  );
};

export default AlertContainer;