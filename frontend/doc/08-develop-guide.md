# develop guide

# 開発ガイド

## 新規画面追加フロー

### 1. ルート設計

適切なルートグループを選択：
- `(public)` - 未認証ユーザー向け（ログイン / 初回パスワード変更）
- `(member)` - メンバー認証必須（自分の勤怠操作）
- `(admin)` - 管理者認証必須（全員勤怠 / ユーザー管理）

### 2. ページ作成

```bash
# 例: 管理者の月次レポート画面（将来追加する場合）
mkdir -p app/(admin)/admin/reports/[month]
touch app/(admin)/admin/reports/[month]/page.tsx
touch app/(admin)/admin/reports/[month]/loading.tsx
```

### 3. Feature 実装

```bash
# Feature モジュール作成
mkdir -p features/admin/components/server
mkdir -p features/admin/components/client/MonthlyReport
mkdir -p features/admin/hooks
mkdir -p features/admin/types
```

### 4. 実装チェックリスト

- [ ] ページコンポーネント（RSC）
- [ ] サーバーテンプレート（prefetchQuery + HydrationBoundary）
- [ ] クライアントコンポーネント（Container / Presenter）
- [ ] カスタムフック（useQuery / useMutation）
- [ ] Server Actions / Server Functions（CQRS で命名）
- [ ] DTO / Zod スキーマ
- [ ] ローディング状態（`loading.tsx`）
- [ ] エラーハンドリング（`error.tsx`）
- [ ] 認可チェック（`requireMember` / `requireAdmin`）

## コーディング規約

### ファイル命名規則

```
- コンポーネント: PascalCase.tsx
- フック: useCamelCase.ts
- ユーティリティ: camelCase.ts
- 型定義: types/index.ts
- Server Functions: camelCase.server.ts (xxxQuery / xxxCommand)
- Server Actions:   camelCase.action.ts (xxxQueryAction / xxxCommandAction)
```

### インポート順序

```tsx
// 1. React / Next
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. 外部ライブラリ
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 3. 内部モジュール（絶対パス）
import { Button } from '@/shared/components/ui/button'
import { useMyAttendanceQuery } from '@/features/attendance/hooks/useMyAttendanceQuery'

// 4. 相対パス
import { ClockPanelPresenter } from './ClockPanelPresenter'
import type { ClockPanelProps } from './types'
```

### コンポーネント構造

```tsx
// 1. 型定義
interface ComponentProps {
  // ...
}

// 2. コンポーネント定義
export function Component({ prop1, prop2 }: ComponentProps) {
  // 3. フック
  const router = useRouter()
  const { data } = useQuery(/* ... */)

  // 4. ローカル状態
  const [state, setState] = useState()

  // 5. 副作用
  useEffect(() => {}, [])

  // 6. ハンドラー（必要に応じて useCallback）
  const handleClick = useCallback(() => {
    // 処理
  }, [/* 依存配列 */])

  // 7. レンダリング
  return <div>...</div>
}
```

## 型定義ガイドライン

### 基本的な型定義

```ts
// ❌ 避けるべき
const data: any = {}
const items: Array<Object> = []

// ✅ 推奨
const data: AttendanceDTO = {}
const items: AttendanceListItemDTO[] = []
```

### ユーティリティ型の活用

```ts
// Partial（一部のプロパティ）
type UpdateAttendanceInput = Partial<AttendanceDTO>

// Omit（特定のプロパティを除外）
type CreateUserInput = Omit<UserDTO, 'id' | 'isActive' | 'mustChangePassword'>

// Pick（特定のプロパティのみ）
type AttendanceSummary = Pick<AttendanceDTO, 'status' | 'clockIn' | 'clockOut'>
```

## Next.js グローバル型定義

Next.js 15 以降では、`LayoutProps` と `PageProps` がグローバルに利用可能。import する必要はない。

### Layout Component

