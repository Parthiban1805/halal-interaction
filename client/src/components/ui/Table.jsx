import React, { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { Skeleton } from './Skeleton';
import emptyStateImg from '../../assets/empty-state.png';

export default function Table({
 columns,
 data,
 keyField = 'id',
 itemsPerPage = 10,
 onRowClick,
 onVisibleDataChange,
 currentPage: controlledCurrentPage,
 onPageChange,
 isLoading = false,
 className = '',
 totalPages: totalPagesProp,
 totalItems: totalItemsProp,
 overflowVisible = false
}) {
 const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
 const [internalPage, setInternalPage] = useState(1);

 const currentPage = controlledCurrentPage !== undefined ? controlledCurrentPage : internalPage;
 const setCurrentPage = onPageChange || setInternalPage;

 // Handle sort
 const handleSort = (key) => {
 let direction = 'asc';
 if (sortConfig.key === key && sortConfig.direction === 'asc') {
 direction = 'desc';
 }
 setSortConfig({ key, direction });
 };

 // Memoize sorted and paginated data
 const processedData = useMemo(() => {
 let sortableItems = [...data];
 if (sortConfig.key !== null) {
 sortableItems.sort((a, b) => {
 let aVal = a[sortConfig.key];
 let bVal = b[sortConfig.key];
 
 // Handle nested keys (e.g. 'user.name') - basic implementation
 if (sortConfig.key && sortConfig.key.includes('.')) {
 const keys = sortConfig.key.split('.');
 aVal = keys.reduce((obj, k) => (obj || {})[k], a);
 bVal = keys.reduce((obj, k) => (obj || {})[k], b);
 }

 // Handle string comparison nicely
 if (typeof aVal === 'string' && typeof bVal === 'string') {
 return sortConfig.direction === 'asc' 
 ? aVal.localeCompare(bVal) 
 : bVal.localeCompare(aVal);
 }

 if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
 if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
 return 0;
 });
 }

 // Pagination
 if (itemsPerPage > 0 && totalPagesProp === undefined) {
   const startIndex = (currentPage - 1) * itemsPerPage;
   return sortableItems.slice(startIndex, startIndex + itemsPerPage);
 }
 return sortableItems;
 }, [data, sortConfig, currentPage, itemsPerPage, totalPagesProp]);

 const totalPages = totalPagesProp !== undefined ? totalPagesProp : (itemsPerPage > 0 ? Math.ceil(data.length / itemsPerPage) : 1);

 const onVisibleDataChangeRef = React.useRef(onVisibleDataChange);
 const prevProcessedIdsRef = React.useRef(null);

 useEffect(() => {
   onVisibleDataChangeRef.current = onVisibleDataChange;
 }, [onVisibleDataChange]);

 useEffect(() => {
   if (onVisibleDataChangeRef.current) {
     // Compare by IDs to avoid triggering parent re-renders for identical data
     const newIds = processedData.map(d => d._id || d.id).join(',');
     if (prevProcessedIdsRef.current !== newIds) {
       prevProcessedIdsRef.current = newIds;
       onVisibleDataChangeRef.current(processedData);
     }
   }
 }, [processedData]);

  const actualTotalItems = totalItemsProp !== undefined ? totalItemsProp : data.length;
  const startItem = actualTotalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, actualTotalItems);

  return (
    <div className={`w-full flex flex-col ${className}`}>
      <div className={`${overflowVisible ? 'overflow-visible' : 'overflow-x-auto'} bg-white border border-[var(--color-border-subtle)] ${totalPages > 1 ? 'rounded-t-xl border-b-0' : 'rounded-xl'}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)]">
              {columns.map((col, index) => (
                <th 
                  key={index}
                  className={`p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:bg-[var(--color-border-subtle)]/30 transition-colors' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && col.key && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && col.key && (
                      <div className="flex flex-col text-[var(--color-border-subtle)]">
                        <ChevronUp size={12} className={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'text-[var(--color-text-main)]' : ''} />
                        <ChevronDown size={12} className={`-mt-1 ${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'text-[var(--color-text-main)]' : ''}`} />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {isLoading ? (
              Array.from({ length: Math.min(itemsPerPage, 5) }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {columns.map((col, cIndex) => (
                    <td key={cIndex} className={`p-4 ${col.className || ''}`}>
                      {col.skeletonRender ? col.skeletonRender() : <Skeleton variant="text" className="h-4 w-full max-w-[80%]" />}
                    </td>
                  ))}
                </tr>
              ))
            ) : processedData.length > 0 ? (
              processedData.map((item, index) => {
                const id = item[keyField] || index;
                return (
                  <tr 
                    key={id}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`hover:bg-[var(--color-bg-hover)] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col, cIndex) => (
                      <td key={cIndex} className={`p-4 text-sm text-[var(--color-text-main)] ${col.className || ''}`}>
                        {col.render ? col.render(item, index) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="flex flex-col items-center justify-center w-full min-h-[450px] bg-[var(--color-bg-subtle)]/30">
                    <img src={emptyStateImg} alt="No data" className="w-32 h-32 object-contain opacity-40 mix-blend-multiply" />
                    <p className="text-[var(--color-text-muted)] font-medium text-sm mt-4">No data available to display</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] rounded-b-xl">
          <span className="text-sm text-[var(--color-text-muted)]">
            Showing <span className="font-medium text-[var(--color-text-main)]">{startItem}</span> to <span className="font-medium text-[var(--color-text-main)]">{endItem}</span> of <span className="font-medium text-[var(--color-text-main)]">{actualTotalItems}</span> results
          </span>
 <div className="flex gap-2">
 <Button 
 variant="outline" 
 size="sm" 
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(currentPage - 1)}
 >
 <ChevronLeft size={16} /> Previous
 </Button>
 <Button 
 variant="outline" 
 size="sm" 
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(currentPage + 1)}
 >
 Next <ChevronRight size={16} />
 </Button>
 </div>
 </div>
 )}
 </div>
 );
}
