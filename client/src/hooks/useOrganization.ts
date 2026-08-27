import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore.js";
import { orgApi } from "../api/org.api.js";
import { Organization, OrganizationRole } from "../types/index.js";

const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  OWNER: [
    "ORGANIZATION_READ",
    "ORGANIZATION_UPDATE",
    "ORGANIZATION_DELETE",
    "MEMBER_READ",
    "MEMBER_INVITE",
    "MEMBER_UPDATE_ROLE",
    "MEMBER_REMOVE",
    "PROJECT_CREATE",
    "PROJECT_READ",
    "PROJECT_UPDATE",
    "PROJECT_DELETE",
    "TASK_CREATE",
    "TASK_READ",
    "TASK_UPDATE",
    "TASK_ASSIGN",
    "TASK_DELETE",
    "COMMENT_CREATE",
    "COMMENT_READ",
    "COMMENT_DELETE",
    "ATTACHMENT_UPLOAD",
    "ATTACHMENT_READ",
    "ATTACHMENT_DELETE",
    "ANALYTICS_READ",
    "ACTIVITY_READ",
  ],
  ADMIN: [
    "ORGANIZATION_READ",
    "ORGANIZATION_UPDATE",
    "MEMBER_READ",
    "MEMBER_INVITE",
    "MEMBER_UPDATE_ROLE",
    "MEMBER_REMOVE",
    "PROJECT_CREATE",
    "PROJECT_READ",
    "PROJECT_UPDATE",
    "PROJECT_DELETE",
    "TASK_CREATE",
    "TASK_READ",
    "TASK_UPDATE",
    "TASK_ASSIGN",
    "TASK_DELETE",
    "COMMENT_CREATE",
    "COMMENT_READ",
    "COMMENT_DELETE",
    "ATTACHMENT_UPLOAD",
    "ATTACHMENT_READ",
    "ATTACHMENT_DELETE",
    "ANALYTICS_READ",
    "ACTIVITY_READ",
  ],
  MANAGER: [
    "ORGANIZATION_READ",
    "MEMBER_READ",
    "PROJECT_CREATE",
    "PROJECT_READ",
    "PROJECT_UPDATE",
    "TASK_CREATE",
    "TASK_READ",
    "TASK_UPDATE",
    "TASK_ASSIGN",
    "TASK_DELETE",
    "COMMENT_CREATE",
    "COMMENT_READ",
    "COMMENT_DELETE",
    "ATTACHMENT_UPLOAD",
    "ATTACHMENT_READ",
    "ATTACHMENT_DELETE",
    "ANALYTICS_READ",
    "ACTIVITY_READ",
  ],
  MEMBER: [
    "ORGANIZATION_READ",
    "MEMBER_READ",
    "PROJECT_READ",
    "TASK_CREATE",
    "TASK_READ",
    "TASK_UPDATE",
    "COMMENT_CREATE",
    "COMMENT_READ",
    "ATTACHMENT_UPLOAD",
    "ATTACHMENT_READ",
    "ACTIVITY_READ",
  ],
};

export function useOrganization() {
  const { activeOrgId, setActiveOrgId, isAuthenticated } = useAuthStore();

  const { data: orgsData = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: orgApi.listOrganizations,
    enabled: isAuthenticated,
  });

  const getOrgId = (item: (typeof orgsData)[number]) =>
    item.id || item._id || item.organization?._id || item.organization?.id || "";

  const activeItem = orgsData.find(
    (item) => getOrgId(item) === activeOrgId
  );

  const activeOrg: Organization | null = activeItem
    ? {
        _id: getOrgId(activeItem),
        id: getOrgId(activeItem),
        name: activeItem.name || activeItem.organization?.name || "",
        slug: activeItem.slug || activeItem.organization?.slug || "",
        logoUrl: activeItem.logoUrl ?? activeItem.organization?.logoUrl,
      }
    : null;

  const activeRole: OrganizationRole | null = activeItem?.role || null;

  const hasPermission = (permission: string): boolean => {
    if (!activeRole) return false;
    const permissions = ROLE_PERMISSIONS[activeRole] || [];
    return permissions.includes(permission);
  };

  return {
    organizations: orgsData.map((d) => ({
      _id: getOrgId(d),
      id: getOrgId(d),
      name: d.name || d.organization?.name || "",
      slug: d.slug || d.organization?.slug || "",
      logoUrl: d.logoUrl ?? d.organization?.logoUrl,
    })),
    activeOrg,
    activeOrgId,
    activeRole,
    isLoading,
    setActiveOrgId,
    hasPermission,
  };
}
