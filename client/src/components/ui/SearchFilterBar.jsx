import React from 'react';
import { Search, Filter } from 'lucide-react';
import CustomSelect from './CustomSelect';

const SearchFilterBar = ({ 
 searchQuery, 
 onSearchChange, 
 filterValue, 
 onFilterChange, 
 filterOptions 
}) => {
 return (
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 fade-in">
 {/* Search Input */}
 <div className="relative flex-1">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
 <Search size={18} />
 </div>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => onSearchChange(e.target.value)}
 placeholder="Search text, username..."
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border-subtle)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent transition-all placeholder-[var(--color-text-light)] text-[var(--color-text-main)] "
 />
 </div>

 {/* Filter Dropdown */}
 <div className="relative shrink-0 flex items-center gap-2">
 <Filter size={16} className="text-[var(--color-text-muted)]" />
 <CustomSelect
 value={filterValue}
 onChange={(e) => onFilterChange(e.target.value)}
 options={filterOptions}
 className="w-full sm:w-[200px]"
 />
 </div>
 </div>
 );
};

export default SearchFilterBar;
