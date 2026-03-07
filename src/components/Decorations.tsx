import React from 'react';

export const ASCIIHeader = () => (
  <div className="text-[6px] leading-[1] font-mono opacity-20 pointer-events-none select-none overflow-hidden h-12">
    {`
    ██████╗ ██╗   ██╗███████╗██╗   ██╗██╗     ██╗      █████╗
    ██╔══██╗██║   ██║██╔════╝██║   ██║██║     ██║     ██╔══██╗
    ██████╔╝██║   ██║███████╗██║   ██║██║     ██║     ███████║
    ██╔══██╗██║   ██║╚════██║██║   ██║██║     ██║     ██╔══██║
    ██████╔╝╚██████╔╝███████║╚██████╔╝███████╗███████╗██║  ██║
    ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
    `}
  </div>
);

export const ASCIIGrid = () => (
  <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden z-[-1] font-mono text-[8px] leading-[1]">
    {Array.from({ length: 100 }).map((_, i) => (
      <div key={i}>
        {"+-------".repeat(20) + "+"}
      </div>
    ))}
  </div>
);

export const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" />
    {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
  </div>
);

export const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="brutalist-border bg-destructive/10 p-4 md:p-6 text-center">
    <p className="text-sm md:text-base mb-3">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 brutalist-border bg-foreground text-background font-bold text-sm uppercase brutalist-button"
      >
        Provo përsëri
      </button>
    )}
  </div>
);
