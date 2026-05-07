export const attendanceKeys = {
  all: ["attendance"] as const,
  my: (date: string) => [...attendanceKeys.all, "my", date] as const,
  list: (date: string) => [...attendanceKeys.all, "list", date] as const,
};
