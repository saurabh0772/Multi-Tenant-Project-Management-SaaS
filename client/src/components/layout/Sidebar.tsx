import React from "react";
import { NavLink } from "react-router-dom";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "../../api/project.api.js";
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Users,
  Bell,
  Settings,
  Folder,
  X,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { activeOrg, hasPermission } = useOrganization();

  // Quick projects list for sidebar
  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeOrg?._id],
    queryFn: () => (activeOrg ? projectApi.listProjects(activeOrg._id, { limit: 5 }) : null),
    enabled: !!activeOrg,
  });

  const projects = projectsData?.projects || [];

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Projects", icon: FolderKanban, path: "/projects" },
    { label: "Analytics", icon: BarChart3, path: "/analytics", permission: "ANALYTICS_READ" },
    { label: "Members", icon: Users, path: "/members", permission: "MEMBER_READ" },
    { label: "Notifications", icon: Bell, path: "/notifications" },
    { label: "Settings", icon: Settings, path: "/settings", permission: "ORGANIZATION_UPDATE" },
  ];

  const content = (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 flex flex-col justify-between h-full p-4 font-sans select-none">
      <div className="space-y-6">
        {/* Mobile Header Close */}
        {isMobileOpen && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 md:hidden">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={onCloseMobile}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Projects Links */}
        {activeOrg && projects.length > 0 && (
          <div className="pt-4 border-t border-slate-800/60">
            <div className="text-[10px] font-semibold uppercase text-slate-400 px-3.5 mb-2 tracking-wider">
              Recent Projects
            </div>
            <div className="space-y-1">
              {projects.map((proj) => {
                const projId = proj.id || proj._id || "";
                return (
                  <NavLink
                    key={projId}
                    to={`/projects/${projId}`}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? "text-blue-400 font-medium bg-blue-500/10"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`
                    }
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{proj.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Workspace Footer */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="truncate">{activeOrg?.name || "Workspace"}</span>
        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          v1.0
        </span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-[calc(100vh-4rem)] sticky top-16 shrink-0">
        {content}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 max-w-xs h-full bg-slate-900 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
