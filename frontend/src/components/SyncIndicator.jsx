import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function SyncIndicator({ isOnline, pendingCount }) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${
        isOnline ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCw size={11} className="animate-spin" />
          <span>{pendingCount} en attente</span>
        </>
      ) : (
        <>
          <WifiOff size={11} />
          <span>Hors ligne{pendingCount > 0 ? ` · ${pendingCount}` : ''}</span>
        </>
      )}
    </div>
  );
}
