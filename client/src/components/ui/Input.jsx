import React from 'react';

export default function Input({
 label,
 error,
 type = 'text',
 className = '',
 id,
 icon: Icon,
 ...props
}) {
 const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
 
 const baseClasses = "w-full bg-white border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-sm rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";
 
 const hasErrorClasses = error ? "border-red-300 focus:ring-red-500" : "";
 const iconPaddingClasses = Icon ? "pl-10" : "px-4";
 
 return (
 <div className={className}>
 {label && (
 <label htmlFor={inputId} className="block text-sm font-semibold text-[var(--color-text-main)] mb-1.5">
 {label}
 </label>
 )}
 
 <div className="relative">
 {Icon && (
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-light)]">
 <Icon size={16} />
 </div>
 )}
 
 {type === 'textarea' ? (
 <textarea
 id={inputId}
 className={`${baseClasses} py-3 ${iconPaddingClasses} ${hasErrorClasses}`}
 {...props}
 />
 ) : (
 <input
 id={inputId}
 type={type}
 className={`${baseClasses} h-[42px] ${iconPaddingClasses} ${hasErrorClasses}`}
 {...props}
 />
 )}
 </div>
 
 {error && (
 <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
 )}
 </div>
 );
}
