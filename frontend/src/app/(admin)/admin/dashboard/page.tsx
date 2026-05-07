import { StatusBadge } from "@/shared/ui/StatusBadge";
import { WorkStylePill } from "@/shared/ui/WorkStylePill";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">管理者ダッシュボード</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Task 4 で全員の勤怠一覧を実装します。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="working" />
        <WorkStylePill style="remote" />
      </div>
    </div>
  );
}
