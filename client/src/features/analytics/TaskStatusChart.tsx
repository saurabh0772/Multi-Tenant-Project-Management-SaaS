import React from "react";

interface TaskStatusChartProps {
  statusData?: Array<{ status: string; count: number }>;
  priorityData?: Array<{ priority: string; count: number }>;
}

export const TaskStatusChart: React.FC<TaskStatusChartProps> = ({
  statusData = [],
  priorityData = [],
}) => {
  const totalStatus = statusData.reduce((sum, item) => sum + item.count, 0);
  const totalPriority = priorityData.reduce((sum, item) => sum + item.count, 0);

  const STATUS_COLORS: Record<string, string> = {
    TODO: "bg-slate-700 text-slate-300",
    IN_PROGRESS: "bg-blue-500 text-blue-400",
    IN_REVIEW: "bg-purple-500 text-purple-400",
    DONE: "bg-emerald-500 text-emerald-400",
  };

  const PRIORITY_COLORS: Record<string, string> = {
    LOW: "bg-slate-600 text-slate-400",
    MEDIUM: "bg-blue-600 text-blue-400",
    HIGH: "bg-amber-500 text-amber-400",
    URGENT: "bg-rose-500 text-rose-400",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
      {/* Task Status Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Task Status Breakdown
        </h3>

        <div className="space-y-3">
          {statusData.map((item) => {
            const pct = totalStatus > 0 ? Math.round((item.count / totalStatus) * 100) : 0;
            const colorClass = STATUS_COLORS[item.status] || "bg-slate-700 text-slate-300";

            return (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.status}</span>
                  <span className="font-mono text-slate-400">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${colorClass.split(" ")[0]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Priority Distribution */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Task Priority Distribution
        </h3>

        <div className="space-y-3">
          {priorityData.map((item) => {
            const pct = totalPriority > 0 ? Math.round((item.count / totalPriority) * 100) : 0;
            const colorClass = PRIORITY_COLORS[item.priority] || "bg-slate-700 text-slate-300";

            return (
              <div key={item.priority} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.priority}</span>
                  <span className="font-mono text-slate-400">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${colorClass.split(" ")[0]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
