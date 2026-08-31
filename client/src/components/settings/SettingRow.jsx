import React from 'react';
import Toggle from './Toggle';

const SettingRow = ({ icon, title, description, enabled, onToggle }) => {
 return (
 <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[var(--color-border-subtle)] last:border-b-0 transition-colors hover:bg-[var(--color-bg-app)]">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="text-[var(--color-text-main)] shrink-0 flex items-center justify-center w-6">
 {icon}
 </div>
 <div>
 <p className="text-base font-semibold text-[var(--color-text-main)]">{title}</p>
 <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
 </div>
 </div>
 <Toggle enabled={enabled} onChange={onToggle} />
 </div>
 );
};

export default SettingRow;
