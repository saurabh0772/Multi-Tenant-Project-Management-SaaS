import React from "react";
import { TrendingUp } from "lucide-react";

interface TaskTrendChartProps {
  trendData?: Array<{ date: string; created: number; completed: number }>;
}

export const TaskTrendChart: React.FC<TaskTrendChartProps> = ({ trendData = [] }) => {
  const maxVal = Math.max(
    1,
    ...trendData.flatMap((d) => [d.created || 0, d.completed || 0])
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl font-sans">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Task Completion vs Creation Trend</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Daily throughput comparison over the selected time range.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-slate-300">Created</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-slate-300">Completed</span>
          </div>
        </div>
      </div>

      {trendData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No trend data recorded for this time period.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {trendData.slice(-10).map((item) => {
            const createdPct = Math.round((item.created / maxVal) * 100);
            const completedPct = Math.round((item.completed / maxVal) * 100);

            return (
              <div key={item.date} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400">{item.date}</span>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="text-blue-400">Created: {item.created}</span>
                    <span className="text-emerald-400">Completed: {item.completed}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${createdPct}%` }}
                    />
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${completedPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
