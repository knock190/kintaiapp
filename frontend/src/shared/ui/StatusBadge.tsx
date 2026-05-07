import { Badge } from "@/shared/ui/badge";

export type AttendanceStatus = "off" | "working" | "away" | "done";

const statusLabels: Record<AttendanceStatus, string> = {
  off: "未出勤",
  working: "勤務中",
  away: "離業中",
  done: "退勤済み",
};

const statusClasses: Record<AttendanceStatus, string> = {
  off: "bg-muted text-muted-foreground",
  working: "bg-emerald-100 text-emerald-800",
  away: "bg-amber-100 text-amber-800",
  done: "bg-sky-100 text-sky-800",
};

type StatusBadgeProps = {
  status: AttendanceStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={statusClasses[status]} variant="secondary">
      {statusLabels[status]}
    </Badge>
  );
}
