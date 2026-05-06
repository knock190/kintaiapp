# 認証設計（プロジェクト固有）

勤怠管理 Web システムにおける認証・認可の設計。要件定義書 v1.2 / ドメイン設計 v0.1 / API 設計 v0.1 と整合させる。

## 1. 目的とスコープ

- 社員 ID + パスワードによるログインとセッション管理を Next.js で行う。
- セッションに `role`（member / admin） と `mustChangePassword` を付与し、画面・API の認可に用いる。
- 認可は **必ずサーバー側**（Server Action / Server Function 内）で再チェックする（多層防御）。

## 2. 信頼境界

- **認証責務**: Next.js App Router 層（layout / middleware / Server Action）が認証を実施。
- **永続化**: Phase 1 では同一プロセス内の Drizzle で DB に直接アクセスするため、API 認可境界は外部に存在しない。
- **将来 API 化**: バックエンド API を切り出した際は、API 側でも `userId` / `role` の検証を行う前提で設計する。

## 3. 認証プロバイダーとライブラリ

- **認証方式**: 社員 ID（`employeeId`）+ パスワード（credentials provider）
- **ライブラリ**: `better-auth`（cookie ベースのセッション）
- **`customSession`**: `role` と `mustChangePassword` をクレームに付与
- **パスワードハッシュ**: Better Auth 既定（argon2）

関連ファイル想定:
- `frontend/src/features/auth/lib/better-auth.ts`
- `frontend/src/features/auth/lib/better-auth-client.ts`

## 4. セッションモデル

- Cookie ベース・ステートフル（`sessions` テーブルに保存）
- セッションに含まれる主要フィールド
  - `user`: `id` / `employeeId` / `name` / `role` / `mustChangePassword` / `deactivatedAt`
  - `session`: `id` / `userId` / `expiresAt`
- セッション TTL は Better Auth の既定（要確認）。アイドルタイムアウト等は今後検討。

## 5. アカウント作成・同期

- アカウントは **管理者のみが発行** する（要件 7）。本人による新規登録フローは存在しない。
- 初期管理者は seed で 1 アカウントだけ投入し、以降の管理者・メンバーはこの初期管理者が `/admin/users` から作成する。
- 作成時の初期値: `mustChangePassword = true`、`deactivatedAt = null`。

関連設計:
- `doc/04-domain-design.md` § 5.1 `UserCreationService`
- `doc/06-database-design.md` § 7.1 シード方針

## 6. キャッシュ戦略

- セッション情報は Better Auth のセッション API（DB アクセス）で取得する。`unstable_cache` で 5 分程度キャッシュすることも検討可（要確認）。
- ユーザー一覧は TanStack Query 側でキャッシュ（`userKeys.list()`）。作成・編集後に `invalidateQueries` する。

## 7. 認証ガード（チェックの適用箇所）

### サーバーサイドのリダイレクトガード

- `requireAuthServer()`: 認証だけチェックし、未認証なら `/login` にリダイレクト。
- `getAuthenticatedSessionServer()`: 認証 + セッション取得（`role` / `mustChangePassword` 込み）。未認証なら `/login` にリダイレクト。
- ロール別の境界
  - `requireMember()`: member / admin を許可
  - `requireAdmin()`: admin のみ許可、それ以外は `/member/dashboard` にリダイレクト

関連ファイル想定:
- `frontend/src/features/auth/servers/redirect.server.ts`

### Server Action ガード

- すべての Server Action の冒頭で `requireMember()` / `requireAdmin()` を呼ぶ。
- 自分のリソースのみ操作する Action（`updateMyAttendanceAction` など）はセッションの `userId` を使う（クライアントから userId を受け取らない）。
- 他人のリソースを操作する Action（`updateUserAttendanceAction` 等）は `requireAdmin()` 必須。

関連ファイル想定:
- `frontend/src/features/auth/servers/auth.guard.ts`

## 8. ログイン / ログアウト UX

- ログイン画面: `/login`（社員 ID + パスワード）
- 認証成功後の遷移
  - `mustChangePassword === true` → `/password/initial`
  - `role === 'member'` → `/member/dashboard`
  - `role === 'admin'` → `/admin/dashboard`
- ログアウト: `signOut()` 実行 → React Query キャッシュをクリア → `/login` へ遷移

