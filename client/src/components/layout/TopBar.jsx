import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

const TopBar = ({ title }) => {
 return (
 <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[var(--color-border-subtle)] sticky top-0 z-40 px-8 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <h1 className="text-lg font-semibold text-[var(--color-text-main)]">
 {title || 'Dashboard'}
 </h1>
 </div>

 <div className="flex items-center gap-6">
 <button className="relative text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
 <Bell size={20} />
 <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-status-error)] rounded-full ring-2 ring-white"></span>
 </button>
 
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-[var(--color-bg-active)] border border-[var(--color-border-focus)] flex items-center justify-center text-sm font-bold text-[var(--color-text-main)]">
 U
 </div>
 </div>
 </div>
 </header>
 );
};

export default TopBar;
