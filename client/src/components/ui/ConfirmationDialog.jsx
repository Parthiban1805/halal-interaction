import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false
}) {
  // Prevent scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
      <div 
        className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] w-full max-w-md rounded-xl overflow-hidden shadow-2xl relative slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-5">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${isDestructive ? 'bg-[var(--color-status-error-bg)] text-[var(--color-status-error)]' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1.5 tracking-tight">{title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {message}
              </p>
            </div>
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="text-[var(--color-text-light)] hover:text-[var(--color-text-main)] transition-colors shrink-0 -mt-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-[var(--color-bg-subtle)] border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-3 mt-auto shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            onClick={() => {
              onConfirm();
            }}
            loading={isLoading}
            variant={isDestructive ? 'danger' : 'primary'}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
