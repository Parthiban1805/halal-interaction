import React from 'react';
import { Check } from 'lucide-react';

export default function Checkbox({ checked, onChange, className = '', id, onClick }) {
  return (
    <label 
      className={`cursor-pointer group inline-flex items-center justify-center ${className}`} 
      htmlFor={id}
      onClick={onClick}
    >
      <input
        type="checkbox"
        id={id}
        className="hidden"
        checked={checked}
        onChange={onChange}
      />
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
            : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] group-hover:border-[var(--color-text-muted)]'
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </div>
    </label>
  );
}
