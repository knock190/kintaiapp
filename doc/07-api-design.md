# 勤怠管理Webシステム API 設計 v0.1

要件定義書 v1.2 / ユースケース定義 v0.1 / ドメイン設計 v0.1 / 画面設計 v0.1 を踏まえた **API レイヤ** の設計。

> 技術前提: Next.js App Router / TypeScript / Better Auth / Drizzle / TanStack Query / RSC 優先

## 1. アーキテクチャ方針

### 1-1. データ取得・更新フロー

| 種別 | 主な手段 | 用途 |
| --- | --- | --- |
| 初期表示の読み取り | **RSC（Server Component から domain サービスを直接呼ぶ）** | ダッシュボード初期描画など SEO/パフォーマンスを優先するページ |
| クライアントからの読み取り（再取得 / ポーリング） | **Server Action**（TanStack Query で `useQuery` 化） | 管理者ダッシュボードの自動更新、楽観的 UI 更新の整合確認 |
| クライアントからの更新 | **Server Action**（`useMutation` で呼び出し） | 打刻 / 修正 / リセット / ユーザー管理など全 CUD 操作 |
| 認証 | **Better Auth の Route Handler**（`/api/auth/[...all]`） | サインイン / サインアウト / セッション取得 |

### 1-2. なぜ Server Actions 主体か

- **RSC優先** の方針と相性が良い（型がそのまま流れる）
- **Better Auth の session を Server 側で確実にチェック** できる
- **TanStack Query の `mutationFn` / `queryFn` から直接呼べる**（`useMutation({ mutationFn: clockInAction })` のように）
- 別途 OpenAPI / REST エンドポイントを用意する必要がなく、Phase 1 規模では十分

### 1-3. ディレクトリ構成（想定）

```
src/
├── actions/                       ← Server Actions（"use server"）
│   ├── auth.ts                    ← changeInitialPassword 等
│   ├── attendance.ts              ← 自分・他人の勤怠操作
│   └── user.ts                    ← 管理者のユーザー管理
├── server/
│   ├── auth.ts                    ← Better Auth 設定 + helpers (requireAuth など)
│   ├── db/
│   │   ├── index.ts               ← Drizzle client
│   │   └── schema.ts              ← Drizzle schema
│   ├── domain/                    ← Entity / VO / Aggregate
│   ├── repositories/              ← Drizzle を使った永続化
│   └── services/                  ← Domain Service（UserCreationService 等）
└── app/
    ├── (public)/login/
    ├── (public)/password/initial/
    ├── (member)/member/dashboard/
    ├── (admin)/admin/dashboard/
    ├── (admin)/admin/users/
    └── api/
        └── auth/[...all]/route.ts  ← Better Auth handler
```

## 2. 共通仕様

### 2-1. Server Action の戻り値型

成功・失敗を判別子で表現。例外は **想定外のエラーのみ** スローする（呼び出し側のエラーバウンダリで補足）。

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export type ActionError = {
  code: ActionErrorCode;
  message: string;                        // ユーザー向けメッセージ
  fieldErrors?: Record<string, string[]>; // フォームバリデーション用
};
```

### 2-2. エラーコード

| コード | HTTP 相当 | 説明 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 未ログイン / セッション切れ |
| `FORBIDDEN` | 403 | ロール不足（member が admin 操作を試みた等） |
| `NOT_FOUND` | 404 | 対象リソースが存在しない |
| `VALIDATION_FAILED` | 400 | 入力バリデーションエラー（`fieldErrors` 同梱） |
| `CONFLICT` | 409 | 重複・状態整合違反（二重打刻 / アクティブ離業期間の削除など） |
| `STATE_TRANSITION_INVALID` | 409 | 状態機械が許可しない遷移（Off で退勤など） |
| `INTERNAL_ERROR` | 500 | 想定外の内部エラー |

### 2-3. 認可ヘルパー

```ts
// src/server/auth.ts
export async function requireAuth(): Promise<Session>;          // 未認証時 UNAUTHORIZED
export async function requireMember(): Promise<Session>;        // member or admin
export async function requireAdmin(): Promise<Session>;         // admin のみ
export async function requireSelfOrAdmin(targetUserId: string): Promise<Session>;
```

各 Server Action の冒頭でこれらを呼ぶ。**認可は必ずサーバー側で実施**（クライアントの role 表示は UX のみ）。

### 2-4. 入力バリデーション

`zod` で input schema を定義し、Server Action の冒頭で `parse()`。失敗時は `VALIDATION_FAILED` を返す。

```ts
const ClockInInput = z.object({
  style: z.enum(['office', 'remote', 'direct_visit']),
});

