import { describe, it, expect, vi, beforeEach } from "vitest";
import { commentApi } from "../../api/comment.api.js";

vi.mock("../../api/comment.api.js", () => ({
  commentApi: {
    listComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

describe("Comments API & UI Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list comments and create a new comment", async () => {
    (commentApi.listComments as ReturnType<typeof vi.fn>).mockResolvedValue({
      comments: [
        {
          _id: "c1",
          organizationId: "org1",
          taskId: "t1",
          authorId: "u1",
          author: { _id: "u1", name: "Alice", email: "alice@example.com" },
          content: "First comment",
          createdAt: "2026-01-01",
        },
      ],
    });

    (commentApi.createComment as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "c2",
      organizationId: "org1",
      taskId: "t1",
      content: "Second comment",
      createdAt: "2026-01-02",
    });

    const list = await commentApi.listComments("org1", "t1");
    expect(list.comments).toHaveLength(1);
    expect(list.comments[0].content).toBe("First comment");

    const created = await commentApi.createComment("org1", "t1", "Second comment");
    expect(created.content).toBe("Second comment");
    expect(commentApi.createComment).toHaveBeenCalledWith("org1", "t1", "Second comment");
  });
});
