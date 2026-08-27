import React, { useState } from "react";
import { projectApi } from "../../api/project.api.js";
import { orgApi } from "../../api/org.api.js";
import { ProjectStatus } from "../../types/index.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, AlertCircle, Users } from "lucide-react";

interface CreateProjectModalProps {
  orgId: string;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  orgId,
  onClose,
}) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("ACTIVE");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch organization members for member assignment
  const { data: members = [] } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => orgApi.listMembers(orgId),
    enabled: !!orgId,
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    setError(null);

    if (newStartDate && dueDate && new Date(dueDate) < new Date(newStartDate)) {
      setDueDate(newStartDate);
    }
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDueDate = e.target.value;
    if (startDate && newDueDate && new Date(newDueDate) < new Date(startDate)) {
      setError("Due date must be on or after start date.");
    } else {
      setError(null);
    }
    setDueDate(newDueDate);
  };

  const toggleMemberSelection = (userId: string) => {
    if (!userId) return;
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      setError("Due date must be on or after start date.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await projectApi.createProject(orgId, {
        name,
        slug,
        description: description || undefined,
        status,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiErr = err as any;
      setError(
        apiErr.response?.data?.error?.message ||
          apiErr.response?.data?.message ||
          apiErr.message ||
          "Failed to create project."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <h3 className="text-base font-bold text-white">Create New Project</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              placeholder="Mobile App Design"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Slug
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mobile-app-design"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project goals and overview..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                min={startDate || undefined}
                value={dueDate}
                onChange={handleDueDateChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Project Members Multi-Select */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Project Members ({selectedMemberIds.length} selected)</span>
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-1.5">
              {members.length === 0 ? (
                <p className="text-[11px] text-slate-500">No members found in organization.</p>
              ) : (
                members.map((m) => {
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
                  const role = m.role || "";
                  const displayName = name ? (email ? `${name} (${email})` : name) : email || "Member";
                  const isChecked = selectedMemberIds.includes(targetUserId);

                  return (
                    <label
                      key={targetUserId}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-blue-600/10 border-blue-500/40 text-white"
                          : "bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMemberSelection(targetUserId)}
                          className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{displayName}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                        {role}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
