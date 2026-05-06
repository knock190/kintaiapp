## Features ディレクトリ設計

### 概要
Features ディレクトリは、勤怠管理 Web システムの機能をドメイン単位で整理する。
各機能は独立したモジュールとして設計し、凝集度を高く保つ。

### ディレクトリ構造
```
features/
├─ attendance/   # 打刻・離業・修正（メンバー / 自分の勤怠）
├─ admin/        # 全員勤怠一覧・他人の修正・リセット・ユーザー管理
└─ auth/         # 認証（ログイン / 初回パスワード変更 / ログアウト）
```

### 機能モジュールの内部構造（例: attendance）
```
features/attendance/
├─ components/
│  ├─ server/
│  │  └─ MemberDashboardTemplate/
│  │     ├─ index.ts
│  │     └─ MemberDashboardTemplate.tsx
│  └─ client/
│     ├─ ClockPanel/
│     │  ├─ index.ts
│     │  ├─ ClockPanelContainer.tsx
│     │  ├─ ClockPanelPresenter.tsx
│     │  └─ useClockPanel.ts
│     └─ AttendanceEditDialog/
│        ├─ index.ts
│        ├─ AttendanceEditDialogContainer.tsx
│        ├─ AttendanceEditDialogPresenter.tsx
│        └─ useAttendanceEditDialog.ts
├─ hooks/
│  ├─ useMyAttendanceQuery.ts
│  └─ useAttendanceMutation.ts
├─ queries/
│  ├─ keys.ts
│  └─ helpers.ts
├─ actions/
│  ├─ clockIn.ts
│  ├─ clockOut.ts
│  ├─ markAway.ts
│  ├─ markBack.ts
│  └─ updateMyAttendance.ts
├─ types/
│  └─ index.ts
└─ utils/
   └─ status-label.ts
```

### Container/Presenter パターン
Container は DOM を直接レンダリングせず、Presenter に props を渡す。

#### Container（ロジック層）
```tsx
// features/attendance/components/client/ClockPanel/ClockPanelContainer.tsx
'use client'

import { ClockPanelPresenter } from './ClockPanelPresenter'
import { useClockPanel } from './useClockPanel'

export function ClockPanelContainer() {
  const {
    attendance,
    isPending,
    onClockIn,
    onClockOut,
    onMarkAway,
    onMarkBack,
    onOpenEdit,
  } = useClockPanel()

  return (
    <ClockPanelPresenter
      attendance={attendance}
      isPending={isPending}
      onClockIn={onClockIn}
      onClockOut={onClockOut}
      onMarkAway={onMarkAway}
      onMarkBack={onMarkBack}
      onOpenEdit={onOpenEdit}
    />
  )
}
```

#### Presenter（表示層）
```tsx
// features/attendance/components/client/ClockPanel/ClockPanelPresenter.tsx
import { Card, CardContent } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { Button } from '@/shared/components/ui/button'
import type { AttendanceDTO } from '@/external/dto/attendance.dto'

type Props = {
  attendance: AttendanceDTO
  isPending: boolean
  onClockIn: (style: 'office' | 'remote' | 'direct_visit') => void
  onClockOut: (style: 'normal' | 'direct_return') => void
  onMarkAway: () => void
  onMarkBack: () => void
  onOpenEdit: () => void
}

export function ClockPanelPresenter({ attendance, isPending, onMarkAway, onMarkBack, onOpenEdit }: Props) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <StatusBadge status={attendance.status} />
        <div>出勤時刻: {attendance.clockIn?.at ?? '--:--'}</div>
        <div>退勤時刻: {attendance.clockOut?.at ?? '--:--'}</div>
        <div className="flex gap-2">
          {attendance.status === 'working' && (
            <Button onClick={onMarkAway} disabled={isPending}>離業</Button>
          )}
          {attendance.status === 'away' && (
            <Button onClick={onMarkBack} disabled={isPending}>業務復帰</Button>
          )}
          <Button onClick={onOpenEdit} variant="outline">修正</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Server Components テンプレート
```
server/
├─ LoginPageTemplate/
│  ├─ index.ts
│  └─ LoginPageTemplate.tsx
├─ MemberDashboardTemplate/
│  ├─ index.ts
│  └─ MemberDashboardTemplate.tsx
├─ AdminDashboardTemplate/
│  ├─ index.ts
│  └─ AdminDashboardTemplate.tsx
└─ AdminUsersTemplate/
   ├─ index.ts
   └─ AdminUsersTemplate.tsx
```

### Client Components の命名規則
index.ts でエクスポートする際は、より具体的な名前に変更する。
```tsx
// features/auth/components/client/Login/index.ts
export { LoginContainer as LoginForm } from './LoginContainer'

// features/attendance/components/client/ClockPanel/index.ts
export { ClockPanelContainer as ClockPanel } from './ClockPanelContainer'

// features/admin/components/client/AttendanceTable/index.ts
export { AttendanceTableContainer as AttendanceTable } from './AttendanceTableContainer'
```

### Presenter コンポーネントの使用ルール
- Presenter は同じ機能ディレクトリ内の Container からのみ呼び出す。
- 他の Presenter の直接呼び出しは禁止。

### コンポーネント分割のルール
#### 1 ファイル 1 コンポーネント
- すべての Client Component は 1 ファイルに 1 コンポーネント。

#### View 専用コンポーネント（ロジックなし）
同じディレクトリ内に配置する（例: `StatusBadge`, `WorkStylePill` は `shared/components/ui` 配下）。

#### ロジックを含むコンポーネント
client 配下に新しいディレクトリを作成する（Container / Presenter / hook の 3 点セット）。

### ベストプラクティス
1. Presenter は表示のみでロジックを持たない（状態遷移の判断は hook 側）
2. ロジックは Container + Custom Hook に集約
3. ステータスバッジ・勤務形態ピル・日付ナビなど汎用 UI は `shared/` へ移動
4. 型安全性のため型定義は明示的に行う（DTO は `external/dto/` を参照）
5. ステータスごとの操作可否（Off で離業不可など）は hook で判定し、Presenter では受け取った flag を表示するだけにする
