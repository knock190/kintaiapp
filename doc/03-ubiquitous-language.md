# 勤怠管理Webシステム ユビキタス言語 v0.1

要件定義書 v1.2 およびユースケース定義 v0.1 から抽出した、本システムで統一して用いる語彙の定義。

## 命名規則

| 用途 | 規則 | 例 |
| --- | --- | --- |
| TypeScript の型・クラス・enum | PascalCase | `User`, `Attendance`, `ClockInStyle` |
| 関数・変数 | camelCase | `clockIn`, `attendanceList` |
| DB テーブル・カラム | snake_case | `users`, `clock_in_at` |
| enum 値（DB 格納時） | snake_case 文字列 | `'office'`, `'direct_visit'` |
| ファイル名（要確定） | kebab-case を想定 | `clock-in.tsx` |

> 表中の DB 識別子例は **命名方針を示すための想定値**。最終的なテーブル設計は別途設計フェーズで決定する。

## 1. ユーザー・アカウント

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| ユーザー | `User` | `users` | 認証可能なアカウントの中核エンティティ | Better Auth の core entity |
| メンバー | `Member` | `users.role = 'member'` | `role` が `member` の User | 一般利用者 |
| 管理者 | `Administrator` | `users.role = 'admin'` | `role` が `admin` の User | 管理操作の権限を持つ |
| 初期管理者 | `InitialAdministrator` | `users.role = 'admin'`（seed） | システム導入時に seed で投入される最初の管理者 | 機能上は通常 admin と同等 |
| 社員 | `Employee` | （User と同義） | 業務上の利用者呼称 | 1 社員 = 1 User として扱う |

## 2. 認証・権限

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| 社員 ID | `EmployeeId` | `users.employee_id` | ログイン時の識別子 | 社員ごとに一意 |
| パスワード | `Password` | `users.password_hash` | 認証用パスワード（ハッシュ保存） | 平文は保存しない |
| 初期パスワード | `InitialPassword` | （同上） | アカウント作成時に管理者が発行する一時パスワード | 初回ログイン後に変更（UC-03） |
| セッション | `Session` | `sessions` | 認証済み状態を保持するレコード | Better Auth の `customSession` で `role` を付与 |
| ロール | `Role` | `users.role` | ユーザーの権限種別 | enum: `member` \| `admin` |
| 認証 | `Authentication` | — | 社員 ID / パスワードによるログイン処理 | |
| 認証境界 | — | — | App Router のルートグループによる画面分離 | `(member)` / `(admin)` を想定 |

## 3. 打刻

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| 勤怠 | `Attendance` | `attendances` | 1 ユーザーの 1 日分の出退勤記録 | ドメインの中核エンティティ |
| 打刻 | `ClockEntry` | — | 出勤または退勤を記録する行為の総称 | |
| 出勤打刻 | `ClockIn` | `attendances.clock_in_at`, `attendances.clock_in_style` | 当日業務の開始を記録する行為 | |
| 退勤打刻 | `ClockOut` | `attendances.clock_out_at`, `attendances.clock_out_style` | 当日業務の終了を記録する行為 | |
| 打刻時刻 | `ClockTime` | `clock_in_at` / `clock_out_at` | 出勤・退勤の時刻 | サーバ側で timestamp 保持 |
| 自動タイムスタンプ | `AutoTimestamp` | — | 打刻ボタン押下時にサーバが自動で付与する時刻 | 既定の打刻方式 |
| 手修正 | `ManualAdjustment` | — | 自分または管理者が **打刻時刻・勤務形態・離業期間** を手入力で上書き／追加／削除する操作 | UC-07 / UC-09 |
| 二重打刻 | `DuplicateClockIn` | — | 当日に 2 回目の出勤打刻を行おうとする行為 | バリデーションで拒否（リセット後の再打刻は除く） |
| 離業 | `MarkAway` | — | 勤務中から離業中へ遷移する行為 | UC-15 |
| 業務復帰 | `MarkBack` | — | 離業中から勤務中へ戻る行為 | UC-15 |
| 離業期間 | `AwayPeriod` | `away_periods` | 離業の開始時刻・終了時刻のペアを表すレコード | 1 日に複数記録され得る |

