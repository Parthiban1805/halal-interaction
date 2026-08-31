import React from 'react';

export default function Badge({ 
 children, 
 variant = 'default',
 className = ''
}) {
 const variants = {
 success: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)]",
 warning: "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)]",
 error: "bg-[var(--color-status-error-bg)] text-[var(--color-status-error)]",
 info: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
 default: "bg-[var(--color-bg-active)] text-[var(--color-text-muted)]"
 };

 return (
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${variants[variant]} ${className}`}>
 {children}
 </span>
 );
}
