import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: ReactNode;
  value: string | number | ReactNode;
  label: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  gradient?: 'primary' | 'gold' | 'tech' | 'orange' | 'success' | 'danger';
  className?: string;
  onClick?: () => void;
}

const gradientClasses: Record<string, string> = {
  primary: 'from-primary-500 to-primary-700',
  gold: 'from-gold-400 to-gold-600',
  tech: 'from-tech-400 to-tech-600',
  orange: 'from-orange-400 to-orange-600',
  success: 'from-success-400 to-success-600',
  danger: 'from-danger-400 to-danger-600',
};

export default function StatCard({
  icon,
  value,
  label,
  trend,
  gradient = 'primary',
  className,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 shadow-card cursor-pointer',
        'bg-gradient-to-br text-white',
        gradientClasses[gradient],
        className
      )}
      onClick={onClick}
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
      <div className="absolute -right-4 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                trend.isPositive !== false
                  ? 'bg-white/20 text-white'
                  : 'bg-white/20 text-white'
              )}
            >
              {trend.isPositive !== false ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.isPositive !== false ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-3xl font-bold font-display tracking-tight">{value}</p>
          <p className="text-white/80 text-sm font-medium">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
