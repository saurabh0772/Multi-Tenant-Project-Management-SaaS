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
      const memberships = orgsData.map((item) => ({
        organizationId: item.organization._id,
        role: item.role,
      }));
      setUserMemberships(memberships);

      if (orgsData.length > 0) {
        // If current activeOrgId is valid, keep it; otherwise set to first org
        const hasActive = orgsData.some(
          (o) => o.organization._id === activeOrgId
        );
        if (!hasActive) {
          setActiveOrgId(orgsData[0].organization._id);
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
      const memberships = orgsData.map((item) => ({
        organizationId: item.organization._id,
        role: item.role,
      }));
      setUserMemberships(memberships);

      if (orgsData.length > 0) {
        setActiveOrgId(orgsData[0].organization._id);
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