## 4. 勤務形態

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| 勤務形態 | `WorkStyle` | — | 出退勤時の働き方区分の総称 | 出勤用 / 退勤用の 2 種類 |
| 出勤勤務形態 | `ClockInStyle` | `clock_in_style` | 出勤打刻時の選択肢 | enum: `office` \| `remote` \| `direct_visit` |
| 出社 | `Office` | `'office'` | 自社オフィスへ出社して勤務開始 | ClockInStyle |
| 在宅勤務 | `Remote` | `'remote'` | 自宅で勤務開始 | ClockInStyle |
| 直行 | `DirectVisit` | `'direct_visit'` | 自社経由せず外出先で勤務開始 | ClockInStyle |
| 退勤勤務形態 | `ClockOutStyle` | `clock_out_style` | 退勤打刻時の選択肢 | enum: `normal` \| `direct_return` |
| 通常退勤 | `Normal` | `'normal'` | 自社・在宅から通常退勤 | ClockOutStyle |
| 直帰 | `DirectReturn` | `'direct_return'` | 自社経由せず外出先から直接退勤 | ClockOutStyle |

## 5. ステータス

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| ステータス | `AttendanceStatus` | `attendances.status` | 当日の勤怠状態（明示フィールド） | 4 値の状態機械として遷移する |
| 休み（Off） | `Off` | `'off'` | 未出勤・休み・打刻前を統合した既定状態 | デフォルト値 |
| 勤務中（Working） | `Working` | `'working'` | 出勤打刻済みかつ業務中（離業していない） | |
| 離業中（Away） | `Away` | `'away'` | 出勤中だが昼休み・会議・席離れ等で一時的に業務を離れている状態 | 元の勤務形態は維持 |
| 退勤済（Done） | `Done` | `'done'` | 退勤打刻済み | 終端状態。巻き戻し不可 |

## 6. 管理操作

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| 修正 | `Update` | — | 既存の打刻データを上書きする操作 | UC-09 |
| リセット | `Reset` | — | 対象日の `Attendance` レコードはそのままに `clockIn` / `clockOut` を `null` に戻し、未出勤状態にする | UC-10。レコード自体は保持（メンバーが同日に再打刻可能） |
| 無効化 | `Deactivate` | `users.deactivated_at` 等 | アカウントをログイン不可にする操作 | UC-14。過去の勤怠は保持 |
| パスワード再発行 | `ReissuePassword` | — | 管理者が新しいパスワードを発行する操作 | UC-13 |
| 監査ログ | `AuditLog` | （未確定） | 修正・リセット等の操作履歴 | 保持要否は残課題 |

## 7. 時間軸

| 日本語 | 型名（コード） | DB 上の表現 | 定義 | 備考 |
| --- | --- | --- | --- | --- |
| 当日 | `Today` | — | 現在の JST における日付 | 0:00〜23:59 区切り |
| 勤怠日付 | `AttendanceDate` | `attendances.attendance_date` | 勤怠レコードが紐づく日付 | DATE 型を想定 |
| JST | — | — | タイムゾーン | `Asia/Tokyo` |

## 8. 用語の使い分けメモ

- **「ユーザー」 / 「社員」 / 「メンバー」 / 「管理者」**
  - システム側の主体は常に **User**。**Member** / **Administrator** は role による区分の呼称。
  - 業務上の話者の言葉として「社員」を使う場合があるが、コード上は **User** に統一する。
- **「打刻」 / 「出勤打刻」 / 「退勤打刻」**
  - 「打刻」単独は行為の総称。具体動作を指すときは必ず「出勤打刻」「退勤打刻」と限定して呼ぶ。
- **「リセット」 / 「無効化」**
  - リセット = 勤怠データに対する操作（UC-10）。
  - 無効化 = アカウントに対する操作（UC-14）。
  - 混同しないよう、文書・UI で必ず使い分ける。

## 9. 残課題

- 監査ログ（AuditLog）の保持要否が確定したらエンティティを追加する
- 業務日（深夜跨ぎ勤務）の概念が将来必要になった場合、`AttendanceDate` の定義を見直す
