import { createContext } from 'react';
import { useAlerts } from '../hooks/useAlerts';

export const AlertContext = createContext<ReturnType<typeof useAlerts> | null>(null);