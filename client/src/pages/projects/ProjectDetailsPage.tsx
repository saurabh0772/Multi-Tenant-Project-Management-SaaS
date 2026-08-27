import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../../api/project.api.js";
import { taskApi } from "../../api/task.api.js";
import { orgApi } from "../../api/org.api.js";
import { Task, TaskStatus } from "../../types/index.js";
import { socketClientManager } from "../../lib/socket-client.js";
import { CreateTaskModal } from "../../features/tasks/CreateTaskModal.js";
import { TaskDetailsDrawer } from "../../features/tasks/TaskDetailsDrawer.js";
import {
  Plus,
  ArrowLeft,
  Calendar,
  GripVertical,
} from "lucide-react";
import { formatDate } from "../../lib/utils.js";

const KANBAN_COLUMNS: Array<{ key: TaskStatus; label: string; color: string }> = [
  { key: "TODO", label: "To Do", color: "border-slate-700 bg-slate-900/40" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-500/30 bg-blue-950/20" },
  { key: "IN_REVIEW", label: "In Review", color: "border-purple-500/30 bg-purple-950/20" },
  { key: "DONE", label: "Done", color: "border-emerald-500/30 bg-emerald-950/20" },
];

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg, hasPermission } = useOrganization();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = useState<TaskStatus>("TODO");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Subscribe to Project Socket Room
  useEffect(() => {
    if (activeOrg && projectId) {
      socketClientManager.joinProject(activeOrg._id, projectId);
    }
  }, [activeOrg, projectId]);

  // Fetch Project Details
  const { data: project } = useQuery({
    queryKey: ["project", activeOrg?._id, projectId],
    queryFn: () => (activeOrg && projectId ? projectApi.getProject(activeOrg._id, projectId) : null),
    enabled: !!activeOrg && !!projectId,
  });

  // Fetch Tasks
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", activeOrg?._id, projectId],
    queryFn: () => (activeOrg && projectId ? taskApi.listTasks(activeOrg._id, projectId) : null),
    enabled: !!activeOrg && !!projectId,
  });
  const tasks = tasksData?.tasks || [];

  // Fetch Members for Assignee selection
  const { data: members = [] } = useQuery({
    queryKey: ["members", activeOrg?._id],
    queryFn: () => (activeOrg ? orgApi.listMembers(activeOrg._id) : []),
    enabled: !!activeOrg,
  });

  // Handle Task Move (Position & Status update)
  const handleMoveTask = async (taskId: string, targetStatus: TaskStatus, position: number) => {
    if (!activeOrg) return;
    try {
      await taskApi.moveTaskPosition(activeOrg._id, taskId, {
        status: targetStatus,
        position,
      });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      alert("Failed to move task position.");
    }
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const columnTasks = tasks.filter((t) => t.status === targetStatus);
    const targetPosition = columnTasks.length + 1;

    await handleMoveTask(taskId, targetStatus, targetPosition);
    setDraggedTaskId(null);
  };

  if (!project) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs font-sans">
        Loading project details...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => navigate("/projects")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {project.name}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  project.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {project.description || "No project description."}
            </p>
          </div>

          {hasPermission("TASK_CREATE") && (
            <button
              onClick={() => {
                setCreateTaskDefaultStatus("TODO");
                setIsCreateTaskOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.key)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`border rounded-3xl p-4 flex flex-col min-h-[500px] backdrop-blur-xl ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>

                {hasPermission("TASK_CREATE") && (
                  <button
                    onClick={() => {
                      setCreateTaskDefaultStatus(col.key);
                      setIsCreateTaskOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1">
                {colTasks.map((t) => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t._id)}
                    onClick={() => setSelectedTask(t)}
                    className="p-4 bg-slate-900 border border-slate-800/80 hover:border-blue-500/50 rounded-2xl cursor-pointer transition-all shadow-md group relative"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-all line-clamp-2">
                        {t.title}
                      </h4>
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                    </div>

                    {t.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {t.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono ${
                          t.priority === "URGENT" || t.priority === "HIGH"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {t.priority}
                      </span>

                      {t.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(t.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {isCreateTaskOpen && activeOrg && (
        <CreateTaskModal
          orgId={activeOrg._id}
          projectId={project._id}
          members={members}
          defaultStatus={createTaskDefaultStatus}
          onClose={() => setIsCreateTaskOpen(false)}
        />
      )}

      {/* Task Details Drawer */}
      {selectedTask && activeOrg && (
        <TaskDetailsDrawer
          orgId={activeOrg._id}
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default ProjectDetailsPage;
