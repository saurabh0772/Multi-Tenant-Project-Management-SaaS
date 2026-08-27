import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { SearchCommand } from "./SearchCommand.js";

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all text-xs font-sans group"
        title="Search workspace (Cmd+K)"
      >
        <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
        <span className="hidden md:inline font-medium">Search workspace...</span>
        <span className="hidden md:inline font-mono text-[10px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-500">
          ⌘K
        </span>
      </button>

      <SearchCommand isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
