import { ClockPanel } from "@/features/attendance/components/client/ClockPanel";
import { getMyAttendanceQuery } from "@/features/attendance/services/attendance.service";
import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";
import { getJstDateString } from "@/shared/lib/datetime";

export default async function AdminDashboardPage() {
  const session = await getAuthenticatedSessionServer();
  const date = getJstDateString();
  const initialAttendance = await getMyAttendanceQuery(session.user.id, date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">管理者ダッシュボード</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          自分の打刻を管理します。全員の勤怠一覧は Task 4 で追加します。
        </p>
      </div>
      <ClockPanel date={date} initialAttendance={initialAttendance} />
    </div>
  );
}
