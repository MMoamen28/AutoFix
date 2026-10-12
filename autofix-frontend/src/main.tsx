import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/700.css'
import './index.css'
import './i18n/i18n'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
)
