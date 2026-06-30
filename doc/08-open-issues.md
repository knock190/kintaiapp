# 進捗確認メモ / 残課題 v0.1

要件定義書 v1.2（[01-requirements.md](./01-requirements.md)）と現状実装を 2026-06-30 時点で照合した結果のメモ。Phase 1 の機能要件はほぼ実装済みだが、品質・運用面で気になる点を残課題として記録する。

## 1. 機能要件の充足状況（サマリ）

| 区分 | 状況 | 主な実装場所 |
| --- | --- | --- |
| メンバー画面（4 状態・打刻・離業・自己修正） | ✅ 実装済 | `frontend/src/features/attendance/` |
| 管理者画面（一覧・日付ナビ・修正・リセット） | ✅ 実装済 | `frontend/src/features/attendance/components/client/AdminAttendanceTable/` |
| 認証（Better Auth + role） | ✅ 実装済 | `frontend/src/features/auth/servers/auth.ts` |
| ユーザー管理（作成・パスワード再発行・無効化） | ✅ 実装済 | `frontend/src/features/users/actions/user.action.ts` |
| 初期管理者 seed | ✅ 実装済 | `frontend/scripts/seed-initial-admin.ts` |

→ Phase 1 の **機能要件は満たされている** と判断。

## 2. 気になる点（残課題）

### 2-1. テストカバレッジが薄い

**現状**: テストファイルは以下 3 本のみ。

- `frontend/src/features/attendance/domain/Attendance.test.ts`
- `frontend/src/features/attendance/actions/attendance.schemas.test.ts`
- `frontend/src/features/users/actions/user.schemas.test.ts`

**未整備の領域**:

| レイヤ | 状況 |
| --- | --- |
| Service 層（`attendance.service.ts` / `user.service.ts`） | テストなし |
| Server Action 層（権限チェック・エラーマッピング含む） | テストなし |
| Repository / Drizzle クエリ層 | テストなし |
| UI コンポーネント（`ClockPanel`, `AdminAttendanceTable`, `AdminUsersTable`） | テストなし |
| E2E（ログイン → 打刻 → 管理者修正の通し） | 未着手 |

**影響**: ドメインロジック以外の回帰検知ができない。特に「権限チェック漏れ」「Drizzle クエリの SQL レベルの誤り」「楽観的 UI 更新と Server Action の整合」が手動確認頼み。

**推奨**: 最低限、Server Action の **権限境界テスト**（member が admin 用 Action を叩いたら拒否される）と、Repository の **DB 整合性制約に依存するテスト**（Docker Compose 上の Postgres に接続）を整備する。

### 2-2. CI/CD パイプラインが未整備

**現状**: リポジトリ直下に `.github/workflows/` が存在しない。

**未整備の項目**:

- Pull Request 時の Lint（Biome） / 型チェック / テスト実行
- main ブランチへの merge をトリガにした Cloud Run デプロイ
- Drizzle マイグレーションの自動適用フロー
- Neon の本番 / プレビュー DB 切り替え

**影響**: ローカルでチェック漏れがあるとそのまま develop / main に入る。デプロイ手順が属人化する。

**推奨**: 最低限 PR チェック用ワークフロー（`pnpm --dir frontend lint && build && test`）を先に入れる。Cloud Run デプロイは認証情報（Workload Identity 連携）の準備が必要なので別タスク。

### 2-3. Cloud Run 向けのランタイム設定の未確認事項

**現状**: `Dockerfile` は Cloud Run 想定（`PORT=8080`, standalone build）で書かれており妥当。一方で本番運用に必要な周辺設定が文書化されていない。

**未確認の項目**:

- 環境変数の渡し方（`DATABASE_URL`, Better Auth の secret, 等）
- Neon への接続戦略（コネクションプール: Neon serverless driver か pgbouncer 経由か）
- マイグレーションを「いつ・どこで」実行するか（ビルド時 / デプロイ前 / 別ジョブ）
- ヘルスチェックエンドポイントの有無

**推奨**: `08-develop-guide.md` 相当の運用ガイドに「本番デプロイ手順」セクションを追加し、Secret Manager / Cloud SQL Proxy 不要（Neon 直叩き）の前提を明文化する。

### 2-4. 観測性（ロギング・エラー通知）

**現状**: Server Action のエラーは `console.error(error)` で stdout に出すのみ（`attendance.action.ts:52` / `user.action.ts:37`）。

**未整備**:

- 構造化ログ（リクエスト ID / user ID 付与）
- 本番でのエラー通知（Sentry 等）
- 監査ログ（管理者の修正・リセット・パスワード再発行の操作履歴）

**特に重要**: 要件 3-2 / 6-1 で管理者に強い権限（過去日の修正・リセット・パスワード再発行）を与えているため、**監査ログは Phase 1 のうちに入れたほうがよい**。現状は誰がいつ何を変更したか追跡不能。

### 2-5. 要件記載との細かなギャップ

要件 3-2 の管理者画面の「ステータス」表記が **未出勤 / 勤務中 / 退勤済** の 3 値で書かれている（行 33）一方、ドメイン / DB は **off / working / away / done** の 4 値。「離業中（away）」が管理者画面でどう見えるべきかは要件未定義。

→ 実装では `AdminAttendanceRow.tsx` がどう表示しているか要確認。要件側を 4 値に揃えるか、画面側で away を「勤務中」に丸めるかの方針を明文化したい。

## 3. 推奨着手順

リスク × コストの観点から、以下の順を推奨。

1. **監査ログ**（2-4 後半） — 権限の強さに対して現状ゼロリスクすぎる
2. **PR チェック CI**（2-2 前半） — 1 日で入る、効果大
3. **Server Action の権限テスト**（2-1） — 2-2 と組み合わせて回帰防止
4. **Cloud Run デプロイ手順の文書化**（2-3） — 実デプロイの直前で良い
5. **UI / E2E テスト**（2-1） — Phase 2 着手前にあると安全
