import React from 'react';

export function Card({ children, className = '', ...props }) {
 return (
 <div className={`card-panel bg-[var(--color-bg-card)] ${className}`} {...props}>
 {children}
 </div>
 );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
 return (
 <div className={`p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-4 ${className}`}>
 <div>
 {title && <h3 className="font-bold text-lg text-[var(--color-text-main)]">{title}</h3>}
 {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
 </div>
 {action && <div>{action}</div>}
 </div>
 );
}

export function CardContent({ children, className = '', noPadding = false }) {
 return (
 <div className={`${noPadding ? '' : 'p-5'} ${className}`}>
 {children}
 </div>
 );
}

export function CardFooter({ children, className = '' }) {
 return (
 <div className={`p-5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] flex items-center ${className}`}>
 {children}
 </div>
 );
}
