import React from 'react';

const ReplyTextarea = ({ value, onChange, placeholder, hint }) => {
 return (
 <div className="px-6 pb-5 pt-2 bg-[var(--color-bg-subtle)]">
 <textarea
 value={value}
 onChange={e => onChange(e.target.value)}
 placeholder={placeholder}
 className="w-full min-h-[100px] resize-y border border-[var(--color-border-subtle)] rounded-lg p-3 text-sm text-[var(--color-text-main)] bg-[var(--color-bg-card)] outline-none leading-relaxed transition-all duration-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
 />
 {hint && (
 <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-tight flex items-center gap-1.5">
 <span className="w-1 h-1 rounded-full bg-[var(--color-primary)]"></span>
 {hint}
 </p>
 )}
 </div>
 );
};

export default ReplyTextarea;
