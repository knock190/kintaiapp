# 🧪 フロントエンドテスト戦略ガイド - 現場で使える実践的アプローチ

> 💡 **このドキュメントのゴール**
> フロントエンドテストの基礎から、App Router時代の現実的なテスト戦略まで、
> 「なぜそのテストが必要なのか」を腑に落ちるレベルで理解する

---

## 📚 目次

1. [テストの基礎知識](#テストの基礎知識)
2. [テストピラミッド](#テストピラミッド)
3. [App Router時代のテストの難しさ](#app-router時代のテストの難しさ)
4. [本プロジェクトのテスト戦略](#本プロジェクトのテスト戦略)
5. [各テストの実装例](#各テストの実装例)
6. [E2Eテスト（Playwright + MSW）](#e2eテストplaywright--msw)
7. [よくある質問](#よくある質問)

---

## テストの基礎知識

### 🎯 なぜテストを書くのか？

```
テストがない世界:
┌────────────────────────────────────┐
│  機能追加                          │
│    ↓                               │
│  「動いた！」→ 本番デプロイ         │
│    ↓                               │
│  3日後: 「なんかバグってる...」     │
│    ↓                               │
│  原因調査に半日、修正に半日         │
│    ↓                               │
│  また別のバグが...（無限ループ）    │
└────────────────────────────────────┘

テストがある世界:
┌────────────────────────────────────┐
│  機能追加                          │
│    ↓                               │
│  テスト実行 → 失敗を検出！          │
│    ↓                               │
│  修正 → テスト成功                  │
│    ↓                               │
│  安心して本番デプロイ               │
│    ↓                               │
│  バグ激減、開発が楽しい！           │
└────────────────────────────────────┘
```

---

### 📊 テストの種類

| 種類 | 何をテストする？ | 速度 | 信頼性 |
|------|-----------------|------|--------|
| **Unit Test** | 関数・Hook単体 | ⚡ 超速い | 高い |
| **Integration Test** | 複数コンポーネント連携 | 🚀 やや遅い | 中程度 |
| **E2E Test** | システム全体 | 🐢 遅い | 低い（壊れやすい） |

---

### 🔍 テストカバレッジの種類

```
C0（Statement Coverage）:
  すべての「行」を実行したか？
  → 最低限のカバレッジ

C1（Branch Coverage）:
  すべての「分岐」を通ったか？
  → if文のtrue/false両方をテスト
  → 現場で最もよく使う

C2（Condition Coverage）:
  すべての「条件の組み合わせ」をテストしたか？
  → 複雑すぎて現実的ではない
```

**例：C1カバレッジ**

```typescript
function canPublish(note: Note): boolean {
  if (note.status !== 'Draft') {  // ← 分岐1
    return false;
  }
  if (note.sections.length === 0) {  // ← 分岐2
    return false;
  }
  return true;
}

// C1達成には最低3ケース必要:
// 1. status === 'Draft' && sections.length > 0  → true
// 2. status !== 'Draft'                         → 分岐1でfalse
// 3. sections.length === 0                      → 分岐2でfalse
```

---

### 🎁 テストがあると何が嬉しい？

| メリット | 具体例 |
|----------|--------|
| **デグレ防止** | 既存機能が壊れたら即座に検知 |
| **リファクタリングの安心感** | 動作保証があるから大胆に改善できる |
| **ライブラリ更新の安全性** | React 19へのアップデートで壊れた箇所を即発見 |
| **ドキュメント効果** | テストコードが仕様書代わりになる |
| **開発速度向上** | 手動確認の時間が減る |

---

### 🔄 特にライブラリ更新で威力を発揮

```
ライブラリ更新時のシナリオ:

テストなし:
┌─────────────────────────────────────────────┐
│  Next.js 15 → 16 にアップデート             │
│    ↓                                        │
│  ビルド成功！                               │
│    ↓                                        │
│  本番デプロイ                               │
│    ↓                                        │
│  ユーザー:「検索機能が動かない...」         │
│    ↓                                        │
│  原因: useSearchParamsの挙動が変わっていた  │
└─────────────────────────────────────────────┘

テストあり:
┌─────────────────────────────────────────────┐
│  Next.js 15 → 16 にアップデート             │
│    ↓                                        │
│  テスト実行                                 │
│    ↓                                        │
│  useNoteList.test.ts: FAILED ❌             │
│  「検索クエリの取得が失敗」                 │
│    ↓                                        │
│  デプロイ前に問題を発見・修正！             │
└─────────────────────────────────────────────┘
```

---

## テストピラミッド

### 🔺 理想的なテスト構成

```
            ▲
           /E2E\              少ない（5-10%）
          /─────\             遅い、壊れやすい
         /       \            主要フローのみ
        / Integra-\
       /   tion    \          中程度（20-30%）
      /─────────────\         コンポーネント連携
     /               \
    /    Unit Test    \       多い（60-70%）
   /───────────────────\      速い、安定
  /                     \     ロジックの検証
```

### なぜピラミッド型？

```
❌ アイスクリームコーン型（アンチパターン）

        ▓▓▓▓▓▓▓▓▓▓▓
       ▓ E2E Test  ▓     ← 多すぎ！遅い、壊れやすい
        ▓▓▓▓▓▓▓▓▓▓▓
           ▓▓▓
          ▓ Int ▓         ← 少ない
           ▓▓▓
            ▓
           ▓Unit▓         ← 少なすぎ！
            ▓

問題:
├─ E2Eが多いと実行時間が長い（30分以上）
├─ 環境依存で不安定（CI失敗が頻発）
├─ デバッグが困難（どこで失敗したかわからない）
└─ メンテナンスコストが高い
```

```
✅ ピラミッド型（推奨）

            ▲
           /E2E\              ← 少数（主要フロー）
          /─────\
         / Integra-\          ← 中程度
        /   tion    \
       /─────────────\
      /    Unit Test  \       ← 多数（高速）
     /─────────────────\

メリット:
├─ 実行時間が短い（数分）
├─ 安定している（環境依存が少ない）
├─ デバッグしやすい（失敗箇所が明確）
└─ メンテナンスコストが低い
```

---

### 📋 一般的なフロントエンドテスト対象

```
一般的なフロントエンドテスト戦略:

┌─────────────────────────────────────────────────────────┐
│  Unit Test                                              │
│  ├── ユーティリティ関数（formatDate, cn など）         │
│  ├── カスタムフック（useNoteList など）                │
│  └── 状態管理ロジック                                  │
├─────────────────────────────────────────────────────────┤
│  Integration Test                                       │
│  ├── コンポーネント単体（Presenter）                   │
│  ├── フォームのバリデーション                          │
│  └── API連携（モック使用）                             │
├─────────────────────────────────────────────────────────┤
│  E2E Test                                               │
│  ├── ログインフロー                                    │
│  ├── CRUD操作（作成・編集・削除）                     │
│  └── 検索・フィルタ機能                               │
└─────────────────────────────────────────────────────────┘
```

---

## App Router時代のテストの難しさ

### 😰 フロントエンドテストの現実

理想通りにコンポーネントテストを書こうとすると、いくつかの壁にぶつかります。

---

### 課題1: Server Actions問題

Next.js App Router では Server Actions が使われます。
Presenterから呼ばれる子コンポーネントが、内部でServer Actionsを使っていると...

```tsx
// PublicNoteListFilter（Presenterから呼ばれる子コンポーネント）
function PublicNoteListFilter({ filters }: Props) {
  const handleSearch = async (query: string) => {
    // ❌ Server Actionを内部で呼んでいる
    await searchNotesAction(query);  // ← テスト時にモックが超困難
  };

  return <SearchInput onSearch={handleSearch} />;
}
```

```tsx
// NoteListPresenter をテストしたいが...
export function NoteListPresenter({ notes, filters }: Props) {
  return (
    <div>
      {/* この子コンポーネントがServer Actionsを使っている！ */}
      <PublicNoteListFilter filters={filters} />
      {/* ... */}
    </div>
  );
}
```

```
問題の構造:

NoteListPresenter (テスト対象)
    │
    └── PublicNoteListFilter (子コンポーネント)
            │
            └── searchNotesAction (Server Action)
                    │
                    └── 🔥 テスト時にモックが困難！

なぜモックが困難？:
├─ Server Actionsはサーバーサイドで実行される
├─ 'use server' ディレクティブがあるとJestでモック不可
├─ next/navigation のモックも複雑
└─ 子コンポーネントの内部実装を知る必要がある
```

---

### 課題2: Props Drilling地獄

「Server Actionsを親からProps経由で渡せばいいのでは？」

```tsx
// 理論上はこうすれば解決...
<PublicNoteListFilter
  filters={filters}
  onSearch={searchNotesAction}  // ← 親から渡す
/>
```

**しかし、コンポーネント階層が深くなると...**

```tsx
// Props drilling地獄の始まり
<GrandParent
  onDelete={deleteAction}
  onSearch={searchAction}
  onUpdate={updateAction}
  onPublish={publishAction}
  onUnpublish={unpublishAction}
>
  <Parent
    onDelete={onDelete}
    onSearch={onSearch}
    onUpdate={onUpdate}
    onPublish={onPublish}
    onUnpublish={onUnpublish}
  >
    <Child
      onDelete={onDelete}
      onSearch={onSearch}
      onUpdate={onUpdate}
    >
      <GrandChild onDelete={onDelete} onSearch={onSearch} />
    </Child>
  </Parent>
</GrandParent>
```

```
Props Drillingの問題:

                   ┌─────────────────────────────────────┐
                   │  GrandParent                        │
                   │  props: 5個のServer Actions         │
                   └───────────────┬─────────────────────┘
                                   │
                   ┌───────────────▼─────────────────────┐
                   │  Parent                             │
                   │  props: 5個のServer Actions (受け渡し)│
                   └───────────────┬─────────────────────┘
                                   │
                   ┌───────────────▼─────────────────────┐
                   │  Child                              │
                   │  props: 3個のServer Actions         │
                   └───────────────┬─────────────────────┘
                                   │
                   ┌───────────────▼─────────────────────┐
                   │  GrandChild                         │
                   │  props: 2個のServer Actions         │
                   └─────────────────────────────────────┘

結果:
├─ Propsの数が爆発的に増える
├─ 実装コストが高い
├─ 型定義が複雑になる
└─ テストのためにコードを複雑にするのは本末転倒
```

---

### 課題3: UIは頻繁に変わる

```
デザイナー: 「このボタンの位置を変えて、色も変更で！」

コンポーネントテストがある場合:
┌─────────────────────────────────────────────┐
│  UIを変更                                   │
│    ↓                                        │
│  テスト失敗（スナップショット不一致）       │
│    ↓                                        │
│  テストを修正...                            │
│    ↓                                        │
│  また変更依頼                               │
│    ↓                                        │
│  またテスト修正...（以下ループ）            │
└─────────────────────────────────────────────┘

結果: テストの維持コストが高すぎて、テストを消すか放置される
```

---

### 🤔 じゃあどうする？

```
現実的な結論:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Presenterのテストは「コスパが悪い」                    │
│                                                         │
│  ├── Server Actions問題 → モックが複雑すぎる           │
│  ├── Props Drilling → 実装コストが高い                 │
│  └── UI変更頻度 → 維持コストが高い                     │
│                                                         │
│  → テストすべき場所を「絞る」のが現実的                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 本プロジェクトのテスト戦略

### 🏗️ レイヤー別テスト方針

```
┌─────────────────────────────────────────────────────────────────┐
│              フロントエンド テスト戦略                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Unit Test（Vitest）                                     │   │
│  │                                                         │   │
│  │  カスタムHook     ✅ 必須   ビジネスロジックの核心      │   │
│  │  Query Keys       ✅ 必須   キャッシュ管理の要          │   │
│  │  Utils            ✅ 推奨   ユーティリティ関数          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  E2E Test（Playwright + MSW）                            │   │
│  │                                                         │   │
│  │  主要ユーザーフロー   ✅ 必須   一覧表示、作成、編集     │   │
│  │  画面間の遷移         ✅ 必須   ルーティング確認         │   │
│  │  エラー表示           ✅ 推奨   エラーハンドリング       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────                             │
│    Presenter / Container は直接テストしない                     │
│    （E2Eでカバー）                                              │
│                                                                 │
│  ※ external層（DTO, Service, Handler）のテストは              │
│    BFFテスト戦略ドキュメントを参照                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 📊 まとめ表

| 対象 | Unit Test | E2E | テスト内容 |
|------|-----------|-----|-----------|
| **カスタムHook** | ✅ 必須 | - | ロジック、状態管理 |
| **Query Keys** | ✅ 必須 | - | キャッシュキーの正しさ |
| **Utils** | ✅ 推奨 | - | ユーティリティ関数 |
| **Presenter** | ❌ | E2Eでカバー | Server Actions問題 |
| **Container** | ❌ | E2Eでカバー | Hookテストで十分 |
| **主要フロー** | - | ✅ 必須 | ユーザー操作 |

> 📝 **Note**: external層（DTO, Service, Handler）のテストは [BFFテスト戦略](./10_bff_testing_strategy.md) を参照

---

### 🎯 この戦略で達成できること

| 目的 | どのテストでカバー？ |
|------|---------------------|
| **デグレ防止** | Hook テスト |
| **ライブラリ更新の安全性** | Hook / Query Keys テスト |
| **UIの動作保証** | E2Eテスト |

> 📝 **Note**: APIとの契約確認は [BFFテスト戦略](./10_bff_testing_strategy.md) を参照

---

### 📁 データフローとテストポイント

```
Page (Server Component)
  └── PageTemplate (Server Component)
        └── Container (Client Component)
              └── useXxx Hook ← ★ テストポイント
                    └── useXxxQuery (TanStack Query)
                          └── Server Action ← BFFテスト戦略へ
                                └── Service  ← BFFテスト戦略へ
              └── Presenter (View) ← E2Eでカバー
```

---

## 各テストの実装例

### 🏗️ 本プロジェクトのアーキテクチャ（おさらい）

```
features/note/
├── components/
│   ├── server/          # Server Components（プリフェッチ担当）
│   │   └── NoteListPageTemplate/
│   └── client/          # Client Components
│       └── NoteList/
│           ├── NoteListContainer.tsx    # ロジック層
│           ├── NoteListPresenter.tsx    # 表示層（テストしない）
│           └── useNoteList.ts           # カスタムHook ← ★テスト対象
├── hooks/
│   └── useNoteListQuery.ts              # TanStack Query ← ★テスト対象
└── queries/
    └── keys.ts                          # Query Keys ← ★テスト対象
```

---

### 1️⃣ カスタムHookのテスト

**目的**: ビジネスロジックが正しく動作するか検証

**特徴**:
- 外部依存はモックで差し替え
- UIに依存しない
- 超高速

**テスト対象**: `useNoteList.ts`

```typescript
// features/note/components/client/NoteList/useNoteList.ts
export function useNoteList(initialFilters: NoteFilters = {}) {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");

  const filters: NoteFilters = {
    q: searchParams.get("q") || initialFilters.q,
    status: NOTE_STATUS.PUBLISH,
    page: pageParam ? Number.parseInt(pageParam, 10) : initialFilters.page || 1,
  };

  const { data: notes, isLoading } = useNoteListQuery(filters);

  return {
    notes: notes || [],
    isLoading,
    filters,
  };
}
```

**テストコード**:

```typescript
// features/note/components/client/NoteList/useNoteList.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNoteList } from './useNoteList';

// 依存関係をモック
vi.mock('@/features/note/hooks/useNoteListQuery', () => ({
  useNoteListQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => null),
  })),
}));

import { useNoteListQuery } from '@/features/note/hooks/useNoteListQuery';
import { useSearchParams } from 'next/navigation';

describe('useNoteList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('常にPublishステータスでフィルタする', () => {
    // Arrange
    vi.mocked(useNoteListQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    // Act
    const { result } = renderHook(() => useNoteList());

    // Assert
    expect(result.current.filters.status).toBe('Publish');
  });

  it('URLパラメータからページ番号を取得する', () => {
    // Arrange
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => key === 'page' ? '3' : null),
    } as any);
    vi.mocked(useNoteListQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    // Act
    const { result } = renderHook(() => useNoteList());

    // Assert
    expect(result.current.filters.page).toBe(3);
  });

  it('ローディング中はisLoadingがtrue、notesは空配列', () => {
    // Arrange
    vi.mocked(useNoteListQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    // Act
    const { result } = renderHook(() => useNoteList());

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.notes).toEqual([]);
  });
});
```

**このテストで守れるもの**:
- Next.js のバージョンアップで `useSearchParams` の挙動が変わった → テストで検知
- フィルタロジックの誤った変更 → テストで検知

---

### 2️⃣ Query Keysのテスト

**目的**: キャッシュキーが正しく生成されるか検証

**特徴**:
- 純粋関数のテスト
- モック不要
- 超高速

**テスト対象**: `keys.ts`

```typescript
// features/note/queries/keys.ts
export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: NoteFilters) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};
```

**テストコード**:

```typescript
// features/note/queries/keys.test.ts
import { describe, it, expect } from 'vitest';
import { noteKeys } from './keys';

describe('noteKeys', () => {
  it('all は ["notes"] を返す', () => {
    expect(noteKeys.all).toEqual(['notes']);
  });

  it('lists は ["notes", "list"] を返す', () => {
    expect(noteKeys.lists()).toEqual(['notes', 'list']);
  });

  it('list はフィルタを含むキーを返す', () => {
    const filters = { status: 'Publish' as const, page: 1 };

    expect(noteKeys.list(filters)).toEqual([
      'notes',
      'list',
      { status: 'Publish', page: 1 }
    ]);
  });

  it('異なるフィルタは異なるキーを生成する', () => {
    const key1 = noteKeys.list({ status: 'Publish' as const });
    const key2 = noteKeys.list({ status: 'Draft' as const });

    expect(key1).not.toEqual(key2);
  });
});
```

**このテストで守れるもの**:
- キーの誤った変更によるキャッシュ問題 → テストで検知
- TanStack Query のバージョンアップ → テストで検知

---

## E2Eテスト（Playwright + MSW）

### なぜMSWを使うのか？

| 方式 | メリット | デメリット |
|------|----------|------------|
| **実API（Docker）** | 完全なE2E | CI時間が長い、環境構築が複雑 |
| **MSW** | 高速、環境不要 | モックと実APIの乖離リスク |

**CIではMSWを使用し、高速にテストを回す戦略を採用**

---

### E2Eテスト例

```typescript
// e2e/note-list.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ノート一覧ページ', () => {
  test.beforeEach(async ({ page }) => {
    // MSWでAPIをモック
    await page.route('**/api/notes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'note-1',
            title: 'テストノート1',
            status: 'Publish',
            templateName: 'テンプレートA',
            owner: {
              id: 'owner-1',
              firstName: '太郎',
              lastName: '山田',
              thumbnail: null
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]),
      });
    });
  });

  test('ノート一覧が表示される', async ({ page }) => {
    await page.goto('/notes');

    // ノートカードが表示されることを確認
    await expect(page.getByText('テストノート1')).toBeVisible();
    await expect(page.getByText('テンプレートA')).toBeVisible();
  });

  test('ノートがない場合は空状態が表示される', async ({ page }) => {
    // 空のレスポンスを返すようにモック
    await page.route('**/api/notes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/notes');

    await expect(page.getByText('ノートがありません')).toBeVisible();
  });

  test('ノート詳細ページに遷移できる', async ({ page }) => {
    await page.goto('/notes');

    // ノートカードをクリック
    await page.getByText('テストノート1').click();

    // 詳細ページに遷移
    await expect(page).toHaveURL(/\/notes\/note-1/);
  });
});
```

**E2Eテストでカバーするもの**:
- 主要なユーザーフロー（一覧表示、詳細遷移、作成・編集・削除）
- 画面間の遷移
- エラー表示

---

## 📁 テストファイルの配置

### コロケーション（同じディレクトリに配置）

```
src/
├── features/
│   └── note/
│       ├── components/
│       │   └── client/
│       │       └── NoteList/
│       │           ├── useNoteList.ts
│       │           └── useNoteList.test.ts    # ← コロケーション
│       ├── hooks/
│       │   ├── useNoteListQuery.ts
│       │   └── useNoteListQuery.test.ts       # ← コロケーション
│       └── queries/
│           ├── keys.ts
│           └── keys.test.ts                   # ← コロケーション
├── shared/
│   └── lib/
│       ├── utils.ts
│       └── utils.test.ts                      # ← コロケーション
└── e2e/                                       # E2Eは別ディレクトリ
    ├── note-list.spec.ts
    └── note-detail.spec.ts
```

> 📝 **Note**: external層のテストファイル配置は [BFFテスト戦略](./10_bff_testing_strategy.md) を参照

---

## よくある質問

### Q1: なぜPresenterのテストを書かないのか？

**A: コスパが悪いからです。**

```
Presenterテストの問題:

1. Server Actions問題
   └─ 子コンポーネント内のServer Actionsをモックするのが困難

2. Props Drilling
   └─ テストのために実装を複雑にするのは本末転倒

3. UI変更頻度
   └─ デザイン変更のたびにテスト修正が必要

4. E2Eでカバー可能
   └─ 実際のユーザー操作をテストする方が効果的
```

---

### Q2: Unit TestとE2E Testの使い分けは？

**A: 「何を検証したいか」で決めます。**

```
ロジックを検証したい:
  → Unit Test（Hook / Service）
  → 速い、安定、デバッグしやすい

ユーザー操作を検証したい:
  → E2E Test（Playwright）
  → 実際のブラウザで確認
```

---

### Q3: テストが遅いときはどうする？

**A: 以下を確認してください。**

```
1. E2Eテストを減らす
   → 主要フローのみに絞る

2. 並列実行
   → Vitestの --parallel オプション

3. モックを活用
   → MSWでAPIをモック

4. テストの粒度を見直す
   → Unit Testを増やしてE2Eを減らす
```

---

### Q4: TanStack Queryのテストはどう書く？

**A: Hookをラップしてテストします。**

```typescript
// useNoteListQuery をテストする場合
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('ノート一覧を取得する', async () => {
  const { result } = renderHook(
    () => useNoteListQuery({ status: 'Publish' }),
    { wrapper: createWrapper() }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(2);
});
```

---

## 🚀 実行コマンド

```bash
# Unit テスト
pnpm test           # 全テスト実行
pnpm test:watch     # ウォッチモード
pnpm test:coverage  # カバレッジ付き

# E2Eテスト
pnpm e2e            # Playwrightテスト実行
pnpm e2e:ui         # UIモードで実行
```

---

## まとめ

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ テストする                                              │
│  ├── カスタムHook → デグレ防止、ライブラリ更新の安全網     │
│  ├── Query Keys → キャッシュ管理の要                       │
│  ├── Utils → ユーティリティ関数                            │
│  └── E2E (Playwright) → UIの動作保証                       │
│                                                             │
│  ❌ テストしない                                            │
│  ├── Presenter → Server Actions問題、コスパ悪い            │
│  └── Container → Hookテストでカバー                        │
│                                                             │
│  ※ external層のテストは BFFテスト戦略 を参照              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 参考リソース

- [Vitest 公式ドキュメント](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [Playwright](https://playwright.dev/)