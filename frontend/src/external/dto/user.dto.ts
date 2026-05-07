export type UserRole = "member" | "admin";

export type UserDTO = {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
