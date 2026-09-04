'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Investigation Console Error</h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          An unexpected session anomaly occurred during drift calculation or telemetry rendering.
        </p>
        <div className="pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md transition active:scale-[0.98]"
          >
            Reset Console Session
          </button>
        </div>
      </div>
    </div>
  );
}
