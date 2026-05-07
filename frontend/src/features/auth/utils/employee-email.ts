const employeeIdPattern = /^[a-zA-Z0-9._-]+$/;

export function normalizeEmployeeId(employeeId: string) {
  return employeeId.trim().toLowerCase();
}

export function assertValidEmployeeId(employeeId: string) {
  if (!employeeIdPattern.test(employeeId)) {
    throw new Error(
      "社員 ID は半角英数字、ドット、ハイフン、アンダースコアで入力してください。",
    );
  }
}

export function employeeIdToEmail(employeeId: string) {
  const normalized = normalizeEmployeeId(employeeId);
  assertValidEmployeeId(normalized);
  return `${normalized}@kintaiapp.local`;
}
