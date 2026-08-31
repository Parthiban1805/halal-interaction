import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, User, Check } from 'lucide-react';

export default function SearchableLeadSelect({ leads, selectedLeadId, onChange, placeholder = '-- Select Lead --' }) {
 const [isOpen, setIsOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const containerRef = useRef(null);
 const inputRef = useRef(null);

 // Close the dropdown when clicking outside
 useEffect(() => {
 const handleClickOutside = (event) => {
 if (containerRef.current && !containerRef.current.contains(event.target)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => {
 document.removeEventListener('mousedown', handleClickOutside);
 };
 }, []);

 // Auto-focus the search input when dropdown opens
 useEffect(() => {
 if (isOpen && inputRef.current) {
 inputRef.current.focus();
 }
 }, [isOpen]);

 const selectedLead = leads.find(l => l._id === selectedLeadId);

 const filteredLeads = leads.filter(lead => 
 lead.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (lead.status && lead.status.toLowerCase().includes(searchQuery.toLowerCase()))
 );

 const handleSelect = (leadId) => {
 onChange(leadId);
 setIsOpen(false);
 setSearchQuery('');
 };

 return (
 <div className="relative w-full" ref={containerRef}>
 {/* Dropdown Trigger Button */}
 <button
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className="w-full flex items-center justify-between bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-left text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all cursor-pointer select-none"
 >
 <span className="truncate flex items-center gap-2">
 <User size={15} className="text-[var(--color-text-muted)] shrink-0" />
 {selectedLead ? (
 <span className="font-medium">
 @{selectedLead.username} <span className="text-xs text-[var(--color-text-muted)] font-normal">({selectedLead.status})</span>
 </span>
 ) : (
 <span className="text-[var(--color-text-light)]">{placeholder}</span>
 )}
 </span>
 <ChevronDown 
 size={16} 
 className={`text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
 />
 </button>

 {/* Dropdown Panel */}
 {isOpen && (
 <div className="absolute left-0 right-0 mt-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 overflow-hidden flex flex-col fade-in">
 {/* Search Box */}
 <div className="p-2 border-b border-[var(--color-border-subtle)] flex items-center relative">
 <Search size={14} className="absolute left-4.5 text-[var(--color-text-muted)]" />
 <input
 ref={inputRef}
 type="text"
 placeholder="Search leads by username or status..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
 />
 </div>

 {/* Leads List */}
 <div className="max-h-[220px] overflow-y-auto py-1">
 {filteredLeads.length === 0 ? (
 <div className="px-4 py-3 text-xs text-[var(--color-text-muted)] text-center font-medium">
 No leads found
 </div>
 ) : (
 filteredLeads.map(lead => {
 const isSelected = lead._id === selectedLeadId;
 return (
 <button
 key={lead._id}
 type="button"
 onClick={() => handleSelect(lead._id)}
 className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left cursor-pointer transition-colors ${
 isSelected
 ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
 : 'text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)]'
 }`}
 >
 <span className="truncate">
 @{lead.username} <span className="text-xs text-[var(--color-text-muted)] font-normal ml-1">({lead.status})</span>
 </span>
 {isSelected && <Check size={13} className="shrink-0 text-[var(--color-primary)]" />}
 </button>
 );
 })
 )}
 </div>
 </div>
 )}
 </div>
 );
}
