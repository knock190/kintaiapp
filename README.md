# kintaiapp

社内のチャットで行っている勤怠報告を置き換える、Web ベースの勤怠管理アプリ。メンバーがブラウザから出勤・退勤・離業を打刻し、管理者がリアルタイムで全員の勤怠を確認・修正できる。

- 技術スタック: Next.js (App Router) / TypeScript / Better Auth / Drizzle / TanStack Query / Tailwind + shadcn/ui
- インフラ: Neon (Postgres) / Cloud Run / Docker Compose（開発）

セットアップ手順は [doc/09-setup.md](doc/09-setup.md) を参照。

## ドキュメント

### プロジェクト仕様（[doc/](doc/)）

- [01. 要件定義](doc/01-requirements.md)
- [02. ユースケース](doc/02-usecase.md)
- [03. ユビキタス言語](doc/03-ubiquitous-language.md)
- [04. ドメイン設計](doc/04-domain-design.md)
- [05. 画面設計](doc/05-screen-design.md)
- [06. データベース設計](doc/06-database-design.md)
- [07. API 設計](doc/07-api-design.md)
- [08. 残課題メモ](doc/08-open-issues.md)
- [09. セットアップ / 本番準備](doc/09-setup.md)

### フロントエンド実装ガイド（[frontend/doc/](frontend/doc/)）

- [01. 技術構成](frontend/doc/01-tech-stack.md)
- [02. アーキテクチャ設計](frontend/doc/02-architecture.md)
- [03. App Router 設計ガイド](frontend/doc/03-app-router-guide.md)
- [04. Features ディレクトリ設計](frontend/doc/04-features-design.md)
- [05. External Layer（外部連携層）](frontend/doc/05-external-layer.md)
- [06. TanStack Query 実装ガイド](frontend/doc/06-tanstack-query-guide.md)
- [07. 認証設計](frontend/doc/07-auth-guide.md)
- [08. 開発ガイド](frontend/doc/08-develop-guide.md)
