import React, { useState } from "react";
import { orgApi } from "../../api/org.api.js";
import { Membership } from "../../types/index.js";
import { useQueryClient } from "@tanstack/react-query";
import { X, Loader2, AlertTriangle } from "lucide-react";

interface TransferOwnershipModalProps {
  orgId: string;
  members: Membership[];
  onClose: () => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  orgId,
  members,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Eligible members (exclude current owner)
  const eligibleMembers = members.filter(
    (m) => m.role !== "OWNER" && m.status === "ACTIVE"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError("Please select a member to transfer ownership to.");
      return;
    }

    const memberObj = members.find((m) => m._id === selectedMemberId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUserId = (memberObj?.userId as any)?._id || memberObj?.userId;

    if (!targetUserId) {
      setError("Invalid member selected.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await orgApi.transferOwnership(orgId, targetUserId);
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      onClose();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiErr = err as any;
      setError(
        apiErr.response?.data?.error?.message || "Failed to transfer ownership."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Transfer Ownership</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          This is a sensitive action. Transferring ownership will make the selected active member the new <strong className="text-white">OWNER</strong>, and your role will be converted to <strong className="text-white">ADMIN</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select New Owner
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a member...</option>
              {eligibleMembers.map((m) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userObj = m.userId as any;
                const name = userObj?.name || "Member";
                const email = userObj?.email || "";
                return (
                  <option key={m._id} value={m._id}>
                    {name} ({email}) - {m.role}
                  </option>
                );
              })}
            </select>
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
              disabled={loading || !selectedMemberId}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <span>Confirm Transfer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
