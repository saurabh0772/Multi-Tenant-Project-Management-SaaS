import { Types } from "mongoose";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { Membership as Member } from "../models/membership.model.js";
import { Comment } from "../models/comment.model.js";
import { Attachment } from "../models/attachment.model.js";
import { ActivityLog } from "../models/activity.model.js";

export class AnalyticsRepository {
  /**
   * Get high-level organization overview metrics
   */
  async getOrganizationOverview(organizationId: Types.ObjectId) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();

    const [projectCounts, taskCounts, memberCounts, commentCount, attachmentCount] =
      await Promise.all([
        Project.aggregate([
          { $match: { organizationId: orgId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
              archived: { $sum: { $cond: [{ $eq: ["$status", "ARCHIVED"] }, 1, 0] } },
            },
          },
        ]),

        Task.aggregate([
          { $match: { organizationId: orgId, deletedAt: null } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $ne: ["$status", "DONE"] }, 1, 0] } },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "DONE"] },
                        { $ne: ["$dueDate", null] },
                        { $lt: ["$dueDate", now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),

        Member.aggregate([
          { $match: { organizationId: orgId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
              suspended: { $sum: { $cond: [{ $eq: ["$status", "SUSPENDED"] }, 1, 0] } },
            },
          },
        ]),

        Comment.countDocuments({ organizationId: orgId }),
        Attachment.countDocuments({ organizationId: orgId }),
      ]);

    const projects = projectCounts[0] || { total: 0, active: 0, completed: 0, archived: 0 };
    const tasks = taskCounts[0] || { total: 0, completed: 0, pending: 0, overdue: 0 };
    const members = memberCounts[0] || { total: 0, active: 0, suspended: 0 };

    return {
      projects: {
        total: projects.total,
        active: projects.active,
        completed: projects.completed,
        archived: projects.archived,
      },
      tasks: {
        total: tasks.total,
        completed: tasks.completed,
        pending: tasks.pending,
        overdue: tasks.overdue,
      },
      members: {
        total: members.total,
        active: members.active,
        suspended: members.suspended,
      },
      comments: commentCount,
      attachments: attachmentCount,
    };
  }

  /**
   * Task status & priority distribution analytics
   */
  async getTaskAnalytics(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    projectId?: Types.ObjectId
  ) {
    const orgId = new Types.ObjectId(organizationId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = {
      organizationId: orgId,
      deletedAt: null,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (projectId) {
      matchStage.projectId = new Types.ObjectId(projectId);
    }

    const results = await Task.aggregate([
      { $match: matchStage },
      {
        $facet: {
          statusDistribution: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } },
          ],
          priorityDistribution: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
            { $project: { priority: "$_id", count: 1, _id: 0 } },
          ],
        },
      },
    ]);

    const statusMap: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    const priorityMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };

    if (results[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results[0].statusDistribution.forEach((item: any) => {
        if (item.status) statusMap[item.status] = item.count;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results[0].priorityDistribution.forEach((item: any) => {
        if (item.priority) priorityMap[item.priority] = item.count;
      });
    }

    return {
      statusDistribution: Object.keys(statusMap).map((st) => ({
        status: st,
        count: statusMap[st],
      })),
      priorityDistribution: Object.keys(priorityMap).map((pr) => ({
        priority: pr,
        count: priorityMap[pr],
      })),
    };
  }

  /**
   * Task completion vs creation trend analytics
   */
  async getTaskTrends(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    interval: "day" | "week" | "month" = "day",
    projectId?: Types.ObjectId
  ) {
    const orgId = new Types.ObjectId(organizationId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = {
      organizationId: orgId,
      deletedAt: null,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (projectId) {
      matchStage.projectId = new Types.ObjectId(projectId);
    }

    const dateFormat = interval === "month" ? "%Y-%m" : interval === "week" ? "%G-W%V" : "%Y-%m-%d";

    const trendResults = await Task.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          created: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", created: 1, completed: 1, _id: 0 } },
    ]);

    return {
      interval,
      data: trendResults,
    };
  }

  /**
   * Overdue task analytics
   */
  async getOverdueTaskAnalytics(organizationId: Types.ObjectId, projectId?: Types.ObjectId) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = {
      organizationId: orgId,
      deletedAt: null,
      status: { $ne: "DONE" },
      dueDate: { $ne: null, $lt: now },
    };

    if (projectId) {
      matchStage.projectId = new Types.ObjectId(projectId);
    }

    const results = await Task.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          byProject: [
            { $group: { _id: "$projectId", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "projects",
                localField: "_id",
                foreignField: "_id",
                as: "project",
              },
            },
            { $unwind: "$project" },
            {
              $project: {
                projectId: "$_id",
                projectName: "$project.name",
                count: 1,
                _id: 0,
              },
            },
          ],
          byAssignee: [
            { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $project: {
                userId: "$_id",
                name: { $arrayElemAt: ["$user.name", 0] },
                count: 1,
                _id: 0,
              },
            },
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
            { $project: { priority: "$_id", count: 1, _id: 0 } },
          ],
        },
      },
    ]);

    const data = results[0] || { totalCount: [], byProject: [], byAssignee: [], byPriority: [] };
    const total = data.totalCount[0]?.count || 0;

    return {
      total,
      byProject: data.byProject,
      byAssignee: data.byAssignee,
      byPriority: data.byPriority,
    };
  }

  /**
   * Member workload analytics
   */
  async getMemberWorkload(organizationId: Types.ObjectId) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();

    const members = await Member.aggregate([
      { $match: { organizationId: orgId, status: "ACTIVE" } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "tasks",
          let: { memberUserId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$organizationId", orgId] },
                    { $eq: ["$assignedTo", "$$memberUserId"] },
                    { $eq: ["$deletedAt", null] },
                  ],
                },
              },
            },
          ],
          as: "assignedTasksList",
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          avatarUrl: "$user.avatarUrl",
          role: "$role",
          assignedTasks: { $size: "$assignedTasksList" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$assignedTasksList",
                as: "t",
                cond: { $eq: ["$$t.status", "DONE"] },
              },
            },
          },
          pendingTasks: {
            $size: {
              $filter: {
                input: "$assignedTasksList",
                as: "t",
                cond: { $ne: ["$$t.status", "DONE"] },
              },
            },
          },
          overdueTasks: {
            $size: {
              $filter: {
                input: "$assignedTasksList",
                as: "t",
                cond: {
                  $and: [
                    { $ne: ["$$t.status", "DONE"] },
                    { $ne: ["$$t.dueDate", null] },
                    { $lt: ["$$t.dueDate", now] },
                  ],
                },
              },
            },
          },
        },
      },
      { $sort: { assignedTasks: -1 } },
    ]);

    return { members };
  }

  /**
   * Project health analytics
   */
  async getProjectHealth(organizationId: Types.ObjectId) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();

    const projects = await Project.aggregate([
      { $match: { organizationId: orgId } },
      {
        $lookup: {
          from: "tasks",
          let: { pId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$organizationId", orgId] },
                    { $eq: ["$projectId", "$$pId"] },
                    { $eq: ["$deletedAt", null] },
                  ],
                },
              },
            },
          ],
          as: "projectTasks",
        },
      },
      {
        $project: {
          _id: 0,
          projectId: "$_id",
          name: "$name",
          status: "$status",
          totalTasks: { $size: "$projectTasks" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$projectTasks",
                as: "t",
                cond: { $eq: ["$$t.status", "DONE"] },
              },
            },
          },
          pendingTasks: {
            $size: {
              $filter: {
                input: "$projectTasks",
                as: "t",
                cond: { $ne: ["$$t.status", "DONE"] },
              },
            },
          },
          overdueTasks: {
            $size: {
              $filter: {
                input: "$projectTasks",
                as: "t",
                cond: {
                  $and: [
                    { $ne: ["$$t.status", "DONE"] },
                    { $ne: ["$$t.dueDate", null] },
                    { $lt: ["$$t.dueDate", now] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          projectId: 1,
          name: 1,
          status: 1,
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          overdueTasks: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalTasks", 0] },
              {
                $multiply: [
                  { $divide: ["$completedTasks", "$totalTasks"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalTasks: -1 } },
    ]);

    return { projects };
  }

  /**
   * Activity log analytics
   */
  async getActivityAnalytics(
    organizationId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    filters?: { action?: string; actorId?: Types.ObjectId; entityType?: string }
  ) {
    const orgId = new Types.ObjectId(organizationId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = {
      organizationId: orgId,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (filters?.action) matchStage.action = filters.action;
    if (filters?.actorId) matchStage.actorId = new Types.ObjectId(filters.actorId);
    if (filters?.entityType) matchStage.entityType = filters.entityType;

    const results = await ActivityLog.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          byAction: [
            { $group: { _id: "$action", count: { $sum: 1 } } },
            { $project: { action: "$_id", count: 1, _id: 0 } },
          ],
          byEntityType: [
            { $group: { _id: "$entityType", count: { $sum: 1 } } },
            { $project: { entityType: "$_id", count: 1, _id: 0 } },
          ],
          trend: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", count: 1, _id: 0 } },
          ],
          topActors: [
            { $group: { _id: "$actorId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $project: {
                userId: "$_id",
                name: { $arrayElemAt: ["$user.name", 0] },
                email: { $arrayElemAt: ["$user.email", 0] },
                count: 1,
                _id: 0,
              },
            },
          ],
        },
      },
    ]);

    const data = results[0] || {
      totalCount: [],
      byAction: [],
      byEntityType: [],
      trend: [],
      topActors: [],
    };

    return {
      totalActivities: data.totalCount[0]?.count || 0,
      byAction: data.byAction,
      byEntityType: data.byEntityType,
      trend: data.trend,
      topActors: data.topActors,
    };
  }

  /**
   * Single-roundtrip main dashboard analytics
   */
  async getDashboardAnalytics(organizationId: Types.ObjectId, startDate: Date, endDate: Date) {
    const orgId = new Types.ObjectId(organizationId);

    const [summary, taskAnalytics, taskTrends, projectHealth, overdueTasks, memberWorkload] =
      await Promise.all([
        this.getOrganizationOverview(orgId),
        this.getTaskAnalytics(orgId, startDate, endDate),
        this.getTaskTrends(orgId, startDate, endDate, "day"),
        this.getProjectHealth(orgId),
        this.getOverdueTaskAnalytics(orgId),
        this.getMemberWorkload(orgId),
      ]);

    return {
      summary,
      taskStatus: taskAnalytics.statusDistribution,
      taskPriority: taskAnalytics.priorityDistribution,
      completionTrend: taskTrends.data,
      projectHealth: projectHealth.projects,
      overdueTasks,
      memberWorkload: memberWorkload.members,
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
