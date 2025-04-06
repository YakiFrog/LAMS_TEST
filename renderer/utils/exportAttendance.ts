import Papa from 'papaparse';
import { getCurrentTime, resetTime } from './timeManager';
import { getStudentsMap, getStudentNameById } from './studentsManager';

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
    console.log('=== エクスポート開始 ===');
    console.log('学生数:', students.length);
    console.log('出勤データ数:', Object.keys(attendanceStates).length);
    console.log('手動エクスポート:', isManualExport);
    
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
  // デバッグ情報
  console.log('=== CSVエクスポートデバッグ情報 ===');
  console.log('出勤データのIDリスト:', Object.keys(attendanceStates));
  console.log('学生データ件数:', students.length);
  
  // 学生IDから名前を取得するマッピングを作成
  const studentMap: { [id: string]: string } = {};
  
  // 提供された学生リストからマッピングを作成
  students.forEach(student => {
    studentMap[student.id] = student.name;
  });
  
  // ローカルストレージの学生データからも補完
  const storedStudentsMap = getStudentsMap();
  
  // CSVのヘッダー行: 日付を最初の列に追加
  const headers = ['日付', '学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'];

  // CSVの行データ
  const rows = Object.entries(attendanceStates).map(([studentId, state]) => {
    // マッピングされた学生名を取得、なければストレージから取得、それもなければIDを表示
    let studentName = studentMap[studentId];
    
    if (!studentName && storedStudentsMap[studentId]) {
      studentName = storedStudentsMap[studentId].name;
    }
    
    if (!studentName) {
      studentName = `ID:${studentId}`;
    }
    
    console.log(`学生ID ${studentId} の名前: ${studentName}`);
    
    // 出勤日時から日付（月日）を抽出
    let attendanceDate = '';
    let fullAttendanceTime = '';
    if (state.attendanceTime) {
      const date = new Date(state.attendanceTime);
      // 月/日 形式の日付
      attendanceDate = `${date.getMonth() + 1}/${date.getDate()}`;
      fullAttendanceTime = date.toLocaleString('ja-JP');
    }
    
    const leavingTime = state.leavingTime ? new Date(state.leavingTime).toLocaleString('ja-JP') : '';
    const totalSeconds = state.totalStayTime || 0;
    const formattedTime = `${Math.floor(totalSeconds / 3600)}時間${Math.floor((totalSeconds % 3600) / 60)}分`;

    return [
      attendanceDate, // 日付を最初の列に
      studentId,
      studentName,
      fullAttendanceTime,
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
 * 同じ日付と学生IDの組み合わせは新しいデータで上書きする
 */
function mergeCSVData(existingCsv: string, newCsv: string): string {
  // 既存のCSVと新しいCSVをパース
  const existingData = Papa.parse(existingCsv, { header: true });
  const newData = Papa.parse(newCsv, { header: true });
  
  // ヘッダー行を取得
  const headers = existingData.meta.fields || [];
  
  // 既存データと新しいデータをマージ
  const mergedData = [...existingData.data, ...newData.data];
  
  // 重複を削除（日付と学生IDの組み合わせが同じレコードは新しいデータで上書き）
  const uniqueRecords: { [key: string]: any } = {};
  mergedData.forEach(record => {
    // キーを日付と学生IDの組み合わせに変更
    const key = `${record['日付']}_${record['学生ID']}`;
    uniqueRecords[key] = record;
  });
  
  // 一意のレコードを配列に変換
  const finalData = Object.values(uniqueRecords);
  
  // 日付でソート (MM/DD形式を考慮したソート)
  finalData.sort((a, b) => {
    if (!a['日付'] || !b['日付']) return 0;
    
    // 日付をMM/DD形式からDate型に変換してソート
    const [aMonth, aDay] = a['日付'].split('/').map(Number);
    const [bMonth, bDay] = b['日付'].split('/').map(Number);
    
    // 同じ年と仮定して月で比較
    if (aMonth !== bMonth) {
      return aMonth - bMonth;
    }
    // 月が同じなら日で比較
    return aDay - bDay;
  });
  
  // マージしたデータをCSV形式に変換
  return Papa.unparse({
    fields: headers,
    data: finalData
  });
}
