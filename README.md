# LAMS (Laboratory Attendance Management System)

## システム概要

LAMSは研究室向けの出退勤管理システムです。学生の出勤・退勤状況を記録し、CSV形式でデータをエクスポートする機能を提供します。

## 主要機能

- 学生の出退勤管理
- 出勤データの自動・手動エクスポート
- 学生情報の管理（追加・削除・編集）
- 出勤統計の表示

## システムロジック・フロー

### 1. アプリケーション起動時

```mermaid
sequenceDiagram
    participant App
    participant LocalStorage
    participant UI
    
    App->>LocalStorage: 学生データ読み込み
    App->>LocalStorage: 出勤状態読み込み
    App->>LocalStorage: エクスポートパス読み込み
    
    App->>App: 日付チェック(旧データの検出)
    
    alt 前日以前のデータ検出
        App->>App: 古い出勤データ抽出
        App->>App: CSVエクスポート処理
        App->>UI: エクスポート結果通知
        App->>LocalStorage: 古いデータ削除
    end
    
    App->>UI: 画面表示
```

### 2. 出退勤処理フロー

```mermaid
sequenceDiagram
    participant Student
    participant Modal
    participant AttendanceState
    participant LocalStorage
    participant Notification
    
    Student->>Modal: 学生パネルをクリック
    Modal->>AttendanceState: 現在の状態取得
    
    alt 出勤中でない場合
        Modal->>AttendanceState: 出勤状態に変更
        AttendanceState->>AttendanceState: 現在時刻を出勤時刻として記録
    else 出勤中の場合
        Modal->>AttendanceState: 退勤状態に変更
        AttendanceState->>AttendanceState: 現在時刻を退勤時刻として記録
        AttendanceState->>AttendanceState: 滞在時間を計算・累積
    end
    
    AttendanceState->>LocalStorage: 状態を保存
    LocalStorage-->>Notification: 保存結果を通知
    AttendanceState->>Modal: モーダルを閉じる
    Modal->>Student: 表示を更新
```

### 3. 自動エクスポート処理

以下の条件でアプリが自動的にデータをエクスポートします：

1. アプリ起動時に前日以前のデータを検出した場合
2. 日付が変わったタイミング（定期チェック）

```mermaid
flowchart TD
    A[定期チェック開始] --> B{前日以前のデータあり?}
    B -->|Yes| C[期限切れデータの抽出]
    B -->|No| J[終了]
    C --> D[エクスポートパス確認]
    D -->|パスあり| E[出勤データCSV出力]
    D -->|パスなし| I[データ削除のみ実行]
    E -->|成功| F[成功通知]
    E -->|失敗| G[失敗通知]
    F --> H[期限切れデータを削除]
    G --> H
    H --> J[終了]
    I --> J
```

### 4. 自動退勤処理

22:30を過ぎた時点で出勤中の学生を自動的に退勤状態に更新します：

```mermaid
flowchart TD
    A[定期チェック開始] --> B{現在時刻 >= 22:30?}
    B -->|Yes| C[出勤中の学生を検索]
    B -->|No| H[終了]
    C --> D{出勤中の学生あり?}
    D -->|Yes| E[22:30時点で退勤処理]
    D -->|No| H
    E --> F[滞在時間計算・保存]
    F --> G[自動退勤通知]
    G --> H
```

### 5. 通知が複数回発生するケース

通知が複数回発生するのは主に以下のシナリオです：

1. **出退勤状態変更時の通知シーケンス**
   - ローカルストレージ保存成功通知
   - 状態変更通知（UI更新用）
   - 外部コールバック実行通知（親コンポーネント用）
   - 期限切れデータがある場合のエクスポート通知

2. **エクスポート処理時**
   - エクスポート開始通知
   - 処理状態通知（各ステップ）
   - 結果通知（成功/失敗）
   - 後処理通知（データクリーンアップ等）

## データフロー

### 出勤データの流れ

```mermaid
flowchart LR
    A[学生パネル操作] --> B[出退勤状態更新]
    B --> C[LocalStorage保存]
    C --> D[UI表示更新]
    
    E[日付変更] --> F[古いデータ検出]
    F --> G[CSV出力]
    G --> H[古いデータ削除]
    
    I[手動エクスポート] --> J[全データ取得]
    J --> K[月ごとに分類]
    K --> L[CSV出力]
```

### CSVエクスポート処理

```mermaid
flowchart TD
    A[エクスポート開始] --> B[出勤データ取得]
    B --> C[学生情報取得]
    C --> D[電子環境チェック]
    
    D -->|Browser| E1[ブラウザでダウンロード]
    D -->|Electron| E2[Electron APIでファイル操作]
    
    E2 --> F[エクスポートパス取得]
    F --> G[月ごとにデータ分類]
    G --> H[各月のファイル処理]
    
    H --> I{ファイル存在?}
    I -->|Yes| J[既存ファイル読込・マージ]
    I -->|No| K[新規ファイル作成]
    
    J --> L[ファイル保存]
    K --> L
    
    L -->|成功| M[成功通知]
    L -->|失敗| N[失敗通知]
```

## データ構造

### 学生データ

```typescript
interface Student {
  id: string;      // 学生ID
  name: string;    // 学生名
  grade: '教員' | 'M2' | 'M1' | 'B4';  // 学年
}
```

### 出勤状態データ

```typescript
interface AttendanceState {
  isAttending: boolean;      // 出勤中かどうか
  attendanceTime: Date | null;  // 出勤時刻
  leavingTime: Date | null;     // 退勤時刻 
  totalStayTime: number;        // 累積滞在時間（秒）
}
```

### CSVエクスポート形式

| 日付 | 学生ID | 学生名 | 出勤日時 | 退勤日時 | 滞在時間（秒） | 滞在時間 |
|------|--------|--------|----------|----------|----------------|----------|
| MM/DD | ID | 名前 | YYYY/MM/DD HH:MM:SS | YYYY/MM/DD HH:MM:SS | 12345 | X時間Y分 |

## 処理タイミングの詳細

### 1. ページロード/コンポーネントマウント時

- 学生データのロード
- 出勤状態のロード
- 期限切れデータのチェックと自動エクスポート
- エクスポート設定のロード
- 定期チェック用インターバル設定（10秒ごと）

### 2. 出退勤ボタン押下時

- 現在時刻の取得（時刻操作モード考慮）
- 状態更新と滞在時間計算
- ローカルストレージへの保存
- 保存結果の通知
- UIの更新（バッジ表示等）

### 3. 22:30チェック（1分ごと）

- 現在時刻が22:30を超えているかチェック
- 出勤中の学生の退勤処理
- 滞在時間の計算と保存
- 自動退勤の通知

### 4. 日付変更時（定期チェック）

- 出勤データと現在日付の比較
- 期限切れデータの抽出とエクスポート
- エクスポート結果の通知
- 古いデータの削除

### 5. 手動エクスポート実行時

- エクスポートパスの確認
- 全出勤データの取得と月ごとの分類
- CSVファイルの生成とマージ
- 結果の通知

