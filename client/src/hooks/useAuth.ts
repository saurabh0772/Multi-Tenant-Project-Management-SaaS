import { useCallback, useEffect } from "react";
import { useAuthStore } from "../store/authStore.js";
import { authApi, LoginParams, RegisterParams } from "../api/auth.api.js";
import { orgApi } from "../api/org.api.js";

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    setIsLoading,
    logout: storeLogout,
    activeOrgId,
    setActiveOrgId,
    setUserMemberships,
  } = useAuthStore();

  const fetchUserAndOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await authApi.getMe();
      setUser(me);

      const orgsData = await orgApi.listOrganizations();
      const getOrgId = (item: (typeof orgsData)[number]) =>
        item.id || item._id || item.organization?._id || item.organization?.id || "";

      const memberships = orgsData.map((item) => ({
        organizationId: getOrgId(item),
        role: item.role,
      }));
      setUserMemberships(memberships);

      if (orgsData.length > 0) {
        const hasActive = orgsData.some((o) => getOrgId(o) === activeOrgId);
        if (!hasActive) {
          setActiveOrgId(getOrgId(orgsData[0]));
        }
      } else {
        setActiveOrgId(null);
      }
    } catch {
      storeLogout();
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setIsLoading, storeLogout, activeOrgId, setActiveOrgId, setUserMemberships]);

  const login = async (params: LoginParams) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(params);
      setUser(data.user);

      const orgsData = await orgApi.listOrganizations();
      const getOrgId = (item: (typeof orgsData)[number]) =>
        item.id || item._id || item.organization?._id || item.organization?.id || "";

      const memberships = orgsData.map((item) => ({
        organizationId: getOrgId(item),
        role: item.role,
      }));
      setUserMemberships(memberships);

      if (orgsData.length > 0) {
        setActiveOrgId(getOrgId(orgsData[0]));
      }
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: RegisterParams) => {
    setIsLoading(true);
    try {
      const data = await authApi.register(params);
      setUser(data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      storeLogout();
    }
  };

  // Session expired event listener
  useEffect(() => {
    const handleSessionExpired = () => {
      storeLogout();
    };
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, [storeLogout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth: fetchUserAndOrgs,
  };
}
