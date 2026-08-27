import React, { useState, useEffect } from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { orgApi } from "../../api/org.api.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TransferOwnershipModal } from "../../features/organizations/TransferOwnershipModal.js";
import { Settings, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export const OrganizationSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrg, activeRole, hasPermission } = useOrganization();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name || "");
      setLogoUrl(activeOrg.logoUrl || "");
      setTimezone(activeOrg.timezone || "UTC");
      setDateFormat(activeOrg.dateFormat || "YYYY-MM-DD");
    }
  }, [activeOrg]);

  const { data: members = [] } = useQuery({
    queryKey: ["members", activeOrg?._id],
    queryFn: () => (activeOrg ? orgApi.listMembers(activeOrg._id) : []),
    enabled: !!activeOrg,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await orgApi.updateOrganization(activeOrg._id, {
        name,
        logoUrl: logoUrl || null,
        timezone,
        dateFormat,
        settings: {
          timezone,
          dateFormat,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      setSuccess("Organization settings updated successfully.");
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiErr = err as any;
      setError(
        apiErr.response?.data?.error?.message || "Failed to update settings."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!activeOrg) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs">
        No organization selected.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Organization Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage workspace profile and timezone configuration.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!hasPermission("ORGANIZATION_UPDATE")}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Slug (Read Only)
              </label>
              <input
                type="text"
                disabled
                value={activeOrg.slug}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs text-slate-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!hasPermission("ORGANIZATION_UPDATE")}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                disabled={!hasPermission("ORGANIZATION_UPDATE")}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>

          {hasPermission("ORGANIZATION_UPDATE") && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Sensitive Danger Zone for OWNER */}
      {activeRole === "OWNER" && (
        <div className="bg-slate-900/60 border border-amber-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">Organization Ownership</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Transfer full ownership of this organization to another active member.
          </p>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30 text-amber-400 font-medium rounded-xl text-xs transition-all"
          >
            Transfer Ownership
          </button>
        </div>
      )}

      {/* Ownership Transfer Modal */}
      {isTransferModalOpen && (
        <TransferOwnershipModal
          orgId={activeOrg._id}
          members={members}
          onClose={() => setIsTransferModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrganizationSettingsPage;
