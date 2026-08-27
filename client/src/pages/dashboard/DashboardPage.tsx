import React from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../../api/project.api.js";
import { taskApi } from "../../api/task.api.js";
import { notificationApi } from "../../api/notification.api.js";
import { activityApi } from "../../api/activity.api.js";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Bell,
  Activity as ActivityIcon,
  CheckSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "../../lib/utils.js";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();

  // Fetch Projects
  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeOrg?._id],
    queryFn: () => (activeOrg ? projectApi.listProjects(activeOrg._id) : null),
    enabled: !!activeOrg,
  });
  const projects = projectsData?.projects || [];

  // Fetch My Tasks across active projects
  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks", activeOrg?._id, "dashboard"],
    queryFn: async () => {
      if (!activeOrg || projects.length === 0) return [];
      // Fetch tasks from first 3 projects
      const taskPromises = projects.slice(0, 3).map((p) =>
        taskApi.listTasks(activeOrg._id, p._id).then((res) => res.tasks)
      );
      const results = await Promise.all(taskPromises);
      return results.flat();
    },
    enabled: !!activeOrg && projects.length > 0,
  });

  // Derived metrics
  const activeProjectsCount = projects.filter((p) => p.status === "ACTIVE").length;
  const completedTasksCount = allTasks.filter((t) => t.status === "DONE").length;
  const pendingTasksCount = allTasks.filter((t) => t.status !== "DONE").length;

  // Unread Notifications Count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count", activeOrg?._id],
    queryFn: () => (activeOrg ? notificationApi.getUnreadCount(activeOrg._id) : 0),
    enabled: !!activeOrg,
  });

  // Recent Activity Feed
  const { data: activitiesData } = useQuery({
    queryKey: ["activities", activeOrg?._id],
    queryFn: () => (activeOrg ? activityApi.listActivities(activeOrg._id, { limit: 10 }) : null),
    enabled: !!activeOrg,
  });
  const activities = activitiesData?.activities || [];

  // Filter My Assigned Tasks
  const myTasks = allTasks.filter((t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assigneeId = (t.assigneeId as any)?._id || t.assigneeId;
    return assigneeId === user?._id;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 border border-blue-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || "Member"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Here is an overview of {activeOrg?.name || "your organization"}&apos;s activity and progress.
            </p>
          </div>

          <Link
            to="/projects"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Active Projects</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{activeProjectsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Total workspace projects</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Completed Tasks</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{completedTasksCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Tasks marked DONE</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Pending Tasks</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{pendingTasksCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">In progress & to-do</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Notifications</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{unreadCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Unread alerts</div>
        </div>
      </div>

      {/* Main Content: My Tasks & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span>My Tasks</span>
            </h2>
            <span className="text-xs text-slate-400">Assigned to you</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-6 backdrop-blur-xl">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No tasks assigned to you right now.
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-xl hover:border-slate-700/80 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-white">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono ${
                            task.status === "DONE"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : task.status === "IN_PROGRESS"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {task.status}
                        </span>
                        <span>Priority: {task.priority}</span>
                        {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-indigo-400" />
              <span>Recent Activity</span>
            </h2>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-6 backdrop-blur-xl">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No activity recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((act) => (
                  <div key={act._id} className="flex gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-slate-300">
                        <strong className="text-white">
                          {act.actor?.name || "User"}
                        </strong>{" "}
                        {act.action.toLowerCase().replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatRelativeTime(act.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
