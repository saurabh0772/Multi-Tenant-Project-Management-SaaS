export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  status?: "ACTIVE" | "SUSPENDED";
  createdAt?: string;
}

export type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";
export type MembershipStatus = "ACTIVE" | "SUSPENDED";

export interface Organization {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  ownerId?: string;
  logoUrl?: string | null;
  timezone?: string;
  dateFormat?: string;
  createdAt?: string;
}

export interface Membership {
  _id: string;
  id?: string;
  userId: string | User;
  user?: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  organizationId?: string;
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: string;
}

export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";

export interface Project {
  _id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  _id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assigneeId?: string | User | null;
  dueDate?: string | null;
  labels?: string[];
  createdBy: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  organizationId: string;
  taskId: string;
  authorId: string;
  author?: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  _id: string;
  organizationId: string;
  taskId?: string | null;
  commentId?: string | null;
  uploaderId: string;
  uploader?: {
    _id: string;
    name: string;
  };
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Notification {
  _id: string;
  organizationId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export interface Activity {
  _id: string;
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
  actorId: string;
  actor?: {
    _id: string;
    name: string;
    email?: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Invitation {
  _id: string;
  id?: string;
  organizationId?: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
  token?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
