## External Layer (外部連携層)

### 概要
External 層は、Next.js アプリと永続化レイヤ（PostgreSQL）/ 外部システムとの境界を管理する。
Phase 1 では Drizzle で DB に直接アクセスするが、将来 API 層を切り出す際に変更箇所を局所化するために層として分離する。

### 設計思想
- **変更可用性**: 将来 API 化したときの影響を `external/service/*` に閉じ込める
- **関心の分離**: ドメインロジック（Attendance / User 集約）と永続化を分離
- **型安全性**: DTO（`external/dto/*`）で API 境界の入出力を Zod 検証

### ディレクトリ構造
```
external/
├─ dto/          # 入出力スキーマ（Zod）と DTO 型
├─ handler/      # Server Actions / Server Functions のエントリーポイント (CQRS)
├─ service/      # ドメインサービス・Repository 呼び出しを束ねるユースケース層
└─ client/       # Drizzle クライアント（将来は API クライアントを並置）
```

### レイヤーの責務
#### DTO (Data Transfer Object)
API 境界で公開する入出力スキーマを定義する。`doc/07-api-design.md` の DTO と一致させる。

```ts
// external/dto/attendance.dto.ts
import { z } from 'zod'

export const ClockInStyleSchema = z.enum(['office', 'remote', 'direct_visit'])
export const ClockOutStyleSchema = z.enum(['normal', 'direct_return'])
export const AttendanceStatusSchema = z.enum(['off', 'working', 'away', 'done'])

export const AwayPeriodSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
})

export const AttendanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  attendanceDate: z.string(),                  // YYYY-MM-DD（JST）
  status: AttendanceStatusSchema,
  clockIn: z
    .object({ at: z.string().datetime(), style: ClockInStyleSchema })
    .nullable(),
  clockOut: z
    .object({ at: z.string().datetime(), style: ClockOutStyleSchema })
    .nullable(),
  awayPeriods: z.array(AwayPeriodSchema),
})

export const ClockInInputSchema = z.object({ style: ClockInStyleSchema })
export const ClockOutInputSchema = z.object({ style: ClockOutStyleSchema })

export type AttendanceDTO = z.infer<typeof AttendanceSchema>
export type ClockInInput = z.infer<typeof ClockInInputSchema>
export type ClockOutInput = z.infer<typeof ClockOutInputSchema>
```

#### Handler (CQRS パターン)
コマンド（書き込み）とクエリ（読み取り）を分離する。

```ts
// external/handler/attendance/attendance.query.server.ts
import 'server-only'
import { attendanceService } from '../../service/attendance/attendance.service'
import { AttendanceSchema } from '../../dto/attendance.dto'

export async function getMyAttendanceQuery(userId: string, date: string) {
  const attendance = await attendanceService.getOrInitialize(userId, date)
  return AttendanceSchema.parse(attendance)
}
```

```ts
// external/handler/attendance/attendance.command.action.ts
'use server'

import { revalidatePath } from 'next/cache'
import { ClockInInputSchema } from '../../dto/attendance.dto'
import { attendanceService } from '../../service/attendance/attendance.service'
import { getAuthenticatedSessionServer } from '@/features/auth/servers/redirect.server'

export async function clockInAction(request: unknown) {
  const session = await getAuthenticatedSessionServer()
  const input = ClockInInputSchema.parse(request)

  const attendance = await attendanceService.clockIn(session.user.id, input.style)

  revalidatePath('/member/dashboard')
  revalidatePath('/admin/dashboard')
  return { ok: true as const, data: attendance }
}
```

#### Service (ドメインサービス / ユースケース)
集約のロード → ドメインメソッド呼び出し → 保存、を 1 トランザクションで束ねる。

```ts
// external/service/attendance/attendance.service.ts
import 'server-only'
import { db } from '../../client/db'
import { attendanceRepository } from '../../repository/attendance.repository'

class AttendanceService {
  async clockIn(userId: string, style: 'office' | 'remote' | 'direct_visit') {
    return db.transaction(async (tx) => {
      const attendance = await attendanceRepository.findOrCreateForToday(userId, tx)
      attendance.recordClockIn(new Date(), style)        // ドメインメソッド（L1 / L4 を内部で検証）
      await attendanceRepository.save(attendance, tx)
      return attendance.toDTO()
    })
  }

  async getOrInitialize(userId: string, date: string) {
    const attendance = await attendanceRepository.findByUserAndDate(userId, date)
    return attendance?.toDTO() ?? attendanceRepository.emptyDTO(userId, date)
  }
}

export const attendanceService = new AttendanceService()
```

#### Client (DB / 外部接続)
Drizzle のクライアントを集約する。

```ts
// external/client/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
```

### データフロー
#### 現在の実装（Next.js + DB 直接接続）
```
Client Component (Container)
    ↓ useMutation
Server Action (*.command.action.ts)
    ↓ 認可チェック + Zod parse
Service (Attendance / User 集約のロード → ドメインメソッド → 保存)
    ↓
Repository (Drizzle)
    ↓
PostgreSQL
```

#### 将来の実装（Next.js BFF + 外部 API）
```
Client Component
    ↓
Server Action (*.command.action.ts)
    ↓
Service (HTTP 経由で API 呼び出し)
    ↓
External API
    ↓
Database
```

### 命名規則
- **Query（読み取り）**: `*.query.server.ts` / `*.query.action.ts`
- **Command（書き込み）**: `*.command.server.ts` / `*.command.action.ts`
- **Server 専用**: `import 'server-only'` を必ず記載
- **DTO**: 入出力スキーマを Zod で定義し、型は `z.infer<typeof Schema>` で導出

### ベストプラクティス
1. DTO のスキーマは API 設計書（`doc/07-api-design.md`）と完全に一致させる
2. ドメイン上の不変条件（L1〜L16）は Service ではなく **集約のメソッド内**で検証する
3. エラーは ActionResult 形式に統一し、UI 側はトーストや FormMessage に流す
4. 集約メソッドは純粋（DB 非依存）に保ち、Service 側でトランザクションを張る
5. テストは Service 層をモックして Container / Hook を検証する
