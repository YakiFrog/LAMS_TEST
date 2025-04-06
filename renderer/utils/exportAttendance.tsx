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

    // ファイルの保存
    const result = await electronAPI.saveFile({
      filePath,
      data: csvData,
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
