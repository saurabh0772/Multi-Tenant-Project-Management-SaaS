import React, { useState } from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../../api/project.api.js";
import { ProjectStatus } from "../../types/index.js";
import { Link } from "react-router-dom";
import { CreateProjectModal } from "../../features/projects/CreateProjectModal.js";
import {
  FolderKanban,
  Plus,
  Search,
  Folder,
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
} from "lucide-react";
import { formatDate } from "../../lib/utils.js";

export const ProjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrg, hasPermission } = useOrganization();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects", activeOrg?._id, search, statusFilter],
    queryFn: () => {
      if (!activeOrg) return null;
      return projectApi.listProjects(activeOrg._id, {
        search: search || undefined,
        status: statusFilter === "ALL" ? undefined : (statusFilter as ProjectStatus),
      });
    },
    enabled: !!activeOrg,
  });

  const projects = projectsData?.projects || [];

  const handleArchive = async (projectId: string) => {
    if (!activeOrg) return;
    try {
      await projectApi.archiveProject(activeOrg._id, projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      // ignore
    }
  };

  const handleRestore = async (projectId: string) => {
    if (!activeOrg) return;
    try {
      await projectApi.restoreProject(activeOrg._id, projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      // ignore
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!activeOrg || !confirm("Are you sure you want to delete this project?")) return;
    try {
      await projectApi.deleteProject(activeOrg._id, projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-400" />
            <span>Projects</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your tenant workspace projects and Kanban task boards.
          </p>
        </div>

        {hasPermission("PROJECT_CREATE") && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 bg-slate-900/40 border border-slate-800/60 rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-12 text-center">
          <Folder className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">No Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Get started by creating your first project for this organization.
          </p>
          {hasPermission("PROJECT_CREATE") && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      proj.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : proj.status === "ARCHIVED"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {proj.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {hasPermission("PROJECT_UPDATE") && proj.status === "ACTIVE" && (
                      <button
                        onClick={() => handleArchive(proj._id)}
                        className="p-1 text-slate-500 hover:text-amber-400 rounded transition-all"
                        title="Archive Project"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {hasPermission("PROJECT_UPDATE") && proj.status === "ARCHIVED" && (
                      <button
                        onClick={() => handleRestore(proj._id)}
                        className="p-1 text-slate-500 hover:text-emerald-400 rounded transition-all"
                        title="Restore Project"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {hasPermission("PROJECT_DELETE") && (
                      <button
                        onClick={() => handleDelete(proj._id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-all"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <Link
                  to={`/projects/${proj._id}`}
                  className="group block"
                >
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-all truncate">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                    {proj.description || "No description provided."}
                  </p>
                </Link>
              </div>

              <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Created: {formatDate(proj.createdAt)}</span>
                </div>
                <Link
                  to={`/projects/${proj._id}`}
                  className="text-blue-400 font-medium hover:underline"
                >
                  Open Board &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && activeOrg && (
        <CreateProjectModal
          orgId={activeOrg._id}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
