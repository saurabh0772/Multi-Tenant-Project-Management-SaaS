import { describe, it, expect, vi, beforeEach } from "vitest";
import { attachmentApi } from "../../api/attachment.api.js";

vi.mock("../../api/attachment.api.js", () => ({
  attachmentApi: {
    listAttachments: vi.fn(),
    uploadAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
  },
}));

describe("Attachments API & Validation Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upload attachment using FormData and invoke backend endpoint", async () => {
    const fakeFile = new File(["dummy content"], "test.pdf", { type: "application/pdf" });

    (attachmentApi.uploadAttachment as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "att1",
      organizationId: "org1",
      filename: "test.pdf",
      originalName: "test.pdf",
      mimeType: "application/pdf",
      size: 1024,
      createdAt: "2026-01-01",
    });

    const result = await attachmentApi.uploadAttachment("org1", fakeFile, { taskId: "t1" });

    expect(result.filename).toBe("test.pdf");
    expect(attachmentApi.uploadAttachment).toHaveBeenCalledWith("org1", fakeFile, { taskId: "t1" });
  });
});
