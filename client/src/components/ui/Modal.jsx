import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({
 isOpen,
 onClose,
 title,
 children,
 footer,
 maxWidth = 'max-w-md'
}) {
 // Prevent body scroll when modal is open
 useEffect(() => {
 if (isOpen) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = 'unset';
 }
 return () => { document.body.style.overflow = 'unset'; };
 }, [isOpen]);

 if (!isOpen) return null;

 return createPortal(
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
 {/* Backdrop */}
 <div 
 className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
 onClick={onClose}
 />
 
 {/* Modal Container */}
 <div className={`card-panel w-full ${maxWidth} bg-[var(--color-bg-card)] relative z-10 flex flex-col max-h-[90vh] scale-100 animate-in fade-in zoom-in duration-200`}>
 
 {/* Header */}
 <div className="flex items-center justify-between p-5 border-b border-[var(--color-border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--color-text-main)]">{title}</h2>
 <button 
 onClick={onClose}
 className="p-2 text-[var(--color-text-light)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] rounded-full transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 
 {/* Body */}
 <div className="p-5 overflow-y-auto">
 {children}
 </div>
 
 {/* Footer */}
 {footer && (
 <div className="p-5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] flex items-center justify-end gap-3 rounded-b-2xl">
 {footer}
 </div>
 )}
 </div>
 </div>,
 document.body
 );
}
