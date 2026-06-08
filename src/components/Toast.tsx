import { useState, useEffect, useCallback, ReactNode, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextProps {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextProps | null>(null);

const toastIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-success-500" />,
  error: <XCircle className="w-5 h-5 text-danger-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  info: <Info className="w-5 h-5 text-tech-500" />,
};

const toastColors: Record<ToastType, string> = {
  success: 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20',
  error: 'border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20',
  warning: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20',
  info: 'border-tech-200 bg-tech-50 dark:border-tech-800 dark:bg-tech-900/20',
};

function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: string) => void }) {
  if (!document.body) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm',
              toastColors[toast.type]
            )}
          >
            {toastIcons[toast.type]}
            <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:text-gray-300 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default function Toast({
  type = 'info',
  message,
  visible,
  onClose,
  duration = 3000,
  className,
}: {
  type?: ToastType;
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
  className?: string;
}) {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!document.body) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <div className="fixed top-4 right-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm',
              toastColors[type],
              className
            )}
          >
            {toastIcons[type]}
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{message}</p>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:text-gray-300 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
