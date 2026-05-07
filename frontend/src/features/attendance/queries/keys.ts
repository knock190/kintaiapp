export const attendanceKeys = {
  all: ["attendance"] as const,
  my: (date: string) => [...attendanceKeys.all, "my", date] as const,
};
