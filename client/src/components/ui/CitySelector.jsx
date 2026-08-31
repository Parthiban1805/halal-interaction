import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function CitySelector({
  value,
  onChange,
  placeholder = "Search city...",
  className = "",
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Sync incoming value to local state if it changes externally
  useEffect(() => {
    if (value !== undefined) {
      setSearchQuery(value || '');
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Debounce the search query
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery && document.activeElement === dropdownRef.current?.querySelector('input')) {
        setIsLoading(true);
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/locations/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => {
            setOptions(data);
            setIsLoading(false);
            setIsOpen(true);
          })
          .catch(err => {
            console.error("Failed to fetch cities", err);
            setIsLoading(false);
          });
      } else {
        setOptions([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, value]);

  const handleSelect = (option) => {
    if (disabled) return;
    setSearchQuery(option);
    onChange({ target: { value: option } }); // Simulate event object
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    // Also notify parent of partial typing so the form gets updated immediately
    onChange({ target: { value: e.target.value } });
    if (!isOpen && e.target.value) {
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          className={`w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 pl-10 text-sm font-medium transition-colors focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed`}
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => { if (searchQuery && options.length > 0) setIsOpen(true); }}
          disabled={disabled}
        />
        <div className="absolute left-3 text-[var(--color-text-muted)]">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </div>
      </div>

      {isOpen && options.length > 0 && (
        <div className="absolute z-[9999] w-full mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl py-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          {options.map((option, index) => (
            <div
              key={index}
              className="px-4 py-2.5 text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] cursor-pointer transition-colors truncate"
              onClick={() => handleSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
      
      {isOpen && !isLoading && options.length === 0 && searchQuery && (
        <div className="absolute z-[9999] w-full mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl p-4 text-center text-sm text-[var(--color-text-muted)] animate-in fade-in zoom-in-95 duration-200">
          No cities found.
        </div>
      )}
    </div>
  );
}
