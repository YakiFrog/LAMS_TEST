import Papa from 'papaparse';
import { getCurrentTime } from './timeManager';

// Electronが利用可能かどうかを安全に確認する関数
const isElectronAvailable = (): boolean => {
  return !!(typeof window !== 'undefined' && window.electron);
};

/**
 * 現在の月の出勤CSVファイルからデータを取得する
 * @param studentId 学生ID
 * @returns { attendanceDays, currentDayIndex } 出勤曜日と現在の曜日インデックス
 */
export async function fetchCurrentMonthAttendance(studentId: string): Promise<{
  attendanceDays: number[];
  currentDayIndex: number;
}> {
  // 時間操作モードを考慮した現在時刻を取得
  const today = getCurrentTime();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // 今日の曜日（0: 月曜, ..., 6: 日曜）
  const currentDayIndex = (today.getDay() + 6) % 7;
  
  try {
    // ローカルストレージから出勤データを取得
    const storedAttendanceStates = localStorage.getItem('attendanceStates');
    if (!storedAttendanceStates) {
      return { attendanceDays: [], currentDayIndex };
    }
    
    const attendanceStates = JSON.parse(storedAttendanceStates);
    const studentData = attendanceStates[studentId];
    
    // 当月の出勤曜日を追跡する配列
    const attendanceDays: number[] = [];
    const processedDays: Set<number> = new Set(); // 処理済みの日付を追跡
    
    if (studentData?.attendanceTime) {
      // 出勤時間をDateオブジェクトに変換
      const attendanceDate = new Date(studentData.attendanceTime);
      
      // 当月のデータを処理
      if (attendanceDate.getMonth() === currentMonth && 
          attendanceDate.getFullYear() === currentYear) {
        
        // 出勤日の曜日
        const attendanceDay = (attendanceDate.getDay() + 6) % 7; // 0: 月曜, ..., 6: 日曜
        
        // まだ追加されていない曜日なら追加
        if (!processedDays.has(attendanceDay)) {
          attendanceDays.push(attendanceDay);
          processedDays.add(attendanceDay);
        }
      }
    }
    
    // ローカルストレージで過去のデータも検索
    // 例えば過去の退勤データなどがある場合、それも含めます
    // この部分は実際のデータ構造に合わせて拡張できます
    
    return { attendanceDays, currentDayIndex };
  } catch (error) {
    console.error('出勤データの分析中にエラーが発生しました:', error);
    return { attendanceDays: [], currentDayIndex };
  }
}

/**
 * 現在の曜日のインデックスを取得 (0: 月曜, ..., 6: 日曜)
 */
function getCurrentDayIndex(): number {
  const today = new Date();
  let dayIndex = today.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
  // 日本の曜日表記に変換 (0: 月曜, ..., 6: 日曜)
  return dayIndex === 0 ? 6 : dayIndex - 1;
}

/**
 * CSVデータを解析して特定の学生の出勤曜日を特定する
 * @param csvContent CSVコンテンツ
 * @param studentId 学生ID
 * @returns 出勤がある曜日のインデックス配列
 */
function analyzeAttendanceCSV(csvContent: string, studentId: string): number[] {
  // CSVデータをパース
  const parsedData = Papa.parse(csvContent, { header: true });
  
  // 曜日の出勤状況を記録する配列 (0: 月曜, 1: 火曜, ..., 6: 日曜)
  const weekdayAttendance = new Set<number>();
  
  // 曜日ごとの日付情報を収集（各曜日の直近の日付を保持）
  const weekdayDates: Record<number, string[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  };
  
  if (parsedData.data && Array.isArray(parsedData.data)) {
    // 特定の学生IDのレコードのみをフィルタリング
    const studentRecords = parsedData.data.filter((record: any) => 
      record['学生ID'] === studentId && record['日付']
    );
    
    // 日付でソートして最新のデータが先頭に来るようにする
    studentRecords.sort((a: any, b: any) => {
      const dateA = parseDate(a['日付']);
      const dateB = parseDate(b['日付']);
      return dateB.getTime() - dateA.getTime(); // 降順ソート
    });
    
    // 各レコードの日付から曜日を計算して記録
    studentRecords.forEach((record: any) => {
      try {
        // MM/DD形式の日付を処理
        const dateStr = record['日付'];
        if (!dateStr) return;
        
        const date = parseDate(dateStr);
        if (!date) return;
        
        // 曜日を取得 (0: 日曜, 1: 月曜, ..., 6: 土曜)
        // 日本の曜日表記に変換 (0: 月曜, ..., 6: 日曜)
        let weekday = date.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
        weekday = weekday === 0 ? 6 : weekday - 1; // 0: 月曜, ..., 6: 日曜に変換
        
        weekdayAttendance.add(weekday);
        
        // 日付情報を保存（月/日形式）
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dateFormatted = `${month}/${day}`;
        weekdayDates[weekday].push(dateFormatted);
        
      } catch (e) {
        console.error('日付解析エラー:', e);
      }
    });
  }
  
  // グローバルに曜日ごとの日付情報をエクスポート
  if (typeof window !== 'undefined') {
    // 各曜日の直近の日付だけを保持する新しいオブジェクト
    const recentDates: Record<number, string> = {};
    
    for (let i = 0; i < 7; i++) {
      if (weekdayDates[i].length > 0) {
        // ソート済みなので、最初の要素が最新
        recentDates[i] = weekdayDates[i][0];
      }
    }
    
    window.weekdayDatesInfo = weekdayDates;
    console.log('weekdayDatesInfo has been set:', weekdayDates);
    console.log('Recent weekday dates:', recentDates);
  }
  
  return Array.from(weekdayAttendance);
}

/**
 * MM/DD形式の日付文字列をDateオブジェクトに変換
 */
function parseDate(dateStr: string): Date | null {
  try {
    // MM/DD形式の日付を処理
    const [month, day] = dateStr.split('/').map(Number);
    if (isNaN(month) || isNaN(day)) return null;
    
    // 現在の年を取得
    const year = new Date().getFullYear();
    
    // 日付オブジェクトを作成
    return new Date(year, month - 1, day);
  } catch (e) {
    console.error('日付解析エラー:', e);
    return null;
  }
}

// グローバル型定義を拡張
declare global {
  interface Window {
    weekdayDatesInfo?: Record<number, string[]>;
  }
}

/**
 * ローカルストレージの出勤データを分析
 * CSVファイルが利用できない場合のバックアップ
 */
function analyzeLocalStorageAttendance(studentId: string): number[] {
  try {
    const attendanceStates = JSON.parse(localStorage.getItem('attendanceStates') || '{}');
    const studentState = attendanceStates[studentId];
    
    if (!studentState || !studentState.attendanceTime) {
      return [];
    }
    
    // 出勤データから曜日を取得
    const attendanceDate = new Date(studentState.attendanceTime);
    let weekday = attendanceDate.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
    weekday = weekday === 0 ? 6 : weekday - 1; // 0: 月曜, ..., 6: 日曜に変換
    
    return [weekday];
  } catch (error) {
    console.error('ローカルストレージ解析エラー:', error);
    return [];
  }
}

/**
 * テスト用のモックデータを生成
 */
function generateMockAttendanceData(): number[] {
  // ランダムな曜日を3-5日分生成
  const numDays = Math.floor(Math.random() * 3) + 3; // 3-5日
  const days = new Set<number>();
  
  while (days.size < numDays) {
    days.add(Math.floor(Math.random() * 7)); // 0-6の乱数
  }
  
  return Array.from(days);
}