```tsx
// app/(member)/layout.tsx
export default function MemberLayout(props: LayoutProps<'/'>) {
  return (
    <MemberLayoutWrapper>
      {props.children}
    </MemberLayoutWrapper>
  )
}
```

### Page Component

```tsx
// app/(admin)/admin/dashboard/page.tsx
export default async function AdminDashboardPage(props: PageProps<'/admin/dashboard'>) {
  const searchParams = await props.searchParams
  const date = typeof searchParams.date === 'string' ? searchParams.date : undefined

  return <AdminDashboardTemplate date={date} />
}

// パラメータが不要な場合
export default function AdminUsersPage(_props: PageProps<'/admin/users'>) {
  return <AdminUsersTemplate />
}
```

### 型の詳細

- `LayoutProps<T>`: T はルートパス。`children` と `params` を含む
- `PageProps<T>`: T はルートパス。`params` と `searchParams` を含む
- 両方とも Promise を返すため、await が必要

## Server Actions と Server Functions

### 命名規則

`external/handler` ディレクトリ内の関数は、以下の命名規則に従う。

#### Server Functions（`*.server.ts`）

サーバー専用関数は、操作の種類に応じて以下の命名規則を使用する：

- **Query（読み取り）**: `xxxQuery` または `xxxQueryServer`
  - 例: `getMyAttendanceQuery`, `listAttendancesQuery`, `listUsersQuery`
- **Command（書き込み）**: `xxxCommand` または `xxxCommandServer`
  - 例: `clockInCommand`, `updateMyAttendanceCommand`, `createUserCommand`

```ts
// ❌ 悪い例
export async function getMyAttendanceServer(date: string) { ... }

// ✅ 良い例
export async function getMyAttendanceQuery(userId: string, date: string) { ... }
export async function clockInCommand(userId: string, style: ClockInStyle) { ... }
```

#### Server Actions（`*.action.ts`）

Server Actions は、対応する Server Function に `Action` サフィックスを付ける：

- **Query Actions**: `xxxQueryAction`
  - 例: `getMyAttendanceQueryAction`, `listAttendancesQueryAction`
- **Command Actions**: `xxxCommandAction`
  - 例: `clockInCommandAction`, `updateMyAttendanceCommandAction`, `resetUserAttendanceCommandAction`

```ts
// ❌ 悪い例
export async function clockInAction(input: unknown) { ... }

// ✅ 良い例
export async function clockInCommandAction(input: unknown) { ... }
export async function getMyAttendanceQueryAction(input: unknown) { ... }
```

### 重要な使い分けルール

**RSC (React Server Component) から呼び出す場合は必ず `*Query` / `*Command` 関数を使用する。`*Action` 関数は使用しない。**

- **`*Action`**: Client Component やフォームアクションからのみ OK
- **`*Query` / `*Command`**: Server Component (page.tsx, layout.tsx, PageTemplate.tsx) からはこちらを使用

| 呼び出し元 | 使用すべき関数 | 例 |
|---|---|---|
| Client Component | `*Action` | `useQuery` の queryFn、フォーム submit |
| Server Component (RSC) | `*Query` / `*Command` | page.tsx, layout.tsx, PageTemplate.tsx |

### 認証ヘルパー関数

Server Component で認証を扱う際は、以下のヘルパー関数を使用する。

#### requireAuthServer

認証チェックのみを行い、未認証の場合は `/login` にリダイレクトする。セッション情報が不要な場合に使用。

```ts
// external/handler/attendance/attendance.query.server.ts
import { requireAuthServer } from '@/features/auth/servers/redirect.server'

export async function listAttendancesQuery(date: string) {
  await requireAuthServer()                 // 認証チェックのみ

  const items = await attendanceService.listForDate(date)
  return items
}
```

#### getAuthenticatedSessionServer

認証チェックとセッション取得を 1 回で行う。未認証の場合は `/login` にリダイレクトする。セッション情報（`session.user.id` / `session.user.role` 等）が必要な場合に使用。

