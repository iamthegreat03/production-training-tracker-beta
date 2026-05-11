import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(15 15 30)',
            border: '1px solid rgb(255 255 255 / 0.08)',
            color: '#f1f1f1',
            borderRadius: '14px',
          },
        }}
      />
    </AppProvider>
  </StrictMode>,
)
