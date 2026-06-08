import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'primary' | 'gold' | 'tech' | 'orange' | 'success' | 'danger';
  showLabel?: boolean;
  labelPlacement?: 'inside' | 'outside';
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
  animated?: boolean;
  className?: string;
}

const colorClasses: Record<string, string> = {
  primary: 'bg-primary-500',
  gold: 'bg-gold-500',
  tech: 'bg-tech-500',
  orange: 'bg-orange-500',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export default function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  showLabel = true,
  labelPlacement = 'outside',
  size = 'md',
  striped = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(percentage), 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn('w-full', className)}>
      {labelPlacement === 'outside' && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {Math.round(percentage)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {value} / {max}
          </span>
        </div>
      )}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800',
          sizeClasses[size]
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${displayValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            colorClasses[color],
            striped &&
              'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.15)_10px,rgba(255,255,255,0.15)_20px)]'
          )}
        >
          {animated && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {labelPlacement === 'inside' && showLabel && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-white drop-shadow">
                {Math.round(percentage)}%
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
