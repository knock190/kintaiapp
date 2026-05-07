import { randomUUID } from "node:crypto";

import type {
  AttendanceDTO,
  AttendanceStatus,
  AwayPeriodDTO,
  ClockInDTO,
  ClockInStyle,
  ClockOutDTO,
  ClockOutStyle,
} from "@/external/dto/attendance.dto";

type AttendanceProps = AttendanceDTO;

type ClosedAwayPeriodInput = {
  id?: string;
  startedAt: string;
  endedAt: string;
};

export class AttendanceDomainError extends Error {
  constructor(
    message: string,
    public readonly code: "CONFLICT" | "STATE_TRANSITION_INVALID",
  ) {
    super(message);
  }
}

export class Attendance {
  private props: AttendanceProps;

  constructor(props: AttendanceProps) {
    this.props = structuredClone(props);
    this.validateConsistency();
  }

  static createOff(params: { id: string; userId: string; date: string }) {
    const now = new Date().toISOString();

    return new Attendance({
      id: params.id,
      userId: params.userId,
      date: params.date,
      status: "off",
      clockIn: null,
      clockOut: null,
      awayPeriods: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  toDTO(): AttendanceDTO {
    return structuredClone(this.props);
  }

  clockIn(at: Date, style: ClockInStyle) {
    if (this.props.status !== "off") {
      throw new AttendanceDomainError(
        "出勤打刻は未出勤のときのみ実行できます。",
        "STATE_TRANSITION_INVALID",
      );
    }

    this.props.clockIn = { at: at.toISOString(), style };
    this.props.status = "working";
    this.touch();
    this.validateConsistency();
  }

  clockOut(at: Date, style: ClockOutStyle) {
    if (this.props.status !== "working" && this.props.status !== "away") {
      throw new AttendanceDomainError(
        "退勤打刻は勤務中または離業中のときのみ実行できます。",
        "STATE_TRANSITION_INVALID",
      );
    }

    const endedAt = at.toISOString();
    const activeAway = this.getActiveAwayPeriod();
    if (activeAway) {
      activeAway.endedAt = endedAt;
    }

    this.props.clockOut = { at: endedAt, style };
    this.props.status = "done";
    this.touch();
    this.validateConsistency();
  }

  markAway(at: Date) {
    if (this.props.status !== "working") {
      throw new AttendanceDomainError(
        "離業は勤務中のときのみ実行できます。",
        "STATE_TRANSITION_INVALID",
      );
    }

    this.props.awayPeriods.push({
      id: randomUUID(),
      startedAt: at.toISOString(),
      endedAt: null,
    });
    this.props.status = "away";
    this.touch();
    this.validateConsistency();
  }

  markBack(at: Date) {
    if (this.props.status !== "away") {
      throw new AttendanceDomainError(
        "業務復帰は離業中のときのみ実行できます。",
        "STATE_TRANSITION_INVALID",
      );
    }

    const activeAway = this.getActiveAwayPeriod();
    if (!activeAway) {
      throw new AttendanceDomainError(
        "アクティブな離業期間が見つかりません。",
        "CONFLICT",
      );
    }

    activeAway.endedAt = at.toISOString();
    this.props.status = "working";
    this.touch();
    this.validateConsistency();
  }

  update(params: {
    clockIn?: ClockInDTO | null;
    clockOut?: ClockOutDTO | null;
    awayPeriods?: ClosedAwayPeriodInput[];
  }) {
    const activeAway = this.getActiveAwayPeriod();

    if (params.clockIn !== undefined) {
      this.props.clockIn = params.clockIn;
    }

    if (!this.props.clockIn) {
      this.props.clockOut = null;
      this.props.awayPeriods = [];
      this.props.status = "off";
      this.touch();
      this.validateConsistency();
      return;
    }

    if (params.clockOut !== undefined) {
      this.props.clockOut = params.clockOut;
    }

    if (params.awayPeriods !== undefined) {
      this.props.awayPeriods = params.awayPeriods.map((period) => ({
        id: period.id ?? randomUUID(),
        startedAt: period.startedAt,
        endedAt: period.endedAt,
      }));
      if (activeAway && !this.props.clockOut) {
        this.props.awayPeriods.push(activeAway);
      }
    }

    if (this.props.clockOut) {
      for (const period of this.props.awayPeriods) {
        if (!period.endedAt) {
          period.endedAt = this.props.clockOut.at;
        }
      }
      this.props.status = "done";
    } else if (this.getActiveAwayPeriod()) {
      this.props.status = "away";
    } else {
      this.props.status = "working";
    }

    this.touch();
    this.validateConsistency();
  }

  private getActiveAwayPeriod() {
    return this.props.awayPeriods.find((period) => period.endedAt === null);
  }

  private touch() {
    this.props.updatedAt = new Date().toISOString();
  }

  private validateConsistency() {
    this.validateStatus();
    this.validateClockOrder();
    this.validateAwayPeriods();
  }

  private validateStatus() {
    const activeAwayCount = this.props.awayPeriods.filter(
      (period) => period.endedAt === null,
    ).length;

    const statusChecks: Record<AttendanceStatus, boolean> = {
      off:
        this.props.clockIn === null &&
        this.props.clockOut === null &&
        this.props.awayPeriods.length === 0,
      working:
        this.props.clockIn !== null &&
        this.props.clockOut === null &&
        activeAwayCount === 0,
      away:
        this.props.clockIn !== null &&
        this.props.clockOut === null &&
        activeAwayCount === 1,
      done:
        this.props.clockIn !== null &&
        this.props.clockOut !== null &&
        activeAwayCount === 0,
    };

    if (!statusChecks[this.props.status]) {
      throw new AttendanceDomainError(
        "勤怠ステータスと打刻情報の整合性が取れていません。",
        "CONFLICT",
      );
    }
  }

  private validateClockOrder() {
    if (!this.props.clockIn || !this.props.clockOut) {
      return;
    }

    if (new Date(this.props.clockIn.at) > new Date(this.props.clockOut.at)) {
      throw new AttendanceDomainError(
        "出勤時刻は退勤時刻以前にしてください。",
        "CONFLICT",
      );
    }
  }

  private validateAwayPeriods() {
    if (!this.props.clockIn && this.props.awayPeriods.length > 0) {
      throw new AttendanceDomainError(
        "出勤前の離業期間は登録できません。",
        "CONFLICT",
      );
    }

    const sortedPeriods = [...this.props.awayPeriods].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    const clockInAt = this.props.clockIn
      ? new Date(this.props.clockIn.at)
      : null;
    const clockOutAt = this.props.clockOut
      ? new Date(this.props.clockOut.at)
      : null;

    for (let index = 0; index < sortedPeriods.length; index += 1) {
      const period = sortedPeriods[index];
      this.validateAwayPeriod(period, clockInAt, clockOutAt);

      const nextPeriod = sortedPeriods[index + 1];
      if (!period.endedAt || !nextPeriod) {
        continue;
      }

      if (new Date(period.endedAt) > new Date(nextPeriod.startedAt)) {
        throw new AttendanceDomainError(
          "離業期間が重複しています。",
          "CONFLICT",
        );
      }
    }
  }

  private validateAwayPeriod(
    period: AwayPeriodDTO,
    clockInAt: Date | null,
    clockOutAt: Date | null,
  ) {
    const startedAt = new Date(period.startedAt);
    const endedAt = period.endedAt ? new Date(period.endedAt) : null;

    if (endedAt && startedAt > endedAt) {
      throw new AttendanceDomainError(
        "離業開始時刻は終了時刻以前にしてください。",
        "CONFLICT",
      );
    }

    if (clockInAt && startedAt < clockInAt) {
      throw new AttendanceDomainError(
        "離業開始時刻は出勤時刻以降にしてください。",
        "CONFLICT",
      );
    }

    if (clockOutAt && startedAt > clockOutAt) {
      throw new AttendanceDomainError(
        "離業開始時刻は退勤時刻以前にしてください。",
        "CONFLICT",
      );
    }

    if (clockOutAt && endedAt && endedAt > clockOutAt) {
      throw new AttendanceDomainError(
        "離業終了時刻は退勤時刻以前にしてください。",
        "CONFLICT",
      );
    }
  }
}
