import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { orgApi } from "../../api/org.api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { AuthLayout } from "../../components/layout/AuthLayout.js";
import { AlertCircle, CheckCircle2, Loader2, UserCheck } from "lucide-react";

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { user, isAuthenticated, checkAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!token) {
      setError("Invalid or missing invitation token.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await orgApi.acceptInvitation(token);
      setSuccessMsg(res.message || "Invitation accepted!");
      await checkAuth();
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiErr = err as any;
      setError(
        apiErr.response?.data?.error?.message ||
          "Failed to accept invitation. The invitation may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Organization Invitation"
      subtitle="Join your team workspace on Project SaaS"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg} Redirecting to dashboard...</span>
          </div>
        )}

        {!token ? (
          <div className="text-center py-4 text-xs text-rose-400">
            No invitation token provided in the URL.
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-4 space-y-4">
            <div className="text-xs text-slate-300">
              Please sign in or create an account to accept your invitation.
            </div>
            <div className="flex justify-center gap-3">
              <Link
                to={`/login?redirect=/accept-invitation?token=${token}`}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all"
              >
                Sign In
              </Link>
              <Link
                to={`/register?redirect=/accept-invitation?token=${token}`}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-xs space-y-1">
              <div className="text-slate-400">Signed in as:</div>
              <div className="font-semibold text-white">{user?.email}</div>
            </div>

            <button
              onClick={handleAccept}
              disabled={loading || !!successMsg}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Accepting Invitation...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Accept Invitation & Join</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default AcceptInvitationPage;
