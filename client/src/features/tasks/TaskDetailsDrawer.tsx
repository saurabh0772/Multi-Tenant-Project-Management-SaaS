import React, { useState } from "react";
import { Task, TaskStatus, TaskPriority, Membership } from "../../types/index.js";
import { taskApi } from "../../api/task.api.js";
import { commentApi } from "../../api/comment.api.js";
import { attachmentApi } from "../../api/attachment.api.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useAuthStore } from "../../store/authStore.js";
import {
  X,
  Send,
  Upload,
  Trash2,
  Calendar,
  MessageSquare,
  Paperclip,
  Loader2,
  Pencil,
  Check,
  Download,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "../../lib/utils.js";

interface TaskDetailsDrawerProps {
  orgId: string;
  task: Task;
  members: Membership[];
  onClose: () => void;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  orgId,
  task,
  members,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { activeRole } = useOrganization();
  const taskId = task.id || task._id || "";

  // Permission logic
  const canManage = activeRole === "OWNER" || activeRole === "ADMIN" || activeRole === "MANAGER";
  const canAssign = canManage;
  const canDeleteTask = canManage;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = task as any;
  const currentAssigneeId =
    tAny.assignedTo?.id ||
    tAny.assignedTo?._id ||
    (typeof tAny.assignedTo === "string" ? tAny.assignedTo : "") ||
    tAny.assigneeId?.id ||
    tAny.assigneeId?._id ||
    (typeof tAny.assigneeId === "string" ? tAny.assigneeId : "") ||
    "";

  const creatorUserId =
    tAny.createdBy?.id ||
    tAny.createdBy?._id ||
    (typeof tAny.createdBy === "string" ? tAny.createdBy : "") ||
    "";

  const currentUserId = user?.id || user?._id || "";
  const isCreatorOrAssignee =
    (creatorUserId && creatorUserId === currentUserId) ||
    (currentAssigneeId && currentAssigneeId === currentUserId);

  const canEditTask = canManage || isCreatorOrAssignee;

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title || "");
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status || "TODO");
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority || "MEDIUM");

  const formatDateForInput = (d?: string | Date | null) => {
    if (!d) return "";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split("T")[0];
  };

  const [editDueDate, setEditDueDate] = useState(formatDateForInput(task.dueDate));
  const [editLabels, setEditLabels] = useState((task.labels || []).join(", "));
  const [editAssigneeId, setEditAssigneeId] = useState(currentAssigneeId);

  const [editLoading, setEditLoading] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ["comments", orgId, taskId],
    queryFn: () => (taskId ? commentApi.listComments(orgId, taskId) : null),
    enabled: !!taskId,
  });
  const comments = commentsData?.comments || [];

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ["attachments", orgId, taskId],
    queryFn: () => (taskId ? attachmentApi.getTaskAttachments(orgId, taskId) : []),
    enabled: !!taskId,
  });

  // Handle task deletion
  const handleDeleteTask = async () => {
    if (!taskId || !confirm("Are you sure you want to delete this task?")) return;
    try {
      await taskApi.deleteTask(orgId, taskId);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    } catch {
      alert("Failed to delete task.");
    }
  };

  // Handle task save
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !editTitle.trim()) return;

    setEditLoading(true);
    try {
      const labelsArray = editLabels
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await taskApi.updateTask(orgId, taskId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate || undefined,
        labels: labelsArray,
        assignedTo: canAssign ? (editAssigneeId || null) : undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsEditing(false);
    } catch {
      alert("Failed to update task.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setUploadLoading(true);
    try {
      await attachmentApi.uploadAttachment(orgId, file, { taskId });
      await queryClient.invalidateQueries({ queryKey: ["attachments", orgId, taskId] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      alert("Failed to upload attachment.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle attachment deletion
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!taskId || !attachmentId) return;
    try {
      await attachmentApi.deleteAttachment(orgId, attachmentId);
      await queryClient.invalidateQueries({ queryKey: ["attachments", orgId, taskId] });
    } catch {
      alert("Failed to delete attachment.");
    }
  };

  // Handle comment creation
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !taskId) return;

    setCommentLoading(true);
    try {
      await commentApi.createComment(orgId, taskId, commentContent.trim());
      setCommentContent("");
      await queryClient.invalidateQueries({ queryKey: ["comments", orgId, taskId] });
    } catch {
      alert("Failed to post comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId: string) => {
    if (!taskId) return;
    try {
      await commentApi.deleteComment(orgId, commentId);
      await queryClient.invalidateQueries({ queryKey: ["comments", orgId, taskId] });
    } catch {
      alert("Failed to delete comment.");
    }
  };

  // Handle direct assignee change when not in edit mode
  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!canAssign) return;
    const newAssigneeId = e.target.value;
    if (!taskId) return;
    try {
      if (newAssigneeId) {
        await taskApi.assignTask(orgId, taskId, newAssigneeId);
      } else {
        await taskApi.unassignTask(orgId, taskId);
      }
      setEditAssigneeId(newAssigneeId);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      alert("Failed to update task assignee.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {task.status}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {task.priority}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {canEditTask && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit</span>
                </button>
              )}

              {canDeleteTask && (
                <button
                  onClick={handleDeleteTask}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Inline Edit Form vs View Mode */}
          {isEditing ? (
            <form onSubmit={handleSaveTask} className="space-y-4 bg-slate-950/60 p-4 border border-slate-800/80 rounded-2xl">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Labels (comma separated)</label>
                  <input
                    type="text"
                    value={editLabels}
                    onChange={(e) => setEditLabels(e.target.value)}
                    placeholder="bug, frontend"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-white mb-2">{task.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {task.description || "No description provided."}
              </p>
            </div>
          )}

          {/* Task Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Assignee</span>
              <select
                disabled={!canAssign}
                value={currentAssigneeId}
                onChange={handleAssigneeChange}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {members.map((m) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const mAny = m as any;
                  const userObj = mAny.user || (typeof mAny.userId === "object" ? mAny.userId : null);
                  const targetUserId =
                    userObj?.id ||
                    userObj?._id ||
                    (typeof mAny.userId === "string" ? mAny.userId : "") ||
                    m._id ||
                    m.id ||
                    "";
                  const name = userObj?.name || "Member";
                  const email = userObj?.email || "";
                  const role = m.role || mAny.role || "MEMBER";
                  const displayName = `${name}${email ? ` (${email})` : ""} - ${role}`;

                  return (
                    <option key={targetUserId} value={targetUserId}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
              {!canAssign && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Assignment restricted to Owners, Admins, and Managers.
                </p>
              )}
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Due Date</span>
              <div className="flex items-center gap-1.5 text-slate-300 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1.5">
                Labels
              </span>
              <div className="flex flex-wrap gap-1.5">
                {task.labels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded-md font-mono"
                  >
                    #{lbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-400" />
                <span>Attachments ({attachments.length})</span>
              </h3>
              <label className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-medium cursor-pointer transition-all inline-flex items-center gap-1">
                {uploadLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                <span>Upload File</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadLoading}
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-[11px] text-slate-500">No attachments uploaded yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {attachments.map((att: any) => {
                  const attId = att.id || att._id || "";
                  const uploaderId =
                    att.uploadedBy?.id ||
                    att.uploadedBy?._id ||
                    (typeof att.uploadedBy === "string" ? att.uploadedBy : "");
                  const canDeleteAtt = canManage || (currentUserId && uploaderId === currentUserId);
                  const downloadUrl = attachmentApi.getDownloadUrl(orgId, attId);

                  return (
                    <div
                      key={attId}
                      className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[240px]">
                        <Paperclip className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-slate-200 font-medium truncate">{att.fileName}</span>
                        {att.fileSize && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({(att.fileSize / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.fileName}
                          className="p-1 text-slate-400 hover:text-blue-400 rounded transition-all"
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {canDeleteAtt && (
                          <button
                            onClick={() => handleDeleteAttachment(attId)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition-all"
                            title="Delete attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>Comments ({comments.length})</span>
            </h3>

            {/* Comment Input */}
            <form onSubmit={handleCreateComment} className="flex gap-2">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={commentLoading || !commentContent.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Comment List */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((c) => (
                <div
                  key={c._id || c.id}
                  className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-white">
                      {c.author?.name || "Author"}
                    </span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>{formatRelativeTime(c.createdAt)}</span>
                      <button
                        onClick={() => handleDeleteComment(c._id || c.id || "")}
                        className="hover:text-rose-400 transition-all"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