関連ファイル想定:
- `frontend/src/features/auth/components/client/LoginPageClient/*`
- `frontend/src/shared/components/layout/client/Header/useHeader.ts`

## 9. 永続化レイヤの前提

- `users` / `sessions` / `accounts` / `verifications` は Better Auth が管理（拡張フィールドあり）。
- `users` への拡張: `employee_id` (UNIQUE) / `role` / `must_change_password` / `deactivated_at`。
- `accounts.password` にハッシュ済パスワードが格納される（credentials provider）。

関連ドキュメント:
- `doc/06-database-design.md` § 2

## 10. 認可ルール（要約）

- **member**
  - 自分の `Attendance` の取得・打刻（出勤 / 退勤 / 離業 / 業務復帰）・修正のみ可能
  - 他ユーザーの勤怠への一切の操作は不可
- **admin**
  - 自分の打刻に加え、全員の勤怠閲覧 / 修正 / リセットが可能
  - ユーザー管理（作成 / パスワード再発行 / 無効化）が可能
- **無効化済アカウント**
  - `deactivatedAt !== null` のユーザーはログイン不可（UC-01 代替フロー）

関連ドキュメント:
- `doc/04-domain-design.md` § 4 ドメインロジック L10
- `doc/07-api-design.md` § 2-3 認可ヘルパー / § 6 ミドルウェア

## 11. 環境変数

- `DATABASE_URL` — Postgres 接続文字列
- `BETTER_AUTH_SECRET` — Better Auth のセッション署名キー
- `BETTER_AUTH_URL` — アプリケーションのベース URL（本番）
- `INITIAL_ADMIN_EMPLOYEE_ID` / `INITIAL_ADMIN_NAME` / `INITIAL_ADMIN_PASSWORD` — seed 用

関連ファイル想定:
- `frontend/src/features/auth/lib/better-auth.ts`
- `frontend/.env.example`

## 12. ユーザーデータモデル（主要フィールド）

- `id`（Better Auth が生成）
- `employeeId`（UNIQUE、ログイン識別子）
- `name`（表示名）
- `role`（`'member'` | `'admin'`）
- `mustChangePassword`（初回ログイン強制フラグ）
- `deactivatedAt`（`null` なら有効）
- `createdAt` / `updatedAt`

関連ドキュメント:
- `doc/04-domain-design.md` § 1.1 User
- `doc/06-database-design.md` § 2.1 users

## 13. テストチェックリスト（最低限）

- 社員 ID + パスワードでログインできる
- 初回ログイン時 `mustChangePassword === true` で `/password/initial` に強制遷移する
- パスワード変更後は `mustChangePassword === false` になり、ロールに応じてダッシュボードに遷移する
- 無効化済みアカウント（`deactivatedAt !== null`）はログイン拒否される
- member が `/admin/*` にアクセスすると `/member/dashboard` にリダイレクトされる
- 未認証で `/member/*` / `/admin/*` にアクセスすると `/login` にリダイレクトされる
- Server Action 直接呼び出しでもロールチェックが効く（多層防御）

## 14. ディレクトリ構造（認証 + ユーザー管理）

```
frontend/src
├─ app
│  ├─ api/auth/[...all]/route.ts            # Better Auth の API ルート
│  ├─ (public)/login/                       # ログイン画面
│  ├─ (public)/password/initial/            # 初回パスワード変更画面
│  ├─ (member)/                             # member 認証境界（layout でガード）
│  └─ (admin)/                              # admin 認証境界（layout でガード）
│
├─ features/auth
│  ├─ lib/
│  │  ├─ better-auth.ts                     # 認証本体設定（credentials / customSession）
│  │  └─ better-auth-client.ts              # クライアント側 signIn / signOut / useSession
│  ├─ servers/
│  │  ├─ auth.server.ts                     # セッション取得
│  │  ├─ redirect.server.ts                 # 認証必須 / 未認証 / role 不一致のリダイレクト
│  │  └─ auth.guard.ts                      # Server Action 用 requireMember / requireAdmin
│  ├─ components/
│  │  ├─ client/LoginPageClient/*           # ログイン UI（社員 ID + パスワード）
│  │  ├─ client/InitialPasswordClient/*     # 初回パスワード変更 UI
│  │  └─ server/LoginPageTemplate/*         # ログインページのサーバー側ラッパー
│  └─ types/better-auth.d.ts                # Session 型拡張（role / mustChangePassword）
│
├─ features/admin
│  ├─ components/
│  │  ├─ server/AdminUsersTemplate/*        # ユーザー管理ページ
│  │  └─ client/UserCreateDialog/*          # 新規ユーザー作成モーダル
│  └─ hooks/
│     ├─ useUsersQuery.ts
│     └─ useUserMutation.ts
│
├─ external/handler/user
│  ├─ user.command.server.ts                # createUser / reissuePassword / deactivateUser
│  ├─ user.command.action.ts                # 上記の Server Action 入口
│  ├─ user.query.server.ts                  # listUsers
│  └─ user.query.action.ts                  # 上記の Server Action 入口
│
├─ external/service/user
│  └─ user.service.ts                       # UserCreationService / PasswordReissueService
│
└─ external/dto/user.dto.ts                 # User の DTO / バリデーション
```

