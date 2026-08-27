import React, { useState } from "react";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "../../api/org.api.js";
import { OrganizationRole, MembershipStatus } from "../../types/index.js";
import { InviteMemberModal } from "../../features/members/InviteMemberModal.js";
import { Users, UserPlus, Trash2, Mail } from "lucide-react";
import { formatDate } from "../../lib/utils.js";

export const MembersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrg, hasPermission } = useOrganization();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Fetch Members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["members", activeOrg?._id],
    queryFn: () => (activeOrg ? orgApi.listMembers(activeOrg._id) : []),
    enabled: !!activeOrg,
  });

  // Fetch Pending Invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", activeOrg?._id],
    queryFn: () => (activeOrg ? orgApi.listInvitations(activeOrg._id) : []),
    enabled: !!activeOrg && hasPermission("MEMBER_INVITE"),
  });

  const handleRoleChange = async (memberId: string, role: OrganizationRole) => {
    if (!activeOrg) return;
    try {
      await orgApi.updateMember(activeOrg._id, memberId, { role });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch {
      alert("Failed to update member role.");
    }
  };

  const handleStatusChange = async (memberId: string, status: MembershipStatus) => {
    if (!activeOrg) return;
    try {
      await orgApi.updateMember(activeOrg._id, memberId, { status });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch {
      alert("Failed to update member status.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeOrg || !confirm("Remove member from organization?")) return;
    try {
      await orgApi.removeMember(activeOrg._id, memberId);
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch {
      alert("Failed to remove member.");
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!activeOrg) return;
    try {
      await orgApi.revokeInvitation(activeOrg._id, invitationId);
      await queryClient.invalidateQueries({ queryKey: ["invitations"] });
    } catch {
      alert("Failed to revoke invitation.");
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Organization Members</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage team access, assigned RBAC roles, and pending invitations.
          </p>
        </div>

        {hasPermission("MEMBER_INVITE") && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Active Members Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl">
        <h2 className="text-sm font-bold text-white mb-4">
          Active Members ({members.length})
        </h2>

        {membersLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="pb-3 px-2">Member</th>
                  <th className="pb-3 px-2">Role</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Joined</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map((m) => {
                  const memberId = m._id || m.id || "";
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const userObj = (typeof m.userId === "object" ? m.userId : m.user) as any;
                  const name = userObj?.name || "Member";
                  const email = userObj?.email || "";
                  const initials = name
                    .split(" ")
                    .map((n: string) => n[0])
                    .filter(Boolean)
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U";

                  return (
                    <tr key={memberId} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-md shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{name}</div>
                            {email && (
                              <div className="text-[10px] text-slate-400">{email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        {hasPermission("MEMBER_UPDATE_ROLE") && m.role !== "OWNER" ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(memberId, e.target.value as OrganizationRole)
                            }
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {m.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        {hasPermission("MEMBER_UPDATE_ROLE") && m.role !== "OWNER" ? (
                          <select
                            value={m.status}
                            onChange={(e) =>
                              handleStatusChange(memberId, e.target.value as MembershipStatus)
                            }
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {m.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-slate-400">
                        {formatDate(m.joinedAt)}
                      </td>

                      <td className="py-3 px-2 text-right">
                        {hasPermission("MEMBER_REMOVE") && m.role !== "OWNER" && (
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {hasPermission("MEMBER_INVITE") && invitations.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl">
          <h2 className="text-sm font-bold text-white mb-4">
            Pending Invitations ({invitations.length})
          </h2>

          <div className="space-y-2">
            {invitations.map((inv) => {
              const invId = inv._id || inv.id || "";
              return (
                <div
                  key={invId}
                  className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-2xl text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="font-semibold text-white">{inv.email}</span>
                      <span className="ml-2 text-[10px] text-slate-400 font-mono">
                        Role: {inv.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeInvitation(invId)}
                    className="px-3 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs transition-all"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && activeOrg && (
        <InviteMemberModal
          orgId={activeOrg._id}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MembersPage;
