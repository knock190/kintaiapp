import { describe, expect, it } from "vitest";

import {
  createUserInputSchema,
  reissuePasswordInputSchema,
} from "@/features/users/actions/user.schemas";

describe("user schemas", () => {
  it("normalizes employee id when creating a user", () => {
    const parsed = createUserInputSchema.parse({
      employeeId: " E001 ",
      name: "田中太郎",
      role: "member",
      initialPassword: "Password123",
    });

    expect(parsed.employeeId).toBe("e001");
  });

  it("rejects invalid employee id", () => {
    const result = createUserInputSchema.safeParse({
      employeeId: "E 001",
      name: "田中太郎",
      role: "member",
      initialPassword: "Password123",
    });

    expect(result.success).toBe(false);
  });

  it("requires at least eight characters for reissued passwords", () => {
    const result = reissuePasswordInputSchema.safeParse({
      userId: "user-1",
      newPassword: "short",
    });

    expect(result.success).toBe(false);
  });
});
