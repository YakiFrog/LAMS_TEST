import Papa from 'papaparse';

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
  try {
    // 現在の曜日を計算 (0: 月曜, ..., 6: 日曜)
    const currentDayIndex = getCurrentDayIndex();
    
    // 現在の年月を取得してファイル名を構成
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-indexed to 1-indexed
    const csvFileName = `attendance_${year}-${String(month).padStart(2, '0')}.csv`;
    
    // エクスポートパスの取得
    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      console.warn('エクスポートパスが設定されていません');
      // モックデータを返す
      return {
        attendanceDays: generateMockAttendanceData(),
        currentDayIndex
      };
    }
    
    const filePath = `${exportPath}/${csvFileName}`;
    console.log(`出勤データファイルを検索: ${filePath}`);
    
    let csvContent: string;
    
    // Electronが利用可能な場合、ファイルシステムからCSVを読み込む
    if (isElectronAvailable()) {
      const fileExists = await window.electron.fileExists(filePath);
      
      if (!fileExists.exists) {
        console.warn(`ファイルが見つかりません: ${filePath}`);
        return {
          attendanceDays: [],
          currentDayIndex
        };
      }
      
      csvContent = await window.electron.readFile(filePath);
    } else {
      // Electron APIが利用できない場合、ローカルストレージのデータを利用
      console.warn('Electron APIが利用できないため、ローカルストレージのデータを使用します');
      return {
        attendanceDays: analyzeLocalStorageAttendance(studentId),
        currentDayIndex
      };
    }
    
    // CSVを解析して特定の学生の出勤曜日を特定
    return {
      attendanceDays: analyzeAttendanceCSV(csvContent, studentId),
      currentDayIndex
    };
  } catch (error) {
    console.error('出勤データ取得エラー:', error);
    // エラー時はローカルストレージのデータを代替として使用
    return {
      attendanceDays: analyzeLocalStorageAttendance(studentId),
      currentDayIndex: getCurrentDayIndex()
    };
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
  
  if (parsedData.data && Array.isArray(parsedData.data)) {
    // 特定の学生IDのレコードのみをフィルタリング
    const studentRecords = parsedData.data.filter((record: any) => 
      record['学生ID'] === studentId && record['日付']
    );
    
    // 各レコードの日付から曜日を計算して記録
    studentRecords.forEach((record: any) => {
      try {
        // MM/DD形式の日付を処理
        const dateStr = record['日付'];
        if (!dateStr) return;
        
        const [month, day] = dateStr.split('/').map(Number);
        if (isNaN(month) || isNaN(day)) return;
        
        // 現在の年を取得
        const year = new Date().getFullYear();
        
        // 日付オブジェクトを作成
        const date = new Date(year, month - 1, day);
        
        // 曜日を取得 (0: 日曜, 1: 月曜, ..., 6: 土曜)
        // 日本の曜日表記に変換 (0: 月曜, ..., 6: 日曜)
        let weekday = date.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
        weekday = weekday === 0 ? 6 : weekday - 1; // 0: 月曜, ..., 6: 日曜に変換
        
        weekdayAttendance.add(weekday);
      } catch (e) {
        console.error('日付解析エラー:', e);
      }
    });
  }
  
  return Array.from(weekdayAttendance);
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
