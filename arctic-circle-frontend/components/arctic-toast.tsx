'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useArcticToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ArcticToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 4000)
    return () => clearTimeout(timer)
  }, [toasts])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-[48px] right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-[4px] border border-card-border bg-card px-4 py-3 font-sans text-[13px] text-foreground shadow-lg"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: toast.type === 'success' ? '#34D399' : '#F87171',
            }}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
