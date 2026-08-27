import { apiClient } from "./axios.js";
import {
  Organization,
  Membership,
  Invitation,
  OrganizationRole,
  MembershipStatus,
  ApiResponse,
} from "../types/index.js";

export interface CreateOrgParams {
  name: string;
  slug: string;
  logoUrl?: string;
  timezone?: string;
  dateFormat?: string;
}

export interface UpdateOrgParams {
  name?: string;
  logoUrl?: string | null;
  timezone?: string;
  dateFormat?: string;
  settings?: {
    timezone?: string;
    dateFormat?: string;
  };
}

export interface OrganizationListItem {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  settings?: {
    timezone?: string;
    dateFormat?: string;
  };
  role: OrganizationRole;
  organization?: Organization;
}

export const orgApi = {
  listOrganizations: async (): Promise<OrganizationListItem[]> => {
    const res = await apiClient.get<ApiResponse<OrganizationListItem[]>>(
      "/organizations"
    );
    return res.data.data;
  },

  createOrganization: async (params: CreateOrgParams): Promise<Organization> => {
    const res = await apiClient.post<ApiResponse<Organization>>(
      "/organizations",
      params
    );
    return res.data.data;
  },

  updateOrganization: async (
    orgId: string,
    params: UpdateOrgParams
  ): Promise<Organization> => {
    const res = await apiClient.patch<ApiResponse<Organization>>(
      `/organizations/${orgId}`,
      params
    );
    return res.data.data;
  },

  transferOwnership: async (
    orgId: string,
    targetUserId: string
  ): Promise<{ message: string }> => {
    const res = await apiClient.post<ApiResponse<{ message: string }>>(
      `/organizations/${orgId}/transfer-ownership`,
      { targetUserId }
    );
    return res.data.data;
  },

  listMembers: async (orgId: string): Promise<Membership[]> => {
    const res = await apiClient.get<ApiResponse<Membership[]>>(
      `/organizations/${orgId}/members`
    );
    return res.data.data;
  },

  updateMember: async (
    orgId: string,
    memberId: string,
    params: { role?: OrganizationRole; status?: MembershipStatus }
  ): Promise<Membership> => {
    const res = await apiClient.patch<ApiResponse<Membership>>(
      `/organizations/${orgId}/members/${memberId}`,
      params
    );
    return res.data.data;
  },

  removeMember: async (orgId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/members/${memberId}`);
  },

  inviteMember: async (
    orgId: string,
    params: { email: string; role: OrganizationRole }
  ): Promise<{ message: string; invitation: Invitation; token?: string }> => {
    const res = await apiClient.post<
      ApiResponse<{ message: string; invitation: Invitation; token?: string }>
    >(`/organizations/${orgId}/invitations`, params);
    return res.data.data;
  },

  listInvitations: async (orgId: string): Promise<Invitation[]> => {
    const res = await apiClient.get<ApiResponse<Invitation[]>>(
      `/organizations/${orgId}/invitations`
    );
    return res.data.data;
  },

  revokeInvitation: async (orgId: string, invitationId: string): Promise<void> => {
    await apiClient.delete(
      `/organizations/${orgId}/invitations/${invitationId}`
    );
  },

  acceptInvitation: async (
    token: string
  ): Promise<{ message: string; organizationId: string }> => {
    const res = await apiClient.post<
      ApiResponse<{ message: string; organizationId: string }>
    >(`/invitations/${token}/accept`);
    return res.data.data;
  },

  getInvitationDetails: async (
    token: string
  ): Promise<{
    id: string;
    email: string;
    role: OrganizationRole;
    status: string;
    expiresAt: string;
    organization?: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  }> => {
    const res = await apiClient.get<
      ApiResponse<{
        id: string;
        email: string;
        role: OrganizationRole;
        status: string;
        expiresAt: string;
        organization?: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
      }>
    >(`/invitations/${token}`);
    return res.data.data;
  },
};
