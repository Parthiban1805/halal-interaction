import React from 'react';

/**
 * Base Skeleton Block
 * Represents a single shimmering box or line.
 */
export const Skeleton = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'shimmer-bg';
  
  const variantClasses = {
    circular: 'rounded-full',
    text: 'rounded-md',
    rectangular: 'rounded-xl',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

/**
 * Table Skeleton
 * Represents a table loading state.
 */
export const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="w-full overflow-hidden border border-[var(--color-border-subtle)] rounded-2xl bg-white">
      {/* Header */}
      <div className="flex bg-[var(--color-bg-subtle)] p-4 border-b border-[var(--color-border-subtle)]">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`th-${i}`} className="flex-1 px-2">
            <Skeleton variant="text" className="h-4 w-24" />
          </div>
        ))}
      </div>
      {/* Body Rows */}
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`tr-${rIdx}`} className="flex p-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div key={`td-${rIdx}-${cIdx}`} className="flex-1 px-2 flex items-center">
                {cIdx === 0 ? (
                  // Maybe the first column has an avatar + text
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circular" className="h-8 w-8 shrink-0" />
                    <div className="flex flex-col gap-2">
                      <Skeleton variant="text" className="h-3 w-32" />
                      <Skeleton variant="text" className="h-2 w-20" />
                    </div>
                  </div>
                ) : (
                  <Skeleton variant="text" className="h-3 w-20" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Card Skeleton
 * Represents a dashboard metric card.
 */
export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[var(--color-border-subtle)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-4 w-1/3" />
        <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
      </div>
      <div className="space-y-2 mt-2">
        <Skeleton variant="text" className="h-8 w-1/2" />
        <Skeleton variant="text" className="h-3 w-1/4" />
      </div>
    </div>
  );
};

/**
 * Detail Skeleton
 * Represents a detailed view (like LeadDetailModal or Event Details).
 */
export const DetailSkeleton = () => {
  return (
    <div className="p-6 space-y-8 bg-white h-full w-full border border-[var(--color-border-subtle)] rounded-2xl">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <Skeleton variant="circular" className="h-16 w-16" />
          <div className="space-y-3 pt-2">
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
        </div>
        <Skeleton variant="rectangular" className="h-8 w-24" />
      </div>

      {/* Grid Section (Info blocks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 border border-[var(--color-border-subtle)] p-5 rounded-2xl">
          <Skeleton variant="text" className="h-5 w-1/3" />
          <div className="space-y-3">
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-5/6" />
            <Skeleton variant="text" className="h-3 w-4/6" />
          </div>
        </div>
        <div className="space-y-4 border border-[var(--color-border-subtle)] p-5 rounded-2xl">
          <Skeleton variant="text" className="h-5 w-1/3" />
          <div className="space-y-3">
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-5/6" />
            <Skeleton variant="text" className="h-3 w-4/6" />
          </div>
        </div>
      </div>
      
      {/* Tabs / Logs Section */}
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-[var(--color-border-subtle)] pb-2">
          <Skeleton variant="text" className="h-5 w-20" />
          <Skeleton variant="text" className="h-5 w-20" />
          <Skeleton variant="text" className="h-5 w-20" />
        </div>
        <div className="space-y-4 pt-4">
           <Skeleton variant="rectangular" className="h-16 w-full" />
           <Skeleton variant="rectangular" className="h-16 w-full" />
           <Skeleton variant="rectangular" className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard Skeleton
 * Represents a generic dashboard with top cards and bottom charts.
 */
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Top metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <CardSkeleton />
         <CardSkeleton />
         <CardSkeleton />
         <CardSkeleton />
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white rounded-2xl p-5 h-[400px] border border-[var(--color-border-subtle)] flex flex-col gap-4">
            <Skeleton variant="text" className="h-6 w-1/3" />
            <Skeleton variant="rectangular" className="flex-1 w-full" />
         </div>
         <div className="bg-white rounded-2xl p-5 h-[400px] border border-[var(--color-border-subtle)] flex flex-col gap-4">
            <Skeleton variant="text" className="h-6 w-1/3" />
            <Skeleton variant="rectangular" className="flex-1 w-full" />
         </div>
      </div>
    </div>
  );
};
