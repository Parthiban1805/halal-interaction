import React from 'react';

const EmptyState = ({ icon: Icon, message, sub }) => {
 return (
 <div className="card-panel flex flex-col items-center justify-center py-16 px-6 gap-3 text-center bg-white/50 border-dashed border-2">
 <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-text-muted)] mb-2">
 <Icon size={28} strokeWidth={1.5} />
 </div>
 <p className="text-lg font-semibold text-[var(--color-text-main)]">{message}</p>
 {sub && <p className="text-sm text-[var(--color-text-muted)] max-w-sm">{sub}</p>}
 </div>
 );
};

export default EmptyState;
