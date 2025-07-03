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
import { Toaster } from 'react-hot-toast'

function App() {
  // Define the main layout structure
  const Layout = () => (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
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
        <PageWrapper>
          <Outlet /> {/* Child routes will render here */}
        </PageWrapper>
      </div>
    </div>
  )

  return (
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
  )
}

export default App