```ts
// external/handler/attendance/attendance.command.server.ts
import { getAuthenticatedSessionServer } from '@/features/auth/servers/redirect.server'
import { ClockInInputSchema } from '@/external/dto/attendance.dto'

export async function clockInCommand(request: unknown) {
  const session = await getAuthenticatedSessionServer()        // 認証 + セッション取得

  const input = ClockInInputSchema.parse(request)
  const attendance = await attendanceService.clockIn(session.user.id, input.style)
  return attendance
}
```

**使い分けのポイント:**
- セッション情報が **不要** → `requireAuthServer()`
- セッション情報が **必要** → `getAuthenticatedSessionServer()`
- 管理者専用 Action → `requireAdmin()`

### Server Actions（クライアントから呼び出し可能）

```ts
// external/handler/attendance/attendance.command.action.ts
'use server'

import { revalidatePath } from 'next/cache'
import { clockInCommand } from './attendance.command.server'

export async function clockInCommandAction(input: unknown) {
  const result = await clockInCommand(input)

  revalidatePath('/member/dashboard')
  revalidatePath('/admin/dashboard')

  return result
}
```

**使用例（Client Component）:**
```tsx
// features/attendance/hooks/useMyAttendanceQuery.ts
export function useMyAttendanceQuery(date: string) {
  return useQuery({
    queryKey: attendanceKeys.my(date),
    queryFn: () => getMyAttendanceQueryAction({ date }),    // ✅ Client Component からは Action
  })
}
```

### Server Functions（サーバー専用）

```ts
// external/handler/attendance/attendance.command.server.ts
import 'server-only'

export async function clockInCommand(input: unknown) {
  // ドメインロジック呼び出し
}
```

**使用例（Server Component）:**
```tsx
// app/(member)/member/dashboard/page.tsx
export default async function MemberDashboardPage() {
  const session = await getAuthenticatedSessionServer()
  const attendance = await getMyAttendanceQuery(session.user.id, todayInJst())  // ✅ RSC からは Query/Command

  return <ClockPanel initialData={attendance} />
}
```

**使用例（layout.tsx - generateMetadata）:**
```tsx
// app/(admin)/admin/users/layout.tsx
export async function generateMetadata(_props: LayoutProps<'/admin/users'>): Promise<Metadata> {
  return {
    title: 'ユーザー管理 | 勤怠管理',
  }
}
```

## テスト戦略

### 単体テスト

ドメインロジック（集約メソッド）はピュアに保ち、DB なしでテストする。

```ts
// src/server/domain/attendance.test.ts
import { describe, it, expect } from 'vitest'
import { Attendance } from './attendance'

describe('Attendance.recordClockIn', () => {
  it('Off → Working に遷移する', () => {
    const attendance = Attendance.empty('user-1', '2026-05-07')
    attendance.recordClockIn(new Date('2026-05-07T09:00:00+09:00'), 'office')

    expect(attendance.status).toBe('working')
    expect(attendance.clockIn?.style).toBe('office')
  })

  it('既に Working の場合は STATE_TRANSITION_INVALID をスローする', () => {
    const attendance = Attendance.empty('user-1', '2026-05-07')
    attendance.recordClockIn(new Date('2026-05-07T09:00:00+09:00'), 'office')

    expect(() =>
      attendance.recordClockIn(new Date('2026-05-07T10:00:00+09:00'), 'remote')
    ).toThrow('STATE_TRANSITION_INVALID')
  })
})
```

### 統合テスト

```tsx
// features/attendance/components/client/ClockPanel/ClockPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClockPanel } from './'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('ClockPanel', () => {
  it('ステータス Off のときに「出勤打刻」ボタンを表示する', async () => {
    render(<ClockPanel />, { wrapper: createWrapper() })

    expect(await screen.findByRole('button', { name: /出勤打刻/ })).toBeInTheDocument()
  })
})
```

