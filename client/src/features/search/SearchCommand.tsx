import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Filter } from "lucide-react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useDebounce } from "../../hooks/useDebounce.js";
import { searchApi } from "../../api/search.api.js";
import { SearchResults } from "./SearchResults.js";
import { SearchItem } from "./SearchResultItem.js";

interface SearchCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchCommand: React.FC<SearchCommandProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { activeOrg } = useOrganization();
  const activeOrgId = activeOrg?._id;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "projects" | "tasks" | "comments" | "members"
  >("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debouncedQuery = useDebounce(searchTerm, 300);

  // TanStack Query with organization-scoped key
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", activeOrgId, debouncedQuery, selectedType],
    queryFn: () =>
      activeOrgId
        ? searchApi.search(activeOrgId, {
            q: debouncedQuery,
            type: selectedType,
          })
        : Promise.reject(new Error("No active organization")),
    enabled: !!activeOrgId && debouncedQuery.length > 0,
    staleTime: 30000,
  });

  // Calculate total item count across returned categories
  const allItems: SearchItem[] = data
    ? [
        ...data.projects,
        ...data.tasks,
        ...data.comments,
        ...data.members,
      ]
    : [];

  // Reset highlighted item index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, selectedType]);

  // Handle item click and navigation
  const handleItemSelect = (item: SearchItem) => {
    onClose();
    switch (item.type) {
      case "project":
        navigate(`/projects/${item.id}`);
        break;
      case "task":
        navigate(`/projects/${item.projectId}`);
        break;
      case "comment":
        navigate(`/projects/${item.taskId}`);
        break;
      case "member":
        navigate(`/members`);
        break;
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          allItems.length > 0 ? (prev + 1) % allItems.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          handleItemSelect(allItems[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, allItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects, tasks, comments, or members..."
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base outline-none"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-mono bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700/60"
          >
            ESC
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          {(["all", "projects", "tasks", "comments", "members"] as const).map(
            (type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                  selectedType === type
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {type}
              </button>
            )
          )}
        </div>

        {/* Results Container */}
        <div className="p-4">
          <SearchResults
            data={data}
            isLoading={isLoading}
            isError={isError}
            query={debouncedQuery}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onItemClick={handleItemSelect}
          />
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div>Workspace: {activeOrg?.name || "Active Org"}</div>
        </div>
      </div>
    </div>
  );
};
