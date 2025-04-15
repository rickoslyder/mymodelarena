import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css' // Default Vite styles (can be removed/modified later if needed)
import './styles/global.css' // Import global styles
import './styles/theme.css'  // Import theme variables

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default query options can go here
      // Example: staleTime: 1000 * 60 * 5, // 5 minutes
      // Example: refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
