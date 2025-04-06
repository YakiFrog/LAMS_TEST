import Papa from 'papaparse';
import { getCurrentTime, resetTime } from './timeManager';

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
}

interface AttendanceState {
  isAttending: boolean;
  attendanceTime: Date | null;
  leavingTime: Date | null;
  totalStayTime: number;
}

interface ExportResult {
  success: boolean;
  message: string;
  filePath?: string;
}

/**
 * Electronが利用可能かどうかを安全に確認する関数
 */
const isElectronAvailable = (): boolean => {
  return !!(typeof window !== 'undefined' && window.electron);
};

/**
 * 出勤データの日付を確認し、エクスポートすべきデータと現在保持すべきデータを分離する
 * @param attendanceStates 全ての出勤データ
 * @returns {expiredData, currentData} 期限切れのデータと現在のデータに分けたオブジェクト
 */
export function separateAttendanceData(attendanceStates: { [studentId: string]: AttendanceState }): {
  expiredData: { [studentId: string]: AttendanceState };
  currentData: { [studentId: string]: AttendanceState };
} {
  const today = resetTime(getCurrentTime());
  const expiredData: { [studentId: string]: AttendanceState } = {};
  const currentData: { [studentId: string]: AttendanceState } = {};

  Object.entries(attendanceStates).forEach(([studentId, state]) => {
    let isExpired = false;

    // 出勤時刻を確認
    if (state.attendanceTime) {
      const attendanceDate = resetTime(new Date(state.attendanceTime));
      if (attendanceDate.getTime() !== today.getTime()) {
        isExpired = true;
      }
    }

    // 退勤時刻を確認
    if (state.leavingTime) {
      const leavingDate = resetTime(new Date(state.leavingTime));
      if (leavingDate.getTime() !== today.getTime()) {
        isExpired = true;
      }
    }

    // データを適切なオブジェクトに振り分け
    if (isExpired) {
      expiredData[studentId] = { ...state };
    } else {
      currentData[studentId] = { ...state };
    }
  });

  return { expiredData, currentData };
}

/**
 * 出勤データをCSVファイルにエクスポートする関数
 * @param attendanceStates 出勤データ
 * @param students 学生リスト
 * @param isManualExport 手動エクスポートかどうか
 * @returns エクスポート結果
 */
export async function exportAttendanceToCSV(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[],
  isManualExport: boolean = false
): Promise<ExportResult> {
  try {
    // 出勤データが空の場合
    if (Object.keys(attendanceStates).length === 0) {
      return {
        success: false,
        message: '出勤データがありません。',
      };
    }

    // Electronが利用可能かチェック
    if (!isElectronAvailable()) {
      console.warn('警告: Electron APIが検出できませんでした。ブラウザモードで実行します。');
      
      // ブラウザ環境では直接ダウンロード
      const csvData = generateCSVContent(attendanceStates, students);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const date = getCurrentTime();
      const fileName = `attendance_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return {
        success: true,
        message: 'ブラウザモードで出勤データをダウンロードしました',
      };
    }

    // 保存先パスの取得
    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      return {
        success: false,
        message: 'エクスポート先が設定されていません。設定タブで設定してください。',
      };
    }

    // CSVデータの生成
    const csvData = generateCSVContent(attendanceStates, students);
    
    // エクスポートする月を特定
    // 手動エクスポートの場合は現在の月、自動エクスポートの場合はデータの月を使用
    let monthToExport: Date;
    
    if (isManualExport) {
      // 手動エクスポートの場合は現在の日付を使用
      monthToExport = getCurrentTime();
    } else {
      // 自動エクスポートの場合は、データの最初のエントリの日付を使用
      const firstEntry = Object.values(attendanceStates)[0];
      if (firstEntry && firstEntry.attendanceTime) {
        monthToExport = new Date(firstEntry.attendanceTime);
      } else {
        // データの日付が取得できない場合は現在の日付を使用
        monthToExport = getCurrentTime();
      }
    }
      
    const fileName = `attendance_${monthToExport.getFullYear()}-${String(monthToExport.getMonth() + 1).padStart(2, '0')}.csv`;
    const filePath = `${exportPath}/${fileName}`;

    console.log(`エクスポート先ファイル: ${filePath}`, { monthToExport, isManualExport });

    // ファイルの存在確認
    const fileExistsResult = await window.electron.fileExists(filePath);
    let finalCsvData = csvData;

    // 既存ファイルがある場合、内容をマージ
    if (fileExistsResult.exists) {
      try {
        // 既存ファイルを読み込み
        const existingContent = await window.electron.readFile(filePath);
        
        // 既存データと新データをマージ
        finalCsvData = mergeCSVData(existingContent, csvData);
      } catch (error) {
        console.error('既存ファイル読み込みエラー:', error);
        // エラーが発生しても続行し、新しいデータだけで保存
      }
    }

    // ファイルの保存
    const result = await window.electron.saveFile({
      filePath,
      data: finalCsvData,
    });

    if (result.success) {
      return {
        success: true,
        message: `出勤データを ${result.filePath} に保存しました。`,
        filePath: result.filePath,
      };
    } else {
      return {
        success: false,
        message: `ファイル保存中にエラーが発生しました: ${result.error}`,
      };
    }
  } catch (error) {
    console.error('エクスポートエラー:', error);
    return {
      success: false,
      message: `エクスポート中にエラーが発生しました: ${error}`,
    };
  }
}

/**
 * CSVデータを生成する関数
 */
function generateCSVContent(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[]
): string {
  // 学生IDから名前を取得するマッピングを作成
  const studentMap: { [id: string]: string } = {};
  students.forEach(student => {
    studentMap[student.id] = student.name;
  });

  // CSVのヘッダー行
  const headers = ['学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'];

  // CSVの行データ
  const rows = Object.entries(attendanceStates).map(([studentId, state]) => {
    const studentName = studentMap[studentId] || 'Unknown';
    const attendanceTime = state.attendanceTime ? new Date(state.attendanceTime).toLocaleString('ja-JP') : '';
    const leavingTime = state.leavingTime ? new Date(state.leavingTime).toLocaleString('ja-JP') : '';
    const totalSeconds = state.totalStayTime || 0;
    const formattedTime = `${Math.floor(totalSeconds / 3600)}時間${Math.floor((totalSeconds % 3600) / 60)}分`;

    return [
      studentId,
      studentName,
      attendanceTime,
      leavingTime,
      totalSeconds.toString(),
      formattedTime
    ];
  });

  // Papaを使ってCSVデータを生成
  return Papa.unparse({
    fields: headers,
    data: rows
  });
}

/**
 * 既存のCSVデータと新しいCSVデータをマージする関数
 */
function mergeCSVData(existingCsv: string, newCsv: string): string {
  // 既存のCSVと新しいCSVをパース
  const existingData = Papa.parse(existingCsv, { header: true });
  const newData = Papa.parse(newCsv, { header: true });
  
  // ヘッダー行を取得
  const headers = existingData.meta.fields || [];
  
  // 既存データと新しいデータをマージ
  const mergedData = [...existingData.data, ...newData.data];
  
  // 重複を削除（学生IDと出勤日時が同じレコードを削除）
  const uniqueRecords: { [key: string]: any } = {};
  mergedData.forEach(record => {
    const key = `${record['学生ID']}_${record['出勤日時']}`;
    uniqueRecords[key] = record;
  });
  
  // 一意のレコードを配列に変換
  const finalData = Object.values(uniqueRecords);
  
  // マージしたデータをCSV形式に変換
  return Papa.unparse({
    fields: headers,
    data: finalData
  });
}
