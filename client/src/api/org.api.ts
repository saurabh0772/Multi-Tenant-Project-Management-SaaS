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
  logoUrl?: string;
  timezone?: string;
  dateFormat?: string;
}

export const orgApi = {
  listOrganizations: async (): Promise<
    Array<{ organization: Organization; role: OrganizationRole }>
  > => {
    const res = await apiClient.get<
      ApiResponse<Array<{ organization: Organization; role: OrganizationRole }>>
    >("/api/v1/organizations");
    return res.data.data;
  },

  createOrganization: async (params: CreateOrgParams): Promise<Organization> => {
    const res = await apiClient.post<ApiResponse<Organization>>(
      "/api/v1/organizations",
      params
    );
    return res.data.data;
  },

  updateOrganization: async (
    orgId: string,
    params: UpdateOrgParams
  ): Promise<Organization> => {
    const res = await apiClient.patch<ApiResponse<Organization>>(
      `/api/v1/organizations/${orgId}`,
      params
    );
    return res.data.data;
  },

  transferOwnership: async (
    orgId: string,
    newOwnerId: string
  ): Promise<{ message: string }> => {
    const res = await apiClient.post<ApiResponse<{ message: string }>>(
      `/api/v1/organizations/${orgId}/transfer-ownership`,
      { newOwnerId }
    );
    return res.data.data;
  },

  listMembers: async (orgId: string): Promise<Membership[]> => {
    const res = await apiClient.get<ApiResponse<Membership[]>>(
      `/api/v1/organizations/${orgId}/members`
    );
    return res.data.data;
  },

  updateMember: async (
    orgId: string,
    memberId: string,
    params: { role?: OrganizationRole; status?: MembershipStatus }
  ): Promise<Membership> => {
    const res = await apiClient.patch<ApiResponse<Membership>>(
      `/api/v1/organizations/${orgId}/members/${memberId}`,
      params
    );
    return res.data.data;
  },

  removeMember: async (orgId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/organizations/${orgId}/members/${memberId}`);
  },

  inviteMember: async (
    orgId: string,
    params: { email: string; role: OrganizationRole }
  ): Promise<Invitation> => {
    const res = await apiClient.post<ApiResponse<Invitation>>(
      `/api/v1/organizations/${orgId}/invitations`,
      params
    );
    return res.data.data;
  },

  listInvitations: async (orgId: string): Promise<Invitation[]> => {
    const res = await apiClient.get<ApiResponse<Invitation[]>>(
      `/api/v1/organizations/${orgId}/invitations`
    );
    return res.data.data;
  },

  revokeInvitation: async (orgId: string, invitationId: string): Promise<void> => {
    await apiClient.delete(
      `/api/v1/organizations/${orgId}/invitations/${invitationId}`
    );
  },
};
