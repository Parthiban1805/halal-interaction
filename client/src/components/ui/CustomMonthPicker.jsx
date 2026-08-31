import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function CustomMonthPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse incoming value (format: YYYY-MM)
  const currentYear = value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear();
  const currentMonthIdx = value ? parseInt(value.split('-')[1], 10) - 1 : new Date().getMonth();
  
  const [viewYear, setViewYear] = useState(currentYear);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Sync viewYear when modal opens or value changes
  useEffect(() => {
    if (isOpen) {
      setViewYear(currentYear);
    }
  }, [isOpen, currentYear]);

  const handleMonthSelect = (monthIndex) => {
    const newMonth = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${newMonth}`);
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const newMonth = String(now.getMonth() + 1).padStart(2, '0');
    onChange(`${now.getFullYear()}-${newMonth}`);
    setIsOpen(false);
  };

  // Format display text
  let displayText = "Select Month";
  if (value) {
    const date = new Date(currentYear, currentMonthIdx);
    displayText = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] hover:border-[var(--color-primary)]/50 font-medium transition-colors cursor-pointer min-w-[160px] justify-between"
      >
        <span>{displayText}</span>
        <Calendar size={16} className="text-[var(--color-text-muted)]" />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 bg-[var(--color-bg-subtle)]/50 rounded-lg p-1.5 border border-[var(--color-border-subtle)]">
            <button 
              onClick={() => setViewYear(viewYear - 1)}
              className="p-1 hover:bg-[var(--color-bg-card)] rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-[var(--color-text-main)] text-sm tracking-wide">
              {viewYear}
            </span>
            <button 
              onClick={() => setViewYear(viewYear + 1)}
              className="p-1 hover:bg-[var(--color-bg-card)] rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {MONTHS.map((monthName, index) => {
              const isSelected = viewYear === currentYear && index === currentMonthIdx;
              return (
                <button
                  key={monthName}
                  onClick={() => handleMonthSelect(index)}
                  className={`
                    py-2 text-sm rounded-lg font-medium transition-colors
                    ${isSelected 
                      ? 'bg-[var(--color-primary)] text-white shadow-sm' 
                      : 'text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)]'
                    }
                  `}
                >
                  {monthName}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end pt-3 border-t border-[var(--color-border-subtle)]">
            <button 
              onClick={handleThisMonth}
              className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors"
            >
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
