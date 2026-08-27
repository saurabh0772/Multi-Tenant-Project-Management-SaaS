import { create } from "zustand";
import { User, OrganizationRole } from "../types/index.js";

interface UserOrgMembership {
  organizationId: string;
  role: OrganizationRole;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeOrgId: string | null;
  userMemberships: UserOrgMembership[];
  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setActiveOrgId: (orgId: string | null) => void;
  setUserMemberships: (memberships: UserOrgMembership[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeOrgId: localStorage.getItem("saas_active_org_id"),
  userMemberships: [],
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveOrgId: (orgId) => {
    if (orgId) {
      localStorage.setItem("saas_active_org_id", orgId);
    } else {
      localStorage.removeItem("saas_active_org_id");
    }
    set({ activeOrgId: orgId });
  },
  setUserMemberships: (userMemberships) => set({ userMemberships }),
  logout: () => {
    localStorage.removeItem("saas_active_org_id");
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeOrgId: null,
      userMemberships: [],
    });
  },
}));
