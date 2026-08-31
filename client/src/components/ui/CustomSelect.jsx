import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

 export default function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select...", 
  className = "", 
  disabled = false,
  isMulti = false,
  searchable = false
 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 'auto', bottom: 'auto', left: 0, right: 'auto', width: 0, transformOrigin: 'top' });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

 useEffect(() => {
 function handleClickOutside(event) {
 const clickedOutsideButton = dropdownRef.current && !dropdownRef.current.contains(event.target);
 const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(event.target);
 
 if (clickedOutsideButton && clickedOutsideMenu) {
 setIsOpen(false);
 }
 }
 
 function handleScroll(event) {
 // Don't close if scrolling inside the menu itself
 if (menuRef.current && menuRef.current.contains(event.target)) return;
 setIsOpen(false);
 }
 
 document.addEventListener("mousedown", handleClickOutside);
 // Use capture phase for scroll to catch scroll events on any element
 document.addEventListener("scroll", handleScroll, true);
 
 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 document.removeEventListener("scroll", handleScroll, true);
 };
 }, []);

 const handleSelect = (optionValue) => {
 if (disabled) return;
 
 if (isMulti) {
   let newValue;
   if (Array.isArray(value) && value.some(v => String(v) === String(optionValue))) {
     newValue = value.filter(v => String(v) !== String(optionValue));
   } else {
     newValue = [...(Array.isArray(value) ? value : []), optionValue];
   }
   onChange({ target: { value: newValue } });
 } else {
   const mockEvent = { target: { value: optionValue } };
   onChange(mockEvent);
   setIsOpen(false);
 }
 };

 const handleOpen = () => {
 if (disabled) return;
 if (!isOpen && dropdownRef.current) {
 const rect = dropdownRef.current.getBoundingClientRect();
 const estimatedHeight = Math.min(240, options.length * 36 + 12); // ~36px per option + padding
 const spaceBelow = window.innerHeight - rect.bottom;
 
 let top = rect.bottom;
 let bottom = 'auto';
 let transformOrigin = 'top';

 if (spaceBelow < estimatedHeight && rect.top > spaceBelow) {
   // Place above
   top = 'auto';
   bottom = window.innerHeight - rect.top;
   transformOrigin = 'bottom';
 }

 // Handle horizontal edge
 let left = rect.left;
 let right = 'auto';
 
 if (rect.left > window.innerWidth / 2) {
   left = 'auto';
   right = window.innerWidth - rect.right;
 } else {
   left = Math.max(10, rect.left);
 }

 setCoords({ top, bottom, left, right, width: rect.width, transformOrigin });
 if (!isOpen) {
    setSearchQuery(''); // Reset search on open
  }
 }
 setIsOpen(!isOpen);
 };

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable 
    ? options.filter(opt => {
        const text = opt.searchLabel || (typeof opt.label === 'string' ? opt.label : String(opt.value || ''));
        return text.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : options;

 const displayLabel = () => {
   if (isMulti) {
     if (!value || !Array.isArray(value) || value.length === 0) return placeholder;
     return `${value.length} selected`;
   }
   const selected = options.find(opt => String(opt.value) === String(value));
   return selected ? (selected.displayLabel || selected.label) : placeholder;
 };

 const isSelected = (optValue) => {
   if (isMulti) {
     return Array.isArray(value) && value.some(v => String(v) === String(optValue));
   }
   return String(optValue) === String(value);
 };

  const isWrapperClass = (c) => {
    const base = c.split(':').pop();
    return base.startsWith('w-') || base.startsWith('min-w-') || base.startsWith('max-w-') || base.startsWith('col-span-') || base.startsWith('flex-') || base === 'shrink-0';
  };
  const extractedClasses = className.split(' ').filter(isWrapperClass).join(' ');
  const wrapperClasses = `relative text-left ${extractedClasses || 'w-full sm:w-auto'}`;

 return (
 <div className={wrapperClasses} ref={dropdownRef}>
 <button
 type="button"
 disabled={disabled}
 onClick={handleOpen}
 className={`w-full bg-white text-[var(--color-text-main)] border ${isOpen ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-[var(--color-border-subtle)]'} rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
 >
 <div className="truncate flex-1 text-left">
 {displayLabel()}
 </div>
 <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
 </button>

 {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
 <div 
 ref={menuRef}
 className="fixed z-[9999] min-w-[160px] max-h-60 overflow-y-auto bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl py-1.5 custom-scrollbar animate-in fade-in zoom-in-95 duration-200"
 style={{
 top: coords.top !== 'auto' ? coords.top + 4 : 'auto',
 bottom: coords.bottom !== 'auto' ? coords.bottom + 4 : 'auto',
 left: coords.left,
 right: coords.right,
 minWidth: Math.max(160, coords.width),
 maxWidth: 'calc(100vw - 32px)',
 transformOrigin: coords.transformOrigin
 }}
 >
  {searchable && (
    <div className="p-2 border-b border-[var(--color-border-subtle)] sticky top-0 bg-[var(--color-bg-card)] z-10">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)] transition-shadow text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )}
 {filteredOptions.length === 0 ? (
 <div className="px-4 py-2 text-sm text-[var(--color-text-muted)] text-center">No options</div>
 ) : (
 filteredOptions.map((option) => (
 <div
 key={option.value}
 onClick={() => handleSelect(option.value)}
 className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors font-medium ${
 isSelected(option.value)
 ? 'bg-[#EFF6FF] text-[#3B82F6]'
 : 'text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)]'
 }`}
 >
 <div className="truncate flex-1">{option.label}</div>
 {isSelected(option.value) && (
 <Check size={14} className="text-[#3B82F6] shrink-0 ml-2" />
 )}
 </div>
 ))
 )}
 </div>,
 document.body
 )}
 </div>
 );
}
