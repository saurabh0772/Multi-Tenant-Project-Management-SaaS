import React from "react";
import { MemberWorkloadItem } from "../../api/analytics.api.js";
import { Users, AlertTriangle } from "lucide-react";

interface MemberWorkloadProps {
  members?: MemberWorkloadItem[];
}

export const MemberWorkload: React.FC<MemberWorkloadProps> = ({ members = [] }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Member Workload & Capacity</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">
          {members.length} Active Members
        </span>
      </div>

      {members.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No workload data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="pb-2.5 px-2">Member</th>
                <th className="pb-2.5 px-2">Role</th>
                <th className="pb-2.5 px-2 text-center">Assigned</th>
                <th className="pb-2.5 px-2 text-center">Completed</th>
                <th className="pb-2.5 px-2 text-center">Pending</th>
                <th className="pb-2.5 px-2 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((m) => (
                <tr key={m.userId} className="hover:bg-slate-800/30 transition-all">
                  <td className="py-2.5 px-2">
                    <div className="font-semibold text-white">{m.name}</div>
                    <div className="text-[10px] text-slate-400">{m.email}</div>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {m.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-white">
                    {m.assignedTasks}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-emerald-400">
                    {m.completedTasks}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-purple-400">
                    {m.pendingTasks}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {m.overdueTasks > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        {m.overdueTasks}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
