import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketClientManager } from "../lib/socket-client.js";
import { useAuthStore } from "../store/authStore.js";

export function useSocket() {
  const { isAuthenticated, activeOrgId } = useAuthStore();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || !activeOrgId) {
      socketClientManager.disconnect();
      return;
    }

    const socket = socketClientManager.connect();
    socketClientManager.joinOrganization(activeOrgId);

    // Heartbeat interval
    const heartbeatInterval = setInterval(() => {
      socketClientManager.sendHeartbeat(activeOrgId);
    }, 30000);

    // Task event handlers
    const handleTaskEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["activities", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["search", activeOrgId] });
    };

    // Project event handlers
    const handleProjectEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["projects", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["activities", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["search", activeOrgId] });
    };

    // Comment event handlers
    const handleCommentEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["activities", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["search", activeOrgId] });
    };

    // Attachment event handlers
    const handleAttachmentEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
      queryClient.invalidateQueries({ queryKey: ["activities", activeOrgId] });
    };

    // Member & Invitation event handlers
    const handleMemberEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["search", activeOrgId] });
    };

    const handleInvitationEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    };

    // Notification event handlers
    const handleNotificationEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["unread-count", activeOrgId] });
    };

    // Presence event handlers
    const handlePresenceOnline = (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    };

    const handlePresenceOffline = (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on("task:created", handleTaskEvent);
    socket.on("task:updated", handleTaskEvent);
    socket.on("task:moved", handleTaskEvent);
    socket.on("task:assigned", handleTaskEvent);
    socket.on("task:unassigned", handleTaskEvent);
    socket.on("task:deleted", handleTaskEvent);
    socket.on("task:restored", handleTaskEvent);

    socket.on("project:created", handleProjectEvent);
    socket.on("project:updated", handleProjectEvent);
    socket.on("project:archived", handleProjectEvent);
    socket.on("project:restored", handleProjectEvent);
    socket.on("project:deleted", handleProjectEvent);

    socket.on("comment:created", handleCommentEvent);
    socket.on("comment:updated", handleCommentEvent);
    socket.on("comment:deleted", handleCommentEvent);

    socket.on("attachment:uploaded", handleAttachmentEvent);
    socket.on("attachment:deleted", handleAttachmentEvent);

    socket.on("member:updated", handleMemberEvent);
    socket.on("member:removed", handleMemberEvent);
    socket.on("member:role-changed", handleMemberEvent);

    socket.on("invitation:created", handleInvitationEvent);
    socket.on("invitation:revoked", handleInvitationEvent);
    socket.on("invitation:accepted", handleInvitationEvent);

    socket.on("notification:created", handleNotificationEvent);
    socket.on("notification:read", handleNotificationEvent);
    socket.on("notification:read-all", handleNotificationEvent);

    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off("task:created", handleTaskEvent);
      socket.off("task:updated", handleTaskEvent);
      socket.off("task:moved", handleTaskEvent);
      socket.off("task:assigned", handleTaskEvent);
      socket.off("task:unassigned", handleTaskEvent);
      socket.off("task:deleted", handleTaskEvent);
      socket.off("task:restored", handleTaskEvent);

      socket.off("project:created", handleProjectEvent);
      socket.off("project:updated", handleProjectEvent);
      socket.off("project:archived", handleProjectEvent);
      socket.off("project:restored", handleProjectEvent);
      socket.off("project:deleted", handleProjectEvent);

      socket.off("comment:created", handleCommentEvent);
      socket.off("comment:updated", handleCommentEvent);
      socket.off("comment:deleted", handleCommentEvent);

      socket.off("attachment:uploaded", handleAttachmentEvent);
      socket.off("attachment:deleted", handleAttachmentEvent);

      socket.off("member:updated", handleMemberEvent);
      socket.off("member:removed", handleMemberEvent);
      socket.off("member:role-changed", handleMemberEvent);

      socket.off("invitation:created", handleInvitationEvent);
      socket.off("invitation:revoked", handleInvitationEvent);
      socket.off("invitation:accepted", handleInvitationEvent);

      socket.off("notification:created", handleNotificationEvent);
      socket.off("notification:read", handleNotificationEvent);
      socket.off("notification:read-all", handleNotificationEvent);

      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
    };
  }, [isAuthenticated, activeOrgId, queryClient]);

  return {
    socket: socketClientManager.getSocket(),
    onlineUsers,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
  };
}
