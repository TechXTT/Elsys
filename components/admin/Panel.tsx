import React from "react";

export default function Panel({ title, actions, children }: { title?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-subtle">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          {title ? <div className="font-medium text-slate-800 dark:text-slate-100">{title}</div> : null}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
