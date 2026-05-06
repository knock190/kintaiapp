## App Router 設計ガイド

### 基本方針
- `page.tsx` と `layout.tsx` は全て RSC (React Server Component)
- `error.tsx` のみ Client Component
- ビジネスロジックは `features/` に委譲
- ルートグループで **認証境界（未認証 / member / admin）** を表現
- Next.js 15+ のグローバル型定義（`LayoutProps` / `PageProps`）を活用

### ルートグループ戦略

#### 認証別グループ
```
app/
├─ (public)/                 # 未認証エリア（middleware: 認証不要）
│  ├─ login/                 → /login
│  └─ password/initial/      → /password/initial
├─ (member)/                 # メンバー認証境界（role: member / admin）
│  └─ member/dashboard/      → /member/dashboard
└─ (admin)/                  # 管理者認証境界（role: admin のみ）
   └─ admin/
      ├─ dashboard/          → /admin/dashboard
      └─ users/              → /admin/users
```

#### グループ別設定
| グループ | Layout | 認証チェック | 共通 UI |
| --- | --- | --- | --- |
| `(public)` | シンプル | ログイン済みならロールに応じてリダイレクト | なし |
| `(member)` | フル機能 | 認証必須 + `mustChangePassword === false` | Header（日付 / ユーザーメニュー） |
| `(admin)` | フル機能 + 管理ナビ | 認証必須 + `role === 'admin'` | Header + 管理ナビ（ダッシュボード ⇄ ユーザー管理） |

### ページコンポーネントパターン

#### 基本構造
```tsx
// app/(member)/member/dashboard/page.tsx
import { MemberDashboardTemplate } from '@/features/attendance/components/server/MemberDashboardTemplate'

export default async function MemberDashboardPage(_props: PageProps<'/member/dashboard'>) {
  return <MemberDashboardTemplate />
}
```

#### メタデータ設定
```tsx
// app/(member)/member/dashboard/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ダッシュボード | 勤怠管理',
  description: '今日の出退勤・離業を打刻する',
}

export default function MemberDashboardLayout(props: LayoutProps<'/member/dashboard'>) {
  return <>{props.children}</>
}
```

### 認証レイアウト実装
```tsx
// app/(member)/layout.tsx
import { redirect } from 'next/navigation'
import { getAuthenticatedSessionServer } from '@/features/auth/servers/redirect.server'
import { MemberLayoutWrapper } from '@/shared/components/layout/server/MemberLayoutWrapper'

export default async function MemberLayout(props: LayoutProps<'/'>) {
  const session = await getAuthenticatedSessionServer()

  if (session.user.mustChangePassword) {
    redirect('/password/initial')
  }

  return (
    <MemberLayoutWrapper user={session.user}>
      {props.children}
    </MemberLayoutWrapper>
  )
}
```

```tsx
// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { getAuthenticatedSessionServer } from '@/features/auth/servers/redirect.server'
import { AdminLayoutWrapper } from '@/shared/components/layout/server/AdminLayoutWrapper'

export default async function AdminLayout(props: LayoutProps<'/'>) {
  const session = await getAuthenticatedSessionServer()

  if (session.user.mustChangePassword) {
    redirect('/password/initial')
  }
  if (session.user.role !== 'admin') {
    redirect('/member/dashboard')
  }

  return (
    <AdminLayoutWrapper user={session.user}>
      {props.children}
    </AdminLayoutWrapper>
  )
}
```

### エラーハンドリング
```tsx
// app/(member)/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-md"
      >
        再試行
      </button>
    </div>
  )
}
```

### ローディング状態
```tsx
// app/(admin)/admin/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}
```
