import { useContext } from 'react';
import { AlertContext } from '../contexts/AlertContext';

export const useAppAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAppAlerts must be used within AlertProvider');
  }
  return context;
};