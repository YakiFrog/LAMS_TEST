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
    
    // 出勤データをデバッグ表示 (より詳細な情報を表示)
    Object.entries(attendanceStates).forEach(([studentId, state]) => {
      if (state.attendanceTime) {
        const date = new Date(state.attendanceTime);
        console.log(`データ確認 [ID:${studentId}]: ${date.toLocaleString()} (${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日)`);
      }
    });
    
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
      
      // データを年月ごとに分類
      const { monthlyData } = classifyDataByMonth(attendanceStates, students);
      
      // ブラウザ環境では直接ダウンロード - 最初の年月のデータのみ
      if (Object.keys(monthlyData).length > 0) {
        const firstMonthKey = Object.keys(monthlyData)[0];
        const { year, month, records } = monthlyData[firstMonthKey];
        
        const csvData = generateCSVContent(records);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const fileName = `attendance_${year}-${String(month).padStart(2, '0')}.csv`;
        
        console.log(`ブラウザモードでエクスポート: ${fileName} (${records.length}件)`);
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return {
          success: true,
          message: `ブラウザモードで${year}年${month}月の出勤データをダウンロードしました`,
        };
      } else {
        return {
          success: false,
          message: '有効な出勤データが見つかりませんでした',
        };
      }
    }

    // 保存先パスの取得
    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      return {
        success: false,
        message: 'エクスポート先が設定されていません。設定タブで設定してください。',
      };
    }

    // データを年月ごとに分類
    const { monthlyData } = classifyDataByMonth(attendanceStates, students);
    
    // 年月ごとに別々のファイルにエクスポート
    if (Object.keys(monthlyData).length === 0) {
      return {
        success: false,
        message: '有効な出勤データが見つかりませんでした',
      };
    }
    
    console.log(`${Object.keys(monthlyData).length}つの年月のデータが見つかりました`);
    
    // 各月のデータを保存
    const results = await Promise.all(
      Object.entries(monthlyData).map(async ([key, { year, month, records }]) => {
        // ファイル名を完全修飾パスなしで生成
        const fileName = `attendance_${year}-${String(month).padStart(2, '0')}.csv`;
        // フルパス (exportPathで指定されたディレクトリ内にファイルを作成)
        const filePath = `${exportPath}/${fileName}`;
        
        console.log(`処理: ${fileName} (${year}年${month}月のデータ ${records.length}件)`);
        
        // CSVデータの生成
        const csvData = generateCSVContent(records);
        
        // ファイルの存在確認
        const fileExistsResult = await window.electron.fileExists(filePath);
        let finalCsvData = csvData;
        
        // 既存ファイルがある場合、内容をマージ
        if (fileExistsResult.exists) {
          try {
            console.log(`既存ファイルを読み込み: ${filePath}`);
            // 既存ファイルを読み込み
            const existingContent = await window.electron.readFile(filePath);
            
            // 既存データと新データをマージ
            finalCsvData = mergeCSVData(existingContent, csvData);
          } catch (error) {
            console.error('既存ファイル読み込みエラー:', error);
            // エラーが発生しても続行し、新しいデータだけで保存
          }
        } else {
          console.log(`新規ファイル作成: ${filePath}`);
        }
        
        // ファイルの保存
        try {
          console.log(`ファイルに書き込み: ${filePath}`);
          
          const result = await window.electron.saveFile({
            filePath,
            data: finalCsvData,
          });
          
          return {
            success: result.success,
            message: result.success ? 
              `${year}年${month}月の出勤データを ${result.filePath} に保存しました。` : 
              `${year}年${month}月のデータ保存に失敗: ${result.error}`,
            filePath: result.filePath,
            year,
            month
          };
        } catch (error) {
          console.error(`${year}年${month}月のデータ保存エラー:`, error);
          return {
            success: false,
            message: `${year}年${month}月のデータ保存中にエラーが発生しました: ${error}`,
            year,
            month
          };
        }
      })
    );
    
    // 結果をまとめる
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    // 成功した月のリストを作成
    const successMonths = results
      .filter(r => r.success)
      .map(r => `${r.year}年${r.month}月`)
      .join(', ');
    
    if (failureCount === 0) {
      return {
        success: true,
        message: `${successMonths}のデータを正常にエクスポートしました。`,
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `${successMonths}のデータをエクスポートしましたが、${failureCount}つの月で問題が発生しました。`,
      };
    } else {
      return {
        success: false,
        message: `すべての月のデータエクスポートに失敗しました。`,
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
 * 出勤データを年月ごとに分類する関数
 */
function classifyDataByMonth(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[]
): {
  monthlyData: {
    [yearMonth: string]: {
      year: number;
      month: number;
      records: any[];
    }
  }
} {
  // 学生IDから名前を取得するマッピングを作成
  const studentMap: { [id: string]: string } = {};
  students.forEach(student => {
    studentMap[student.id] = student.name;
  });
  
  // ローカルストレージの学生データからも補完
  const storedStudentsMap = getStudentsMap();
  
  // 月ごとのデータ
  const monthlyData: {
    [yearMonth: string]: {
      year: number;
      month: number;
      records: any[];
    }
  } = {};
  
  // 各出勤データを処理
  Object.entries(attendanceStates).forEach(([studentId, state]) => {
    // 学生名を取得
    let studentName = studentMap[studentId];
    if (!studentName && storedStudentsMap[studentId]) {
      studentName = storedStudentsMap[studentId].name;
    }
    if (!studentName) {
      studentName = `ID:${studentId}`;
    }
    
    // 出勤・退勤時間から年月を決定
    let year: number;
    let month: number;
    let day: number;
    let attendanceDate = '';
    let fullAttendanceTime = '';
    let leavingTime = '';
    
    if (state.attendanceTime) {
      // 出勤時間から日付を取得
      const date = new Date(state.attendanceTime);
      year = date.getFullYear();
      month = date.getMonth() + 1;
      day = date.getDate();
      attendanceDate = `${month}/${day}`;
      fullAttendanceTime = date.toLocaleString('ja-JP');
      
      console.log(`出勤データ分類: [ID:${studentId}] ${year}年${month}月${day}日`);
    } else if (state.leavingTime) {
      // 出勤時間がなく退勤時間がある場合
      const date = new Date(state.leavingTime);
      year = date.getFullYear();
      month = date.getMonth() + 1;
      day = date.getDate();
      attendanceDate = `${month}/${day}`;
      
      console.log(`退勤のみデータ分類: [ID:${studentId}] ${year}年${month}月${day}日`);
    } else {
      // 両方ない場合は現在の年月を使用（通常はこのケースはない）
      const now = getCurrentTime();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      day = now.getDate();
      attendanceDate = `${month}/${day}`;
      console.warn(`警告: 学生ID ${studentId} のデータに出勤時間も退勤時間もありません。${year}年${month}月${day}日として処理します。`);
    }
    
    if (state.leavingTime) {
      leavingTime = new Date(state.leavingTime).toLocaleString('ja-JP');
    }
    
    // 滞在時間の計算
    const totalSeconds = state.totalStayTime || 0;
    const formattedTime = `${Math.floor(totalSeconds / 3600)}時間${Math.floor((totalSeconds % 3600) / 60)}分`;
    
    console.log(`データ出力 [ID:${studentId}]: 滞在時間=${formattedTime} (${totalSeconds}秒)`);
    
    // レコードの作成
    const record = {
      '日付': attendanceDate,
      '学生ID': studentId,
      '学生名': studentName,
      '出勤日時': fullAttendanceTime,
      '退勤日時': leavingTime,
      '滞在時間（秒）': totalSeconds.toString(),
      '滞在時間': formattedTime
    };
    
    // 年月ごとにデータを分類
    const yearMonthKey = `${year}-${month}`;
    if (!monthlyData[yearMonthKey]) {
      monthlyData[yearMonthKey] = {
        year,
        month,
        records: []
      };
    }
    
    monthlyData[yearMonthKey].records.push(record);
  });
  
  // 月ごとのデータ件数をログ出力
  Object.entries(monthlyData).forEach(([key, data]) => {
    console.log(`年月データ: ${key} (${data.year}年${data.month}月) ${data.records.length}件`);
  });
  
  return { monthlyData };
}

/**
 * CSVデータを生成する関数
 */
function generateCSVContent(records: any[]): string {
  // CSVのヘッダー行
  const headers = ['日付', '学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'];

  // 日付でソート
  const sortedRecords = [...records].sort((a, b) => {
    if (!a['日付'] || !b['日付']) return 0;
    
    const [aMonth, aDay] = a['日付'].split('/').map(Number);
    const [bMonth, bDay] = b['日付'].split('/').map(Number);
    
    if (aMonth !== bMonth) {
      return aMonth - bMonth;
    }
    return aDay - bDay;
  });

  // Papaを使ってCSVデータを生成
  return Papa.unparse({
    fields: headers,
    data: sortedRecords
  });
}

/**
 * 既存のCSVデータと新しいCSVデータをマージする関数
 * 同じ日付と学生IDの組み合わせは確実に上書きする
 */
function mergeCSVData(existingCsv: string, newCsv: string): string {
  console.log('CSVデータのマージを開始します');
  
  // 既存のCSVと新しいCSVをパース
  const existingData = Papa.parse(existingCsv, { header: true });
  const newData = Papa.parse(newCsv, { header: true });
  
  // ヘッダー行を取得
  const headers = existingData.meta.fields || ['日付', '学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'];
  
  // 日付と学生IDをキーにした辞書を作成
  const recordsByKey: { [key: string]: any } = {};
  
  // まず既存データを辞書に格納
  existingData.data.forEach((record: any) => {
    if (record['日付'] && record['学生ID']) {
      const key = `${record['日付']}_${record['学生ID']}`;
      recordsByKey[key] = record;
      console.log(`既存データ読み込み: ${key}, 学生名: ${record['学生名']}, 滞在時間: ${record['滞在時間']}`);
    }
  });
  
  // 次に新しいデータで上書きまたは追加
  newData.data.forEach((record: any) => {
    if (record['日付'] && record['学生ID']) {
      const key = `${record['日付']}_${record['学生ID']}`;
      
      // 既存のデータがあるか確認
      if (recordsByKey[key]) {
        console.log(`同じキーのデータを発見: ${key}`);
        console.log(`既存データ: 学生名=${recordsByKey[key]['学生名']}, 滞在時間=${recordsByKey[key]['滞在時間']}`);
        console.log(`新規データ: 学生名=${record['学生名']}, 滞在時間=${record['滞在時間']}`);
        
        // 完全に上書き
        recordsByKey[key] = record;
        console.log(`上書き完了: ${key}, 新しい滞在時間=${record['滞在時間']}`);
      } else {
        // 既存データがなければ新規追加
        recordsByKey[key] = record;
        console.log(`新規データ追加: ${key}, 学生名=${record['学生名']}, 滞在時間=${record['滞在時間']}`);
      }
    }
  });
  
  // 辞書からレコードの配列に変換
  const allRecords = Object.values(recordsByKey);
  
  // 日付でソート
  allRecords.sort((a, b) => {
    if (!a['日付'] || !b['日付']) return 0;
    
    // MM/DD形式の日付を解析
    const [aMonth, aDay] = a['日付'].split('/').map(Number);
    const [bMonth, bDay] = b['日付'].split('/').map(Number);
    
    // 月が異なる場合は月で比較
    if (aMonth !== bMonth) {
      return aMonth - bMonth;
    }
    
    // 月が同じなら日で比較
    return aDay - bDay;
  });
  
  console.log(`マージ完了: ${allRecords.length}件のレコード`);
  
  // CSV形式に変換して返す
  return Papa.unparse({
    fields: headers,
    data: allRecords
  });
}
