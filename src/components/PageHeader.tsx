import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backPath?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function PageHeader({
  title,
  description,
  showBackButton = false,
  backPath,
  actions,
  icon: Icon,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mb-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {title}
              </h1>
              {description && (
                <p className="text-slate-500 mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
