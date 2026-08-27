import React, { useState } from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../../api/notification.api.js";
import {
  Building2,
  ChevronDown,
  Plus,
  Bell,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Menu,
} from "lucide-react";
import { CreateOrgModal } from "../../features/organizations/CreateOrgModal.js";
import { GlobalSearch } from "../../features/search/GlobalSearch.js";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { organizations, activeOrg, activeRole, setActiveOrgId } = useOrganization();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);

  // Unread notification count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count", activeOrg?._id],
    queryFn: () => (activeOrg ? notificationApi.getUnreadCount(activeOrg._id) : 0),
    enabled: !!activeOrg,
    refetchInterval: 30000,
  });

  return (
    <>
      <header className="h-16 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans">
        {/* Left Section: Mobile Menu + Org Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 text-slate-400 hover:text-white rounded-lg md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Organization Selector */}
          <div className="relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all text-xs sm:text-sm text-slate-200"
            >
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="font-semibold text-white leading-tight">
                  {activeOrg?.name || "Select Organization"}
                </div>
                {activeRole && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    {activeRole}
                  </div>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isOrgDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50">
                <div className="text-[10px] font-semibold uppercase text-slate-400 px-3 py-1.5 tracking-wider">
                  Your Organizations
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {organizations.map((org) => (
                    <button
                      key={org._id}
                      onClick={() => {
                        setActiveOrgId(org._id);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                        org._id === activeOrg?._id
                          ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                          : "text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="font-medium truncate">{org.name}</div>
                      {org._id === activeOrg?._id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-800/80 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setIsOrgDropdownOpen(false);
                      setIsCreateOrgModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Global Search + Presence + Notifications + User Menu */}
        <div className="flex items-center gap-3">
          {/* Global Workspace Search */}
          <GlobalSearch />

          {/* Presence Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>

          {/* Notifications Button */}
          <a
            href="/notifications"
            className="relative p-2 text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800 rounded-xl transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 p-1.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
            >
              <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="font-semibold text-xs text-white">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Role: {activeRole || "Member"}</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Create Organization Modal */}
      {isCreateOrgModalOpen && (
        <CreateOrgModal onClose={() => setIsCreateOrgModalOpen(false)} />
      )}
    </>
  );
};
