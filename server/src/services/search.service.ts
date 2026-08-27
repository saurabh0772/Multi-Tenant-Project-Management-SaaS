import crypto from "crypto";
import { searchRepository } from "../repositories/search.repository.js";
import { SearchQueryParams } from "../validators/search.schema.js";
import { getRedisClient } from "../config/redis.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface ProjectSearchDTO {
  id: string;
  type: "project";
  name: string;
  slug: string;
  status: string;
  description?: string;
  score?: number;
}

export interface TaskSearchDTO {
  id: string;
  type: "task";
  title: string;
  status: string;
  priority: string;
  projectId: string;
  description?: string;
  score?: number;
}

export interface CommentSearchDTO {
  id: string;
  type: "comment";
  content: string;
  taskId: string;
  score?: number;
}

export interface MemberSearchDTO {
  id: string;
  type: "member";
  name: string;
  email: string;
  avatarUrl: string | null;
  score?: number;
}

export interface SearchResponseDTO {
  projects: ProjectSearchDTO[];
  tasks: TaskSearchDTO[];
  comments: CommentSearchDTO[];
  members: MemberSearchDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export class SearchService {
  /**
   * Compute deterministic relevance score for a record given search query
   */
  private calculateScore(textToCompare: string, query: string, isMainField: boolean): number {
    if (!query || !textToCompare) return 25;

    const main = textToCompare.toLowerCase().trim();
    const q = query.toLowerCase().trim();

    if (main === q) return 100;
    if (main.startsWith(q)) return 75;
    if (isMainField && main.includes(q)) return 50;
    if (main.includes(q)) return 25;
    return 10;
  }

  /**
   * Helper to invalidate organization-scoped search cache keys safely
   */
  async invalidateSearchCache(organizationId: string): Promise<void> {
    if (!organizationId) return;

    try {
      const redis = getRedisClient();
      if (!redis || redis.status !== "ready") return;

      const pattern = `saas:cache:search:${organizationId}:*`;
      const stream = redis.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on("data", async (keys: string[]) => {
        if (keys && keys.length > 0) {
          const pipeline = redis.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec().catch(() => {});
        }
      });
    } catch (err) {
      logger.warn({ err, organizationId }, "Error invalidating search cache");
    }
  }

  /**
   * Perform tenant-isolated search with Redis caching
   */
  async search(
    organizationId: string,
    params: SearchQueryParams
  ): Promise<SearchResponseDTO> {
    const { q, type, page, limit } = params;
    const cacheKeyHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ organizationId, ...params }))
      .digest("hex");
    const cacheKey = `saas:cache:search:${organizationId}:${cacheKeyHash}`;

    // Attempt Redis cache lookup
    try {
      const redis = getRedisClient();
      if (redis && redis.status === "ready") {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData) as SearchResponseDTO;
        }
      }
    } catch (err) {
      logger.warn({ err, organizationId }, "Redis search cache GET failed, falling back to database");
    }

    const fetchProjects = type === "all" || type === "projects";
    const fetchTasks = type === "all" || type === "tasks";
    const fetchComments = type === "all" || type === "comments";
    const fetchMembers = type === "all" || type === "members";

    const [rawProjects, rawTasks, rawComments, rawMembers] = await Promise.all([
      fetchProjects ? searchRepository.searchProjects(organizationId, params) : [],
      fetchTasks ? searchRepository.searchTasks(organizationId, params) : [],
      fetchComments ? searchRepository.searchComments(organizationId, params) : [],
      fetchMembers ? searchRepository.searchMembers(organizationId, params) : [],
    ]);

    // Transform raw MongoDB results to safe DTOs and calculate relevance scores
    const projects: ProjectSearchDTO[] = rawProjects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: String(p._id),
        type: "project" as const,
        name: p.name,
        slug: p.slug,
        status: p.status,
        description: p.description,
        score: this.calculateScore(p.name, q, true),
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const tasks: TaskSearchDTO[] = rawTasks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => ({
        id: String(t._id),
        type: "task" as const,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectId: String(t.projectId),
        description: t.description,
        score: this.calculateScore(t.title, q, true),
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const comments: CommentSearchDTO[] = rawComments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({
        id: String(c._id),
        type: "comment" as const,
        content: c.content,
        taskId: String(c.taskId),
        score: this.calculateScore(c.content, q, false),
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const members: MemberSearchDTO[] = rawMembers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        id: String(m._id),
        type: "member" as const,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl || null,
        score: Math.max(
          this.calculateScore(m.name, q, true),
          this.calculateScore(m.email, q, true)
        ),
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const total =
      projects.length + tasks.length + comments.length + members.length;

    const responsePayload: SearchResponseDTO = {
      projects: projects.slice(0, limit),
      tasks: tasks.slice(0, limit),
      comments: comments.slice(0, limit),
      members: members.slice(0, limit),
      pagination: {
        page,
        limit,
        total,
      },
    };

    // Store response payload in Redis search cache asynchronously
    try {
      const redis = getRedisClient();
      if (redis && redis.status === "ready") {
        await redis.set(
          cacheKey,
          JSON.stringify(responsePayload),
          "EX",
          env.SEARCH_CACHE_TTL
        );
      }
    } catch (err) {
      logger.warn({ err, organizationId }, "Redis search cache SET failed");
    }

    return responsePayload;
  }
}

export const searchService = new SearchService();
