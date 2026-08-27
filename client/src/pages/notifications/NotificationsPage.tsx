import React, { useState } from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../../api/notification.api.js";
import { Bell, CheckCheck, Check, Clock, Inbox } from "lucide-react";
import { formatRelativeTime } from "../../lib/utils.js";

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrg } = useOrganization();

  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", activeOrg?._id, unreadOnly],
    queryFn: () => {
      if (!activeOrg) return null;
      return notificationApi.listNotifications(activeOrg._id, { unreadOnly });
    },
    enabled: !!activeOrg,
  });

  const notifications = notificationsData?.notifications || [];

  const handleMarkRead = async (notificationId: string) => {
    if (!activeOrg) return;
    try {
      await notificationApi.markRead(activeOrg._id, notificationId);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!activeOrg) return;
    try {
      await notificationApi.markAllRead(activeOrg._id);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time notifications and alerts for task assignments and activities.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            !unreadOnly
              ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            unreadOnly
              ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">No notifications found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  !n.readAt
                    ? "bg-blue-950/20 border-blue-500/30"
                    : "bg-slate-950/40 border-slate-800/60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    {!n.readAt && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{n.message}</p>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{formatRelativeTime(n.createdAt)}</span>
                  </div>
                </div>

                {!n.readAt && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-all shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
