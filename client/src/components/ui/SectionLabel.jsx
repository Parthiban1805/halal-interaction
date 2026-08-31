import React from 'react';

const SectionLabel = ({ count, label, extra }) => {
 return (
 <div className="flex items-center justify-between mb-2 px-1">
 <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
 {count} {label}{count !== 1 ? 's' : ''}
 </h2>
 {extra && (
 <span className="text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2.5 py-1 rounded-full">
 {extra}
 </span>
 )}
 </div>
 );
};

export default SectionLabel;
