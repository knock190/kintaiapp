import { describe, expect, it } from "vitest";

import {
  listAttendancesInputSchema,
  resetUserAttendanceInputSchema,
  updateUserAttendanceInputSchema,
} from "@/features/attendance/actions/attendance.schemas";

describe("listAttendancesInputSchema", () => {
  it("正しい日付を受理する", () => {
    const result = listAttendancesInputSchema.safeParse({ date: "2026-05-07" });
    expect(result.success).toBe(true);
  });

  it("日付が空文字なら失敗", () => {
    const result = listAttendancesInputSchema.safeParse({ date: "" });
    expect(result.success).toBe(false);
  });

  it("不正フォーマットなら失敗", () => {
    const result = listAttendancesInputSchema.safeParse({ date: "2026/05/07" });
    expect(result.success).toBe(false);
  });

  it("date が無いと失敗", () => {
    const result = listAttendancesInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateUserAttendanceInputSchema", () => {
  const base = {
    userId: "user-1",
    date: "2026-05-07",
  };

  it("最小入力（userId + date のみ）で受理される", () => {
    const result = updateUserAttendanceInputSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("clockIn / clockOut / awayPeriods 揃いを受理する", () => {
    const result = updateUserAttendanceInputSchema.safeParse({
      ...base,
      clockIn: { at: "2026-05-07T00:00:00.000Z", style: "office" },
      clockOut: { at: "2026-05-07T09:00:00.000Z", style: "normal" },
      awayPeriods: [
        {
          startedAt: "2026-05-07T03:00:00.000Z",
          endedAt: "2026-05-07T04:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("clockIn を null にできる", () => {
    const result = updateUserAttendanceInputSchema.safeParse({
      ...base,
      clockIn: null,
    });
    expect(result.success).toBe(true);
  });

  it("不正な勤務形態を弾く", () => {
    const result = updateUserAttendanceInputSchema.safeParse({
      ...base,
      clockIn: { at: "2026-05-07T00:00:00.000Z", style: "unknown" },
    });
    expect(result.success).toBe(false);
  });

  it("userId が空なら失敗", () => {
    const result = updateUserAttendanceInputSchema.safeParse({
      userId: "",
      date: "2026-05-07",
    });
    expect(result.success).toBe(false);
  });

  it("ISO でない日時を弾く", () => {
    const result = updateUserAttendanceInputSchema.safeParse({
      ...base,
      clockIn: { at: "2026-05-07 00:00:00", style: "office" },
    });
    expect(result.success).toBe(false);
  });
});

describe("resetUserAttendanceInputSchema", () => {
  it("正しい入力を受理する", () => {
    const result = resetUserAttendanceInputSchema.safeParse({
      userId: "user-1",
      date: "2026-05-07",
    });
    expect(result.success).toBe(true);
  });

  it("date が無いと失敗", () => {
    const result = resetUserAttendanceInputSchema.safeParse({
      userId: "user-1",
    });
    expect(result.success).toBe(false);
  });

  it("userId が無いと失敗", () => {
    const result = resetUserAttendanceInputSchema.safeParse({
      date: "2026-05-07",
    });
    expect(result.success).toBe(false);
  });
});
