'use client';

import { useEffect, useRef, useState } from 'react';

interface ErrorInfo {
  id: string;
  message: string;
  timestamp: number;
}

export function GlobalErrorIndicator() {
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const currentErrorRef = useRef<ErrorInfo | null>(null);
  const lastMessageRef = useRef<{ message: string; timestamp: number } | null>(
    null
  );
  const autoCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 监听自定义错误事件
    const handleError = (event: CustomEvent) => {
      const message = (event as any)?.detail?.message as string | undefined;

      if (!message) {
        return;
      }

      const now = Date.now();
      const last = lastMessageRef.current;
      if (last && last.message === message && now - last.timestamp < 1500) {
        return;
      }
      lastMessageRef.current = { message, timestamp: now };

      const newError: ErrorInfo = {
        id: now.toString(),
        message,
        timestamp: now,
      };

      const hadError = Boolean(currentErrorRef.current);
      currentErrorRef.current = newError;

      // 如果已有错误，开始替换动画
      if (hadError) {
        setCurrentError(newError);
        setIsReplacing(true);

        // 动画完成后恢复正常
        setTimeout(() => {
          setIsReplacing(false);
        }, 200);
      } else {
        // 第一次显示错误
        setCurrentError(newError);
      }

      setIsVisible(true);

      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        setCurrentError(null);
        currentErrorRef.current = null;
        setIsReplacing(false);
      }, 4000);
    };

    // 监听错误事件
    window.addEventListener('globalError', handleError as EventListener);

    return () => {
      window.removeEventListener('globalError', handleError as EventListener);

      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setCurrentError(null);
    currentErrorRef.current = null;
    setIsReplacing(false);

    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  if (!isVisible || !currentError) {
    return null;
  }

  return (
    <div className='fixed top-4 right-4 z-[2000]'>
      {/* 错误卡片 */}
      <div
        className={`bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-[400px] transition-all duration-300 ${isReplacing ? 'scale-105 bg-red-400' : 'scale-100 bg-red-500'
          } animate-fade-in`}
      >
        <span className='text-sm font-medium flex-1 mr-3'>
          {currentError.message}
        </span>
        <button
          onClick={handleClose}
          className='text-white hover:text-red-100 transition-colors flex-shrink-0'
          aria-label='关闭错误提示'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 全局错误触发函数
export function triggerGlobalError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', {
        detail: { message },
      })
    );
  }
}
