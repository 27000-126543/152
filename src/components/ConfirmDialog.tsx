import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  content?: string;
  icon?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  className?: string;
  isLoading?: boolean;
  children?: ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  content,
  icon,
  confirmText = '确认',
  cancelText = '取消',
  confirmButtonClass,
  cancelButtonClass,
  className,
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden dark:bg-gray-900',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                  {icon || <AlertTriangle className="w-6 h-6 text-orange-500" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                </div>
              </div>

              {content && (
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {content}
                </p>
              )}
              {children}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-medium transition-all',
                  'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  cancelButtonClass
                )}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  'px-5 py-2.5 rounded-xl font-medium transition-all',
                  'bg-danger-500 text-white hover:bg-danger-600 shadow-lg shadow-danger-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2',
                  confirmButtonClass
                )}
              >
                {isLoading && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                )}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
