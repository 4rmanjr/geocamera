
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckIcon, XIcon } from '../icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('success');
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback((msg: string, toastType: ToastType = 'success') => {
    setMessage(msg);
    setType(toastType);
    setIsVisible(true);

    // Auto hide after 3 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    
    // Clear message after animation ends to prevent flickering
    setTimeout(() => {
        if (!isVisible) setMessage(null); 
    }, 3300);
  }, [isVisible]);

  // Determine styles based on type
  const getStyle = () => {
      switch(type) {
          case 'error': 
            return 'bg-red-900/90 border-red-500/50 text-red-200';
          case 'success':
          default:
            return 'bg-black/90 border-emerald-500/30 text-emerald-400';
      }
  };

  const getIcon = () => {
      switch(type) {
          case 'error': return <XIcon className="w-4 h-4 flex-shrink-0" />;
          case 'success':
          default: return <CheckIcon className="w-4 h-4 flex-shrink-0" />;
      }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Global Toast UI */}
      <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className={`border px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-sm ${getStyle()}`}>
            {getIcon()}
            <span className="font-mono text-xs font-bold uppercase tracking-wide text-center whitespace-nowrap">
                {message}
            </span>
          </div>
      </div>
    </ToastContext.Provider>
  );
};
