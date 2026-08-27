import React, { useState } from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, AnalyticsQueryFilter } from "../../api/analytics.api.js";
import { projectApi } from "../../api/project.api.js";
import { AnalyticsSummary } from "../../features/analytics/AnalyticsSummary.js";
import { TaskStatusChart } from "../../features/analytics/TaskStatusChart.js";
import { TaskTrendChart } from "../../features/analytics/TaskTrendChart.js";
import { ProjectHealth } from "../../features/analytics/ProjectHealth.js";
import { MemberWorkload } from "../../features/analytics/MemberWorkload.js";
import { BarChart3, AlertCircle } from "lucide-react";

export const AnalyticsPage: React.FC = () => {
  const { activeOrg, hasPermission } = useOrganization();

  const [range, setRange] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [projectId, setProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch Projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeOrg?._id],
    queryFn: () => (activeOrg ? projectApi.listProjects(activeOrg._id) : null),
    enabled: !!activeOrg,
  });
  const projects = projectsData?.projects || [];

  // Build Analytics Query Filters
  const filters: AnalyticsQueryFilter = {
    range,
    projectId: projectId || undefined,
    startDate: range === "custom" && startDate ? startDate : undefined,
    endDate: range === "custom" && endDate ? endDate : undefined,
  };

  // Fetch Dashboard Analytics
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["analytics", activeOrg?._id, "dashboard", range, projectId, startDate, endDate],
    queryFn: () => (activeOrg ? analyticsApi.getDashboard(activeOrg._id, filters) : null),
    enabled: !!activeOrg && hasPermission("ANALYTICS_READ"),
  });

  if (!hasPermission("ANALYTICS_READ")) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl max-w-md mx-auto mt-12 font-sans">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">Access Restricted</h3>
        <p className="text-xs text-slate-400">
          You do not have permission to view organization analytics and reporting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Analytics & SaaS Insights</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time insights on project health, task completion trends, and member workload.
          </p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 border border-slate-800 rounded-xl text-xs">
            {(["7d", "30d", "90d", "custom"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  range === r
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "custom" ? "Custom" : r}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if Range === custom */}
          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          )}

          {/* Project Filter Select */}
          <div className="relative">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Failed to load analytics data. Please try again.</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <AnalyticsSummary summary={dashboard?.summary} isLoading={isLoading} />

          {/* Status & Priority Charts */}
          <TaskStatusChart
            statusData={dashboard?.taskStatus}
            priorityData={dashboard?.taskPriority}
          />

          {/* Completion Trend */}
          <TaskTrendChart trendData={dashboard?.completionTrend} />

          {/* Project Health & Member Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectHealth projects={dashboard?.projectHealth} />
            <MemberWorkload members={dashboard?.memberWorkload} />
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
