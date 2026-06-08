import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  mode?: 'fullscreen' | 'inline';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const colorClasses: Record<string, string> = {
  primary: 'text-primary-500',
  white: 'text-white',
};

export default function Loading({
  mode = 'inline',
  text,
  size = 'md',
  color = 'primary',
  className,
}: LoadingProps) {
  if (mode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={cn(sizeClasses[size], colorClasses['white'])}
        >
          <Loader2 className="w-full h-full" />
        </motion.div>
        {text && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-white text-sm font-medium"
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8',
        className
      )}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={cn(sizeClasses[size], colorClasses[color])}
      >
        <Loader2 className="w-full h-full" />
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-gray-500 dark:text-gray-400 text-sm"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
