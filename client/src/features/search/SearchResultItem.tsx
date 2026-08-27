import React from "react";
import { Folder, CheckSquare, MessageSquare, User } from "lucide-react";
import {
  ProjectSearchResult,
  TaskSearchResult,
  CommentSearchResult,
  MemberSearchResult,
} from "../../api/search.api.js";

export type SearchItem =
  | ProjectSearchResult
  | TaskSearchResult
  | CommentSearchResult
  | MemberSearchResult;

interface SearchResultItemProps {
  item: SearchItem;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  item,
  isSelected,
  onSelect,
  onClick,
}) => {
  const getItemIcon = () => {
    switch (item.type) {
      case "project":
        return <Folder className="w-4 h-4 text-blue-400" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case "member":
        return <User className="w-4 h-4 text-purple-400" />;
      default:
        return <Folder className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTitle = () => {
    switch (item.type) {
      case "project":
        return item.name;
      case "task":
        return item.title;
      case "comment":
        return item.content.length > 80 ? `${item.content.substring(0, 80)}...` : item.content;
      case "member":
        return `${item.name} (${item.email})`;
    }
  };

  const getSubtitle = () => {
    switch (item.type) {
      case "project":
        return `Status: ${item.status} | Slug: ${item.slug}`;
      case "task":
        return `Status: ${item.status} | Priority: ${item.priority}`;
      case "comment":
        return `Comment on task`;
      case "member":
        return `Organization Member`;
    }
  };

  return (
    <div
      onMouseEnter={onSelect}
      onClick={onClick}
      className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
        isSelected
          ? "bg-blue-600/20 border border-blue-500/30 text-white"
          : "hover:bg-slate-800/50 text-slate-300 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0">
          {getItemIcon()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-xs sm:text-sm text-slate-100 truncate">
            {getTitle()}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {getSubtitle()}
          </div>
        </div>
      </div>
      {item.score !== undefined && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50 ml-2 flex-shrink-0">
          Relevance: {item.score}
        </span>
      )}
    </div>
  );
};
