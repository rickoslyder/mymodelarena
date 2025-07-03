import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ModelsPage from './pages/ModelsPage'
import EvalsListPage from './pages/EvalsListPage'
import EvalDetailPage from './pages/EvalDetailPage'
import EvalGenerationPage from './pages/EvalGenerationPage'
import EvalRunPage from './pages/EvalRunPage'
import ReportingPage from './pages/ReportingPage'
import TemplatesPage from './pages/TemplatesPage'
import NotFoundPage from './pages/NotFoundPage'
// Import layout components
import Sidebar from './components/layout/Sidebar'
import PageWrapper from './components/layout/PageWrapper'
import Header from './components/layout/Header'
import ErrorBoundary from './components/common/ErrorBoundary'
import AlertContainer from './components/common/AlertContainer'
import { useAlerts } from './components/common/Alert'
import { Toaster } from 'react-hot-toast'

// Create Alert Context
const AlertContext = createContext<ReturnType<typeof useAlerts> | null>(null)

export const useAppAlerts = () => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAppAlerts must be used within AlertProvider')
  }
  return context
}

function App() {
  const alertsManager = useAlerts()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(false) // Close sidebar when switching to desktop
      }
    }

    handleResize() // Check initial size
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Global error caught:', error, errorInfo)
    alertsManager.showError('An unexpected error occurred. Please refresh the page if the problem persists.')
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  // Define the main layout structure
  const Layout = () => (
    <AlertContext.Provider value={alertsManager}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {!isMobile && <Sidebar isOpen={true} onClose={closeSidebar} />}
        {isMobile && (
          <>
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            {sidebarOpen && (
              <div 
                style={{ 
                  position: 'fixed', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                  zIndex: 999 
                }}
                onClick={closeSidebar}
              />
            )}
          </>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Header onMenuToggle={toggleSidebar} />
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: '',
              duration: 5000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: 'var(--color-success)',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: 'var(--color-danger)',
                },
              },
            }}
          />
          <ErrorBoundary onError={handleGlobalError} resetOnPropsChange={true}>
            <PageWrapper>
              <Outlet /> {/* Child routes will render here */}
            </PageWrapper>
          </ErrorBoundary>
          
          {/* Global alert container */}
          <AlertContainer 
            alerts={alertsManager.alerts} 
            position="top-right"
            maxAlerts={3}
          />
        </div>
      </div>
    </AlertContext.Provider>
  )

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="evals" element={<EvalsListPage />} />
            <Route path="evals/:id" element={<EvalDetailPage />} />
            <Route path="evals/:evalId/run/:runId" element={<EvalRunPage />} />
            <Route path="evals/generate" element={<EvalGenerationPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="reporting" element={<ReportingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
