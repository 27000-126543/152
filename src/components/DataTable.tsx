import { useState, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: T[keyof T] | undefined, row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  rowKey?: keyof T | ((row: T) => string);
  rowClassName?: (row: T) => string;
  emptyState?: ReactNode;
  className?: string;
}

export default function DataTable<T extends object>({
  columns,
  data,
  pageSize = 10,
  onRowClick,
  rowKey = 'id' as keyof T,
  rowClassName,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key as string];
      const bValue = (b as Record<string, unknown>)[sortConfig.key as string];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: keyof T | string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String((row as Record<string, unknown>)[rowKey as string] ?? '');
  };

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (data.length === 0) {
    return (
      <div className={cn('w-full py-12', className)}>
        {emptyState || (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Inbox className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无数据</p>
            <p className="text-sm mt-1">数据列表为空</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300',
                    alignClasses[col.align || 'left'],
                    col.sortable && 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1 justify-inherit">
                    {col.header}
                    {col.sortable && (
                      <span className="flex flex-col -space-y-1">
                        <ChevronUp
                          className={cn(
                            'w-3 h-3 transition-colors',
                            sortConfig?.key === col.key && sortConfig.direction === 'asc'
                              ? 'text-primary-500'
                              : 'text-gray-300 dark:text-gray-600'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-colors',
                            sortConfig?.key === col.key && sortConfig.direction === 'desc'
                              ? 'text-primary-500'
                              : 'text-gray-300 dark:text-gray-600'
                          )}
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence>
              {paginatedData.map((row, index) => (
                <motion.tr
                  key={getRowKey(row)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={cn(
                    'bg-white dark:bg-gray-950 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900',
                    rowClassName?.(row)
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300',
                        alignClasses[col.align || 'left']
                      )}
                    >
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key as string] as T[keyof T] | undefined, row, index)
                        : ((row as Record<string, unknown>)[col.key as string] as ReactNode)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            共 <span className="font-medium text-gray-700 dark:text-gray-300">{data.length}</span> 条，
            第 <span className="font-medium text-gray-700 dark:text-gray-300">{currentPage}</span> / {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    'min-w-9 h-9 px-2.5 rounded-lg text-sm font-medium transition-colors',
                    currentPage === pageNum
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