## 15. ロールベースルーティングの実装メモ

| パス | middleware で要求するもの | 違反時の挙動 |
| --- | --- | --- |
| `/login` / `/password/initial` | なし（公開） | ログイン済みなら role に応じてダッシュボードへ |
| `/member/*` | 認証済み + `mustChangePassword === false` | `mustChangePassword=true` なら `/password/initial`、未認証なら `/login` |
| `/admin/*` | 認証済み + `role === 'admin'` + `mustChangePassword === false` | role 不足なら `/member/dashboard`、未認証なら `/login` |

`(member)/layout.tsx` と `(admin)/layout.tsx` で実施し、Server Action 内でも `requireMember` / `requireAdmin` で再チェック。

## 16. セキュリティ設定（Cookie / CSRF）

- セッションは Cookie ベース。属性（`httpOnly` / `sameSite=lax` / `secure`）は本番環境で必ず有効化する（Better Auth の設定で明示する）。
- CSRF: Next.js Server Actions は POST + Action ID で標準保護される。Better Auth のフォーム POST は CSRF トークンを使う。
- ログイン試行のレート制限は Phase 1 では未導入。Better Auth のレート制限機能を将来導入検討。

## 17. パスワードポリシー

- 初期パスワード・変更後パスワードとも、最小桁数 8 文字（要件 Q で確定予定）。
- ハッシュは Better Auth 既定の argon2 を使用、平文は保存しない。
- 「パスワード忘れ」のセルフリセットは不可。管理者の再発行（UC-13）でのみ復旧する。

## 18. セッション有効期限と再認証条件

- セッション TTL は Better Auth の既定（要確認）。
- セッション切れ時は API 401 → クライアント側で `/login` へリダイレクト。
- ログアウト時はサーバー側で `sessions` レコードを破棄。

## 19. ログアウトの挙動

- クライアントで `signOut()` を実行 → サーバー側 `sessions` レコードを破棄
- React Query のキャッシュをクリア（特にユーザー一覧・勤怠一覧）
- `/login` へリダイレクト

## 20. 失敗時フロー（UX）

- 認証失敗（社員 ID / パスワード不一致）→ `Alert variant="destructive"` でメッセージ表示
- 無効化済アカウント → 同上、文言を区別（要件 Q で確定）
- パスワード変更失敗（ポリシー違反 / 確認不一致）→ `FormMessage` で field 単位に表示

## 21. アカウントのライフサイクル

- 作成（管理者 UC-11 / UC-12）→ `mustChangePassword = true` で発行
- 初回ログイン → 強制パスワード変更（UC-03）→ `mustChangePassword = false`
- パスワード再発行（UC-13）→ `passwordHash` 更新、`mustChangePassword` は変更しない
- 無効化（UC-14）→ `deactivatedAt = now()`、ログイン不可。過去の勤怠は保持
- 再有効化フローの要否は残課題（要件 Q3）

## 22. 信頼境界の補強策

- Phase 1 では Next.js が DB と同一信頼境界に存在するため、特別な補強策は不要。
- 将来 API を切り出す場合は、API 側で `userId` / `role` の検証を行い、Next.js BFF が信頼できる発信元であることを内部ネットワーク / API キー等で担保する。
