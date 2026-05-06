## アーキテクチャ設計

### 全体構成
```
frontend/src/
├─ app/          # App Router (薄く保つ・認証境界を表現)
├─ features/     # 機能別モジュール (attendance / auth / admin)
├─ shared/       # 共通コンポーネント・ユーティリティ
└─ external/     # 外部連携層 (DB / ドメインサービス呼び出し)
```

### 設計原則
1. **関心の分離**: ドメイン / アプリケーション / プレゼンテーションの責任を明確に
2. **Server Components 優先**: クライアントサイドの JS を最小化（RSC で初期表示）
3. **型安全性**: TypeScript と Zod による境界の型保証
4. **テスタビリティ**: ドメイン層 / Service 層 / UI 層を独立してテスト可能に
5. **不変条件の保証**: Attendance / User 集約のメソッド経由でのみ状態を変更する

### レイヤーの責務
#### App Router (`/app`)
- ルーティング定義（`(public)` / `(member)` / `(admin)` のルートグループで認証境界を分離）
- メタデータ設定
- 認証 / ロールチェック（layout.tsx と middleware）
- エラーハンドリング（`error.tsx`）

#### Features (`/features`)
- 画面別のビジネスロジック（打刻 / 管理者の修正・リセット / ユーザー管理）
- UI 実装（Container / Presenter）
- ローカル状態管理
- カスタムフック（TanStack Query の `useQuery` / `useMutation` を集約）

#### Shared (`/shared`)
- 共通コンポーネント（Header / StatusBadge / WorkStylePill 等）
- ユーティリティ関数（JST 日付整形・状態ラベル変換）
- 型定義（DTO / 表示モデル）
- プロバイダー（QueryProvider / Toaster）

#### External (`/external`)
- ドメインサービス・Repository 呼び出しの入口（Server Actions / Server Functions）
- DTO による境界の型保証
- Drizzle 経由の DB アクセス（現状は Next.js から直接接続）
- 将来的に外部 API 化する場合の差し替えポイント

### データフロー
```mermaid
graph TD
    A[Page Component RSC] --> B[Feature PageTemplate RSC]
    B --> C[Container Client Component]
    C --> D[Custom Hook (useQuery/useMutation)]
    D --> E[Server Action *.action.ts]
    E --> F[Domain Service / Aggregate Method]
    F --> G[Repository (Drizzle)]
    G --> H[(PostgreSQL)]
```

### 認証アーキテクチャ
- Better Auth（credentials provider）による社員 ID + パスワード認証
- `customSession` で `role`（member / admin） / `mustChangePassword` をセッションに付与
- ルートグループでの認証境界分離: `(public)` / `(member)` / `(admin)`
- `layout.tsx` で role チェック、Server Actions 内でも `requireMember` / `requireAdmin` で再チェック（多層防御）
- 無効化済みアカウント（`deactivatedAt !== null`）はログイン不可
