"use client";

import type {
  AttendanceListItemDTO,
  UserSummaryDTO,
} from "@/external/dto/attendance.dto";
import { formatJstTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { WorkStylePill } from "@/shared/ui/WorkStylePill";

type AdminAttendanceRowProps = {
  item: AttendanceListItemDTO;
  onEdit: (item: AttendanceListItemDTO) => void;
  onReset: (user: UserSummaryDTO) => void;
};

export function AdminAttendanceRow({
  item,
  onEdit,
  onReset,
}: AdminAttendanceRowProps) {
  const status = item.attendance?.status ?? "off";

  return (
    <tr className="border-t">
      <td className="px-4 py-3 font-mono text-xs">{item.user.employeeId}</td>
      <td className="px-4 py-3">{item.user.name}</td>
      <td className="px-4 py-3">
        {item.attendance?.clockIn ? (
          <WorkStylePill style={item.attendance.clockIn.style} />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono">
        {formatJstTime(item.attendance?.clockIn?.at)}
      </td>
      <td className="px-4 py-3 font-mono">
        {formatJstTime(item.attendance?.clockOut?.at)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onEdit(item)}
          >
            修正
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onReset(item.user)}
          >
            リセット
          </Button>
        </div>
      </td>
    </tr>
  );
}
