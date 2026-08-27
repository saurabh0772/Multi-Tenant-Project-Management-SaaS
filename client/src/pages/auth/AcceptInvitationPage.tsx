import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orgApi } from "../../api/org.api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { AuthLayout } from "../../components/layout/AuthLayout.js";
import { AlertCircle, CheckCircle2, Loader2, UserCheck, Building2, ShieldCheck, Mail } from "lucide-react";

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { user, isAuthenticated, checkAuth } = useAuth();

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch invitation preview details publicly by token
  const { data: invDetails, isLoading: detailsLoading, error: detailsError } = useQuery({
    queryKey: ["invitationDetails", token],
    queryFn: () => (token ? orgApi.getInvitationDetails(token) : null),
    enabled: !!token,
    retry: false,
  });

  const handleAccept = async () => {
    if (!token) {
      setError("Invalid or missing invitation token.");
      return;
    }
    setError(null);
    setAccepting(true);

    try {
      const res = await orgApi.acceptInvitation(token);
      setSuccessMsg(res.message || "Invitation accepted successfully!");
      
      // Update global auth state & set active org immediately
      await checkAuth();
      if (res.organizationId) {
        localStorage.setItem("saas_active_org_id", res.organizationId);
      }

      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiErr = err as any;
      setError(
        apiErr.response?.data?.error?.message ||
          "Failed to accept invitation. The invitation may be invalid or expired."
      );
    } finally {
      setAccepting(false);
    }
  };

  const orgName = invDetails?.organization?.name || "Organization";
  const invEmail = invDetails?.email || "";
  const invRole = invDetails?.role || "MEMBER";

  const redirectUrl = encodeURIComponent(`/accept-invitation?token=${token}`);
  const emailParam = invEmail ? `&email=${encodeURIComponent(invEmail)}` : "";

  return (
    <AuthLayout
      title="Team Invitation"
      subtitle="Join your multi-tenant workspace"
    >
      <div className="space-y-5 font-sans">
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg} Redirecting to workspace...</span>
          </div>
        )}

        {!token ? (
          <div className="text-center py-6 text-xs text-rose-400">
            No invitation token provided in URL.
          </div>
        ) : detailsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Loading invitation details...</span>
          </div>
        ) : detailsError ? (
          <div className="text-center py-6 text-xs text-rose-400">
            This invitation link is invalid, revoked, or has expired.
          </div>
        ) : (
          <>
            {/* Invitation Preview Card */}
            <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">You are invited to join</div>
                  <div className="text-sm font-bold text-white">{orgName}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Assigned Role:</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {invRole}
                </span>
              </div>

              {invEmail && (
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Recipient Email:</span>
                  </div>
                  <span className="font-mono text-slate-200 text-[11px]">{invEmail}</span>
                </div>
              )}
            </div>

            {/* Action State */}
            {!isAuthenticated ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-400 text-center">
                  Sign in or create an account to accept this invitation:
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/login?redirect=${redirectUrl}${emailParam}`}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs text-center transition-all shadow-lg shadow-blue-500/10"
                  >
                    Sign In to Accept
                  </Link>
                  <Link
                    to={`/register?redirect=${redirectUrl}${emailParam}`}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs text-center transition-all"
                  >
                    Create Account to Accept
                  </Link>
                </div>
              </div>
            ) : user?.email?.toLowerCase() !== invEmail.toLowerCase() ? (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs space-y-1">
                  <div>Warning: Logged in email mismatch</div>
                  <div className="text-[11px] text-slate-300">
                    This invitation was sent to <strong>{invEmail}</strong>, but you are logged in as <strong>{user?.email}</strong>.
                  </div>
                </div>
                <Link
                  to={`/login?redirect=${redirectUrl}${emailParam}`}
                  className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs text-center transition-all"
                >
                  Switch Account & Sign In as {invEmail}
                </Link>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting || !!successMsg}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining {orgName}...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Accept Invitation & Join {orgName}</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default AcceptInvitationPage;
