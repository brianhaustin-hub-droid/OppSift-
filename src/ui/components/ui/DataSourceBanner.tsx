import React from 'react';
import { AlertTriangle, Database, Loader2 } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

/**
 * Reports the provenance of the figures on screen. The application has no
 * sample-data mode: this strip confirms database reads, or states why
 * records are unavailable.
 */
export function DataSourceBanner() {
  const { dataMode, dataModeDetail, dataLoading, dataLastSyncedAt } = useAppState();

  if (dataMode === 'loading' || dataLoading) {
    return (
      <div
        role="status"
        className="mb-5 rounded-xl border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 flex items-start gap-2.5 text-[#2563EB] dark:text-[#38BDF8]"
      >
        <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
        <div>
          <p className="text-sm font-semibold">Loading records</p>
          <p className="text-xs opacity-90 mt-0.5">{dataModeDetail}</p>
        </div>
      </div>
    );
  }

  if (dataMode === 'error') {
    return (
      <div
        role="status"
        className="mb-5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/8 px-4 py-3 flex items-start gap-2.5 text-[#B91C1C] dark:text-[#FCA5A5]"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Records unavailable</p>
          <p className="text-xs opacity-90 mt-0.5">{dataModeDetail}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-5 rounded-lg border border-[#16A34A]/25 bg-[#16A34A]/6 px-3.5 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#15803D] dark:text-[#4ADE80]"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Database className="w-3.5 h-3.5" />
        Connected
      </span>
      <span className="text-[11px] text-[#334155] dark:text-[#CBD5E1]">
        Opportunity database connected
        {dataLastSyncedAt
          ? ` · synced ${new Date(dataLastSyncedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
          : ''}
      </span>
    </div>
  );
}
