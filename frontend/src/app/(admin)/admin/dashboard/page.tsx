import { AdminAttendanceTable } from "@/features/attendance/components/client/AdminAttendanceTable";
import { ClockPanel } from "@/features/attendance/components/client/ClockPanel";
import {
  getMyAttendanceQuery,
  listAttendancesQuery,
} from "@/features/attendance/services/attendance.service";
import { requireAdmin } from "@/features/auth/servers/redirect.server";
import { getJstDateString } from "@/shared/lib/datetime";

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const date = getJstDateString();
  const [initialAttendance, initialItems] = await Promise.all([
    getMyAttendanceQuery(session.user.id, date),
    listAttendancesQuery(date),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">管理者ダッシュボード</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            自分の打刻と全メンバーの勤怠状況を管理します。
          </p>
        </div>
        <ClockPanel date={date} initialAttendance={initialAttendance} />
      </section>

      <AdminAttendanceTable
        initialDate={date}
        initialItems={initialItems}
        today={date}
      />
    </div>
  );
}