export async function clockInAction(raw: unknown): Promise<ActionResult<AttendanceDTO>> {
  const session = await requireMember();
  const parsed = ClockInInput.safeParse(raw);
  if (!parsed.success) return validationFailed(parsed.error);
  // ... Domain 呼び出し
}
```

### 2-5. revalidation / キャッシュ戦略

| 操作 | サーバー側 | クライアント側（TanStack Query） |
| --- | --- | --- |
| 自分の打刻系（clock-in/out, away/back, modify） | `revalidatePath('/member/dashboard')` & `revalidatePath('/admin/dashboard')` | `invalidateQueries(['my-attendance'])` & `invalidateQueries(['attendances', date])` |
| 管理者の他人勤怠 修正 / リセット | `revalidatePath('/admin/dashboard')` | `invalidateQueries(['attendances', date])` |
| ユーザー作成 / 編集 / 無効化 | `revalidatePath('/admin/users')` | `invalidateQueries(['users'])` |

## 3. Server Actions 一覧

### 3-1. 認証・パスワード

| アクション | 関連 UC | ロール | 概要 |
| --- | --- | --- | --- |
| `changeInitialPasswordAction` | UC-03 | 認証済み（`mustChangePassword === true`） | 初回パスワード変更 |

#### `changeInitialPasswordAction`

```ts
const Input = z.object({
  newPassword: z.string().min(8),                 // ポリシー要確定
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'パスワードが一致しません',
});

type Output = ActionResult<{ userId: string }>;
```

- 処理: パスワードハッシュ更新 → `must_change_password = false`
- エラー: `VALIDATION_FAILED` / `UNAUTHORIZED`

> ログイン / ログアウト / セッション取得は **Better Auth の組み込み API**（§ 5）を使用。

---

### 3-2. メンバー打刻系（自分の勤怠）

| アクション | 関連 UC | ロール | 概要 |
| --- | --- | --- | --- |
| `getMyAttendanceAction` | UC-06 | member / admin | 自分の特定日の勤怠を取得（既定: 当日） |
| `clockInAction` | UC-04 | member / admin | 出勤打刻（自動タイムスタンプ） |
| `clockOutAction` | UC-05 | member / admin | 退勤打刻（自動タイムスタンプ） |
| `markAwayAction` | UC-15 | member / admin | 離業（自動タイムスタンプ） |
| `markBackAction` | UC-15 | member / admin | 業務復帰（自動タイムスタンプ） |
| `updateMyAttendanceAction` | UC-07 | member / admin | 自分の打刻情報修正（時刻・勤務形態・離業期間） |

#### `getMyAttendanceAction`

```ts
const Input = z.object({ date: z.string().date().optional() });   // 既定: 当日 (JST)
type Output = ActionResult<AttendanceDTO>;
```

#### `clockInAction`

```ts
const Input = z.object({
  style: z.enum(['office', 'remote', 'direct_visit']),
});
type Output = ActionResult<AttendanceDTO>;
```

- 処理: Off → Working 遷移（L1 / L4）
- エラー: `STATE_TRANSITION_INVALID`（Off 以外）/ `CONFLICT`（万一の競合）

#### `clockOutAction`

```ts
const Input = z.object({
  style: z.enum(['normal', 'direct_return']),
});
type Output = ActionResult<AttendanceDTO>;
```

- 処理: Working/Away → Done 遷移（Away からの場合 active な AwayPeriod を `clockOut.at` で確定 / L15）
- エラー: `STATE_TRANSITION_INVALID`

#### `markAwayAction` / `markBackAction`

```ts
type AwayInput = z.object({}).strict();           // 引数なし（時刻は now()）
type Output = ActionResult<AttendanceDTO>;
```

- `markAway`: Working → Away、新規 AwayPeriod を生成
- `markBack`: Away → Working、active AwayPeriod の endedAt を確定
- エラー: `STATE_TRANSITION_INVALID`

#### `updateMyAttendanceAction`

```ts
const ClockInPatch = z.object({
  at: z.string().datetime(),                              // ISO 8601
  style: z.enum(['office', 'remote', 'direct_visit']),
}).optional();

const ClockOutPatch = z.object({
  at: z.string().datetime(),
  style: z.enum(['normal', 'direct_return']),
}).optional();

const AwayPeriodInput = z.object({
  id: z.string().uuid().optional(),                       // 既存編集 / 新規追加
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),                         // 手動追加・編集はクローズ済必須（L16）
});

