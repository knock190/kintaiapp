export type UserRole = "member" | "admin";

export type AuthenticatedUser = {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  deactivatedAt: Date | null;
};

export type AuthenticatedSession = {
  user: AuthenticatedUser;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
};
