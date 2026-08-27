import React from "react";
import { OrganizationOverviewDTO } from "../../api/analytics.api.js";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  MessageSquare,
} from "lucide-react";

interface AnalyticsSummaryProps {
  summary?: OrganizationOverviewDTO;
  isLoading?: boolean;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  summary,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-sans">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-900/40 border border-slate-800/60 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Projects",
      value: summary?.projects.total || 0,
      subtext: `${summary?.projects.active || 0} Active`,
      icon: FolderKanban,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Tasks Completed",
      value: summary?.tasks.completed || 0,
      subtext: `Total: ${summary?.tasks.total || 0}`,
      icon: CheckCircle2,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Pending Tasks",
      value: summary?.tasks.pending || 0,
      subtext: "In Progress / Review",
      icon: Clock,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Overdue Tasks",
      value: summary?.tasks.overdue || 0,
      subtext: "Needs Attention",
      icon: AlertTriangle,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      title: "Active Members",
      value: summary?.members.active || 0,
      subtext: `Total: ${summary?.members.total || 0}`,
      icon: Users,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Team Discussions",
      value: summary?.comments || 0,
      subtext: `${summary?.attachments || 0} Files`,
      icon: MessageSquare,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-sans">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl transition-all hover:border-slate-700/80"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg border ${c.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white tracking-tight">
              {c.value}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {c.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