const Input = z.object({
  date: z.string().date(),
  clockIn: ClockInPatch,
  clockOut: ClockOutPatch,
  awayPeriods: z.array(AwayPeriodInput).optional(),       // 提示分で全置換 or 差分？ → 全置換（後述）
});
```

- 処理: Attendance 集約のメソッドで時刻 / 勤務形態 / AwayPeriod を上書き。L2 / L14 / L16 を検証
- 仕様: `awayPeriods` は **クライアントから提示された配列で全置換**（送られてきた `id` のものを残し、無いものは削除）。**ただしアクティブ期間（`endedAt = null` のもの）の編集・削除は許可しない**（L16）
- エラー: `VALIDATION_FAILED` / `CONFLICT`（重複 / 範囲外）

---

### 3-3. 管理者: 勤怠操作

| アクション | 関連 UC | ロール | 概要 |
| --- | --- | --- | --- |
| `listAttendancesAction` | UC-08 | admin | 指定日の全有効ユーザーの勤怠一覧 |
| `updateUserAttendanceAction` | UC-09 | admin | 任意ユーザー / 任意日の勤怠修正 |
| `resetUserAttendanceAction` | UC-10 | admin | 任意ユーザー / 任意日の勤怠リセット（null 戻し） |

#### `listAttendancesAction`

```ts
const Input = z.object({ date: z.string().date() });
type Output = ActionResult<AttendanceListItemDTO[]>;       // 行: { user, attendance | null }
```

- 処理: `users WHERE deactivated_at IS NULL` LEFT JOIN `attendances ON user_id AND attendance_date`
- レコード無し → `attendance` フィールドを `null` で返却（画面側で「休み」表示にマップ）
- ポーリング想定（TanStack Query `refetchInterval` で利用）

#### `updateUserAttendanceAction`

```ts
const Input = z.object({
  userId: z.string(),
  date: z.string().date(),
  clockIn: ClockInPatch,
  clockOut: ClockOutPatch,
  awayPeriods: z.array(AwayPeriodInput).optional(),
});
```

- `updateMyAttendanceAction` の admin 版（`userId` 指定）。バリデーション・処理は同じ
- エラー: `NOT_FOUND`（対象 user / attendance）/ `VALIDATION_FAILED`

#### `resetUserAttendanceAction`

```ts
const Input = z.object({
  userId: z.string(),
  date: z.string().date(),
});
type Output = ActionResult<AttendanceDTO>;                 // status='off' に戻したもの
```

- 処理: `Attendance.reset()` を呼び出し（L6）。レコード保持
- エラー: `NOT_FOUND`

---

### 3-4. 管理者: ユーザー管理

| アクション | 関連 UC | ロール | 概要 |
| --- | --- | --- | --- |
| `listUsersAction` | (画面) | admin | ユーザー一覧（無効化済みも含む） |
| `createUserAction` | UC-11 / UC-12 | admin | 新規ユーザー作成 |
| `reissuePasswordAction` | UC-13 | admin | パスワード再発行 |
| `deactivateUserAction` | UC-14 | admin | アカウント無効化 |

#### `listUsersAction`

```ts
const Input = z.object({}).strict();
type Output = ActionResult<UserDTO[]>;                     // active / deactivated 両方
```

#### `createUserAction`

```ts
const Input = z.object({
  employeeId: z.string().min(1),                           // 形式は確定後
  name: z.string().min(1),
  role: z.enum(['member', 'admin']),
  initialPassword: z.string().min(8),
});
type Output = ActionResult<UserDTO>;
```

- 処理: `UserCreationService` を呼ぶ（DB 一意制約 + ドメイン側のチェック / L1 ユーザー版）。`mustChangePassword = true` で作成
- エラー: `CONFLICT`（employeeId 重複）/ `VALIDATION_FAILED`

#### `reissuePasswordAction`

```ts
const Input = z.object({
  userId: z.string(),
  newPassword: z.string().min(8),
});
type Output = ActionResult<{ userId: string }>;
```

- 処理: `PasswordReissueService` を呼ぶ。`mustChangePassword` は変更しない（L9）
- エラー: `NOT_FOUND` / `VALIDATION_FAILED`

#### `deactivateUserAction`

```ts
const Input = z.object({ userId: z.string() });
type Output = ActionResult<UserDTO>;
```

- 処理: `User.deactivate()` を呼ぶ（L10）。`deactivated_at = now()`
- エラー: `NOT_FOUND` / `CONFLICT`（既に無効化済み）

> **`reactivateUserAction`** は要件側残課題 Q3 が確定したら追加。

## 4. DTO / レスポンス型

API 境界で公開する型を定義（ドメインの内部表現とは別物として扱う）。

```ts
export type UserDTO = {
  id: string;
  employeeId: string;
  name: string;
  role: 'member' | 'admin';
  isActive: boolean;                            // !deactivated_at
  mustChangePassword: boolean;
};

