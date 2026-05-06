## TanStack Query 実装ガイド

### 概要
TanStack Query を使用してサーバー状態を管理し、Next.js App Router の Server Components と連携させる。
勤怠管理では「自分の今日の勤怠」「全員の当日勤怠（管理者）」「ユーザー一覧」を主要キャッシュとして扱う。

### セットアップ
#### Provider 設定
```tsx
// shared/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,                      // RSC の hydrate データを常に優先
            gcTime: 5 * 60 * 1000,             // 5 分
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

#### staleTime と gcTime の設定意図
| 設定 | 値 | 理由 |
| --- | --- | --- |
| staleTime | 0 | RSC で hydrate されたデータを常に優先 |
| gcTime | 5 分 | キャッシュを保持し再取得を抑える |

> 管理者ダッシュボードの全員勤怠一覧は `refetchInterval`（30 秒想定）で別途定期更新する。

### サーバー用 QueryClient
```tsx
// shared/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'
import { cache } from 'react'

export const getQueryClient = cache(() => new QueryClient())
```

### クエリキーの管理
```ts
// features/attendance/queries/keys.ts
export const attendanceKeys = {
  all: ['attendance'] as const,
  my: (date: string) => [...attendanceKeys.all, 'my', date] as const,
  list: (date: string) => [...attendanceKeys.all, 'list', date] as const,
}

// features/admin/queries/keys.ts
export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (userId: string) => [...userKeys.all, 'detail', userId] as const,
}
```

### サーバーサイドプリフェッチ
```tsx
// features/attendance/components/server/MemberDashboardTemplate/MemberDashboardTemplate.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/shared/lib/query-client'
import { attendanceKeys } from '@/features/attendance/queries/keys'
import { getMyAttendanceQuery } from '@/external/handler/attendance/attendance.query.server'
import { getAuthenticatedSessionServer } from '@/features/auth/servers/redirect.server'
import { todayInJst } from '@/shared/lib/date'
import { ClockPanel } from '../../client/ClockPanel'

export async function MemberDashboardTemplate() {
  const session = await getAuthenticatedSessionServer()
  const today = todayInJst()
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery({
    queryKey: attendanceKeys.my(today),
    queryFn: () => getMyAttendanceQuery(session.user.id, today),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClockPanel />
    </HydrationBoundary>
  )
}
```

### クライアントサイド Query
Server Actions（`*.query.action.ts`）を `queryFn` から呼び出す。
```ts
// features/attendance/hooks/useMyAttendanceQuery.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { attendanceKeys } from '../queries/keys'
import { getMyAttendanceQueryAction } from '@/external/handler/attendance/attendance.query.action'

export function useMyAttendanceQuery(date: string) {
  return useQuery({
    queryKey: attendanceKeys.my(date),
    queryFn: () => getMyAttendanceQueryAction({ date }),
  })
}
```

```ts
// features/admin/hooks/useAttendanceListQuery.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { attendanceKeys } from '@/features/attendance/queries/keys'
import { listAttendancesQueryAction } from '@/external/handler/attendance/attendance.query.action'

export function useAttendanceListQuery(date: string) {
  return useQuery({
    queryKey: attendanceKeys.list(date),
    queryFn: () => listAttendancesQueryAction({ date }),
    refetchInterval: 30_000,                   // 管理者ダッシュボードは 30 秒ごとにポーリング
  })
}
```

### Mutation 実装
```ts
// features/attendance/hooks/useAttendanceMutation.ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceKeys } from '../queries/keys'
import {
  clockInAction,
  clockOutAction,
  markAwayAction,
  markBackAction,
  updateMyAttendanceAction,
} from '@/external/handler/attendance/attendance.command.action'
import { todayInJst } from '@/shared/lib/date'

function useInvalidateAttendance() {
  const queryClient = useQueryClient()
  return () => {
    const today = todayInJst()
    queryClient.invalidateQueries({ queryKey: attendanceKeys.my(today) })
    queryClient.invalidateQueries({ queryKey: attendanceKeys.list(today) })
  }
}

export function useClockInMutation() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: clockInAction, onSuccess: invalidate })
}

export function useClockOutMutation() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: clockOutAction, onSuccess: invalidate })
}

export function useMarkAwayMutation() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: markAwayAction, onSuccess: invalidate })
}

export function useMarkBackMutation() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: markBackAction, onSuccess: invalidate })
}

export function useUpdateMyAttendanceMutation() {
  const invalidate = useInvalidateAttendance()
  return useMutation({ mutationFn: updateMyAttendanceAction, onSuccess: invalidate })
}
```

### パフォーマンス最適化
- ダッシュボード初期表示は RSC で prefetch → HydrationBoundary で受け渡す
- `invalidateQueries` は当日のキー（`attendanceKeys.my(today)` / `attendanceKeys.list(today)`）に限定
- 楽観的更新が必要な操作（離業ボタンの即時反映等）は `onMutate` で先行更新し、失敗時に `onError` でロールバック
- 管理者一覧のポーリングはタブ非アクティブ時に止めるため `refetchIntervalInBackground: false` をオプションで検討
