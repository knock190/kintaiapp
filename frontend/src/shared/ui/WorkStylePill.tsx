import { Badge } from "@/shared/ui/badge";

export type WorkStyle =
  | "office"
  | "remote"
  | "direct_visit"
  | "normal"
  | "direct_return";

const workStyleLabels: Record<WorkStyle, string> = {
  office: "出社",
  remote: "在宅",
  direct_visit: "直行",
  normal: "通常退勤",
  direct_return: "直帰",
};

type WorkStylePillProps = {
  style: WorkStyle;
};

export function WorkStylePill({ style }: WorkStylePillProps) {
  return <Badge variant="outline">{workStyleLabels[style]}</Badge>;
}