## パフォーマンス最適化

### 動的インポート

```tsx
// 重いコンポーネントの遅延読み込み
const AttendanceEditDialog = dynamic(
  () => import('@/features/attendance/components/client/AttendanceEditDialog'),
  {
    loading: () => <DialogSkeleton />,
    ssr: false,
  }
)
```

### 画像最適化

```tsx
import Image from 'next/image'

<Image
  src="/avatar.png"
  alt="User Avatar"
  width={32}
  height={32}
  priority
/>
```

### バンドルサイズ削減

```ts
// ❌ 全体インポート
import _ from 'lodash'

// ✅ 個別インポート
import debounce from 'lodash/debounce'
```

## トランザクション管理（external ディレクトリ）

> **注意**: このセクションは `external` ディレクトリ内の Repository / Service 層の実装に関する内容。
>
> - **適用範囲**: `external` ディレクトリのみ
> - **適用外**: `features` / `shared` / `app` ディレクトリには適用されない
>
> Next.js 自体をクリーンアーキテクチャにしているわけではない。データアクセス層（Repository / Service）のみをクリーンアーキテクチャで設計している。

### アーキテクチャ概要

`external` ディレクトリでは、クリーンアーキテクチャに基づいたトランザクション管理を実装する。

```
Service 層 (use case)
    ↓ 依存 (interface)
Domain 層 (ITransactionManager, IRepository)
    ↑ 実装
Repository 層 (TransactionRepository, Repository 実装)
    ↓ 依存
Client 層 (db, Drizzle ORM)
```

### トランザクションが必要な操作

トランザクションは以下の条件で使用する：

1. **集約内の複数テーブルへの書き込み**
   - 例: `Attendance` 集約は `attendances` + `away_periods` をまとめて操作する

2. **読み取り + 書き込みのセット**
   - 例: 出勤打刻時に「同日のレコードを取得してから状態遷移して保存」する処理

3. **状態遷移を伴う Attendance 操作全般**
   - `clockIn` / `clockOut` / `markAway` / `markBack` / `updateMyAttendance` / `resetUserAttendance`

### トランザクション実装パターン

#### Service 層での使用

```ts
// external/service/attendance/attendance.service.ts
export class AttendanceService {
  constructor(
    private attendanceRepository: IAttendanceRepository,
    private transactionManager: ITransactionManager<DbClient>,
  ) {}

  async clockIn(userId: string, style: ClockInStyle): Promise<AttendanceDTO> {
    return this.transactionManager.execute(async (tx) => {
      // 1. 当日の Attendance を取得（無ければ Off で生成）
      const attendance = await this.attendanceRepository.findOrCreateForToday(userId, tx)

      // 2. ドメインメソッドで状態遷移（L1 / L4 を集約内で検証）
      attendance.recordClockIn(new Date(), style)

      // 3. 集約まとめて保存（attendances + away_periods）
      await this.attendanceRepository.save(attendance, tx)

      return attendance.toDTO()
    })
  }

  async resetForUser(targetUserId: string, date: string): Promise<AttendanceDTO> {
    return this.transactionManager.execute(async (tx) => {
      const attendance = await this.attendanceRepository.findByUserAndDate(targetUserId, date, tx)
      if (!attendance) throw new Error('NOT_FOUND')

      attendance.reset()                                // L6: clockIn/Out を null、awayPeriods を空、status を 'off'
      await this.attendanceRepository.save(attendance, tx)

      return attendance.toDTO()
    })
  }
}
```

#### Repository 層での対応

