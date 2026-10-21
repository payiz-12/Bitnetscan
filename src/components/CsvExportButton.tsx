import React, { useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { exportTransactionsCsv, CSV_MAX_ROWS } from '../services/csvExport';

/** "Download CSV" for an address's transactions, with progress and cancel. */
export const CsvExportButton: React.FC<{ address: string }> = ({ address }) => {
  const [rows, setRows] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const start = async () => {
    controller.current = new AbortController();
    setRows(0);
    setNote(null);
    try {
      const r = await exportTransactionsCsv(address, setRows, controller.current.signal);
      setNote(r.truncated ? `Downloaded the newest ${r.rows.toLocaleString()} transactions (limit ${CSV_MAX_ROWS.toLocaleString()}).` : `Downloaded ${r.rows.toLocaleString()} transactions.`);
    } catch {
      setNote(controller.current?.signal.aborted ? 'Download cancelled.' : 'The explorer did not answer. Try again.');
    } finally {
      setRows(null);
      controller.current = null;
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {rows === null ? (
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:border-petrol hover:text-petrol cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      ) : (
        <button
          type="button"
          onClick={() => controller.current?.abort()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-petrol-50 text-petrol border border-petrol-200 cursor-pointer"
          title="Cancel"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {rows.toLocaleString()} <X className="w-3.5 h-3.5" />
        </button>
      )}
      {note && <span className="text-[10px] text-slate-500 text-right">{note}</span>}
    </div>
  );
};
