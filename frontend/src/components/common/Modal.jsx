import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  showCloseButton = true,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0A1D11]/80 backdrop-blur-md animate-fade-in">
      <div 
        className={`bg-[#EFF9CE] rounded-3xl shadow-2xl border-2 border-[#8BC829] w-full ${maxWidth} overflow-hidden transform transition-all my-auto max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#C3E956]/40 shrink-0 bg-gradient-to-r from-[#102919] to-[#1F4B2C] text-white">
          <h3 className="text-sm sm:text-base font-black tracking-tight text-[#C3E956]">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-300 hover:text-[#C3E956] hover:bg-white/10 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-6 overflow-y-auto flex-1 text-[#102919]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

