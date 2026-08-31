import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
 children, 
 variant = 'primary', 
 size = 'md', 
 className = '', 
 loading = false,
 disabled = false,
 icon: Icon,
 ...props 
}) {
 const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
 
 const variants = {
 primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] focus:ring-[var(--color-primary)]",
 secondary: "bg-[var(--color-bg-active)] text-[var(--color-text-main)] hover:bg-[var(--color-border-subtle)] focus:ring-[var(--color-border-focus)]",
 danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
 ghost: "bg-transparent text-[var(--color-text-light)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-main)] focus:ring-[var(--color-border-focus)]",
 outline: "bg-transparent border border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] focus:ring-[var(--color-border-focus)]"
 };

 const sizes = {
 sm: "px-3 py-1.5 text-xs gap-1.5",
 md: "px-4 py-2 text-sm gap-2",
 lg: "px-6 py-3 text-base gap-2.5"
 };

 const iconSizes = {
 sm: 14,
 md: 16,
 lg: 18
 };

 return (
 <button
 className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
 disabled={disabled || loading}
 {...props}
 >
 {loading ? (
 <Loader2 size={iconSizes[size]} className="animate-spin" />
 ) : Icon ? (
 <Icon size={iconSizes[size]} />
 ) : null}
 {children}
 </button>
 );
}
