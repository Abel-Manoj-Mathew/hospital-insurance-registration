import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/state/sessionStore'
import { WelcomePage } from '@/pages/WelcomePage'
import { LanguagePage } from '@/pages/LanguagePage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { DocumentCapturePage } from '@/pages/DocumentCapturePage'
import { DocumentProcessingPage } from '@/pages/DocumentProcessingPage'
import { BedPreferencePage } from '@/pages/BedPreferencePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { SuccessPage } from '@/pages/SuccessPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  const language = useSessionStore((state) => state.language)
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.lang = language ?? 'en'
  }, [language])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/language" element={<LanguagePage />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/documents/:documentType" element={<DocumentCapturePage />} />
      <Route path="/documents/:documentType/processing" element={<DocumentProcessingPage />} />
      <Route path="/preferences" element={<BedPreferencePage />} />
      <Route path="/review" element={<ReviewPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
