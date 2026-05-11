import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'error'
}

interface ToastContextValue {
  show: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, ...toast }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            onOpenChange={(open) => !open && dismiss(toast.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-[var(--color-surface-elevated)] p-4 pr-10 shadow-2xl',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
              'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
              'data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
              toast.variant === 'error'
                ? 'border-[var(--color-danger)]/40'
                : 'border-[var(--color-border-strong)]',
            )}
          >
            <div className="shrink-0 mt-0.5">
              {toast.variant === 'error' ? (
                <AlertCircle className="size-5 text-[var(--color-danger)]" />
              ) : (
                <CheckCircle2 className="size-5 text-[var(--color-success)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-medium text-[var(--color-foreground)]">
                {toast.title}
              </ToastPrimitive.Title>
              {toast.description && (
                <ToastPrimitive.Description className="text-xs text-[var(--color-muted)] mt-1">
                  {toast.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="absolute right-2 top-2 rounded-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
