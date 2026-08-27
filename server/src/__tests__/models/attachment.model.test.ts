import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose, { Types } from "mongoose";
import { env } from "../../config/env.js";
import { Attachment } from "../../models/attachment.model.js";

describe("Attachment Model Parent Relationship Validation", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Attachment.deleteMany({});
  });

  it("should fail validation if both taskId and commentId are null", async () => {
    const orphanAttachment = new Attachment({
      organizationId: new Types.ObjectId(),
      uploadedBy: new Types.ObjectId(),
      fileName: "orphan.pdf",
      fileUrl: "https://example.com/orphan.pdf",
      storageKey: "key/orphan.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      taskId: null,
      commentId: null,
    });

    await expect(orphanAttachment.save()).rejects.toThrow(
      "Attachment must belong to either a Task or a Comment"
    );
  });

  it("should succeed when attached to a task", async () => {
    const validAttachment = await Attachment.create({
      organizationId: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      uploadedBy: new Types.ObjectId(),
      fileName: "task-doc.pdf",
      fileUrl: "https://example.com/task-doc.pdf",
      storageKey: "key/task-doc.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
    });

    expect(validAttachment._id).toBeDefined();
    expect(validAttachment.taskId).toBeDefined();
  });
});
