import { StatusBadge } from "@/shared/ui/StatusBadge";
import { WorkStylePill } from "@/shared/ui/WorkStylePill";

export default function MemberDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">自分の勤怠</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Task 3 で打刻パネルを実装します。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="off" />
        <WorkStylePill style="office" />
      </div>
    </div>
  );
}
