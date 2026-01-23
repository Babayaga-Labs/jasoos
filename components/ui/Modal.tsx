'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-2xl',
    lg: 'md:max-w-4xl',
    full: 'md:max-w-6xl md:h-[90vh]',
  };

  return (
    <>
      {/* Overlay - mystical dark backdrop */}
      <div 
        className="modal-overlay" 
        onClick={onClose}
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
        }}
      />

      {/* Content - with magical entrance animation */}
      <div 
        className={`modal-content ${sizeClasses[size]} md:w-full`}
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(251,191,36,0.1), inset 0 1px 0 rgba(251,191,36,0.05)',
        }}
      >
        {children}
      </div>
    </>
  );
}
