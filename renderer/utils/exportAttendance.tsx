import Papa from 'papaparse';

// Extend Window interface to include electron property
declare global {
  interface Window {
    electron: any;
  }
}

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

interface AttendanceExportResult {
  success: boolean;
  message: string;
  filePath?: string;
}

// APIを安全に取得する関数
const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron;
  }
  return null;
};

export async function exportAttendanceToCSV(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[],
  isManualExport: boolean
): Promise<AttendanceExportResult> {
  try {
    // 出勤データが空の場合
    if (Object.keys(attendanceStates).length === 0) {
      return {
        success: false,
        message: '出勤データがありません。',
      };
    }

    // Electronが利用可能かチェック
    const electronAPI = getElectronAPI();
    if (!electronAPI) {
      console.error('Electron APIが利用できません');
      
      // ブラウザ環境の場合はCSVをダウンロード
      if (typeof window !== 'undefined') {
        const csvData = generateCSVContent(attendanceStates, students);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const date = new Date();
        const fileName = `attendance_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return {
          success: true,
          message: '出勤データをブラウザでダウンロードしました',
        };
      }
      
      return {
        success: false,
        message: 'Electron APIが利用できません。Nextronアプリとして実行してください。',
      };
    }

    // 保存先パスの取得
    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      return {
        success: false,
        message: 'エクスポート先が設定されていません。管理タブで設定してください。',
      };
    }

    // CSVデータの生成
    const csvData = generateCSVContent(attendanceStates, students);

    // 現在の月に基づいてファイル名を決定
    const date = new Date();
    const fileName = `attendance_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.csv`;
    const filePath = `${exportPath}/${fileName}`;

    // ファイルの保存前に既存ファイルとのマージ処理
    let finalCsvData;
    try {
      const fileExists = await electronAPI.fileExists(filePath);
      if (fileExists && fileExists.exists) {
        const existingContent = await electronAPI.readFile(filePath);
        finalCsvData = mergeCSVFiles(existingContent, csvData);
      } else {
        finalCsvData = csvData;
      }
    } catch (error) {
      console.error('既存ファイル処理エラー:', error);
      finalCsvData = csvData; // エラーの場合は新しいデータのみ使用
    }

    // ファイルの保存
    const result = await electronAPI.saveFile({
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

// CSVコンテンツを生成する関数
function generateCSVContent(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[]
): string {
  // 学生IDから名前を取得するマッピングを作成
  const studentMap: { [id: string]: string } = {};
  students.forEach(student => {
    studentMap[student.id] = student.name;
  });

  // CSVのヘッダー行 - 日付を最初の列に追加
  const headers = ['日付', '学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'];

  // CSVの行データ
  const rows = Object.entries(attendanceStates).map(([studentId, state]) => {
    const studentName = studentMap[studentId] || 'Unknown';
    
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

// ファイルマージ処理のための関数を追加
function mergeCSVFiles(existingCsv: string, newCsv: string): string {
  // CSVレコードの型を定義
  interface CSVRecord {
    [key: string]: string;
  }

  // 既存のCSVと新しいCSVをパース
  const existingData = Papa.parse<CSVRecord>(existingCsv, { header: true });
  const newData = Papa.parse<CSVRecord>(newCsv, { header: true });
  
  // ヘッダー行を取得
  const headers = existingData.meta.fields || [];
  
  // 既存データと新しいデータをマージ
  const mergedData = [...existingData.data, ...newData.data];
  
  // 重複を削除（日付と学生IDの組み合わせが同じレコードは新しいデータで上書き）
  const uniqueRecords: { [key: string]: CSVRecord } = {};
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
