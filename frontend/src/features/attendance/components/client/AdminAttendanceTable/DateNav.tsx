"use client";

import { Button } from "@/shared/ui/button";

type DateNavProps = {
  date: string;
  today: string;
  onChange: (date: string) => void;
};

function shiftDate(value: string, deltaDays: number) {
  const [year, month, day] = value.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const shifted = new Date(utc + deltaDays * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = weekdayLabels[utc.getUTCDay()];
  return `${value} (${weekday})`;
}

export function DateNav({ date, today, onChange }: DateNavProps) {
  const isToday = date === today;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(shiftDate(date, -1))}
      >
        ◀ 前日
      </Button>
      <span className="min-w-[10rem] text-center text-sm font-medium">
        {formatDateLabel(date)}
      </span>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(shiftDate(date, 1))}
      >
        翌日 ▶
      </Button>
      <Button
        disabled={isToday}
        type="button"
        variant={isToday ? "outline" : "default"}
        onClick={() => onChange(today)}
      >
        今日
      </Button>
      <input
        aria-label="日付選択"
        className="h-10 rounded-md border bg-background px-3 text-sm"
        type="date"
        value={date}
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
      />
    </div>
  );
}
