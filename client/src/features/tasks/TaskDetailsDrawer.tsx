import React, { useState } from "react";
import { Task, Membership } from "../../types/index.js";
import { taskApi } from "../../api/task.api.js";
import { commentApi } from "../../api/comment.api.js";
import { attachmentApi } from "../../api/attachment.api.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Send,
  Upload,
  Trash2,
  Calendar,
  MessageSquare,
  Paperclip,
  Loader2,
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
  const taskId = task.id || task._id || "";

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
      await queryClient.invalidateQueries({ queryKey: ["attachments"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      alert("Failed to upload attachment.");
    } finally {
      setUploadLoading(false);
    }
  };

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

  const handleDeleteComment = async (commentId: string) => {
    if (!taskId) return;
    try {
      await commentApi.deleteComment(orgId, commentId);
      await queryClient.invalidateQueries({ queryKey: ["comments", orgId, taskId] });
    } catch {
      alert("Failed to delete comment.");
    }
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAssigneeId = e.target.value;
    if (!taskId) return;
    try {
      if (newAssigneeId) {
        await taskApi.assignTask(orgId, taskId, newAssigneeId);
      } else {
        await taskApi.unassignTask(orgId, taskId);
      }
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      alert("Failed to update task assignee.");
    }
  };

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
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Description */}
          <div>
            <h2 className="text-lg font-bold text-white mb-2">{task.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {task.description || "No description provided."}
            </p>
          </div>

          {/* Task Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Assignee</span>
              <select
                value={currentAssigneeId}
                onChange={handleAssigneeChange}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
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
                  const name = userObj?.name || "";
                  const email = userObj?.email || "";
                  const displayName = name ? (email ? `${name} (${email})` : name) : email || "Member";

                  return (
                    <option key={targetUserId} value={targetUserId}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
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

          {/* Attachment Upload Dropzone */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-400" />
                <span>Attachments</span>
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