```ts
// external/repository/attendance.repository.ts
export class AttendanceRepository implements IAttendanceRepository {
  async save(attendance: Attendance, client: DbClient = db): Promise<void> {
    // attendances 本体の upsert
    await client
      .insert(attendances)
      .values(attendance.toRow())
      .onConflictDoUpdate({
        target: [attendances.userId, attendances.attendanceDate],
        set: { /* ... */ },
      })

    // away_periods は集約配下なので一旦消して入れ直す（同一トランザクション内）
    await client.delete(awayPeriods).where(eq(awayPeriods.attendanceId, attendance.id))

    if (attendance.awayPeriods.length > 0) {
      await client.insert(awayPeriods).values(
        attendance.awayPeriods.map((p) => ({
          id: p.id,
          attendanceId: attendance.id,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
        })),
      )
    }
  }
}
```

### COMMIT / ROLLBACK

Drizzle ORM の `db.transaction()` が自動的に処理する：

- **自動 COMMIT**: コールバック関数が正常に完了したら自動的に COMMIT
- **自動 ROLLBACK**: コールバック関数内でエラーが throw されたら自動的に ROLLBACK

```ts
// TransactionRepository 実装
async execute<T>(callback: (tx: DbClient) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx)
    // 成功 → 自動 COMMIT
    // エラー → 自動 ROLLBACK
  })
}
```

明示的に `commit()` や `rollback()` を呼ぶ必要はない。

### トランザクション不要な操作

以下の場合はトランザクションを使用しない：

1. **読み取り専用のクエリ**
   ```ts
   async listForDate(date: string): Promise<AttendanceListItemDTO[]> {
     return this.attendanceRepository.listForDate(date)        // 読み取りのみ
   }
   ```

2. **単一テーブルへの単純な操作**
   ```ts
   async listUsers(): Promise<UserDTO[]> {
     return this.userRepository.listAll()                      // 読み取りのみ
   }
   ```

3. **集約配下に子エンティティがない単一エンティティの更新**
   - 例: `User` の無効化（`deactivated_at` の更新のみ）

### 実装例まとめ

| ユースケース | トランザクション使用 | 理由 |
|---|---|---|
| 出勤打刻（clockIn） | ✅ 必要 | attendances 取得・更新 |
| 退勤打刻（clockOut） | ✅ 必要 | attendances 更新 + active away_period のクローズ |
| 離業（markAway） | ✅ 必要 | attendances 更新 + away_periods 追加 |
| 業務復帰（markBack） | ✅ 必要 | attendances 更新 + away_period の endedAt 確定 |
| 自分の修正（updateMyAttendance） | ✅ 必要 | attendances + away_periods の整合更新 |
| 管理者の修正（updateUserAttendance） | ✅ 必要 | 同上 |
| 管理者のリセット（resetUserAttendance） | ✅ 必要 | attendances + away_periods のクリア |
| ユーザー作成（createUser） | ✅ 必要 | users + accounts（Better Auth）に整合書き込み |
| パスワード再発行（reissuePassword） | ✅ 必要 | accounts.password の更新と監査 |
| ユーザー無効化（deactivateUser） | ❌ 不要 | users.deactivated_at の単一更新 |
| 自分の今日の勤怠取得（getMyAttendance） | ❌ 不要 | 読み取りのみ |
| 全員の当日勤怠一覧（listAttendances） | ❌ 不要 | 読み取りのみ |
| ユーザー一覧（listUsers） | ❌ 不要 | 読み取りのみ |

## デバッグテクニック

### React Query Devtools

開発環境で自動的に有効化される。`attendanceKeys` / `userKeys` の状態をリアルタイムに確認できる。

### Server Components のデバッグ

```tsx
// コンソール出力はサーバー側に表示
export default async function Page() {
  console.log('This logs on the server')

  const data = await getMyAttendanceQuery(/* ... */)
  console.log('Fetched attendance:', data)

  return <div>...</div>
}
```

### Client Components のデバッグ

```tsx
'use client'

export function Component() {
  // ブラウザコンソールに表示
  console.log('This logs in the browser')

  // React Developer Tools で確認可能
  return <div>...</div>
}
```
