import { describe, expect, it } from "vitest";

import {
  Attendance,
  AttendanceDomainError,
} from "@/features/attendance/domain/Attendance";

const baseParams = {
  id: "11111111-1111-1111-1111-111111111111",
  userId: "user-1",
  date: "2026-05-07",
};

function buildOff() {
  return Attendance.createOff(baseParams);
}

describe("Attendance.reset", () => {
  it("出勤・退勤・離業がすべて入った状態から status=off に戻し、打刻情報をクリアする", () => {
    const attendance = buildOff();
    attendance.clockIn(new Date("2026-05-07T00:00:00Z"), "office");
    attendance.markAway(new Date("2026-05-07T03:00:00Z"));
    attendance.markBack(new Date("2026-05-07T04:00:00Z"));
    attendance.clockOut(new Date("2026-05-07T09:00:00Z"), "normal");

    attendance.reset();

    const dto = attendance.toDTO();
    expect(dto.status).toBe("off");
    expect(dto.clockIn).toBeNull();
    expect(dto.clockOut).toBeNull();
    expect(dto.awayPeriods).toEqual([]);
  });

  it("勤務中（離業中含む）からでも status=off に戻る", () => {
    const attendance = buildOff();
    attendance.clockIn(new Date("2026-05-07T00:00:00Z"), "remote");
    attendance.markAway(new Date("2026-05-07T03:00:00Z"));

    attendance.reset();

    const dto = attendance.toDTO();
    expect(dto.status).toBe("off");
    expect(dto.awayPeriods).toEqual([]);
  });

  it("もとから off の状態で reset しても整合性が保たれる", () => {
    const attendance = buildOff();
    expect(() => attendance.reset()).not.toThrow();
    expect(attendance.toDTO().status).toBe("off");
  });

  it("reset 後に updatedAt が進む", () => {
    const attendance = buildOff();
    const before = attendance.toDTO().updatedAt;
    // 同一 ms に巻き込まれないよう微小スリープ
    const start = Date.now();
    while (Date.now() === start) {
      // spin
    }
    attendance.reset();
    const after = attendance.toDTO().updatedAt;
    expect(new Date(after).getTime()).toBeGreaterThan(
      new Date(before).getTime(),
    );
  });
});

describe("Attendance 状態遷移（既存ロジックの回帰）", () => {
  it("off からの clockOut は STATE_TRANSITION_INVALID を投げる", () => {
    const attendance = buildOff();
    expect(() =>
      attendance.clockOut(new Date("2026-05-07T09:00:00Z"), "normal"),
    ).toThrowError(AttendanceDomainError);
  });

  it("clockIn 後は status=working", () => {
    const attendance = buildOff();
    attendance.clockIn(new Date("2026-05-07T00:00:00Z"), "office");
    expect(attendance.toDTO().status).toBe("working");
  });
});
