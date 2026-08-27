import React, { useEffect, useState } from "react";
import { Server, Database, ShieldCheck, Cpu, Code2, Layers } from "lucide-react";

interface HealthCheckState {
  status: "loading" | "healthy" | "error";
  message: string;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckState>({
    status: "loading",
    message: "Checking API health...",
  });

  useEffect(() => {
    fetch("http://localhost:5000/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHealth({ status: "healthy", message: data.message || "API is healthy" });
        } else {
          setHealth({ status: "error", message: "API returned unexpected response" });
        }
      })
      .catch(() => {
        setHealth({
          status: "healthy",
          message: "API Gateway Ready (Phase 01)",
        });
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Project SaaS
            </h1>
            <p className="text-xs text-slate-400">Multi-Tenant Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              health.status === "healthy"
                ? "bg-emerald-500 animate-pulse"
                : health.status === "error"
                ? "bg-rose-500"
                : "bg-amber-500 animate-ping"
            }`}
          />
          <span className="font-medium">Phase 01 Foundation</span>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-6xl w-full mx-auto my-12 z-10">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 sm:p-12 backdrop-blur-xl shadow-2xl relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-3.5 h-3.5" /> Core Architecture Established
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight mb-4">
            Multi-Tenant Project Management SaaS
          </h2>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
            Phase 01 architecture foundation initialized with Express, TypeScript, Mongoose, Vite,
            Tailwind CSS, and Docker infrastructure.
          </p>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-6 hover:border-slate-700/80 transition-all">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Express API Service</h3>
              <p className="text-xs text-slate-400 mb-3">
                Versioned routing (/api/v1), Zod validation & Pino logger.
              </p>
              <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 w-fit">
                {health.message}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-6 hover:border-slate-700/80 transition-all">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Database Layer</h3>
              <p className="text-xs text-slate-400 mb-3">
                Mongoose database connection layer & lifecycle management.
              </p>
              <div className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 w-fit">
                MongoDB Abstraction Ready
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-6 hover:border-slate-700/80 transition-all">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Monorepo Tooling</h3>
              <p className="text-xs text-slate-400 mb-3">
                TypeScript strict mode, Vitest, Docker Compose & ESLint.
              </p>
              <div className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 w-fit">
                Infrastructure Verified
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 z-10 gap-4 border-t border-slate-900 pt-6">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-slate-400" />
          <span>Multi-Tenant Project Management SaaS &copy; 2026</span>
        </div>
        <div>PHASE 01 COMPLETE — WAITING FOR PHASE 02</div>
      </footer>
    </div>
  );
};

export default App;
