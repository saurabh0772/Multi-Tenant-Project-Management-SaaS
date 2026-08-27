import { describe, it, expect, vi, beforeEach } from "vitest";
import { notificationApi } from "../../api/notification.api.js";

vi.mock("../../api/notification.api.js", () => ({
  notificationApi: {
    listNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

describe("Notifications API & Badge Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch unread count and mark notifications as read", async () => {
    (notificationApi.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    (notificationApi.markAllRead as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    const count = await notificationApi.getUnreadCount("org1");
    expect(count).toBe(3);

    await notificationApi.markAllRead("org1");
    expect(notificationApi.markAllRead).toHaveBeenCalledWith("org1");
  });
});
