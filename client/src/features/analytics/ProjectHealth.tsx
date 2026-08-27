import React from "react";
import { ProjectHealthItem } from "../../api/analytics.api.js";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";

interface ProjectHealthProps {
  projects?: ProjectHealthItem[];
}

export const ProjectHealth: React.FC<ProjectHealthProps> = ({ projects = [] }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span>Project Health & Progress</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">
          {projects.length} Active Projects
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No projects available.
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj) => {
            const completion = Math.round(proj.completionRate || 0);

            return (
              <div
                key={proj.projectId}
                className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{proj.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {proj.status}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {completion}%
                  </span>
                </div>

                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Completed: {proj.completedTasks}
                    </span>
                    <span>Pending: {proj.pendingTasks}</span>
                  </div>

                  {proj.overdueTasks > 0 && (
                    <span className="flex items-center gap-1 text-rose-400">
                      <AlertCircle className="w-3 h-3" />
                      {proj.overdueTasks} Overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
