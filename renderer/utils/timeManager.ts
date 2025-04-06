/**
 * アプリケーション全体の時間管理を行うユーティリティ
 * 開発モードでは時間をオーバーライドすることができます
 */

// シングルトンとしての状態管理
let currentTimeOverride: Date | null = null;
let useOverrideTime: boolean = false;

/**
 * 現在時刻を取得する（オーバーライドされた時間または実際の時間）
 * @returns 現在時刻
 */
export function getCurrentTime(): Date {
  if (useOverrideTime && currentTimeOverride) {
    return new Date(currentTimeOverride);
  }
  return new Date();
}

/**
 * 日本時間を取得する（オーバーライドされた時間または実際の時間）
 * @returns 日本時間
 */
export function getJapanTime(): Date {
  const baseTime = getCurrentTime();
  const utc = baseTime.getTime() + baseTime.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
}

/**
 * 日本時間を "YYYY-MM-DDThh:mm" 形式の文字列で取得する
 * HTML の datetime-local 入力に最適な形式
 * @returns 日本時間の文字列（YYYY-MM-DDThh:mm形式）
 */
export function getJapanTimeISOString(): string {
  // 日本時間を取得
  const japanTime = getJapanTime();
  
  // YYYY-MM-DDThh:mm 形式に整形
  const year = japanTime.getFullYear();
  const month = String(japanTime.getMonth() + 1).padStart(2, '0');
  const day = String(japanTime.getDate()).padStart(2, '0');
  const hours = String(japanTime.getHours()).padStart(2, '0');
  const minutes = String(japanTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 日付部分を取り出す（時刻部分をリセット）
 * @param date 日付
 * @returns 時刻部分がリセットされた日付
 */
export function resetTime(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * オーバーライドする時間を設定
 * @param dateTime 設定する日時
 */
export function setOverrideTime(dateTime: Date | null): void {
  if (typeof window !== 'undefined') {
    if (dateTime) {
      // 時間を上書き
      currentTimeOverride = dateTime;
      useOverrideTime = true;
      // ローカルストレージに保存
      localStorage.setItem('timeOverride', dateTime.toISOString());
      localStorage.setItem('useTimeOverride', 'true');
    } else {
      // 上書きを解除
      currentTimeOverride = null;
      useOverrideTime = false;
      // ローカルストレージから削除
      localStorage.removeItem('timeOverride');
      localStorage.removeItem('useTimeOverride');
    }
  }
  
  console.log(
    useOverrideTime 
      ? `[TimeManager] 時間をオーバーライド: ${currentTimeOverride?.toLocaleString()}` 
      : '[TimeManager] 実際の時間を使用'
  );
}

/**
 * 時間オーバーライドが有効かどうかを取得
 * @returns 時間オーバーライドが有効かどうか
 */
export function isTimeOverrideEnabled(): boolean {
  return useOverrideTime;
}

/**
 * オーバーライドされた時間を取得
 * @returns オーバーライドされた時間（無効な場合はnull）
 */
export function getOverrideTime(): Date | null {
  return useOverrideTime ? currentTimeOverride : null;
}

/**
 * 時間を特定の増分で進める
 * @param minutes 進める分数
 */
export function advanceTimeBy(minutes: number): void {
  if (!useOverrideTime || !currentTimeOverride) {
    // オーバーライドされていない場合は現在時刻を基点にする
    currentTimeOverride = new Date();
    useOverrideTime = true;
  }
  
  // 時間を進める
  currentTimeOverride = new Date(currentTimeOverride.getTime() + minutes * 60000);
  
  // ローカルストレージに保存
  if (typeof window !== 'undefined') {
    localStorage.setItem('timeOverride', currentTimeOverride.toISOString());
    localStorage.setItem('useTimeOverride', 'true');
  }
  
  console.log(`[TimeManager] 時間を ${minutes} 分進めました: ${currentTimeOverride.toLocaleString()}`);
}

/**
 * 保存された時間オーバーライド設定を読み込む
 * アプリ起動時に呼び出すこと
 */
export function loadSavedTimeOverride(): void {
  if (typeof window !== 'undefined') {
    const savedTime = localStorage.getItem('timeOverride');
    const savedUseOverride = localStorage.getItem('useTimeOverride');
    
    if (savedTime && savedUseOverride === 'true') {
      try {
        currentTimeOverride = new Date(savedTime);
        useOverrideTime = true;
        console.log(`[TimeManager] 保存された時間オーバーライドを読み込みました: ${currentTimeOverride.toLocaleString()}`);
      } catch (error) {
        console.error('[TimeManager] 保存された時間の読み込みに失敗しました:', error);
        currentTimeOverride = null;
        useOverrideTime = false;
      }
    }
  }
}

// 初期化: モジュールがロードされたときに保存された設定を読み込む
if (typeof window !== 'undefined') {
  // クライアントサイドでのみ実行
  loadSavedTimeOverride();
}

/**
 * 二つの日付が同じ日かどうかを確認する
 * @param date1 比較する日付1
 * @param date2 比較する日付2
 * @returns 同じ日ならtrue、異なる日ならfalse
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = resetTime(new Date(date1));
  const d2 = resetTime(new Date(date2));
  return d1.getTime() === d2.getTime();
}

/**
 * 日付が変わったかどうかを確認する
 * @param oldDate 前の日付
 * @param newDate 新しい日付
 * @returns 日付が変わっていればtrue、同じ日ならfalse
 */
export function hasDateChanged(oldDate: Date, newDate: Date): boolean {
  return !isSameDay(oldDate, newDate);
}

/**
 * 滞在時間を秒単位から「○時間○分」形式の文字列に変換
 * @param totalSeconds 滞在時間（秒）
 * @returns フォーマットされた滞在時間文字列
 */
export function formatStayTime(totalSeconds: number): string {
  if (!totalSeconds && totalSeconds !== 0) return "未登録";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}時間${minutes}分`;
}

/**
 * 指定した時間が22:30以降かどうかを確認する
 * @param date 確認する日時
 * @returns 22:30以降ならtrue、そうでなければfalse
 */
export function isAfter2230(date: Date): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return hours > 22 || (hours === 22 && minutes >= 30);
}
