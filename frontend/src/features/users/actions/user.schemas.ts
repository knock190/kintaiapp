import { z } from "zod";

const employeeIdSchema = z
  .string()
  .trim()
  .min(1, "社員 ID を入力してください。")
  .max(64, "社員 ID は 64 文字以内で入力してください。")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "社員 ID は半角英数字、ドット、ハイフン、アンダースコアで入力してください。",
  )
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "パスワードは 8 文字以上で入力してください。");

export const listUsersInputSchema = z.object({}).strict();

export const createUserInputSchema = z.object({
  employeeId: employeeIdSchema,
  name: z
    .string()
    .trim()
    .min(1, "名前を入力してください。")
    .max(100, "名前は 100 文字以内で入力してください。"),
  role: z.enum(["member", "admin"], {
    error: "ロールを選択してください。",
  }),
  initialPassword: passwordSchema,
});

export const reissuePasswordInputSchema = z.object({
  userId: z.string().min(1, "対象ユーザーを選択してください。"),
  newPassword: passwordSchema,
});

export const deactivateUserInputSchema = z.object({
  userId: z.string().min(1, "対象ユーザーを選択してください。"),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type ReissuePasswordInput = z.infer<typeof reissuePasswordInputSchema>;
