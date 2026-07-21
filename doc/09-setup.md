# セットアップ / 本番準備

## 環境変数

`.env.example` をもとに設定します。Cloud Run では Secret Manager かサービス環境変数で同じ値を注入します。

| 変数 | 用途 |
| --- | --- |
| `DATABASE_URL` | Postgres 接続文字列。開発は Docker Compose、本番は Neon の接続文字列 |
| `BETTER_AUTH_SECRET` | Better Auth の署名秘密鍵。32 文字以上のランダム値 |
| `BETTER_AUTH_URL` | アプリの公開 URL。Cloud Run デプロイ後の HTTPS URL |
| `INITIAL_ADMIN_EMPLOYEE_ID` | 初期管理者 seed 用の社員 ID |
| `INITIAL_ADMIN_NAME` | 初期管理者 seed 用の名前 |
| `INITIAL_ADMIN_PASSWORD` | 初期管理者 seed 用の初期パスワード |
| `GUEST_MEMBER_EMPLOYEE_ID` | ゲスト（メンバー）用の社員 ID。既定 `guest-member` |
| `GUEST_MEMBER_NAME` | ゲスト（メンバー）の表示名 |
| `GUEST_ADMIN_EMPLOYEE_ID` | ゲスト（管理者）用の社員 ID。既定 `guest-admin` |
| `GUEST_ADMIN_NAME` | ゲスト（管理者）の表示名 |
| `GUEST_PASSWORD` | ゲスト共通パスワード。**設定するとゲストログインが有効になる**（未設定なら無効） |
| `PORT` | Next.js 起動ポート。Cloud Run は `8080` |

## ゲストログイン

採用/デモ向けに、ログイン画面とトップページから 1 クリックで体験できる「ゲスト（メンバー）」「ゲスト（管理者）」ボタンを提供します。ゲストは共有アカウントで、**ログイン時にそのゲスト所有の `attendances` を全削除**して初期状態でスタートします。

有効化するには、`GUEST_PASSWORD` を設定したうえで seed を流します。

```bash
pnpm --dir frontend db:seed:guests
```

## 本番準備

Cloud Run へデプロイする前に、Neon の `DATABASE_URL` を設定した状態でマイグレーションと初期管理者 seed を実行します。

```bash
pnpm --dir frontend db:migrate
pnpm --dir frontend db:seed:admin
```

コンテナはルートの `Dockerfile` でビルドできます。

```bash
docker build -t kintaiapp .
docker run --env-file .env -p 8080:8080 kintaiapp
```
