interface AdminLoadingStateProps {
  label?: string;
  className?: string;
}

export function AdminLoadingState({ label = 'Loading admin data...', className = '' }: AdminLoadingStateProps) {
  return (
    <div className={`text-center py-12 ${className}`} role="status" aria-live="polite">
      <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
      <p className="mt-3 text-sm text-olive-400">{label}</p>
    </div>
  );
}

interface AdminErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function AdminErrorState({ message, onRetry, className = '' }: AdminErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`} role="alert">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-300">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
        </svg>
      </div>
      <p className="text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-olive-700 px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-olive-600"
        >
          Try again
        </button>
      )}
    </div>
  );
}
