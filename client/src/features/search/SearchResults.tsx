import React from "react";
import { SearchResponse } from "../../api/search.api.js";
import { SearchResultItem, SearchItem } from "./SearchResultItem.js";
import { Search } from "lucide-react";

interface SearchResultsProps {
  data?: SearchResponse;
  isLoading: boolean;
  isError: boolean;
  query: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onItemClick: (item: SearchItem) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  data,
  isLoading,
  isError,
  query,
  selectedIndex,
  onSelectIndex,
  onItemClick,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2 font-sans">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Searching organization workspace...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-rose-400 text-xs bg-rose-500/10 rounded-xl border border-rose-500/20 font-sans">
        Unable to complete search request. Please try again.
      </div>
    );
  }

  if (!data || data.pagination.total === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2 font-sans">
        <Search className="w-8 h-8 text-slate-600 mb-1" />
        <span>{query ? `No results found for "${query}"` : "Type a query to search"}</span>
      </div>
    );
  }

  let currentIndex = 0;

  const groups = [
    { label: "Projects", items: data.projects },
    { label: "Tasks", items: data.tasks },
    { label: "Comments", items: data.comments },
    { label: "Members", items: data.members },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-h-96 overflow-y-auto space-y-4 pr-1 font-sans">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{group.label}</span>
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
              {group.items.length}
            </span>
          </div>

          <div className="space-y-1">
            {group.items.map((item) => {
              const itemIdx = currentIndex++;
              return (
                <SearchResultItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  isSelected={selectedIndex === itemIdx}
                  onSelect={() => onSelectIndex(itemIdx)}
                  onClick={() => onItemClick(item)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
