import { ClockPanel } from "@/features/attendance/components/client/ClockPanel";
import { getMyAttendanceQuery } from "@/features/attendance/services/attendance.service";
import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";
import { getJstDateString } from "@/shared/lib/datetime";

export default async function MemberDashboardPage() {
  const session = await getAuthenticatedSessionServer();
  const date = getJstDateString();
  const initialAttendance = await getMyAttendanceQuery(session.user.id, date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">自分の勤怠</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          今日の出勤、離業、復帰、退勤を管理します。
        </p>
      </div>
      <ClockPanel date={date} initialAttendance={initialAttendance} />
    </div>
  );
}
