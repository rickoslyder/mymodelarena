import { useState, useCallback, useRef } from 'react';

export interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useAlerts = (maxAlerts = 5, defaultDuration = 5000) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const alertIdCounter = useRef(0);

  const showAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = `alert-${Date.now()}-${alertIdCounter.current++}`;
    const newAlert: Alert = {
      ...alert,
      id,
      duration: alert.duration ?? defaultDuration,
    };

    setAlerts(prev => {
      const updated = [...prev, newAlert];
      return updated.slice(-maxAlerts);
    });

    return id;
  }, [maxAlerts, defaultDuration]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return showAlert({ type: 'success', message, duration });
  }, [showAlert]);

  const showError = useCallback((message: string, duration?: number) => {
    return showAlert({ type: 'error', message, duration });
  }, [showAlert]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return showAlert({ type: 'warning', message, duration });
  }, [showAlert]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return showAlert({ type: 'info', message, duration });
  }, [showAlert]);

  return {
    alerts,
    showAlert,
    removeAlert,
    clearAlerts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};