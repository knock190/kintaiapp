export type AttendanceStatus = "off" | "working" | "away" | "done";
export type ClockInStyle = "office" | "remote" | "direct_visit";
export type ClockOutStyle = "normal" | "direct_return";

export type ClockInDTO = {
  at: string;
  style: ClockInStyle;
};

export type ClockOutDTO = {
  at: string;
  style: ClockOutStyle;
};

export type AwayPeriodDTO = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

export type AttendanceDTO = {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  clockIn: ClockInDTO | null;
  clockOut: ClockOutDTO | null;
  awayPeriods: AwayPeriodDTO[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateAttendanceInput = {
  date: string;
  clockIn?: ClockInDTO | null;
  clockOut?: ClockOutDTO | null;
  awayPeriods?: Array<{
    id?: string;
    startedAt: string;
    endedAt: string;
  }>;
};

export type UserSummaryDTO = {
  id: string;
  employeeId: string;
  name: string;
  role: "member" | "admin";
};

export type AttendanceListItemDTO = {
  user: UserSummaryDTO;
  attendance: AttendanceDTO | null;
};