export type AwayPeriodDTO = {
  id: string;
  startedAt: string;                            // ISO 8601
  endedAt: string | null;
};

export type AttendanceDTO = {
  id: string;
  userId: string;
  attendanceDate: string;                       // YYYY-MM-DD
  status: 'off' | 'working' | 'away' | 'done';
  clockIn: { at: string; style: 'office' | 'remote' | 'direct_visit' } | null;
  clockOut: { at: string; style: 'normal' | 'direct_return' } | null;
  awayPeriods: AwayPeriodDTO[];
};

export type AttendanceListItemDTO = {
  user: UserDTO;
  attendance: AttendanceDTO | null;             // null = その日のレコード未生成（休み扱い）
};
```

## 5. Better Auth エンドポイント

Better Auth は `/api/auth/[...all]/route.ts` で全エンドポイントを公開。クライアントは `better-auth/react` の `authClient` を使う。

| エンドポイント | 用途 | 関連 UC |
| --- | --- | --- |
| `POST /api/auth/sign-in` | 社員 ID + パスワードでサインイン | UC-01 |
| `POST /api/auth/sign-out` | サインアウト | UC-02 |
| `GET  /api/auth/session` | 現在のセッション取得（role / mustChangePassword 含む） | 認証チェック |

> 認証本体は Better Auth に委譲。`customSession` で `role` / `mustChangePassword` をクレームに乗せる。

## 6. ミドルウェア / 認証境界

| パス | middleware で要求するもの | 違反時 |
| --- | --- | --- |
| `/login` / `/password/initial` | なし（公開） | — |
| `/member/*` | 認証済み（member / admin） + `mustChangePassword === false` | `mustChangePassword=true` なら `/password/initial` へ、未認証なら `/login` へ |
| `/admin/*` | 認証済み + `role === 'admin'` + `mustChangePassword === false` | role 不足時は `/member/dashboard` へ、未認証時は `/login` へ |

ルートグループの **`layout.tsx`** または **Next.js middleware** で実施。Server Actions 内でも **必ず再チェック**（多層防御）。

## 7. クライアント側の利用パターン

### 7-1. 初期表示（RSC）

```tsx
// app/(member)/member/dashboard/page.tsx
export default async function Page() {
  const session = await requireMember();
  const attendance = await getMyAttendance(session.userId, today());
  return <Dashboard initialData={attendance} />;
}
```

### 7-2. ミューテーション（クライアント / TanStack Query）

```ts
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: clockInAction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
    toast.success('出勤打刻しました');
  },
  onError: (err) => toast.error(err.message),
});
```

### 7-3. ポーリング（管理者ダッシュボード）

```ts
const { data } = useQuery({
  queryKey: ['attendances', date],
  queryFn: () => listAttendancesAction({ date }),
  refetchInterval: 30_000,                       // 30 秒ごと（要件確定で調整）
  initialData,                                   // RSC で取得した初期値を渡す
});
```

## 8. パフォーマンス / セキュリティ留意点

| 観点 | 方針 |
| --- | --- |
| CSRF | Server Actions は Next.js が POST + Action ID で保護（標準）。Better Auth は組み込み CSRF |
| レート制限 | Phase 1 では未導入。Better Auth のレート制限機能は今後検討 |
| パスワードハッシュ | Better Auth 既定（argon2）をそのまま使用 |
| Server Action 実行時間 | 単一 DB 往復で完結する設計。長時間処理は導入しない |
| ログ | サーバー側で操作ログを最低限残す（ユーザー操作ではなく実行記録）。監査ログは要件 Q1 と連動 |

## 9. 残課題

- **管理者画面の自動更新の方式・間隔** — ポーリング 30 秒（仮）/ SSE 等は要件確定後
- **`updateMyAttendanceAction` / `updateUserAttendanceAction` の `awayPeriods` の差分 vs 全置換** — 本書は「全置換（アクティブ除く）」で記述したが、UI とのトレードオフで再検討の余地あり
- **`reactivateUserAction`** — 要件側 Q3（再有効化フローの要否）と連動
- **エラー文言の標準化** — `ActionError.message` の表現ルール / 多言語対応の要否
- **DTO とドメイン型のマッパー層** — 厳密に分離するか、シンプルに同一型で済ませるかの判断（Phase 1 の規模次第）
- **ページネーション** — ユーザー / 勤怠一覧が増えた場合の対応（数百件超えで検討）
- **OpenAPI スキーマ生成の要否** — Server Actions 中心なので原則不要だが、外部連携が出れば検討
