"use client";

import { formatDistanceToNow } from "@/app/admin/utils/date";

interface ActivityItemProps {
  action: string;
  entity?: string | null;
  entityId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  createdAt: Date | string;
  details?: Record<string, any> | null;
}

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  login: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function getActionColor(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("create") || lowerAction.includes("add")) return actionColors.create;
  if (lowerAction.includes("update") || lowerAction.includes("edit")) return actionColors.update;
  if (lowerAction.includes("delete") || lowerAction.includes("remove")) return actionColors.delete;
  if (lowerAction.includes("login") || lowerAction.includes("auth")) return actionColors.login;
  return actionColors.default;
}

function getActionIcon(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("create") || lowerAction.includes("add")) return "✨";
  if (lowerAction.includes("update") || lowerAction.includes("edit")) return "✏️";
  if (lowerAction.includes("delete") || lowerAction.includes("remove")) return "🗑️";
  if (lowerAction.includes("login") || lowerAction.includes("auth")) return "🔐";
  return "📝";
}

export function ActivityItem({ action, entity, entityId, userName, userEmail, createdAt, details }: ActivityItemProps) {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const displayName = userName || userEmail || "System";

  return (
    <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm dark:bg-slate-800">
        {getActionIcon(action)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(action)}`}>
            {action}
          </span>
          {entity && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              on <span className="font-medium text-slate-700 dark:text-slate-300">{entity}</span>
              {entityId && <span className="text-slate-400"> #{entityId.slice(0, 8)}</span>}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{displayName}</span>
          <span>•</span>
          <span title={date.toISOString()}>{formatDistanceToNow(date)}</span>
        </div>
        {details && Object.keys(details).length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
              Show details
            </summary>
            <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
              {JSON.stringify(details, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
