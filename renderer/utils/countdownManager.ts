import { getCurrentTime } from './timeManager';
import Papa from 'papaparse';

// 有効な対象学年の型定義
export type TargetGrade = '全員' | 'M2' | 'M1' | 'B4' | string;

export interface CountdownEvent {
  name: string;
  date: Date;
  daysRemaining: number;
  target: TargetGrade; // 対象学年を追加
}

/**
 * CSVファイルからカウントダウン予定を読み込む関数
 */
export const loadCountdownEventsFromCSV = async (): Promise<CountdownEvent[]> => {
  try {
    // Electron APIのチェック
    if (typeof window === 'undefined' || !window.electron) {
      console.log('Electron APIが利用できません');
      return [];
    }

    // カウントダウンCSVパスの取得
    const countdownFilePath = localStorage.getItem('countdownFilePath');
    if (!countdownFilePath) {
      console.log('カウントダウンファイルのパスが設定されていません');
      return [];
    }

    // ファイルの存在確認
    const exists = await window.electron.fileExists(countdownFilePath);
    if (!exists.exists) {
      console.log(`ファイルが存在しません: ${countdownFilePath}`);
      return [];
    }

    // ファイル読み込み
    const csvContent = await window.electron.readFile(countdownFilePath);
    if (!csvContent) {
      return [];
    }

    // CSVパース
    const parsedData = Papa.parse(csvContent, { header: true });
    if (!parsedData.data || !Array.isArray(parsedData.data)) {
      return [];
    }

    // データの加工
    const now = getCurrentTime();
    // 現在日の0時0分0秒を取得（日付の比較用）
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const events: CountdownEvent[] = [];

    parsedData.data.forEach((row: any) => {
      if (row.name && row.date) {
        try {
          // 日付形式を解析 (YYYY-MM-DD または MM/DD/YYYY)
          let eventDate;
          if (row.date.includes('-')) {
            // YYYY-MM-DD形式
            eventDate = new Date(row.date);
          } else if (row.date.includes('/')) {
            // MM/DD/YYYY形式
            const [month, day, year] = row.date.split('/');
            eventDate = new Date(year, month - 1, day);
          } else {
            throw new Error('未対応の日付形式');
          }

          // イベント日の0時0分0秒を設定（日付の比較用）
          const eventDay = new Date(eventDate);
          eventDay.setHours(0, 0, 0, 0);

          // 今日の日付との差分を計算（日単位）
          const timeDiff = eventDay.getTime() - today.getTime();
          const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

          // 過去の予定は除外（前日以前のものは表示しない）
          if (daysDiff < 0) {
            return;
          }

          // 対象学年の処理（未指定なら「全員」とする）
          const target = row.target || '全員';

          events.push({
            name: row.name,
            date: eventDate,
            daysRemaining: daysDiff,
            target: target
          });
        } catch (error) {
          console.error(`日付解析エラー: ${error}, 行: ${JSON.stringify(row)}`);
        }
      }
    });

    // 残り日数の少ない順に並べ替え
    return events.sort((a, b) => a.daysRemaining - b.daysRemaining);
  } catch (error) {
    console.error('カウントダウン情報の読み込みエラー:', error);
    return [];
  }
};
