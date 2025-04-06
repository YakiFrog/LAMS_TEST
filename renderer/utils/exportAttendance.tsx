import Papa from 'papaparse';

// Extend Window interface to include electron property
declare global {
  interface Window {
    electron?: any;
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
  if (typeof window !== 'undefined') {
    // まずエラーを避けるためにwindow.electronの存在を確認
    if (window.electron) {
      console.log('Electron API found in window object');
      return window.electron;
    }
    console.log('Electron API not found, using mock implementation');
    // 開発モード用のモックAPIを返す - モックファイルシステムを模倣
    const mockFiles = {};
    return {
      isElectron: false,
      selectDirectory: async () => ({ canceled: false, filePaths: ['/mock/path'] }),
      saveFile: async (options: any) => {
        // ファイルをモックストレージに保存
        mockFiles[options.filePath] = options.data;
        console.log(`モックファイル保存: ${options.filePath}`);
        return { success: true, filePath: options.filePath };
      },
      fileExists: async (filePath: string) => {
        // モックストレージでファイルの存在をチェック
        const exists = !!mockFiles[filePath];
        console.log(`モックファイル存在チェック: ${filePath} -> ${exists ? '存在します' : '存在しません'}`);
        return { exists };
      },
      readFile: async (filePath: string) => {
        // モックストレージからファイルを読み込み
        if (mockFiles[filePath]) {
          console.log(`モックファイル読み込み: ${filePath}`);
          return mockFiles[filePath];
        }
        console.log(`モックファイル読み込み失敗: ${filePath} (ファイルが存在しません)`);
        return '';
      }
    };
  }
  console.log('Window object not available (SSR context)');
  return null;
};

export async function exportAttendanceToCSV(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[],
  isManualExport: boolean
): Promise<AttendanceExportResult> {
  try {
    console.log('exportAttendanceToCSV called', { 
      statesCount: Object.keys(attendanceStates).length, 
      studentsCount: students.length,
      isManualExport
    });
    
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
        // 出勤データから年月を取得
        const { yearMonth, newAttendanceRecords } = extractYearMonthAndRecords(attendanceStates, students);
        const { year, month } = yearMonth;
        
        const fileName = `attendance_${year}-${String(month).padStart(2, '0')}.csv`;
        console.log(`ブラウザでエクスポート: ${fileName}`);
        
        const csvData = Papa.unparse({
          fields: ['日付', '学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'],
          data: newAttendanceRecords
        });
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
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

    // 出勤データから年月とレコードを取得
    const { yearMonth, newAttendanceRecords } = extractYearMonthAndRecords(attendanceStates, students);
    const { year, month } = yearMonth;
    
    // 年月に基づいてファイル名を決定
    const fileName = `attendance_${year}-${String(month).padStart(2, '0')}.csv`;
    const filePath = `${exportPath}/${fileName}`;

    console.log(`ファイルパス: ${filePath} (${year}年${month}月のデータ)`);
    console.log(`新しい出勤データ: ${newAttendanceRecords.length}件`);

    // 既存ファイルの読み込みとデータの結合
    let fileExistsResult;
    try {
      fileExistsResult = await electronAPI.fileExists(filePath);
    } catch (error) {
      console.error('fileExists API error:', error);
      fileExistsResult = { exists: false };
    }
    
    let finalCsvData;
    
    // 既存ファイルがある場合、内容をマージ
    if (fileExistsResult.exists) {
      try {
        console.log('既存ファイルが見つかりました。マージモードで処理します。');
        // 既存ファイルを読み込み
        const existingContent = await electronAPI.readFile(filePath);
        
        if (existingContent && existingContent.trim()) {
          // 既存CSVを解析
          const parsedExisting = Papa.parse(existingContent, { header: true });
          if (parsedExisting.data && parsedExisting.data.length > 0) {
            console.log(`既存ファイルから${parsedExisting.data.length}件のレコードを読み込みました`);
            
            // 日付と学生IDの組み合わせをキーにしてマージ
            const recordMap = new Map();
            
            // 既存データをマップに追加
            parsedExisting.data.forEach((record: any) => {
              if (record['日付'] && record['学生ID']) {
                const key = `${record['日付']}_${record['学生ID']}`;
                recordMap.set(key, record);
                console.log(`既存データ読み込み: ${key}`);
              }
            });
            
            // 新しいデータを追加または上書き
            newAttendanceRecords.forEach(record => {
              if (record['日付'] && record['学生ID']) {
                const key = `${record['日付']}_${record['学生ID']}`;
                
                if (recordMap.has(key)) {
                  console.log(`重複レコード検出 - キー: ${key} を上書きします`);
                  
                  // 既存レコードと新しいレコードを取得
                  const existingRecord = recordMap.get(key);
                  
                  // 出勤時間は最も早い時間を保持
                  if (existingRecord['出勤日時'] && record['出勤日時']) {
                    const existingTime = new Date(existingRecord['出勤日時']);
                    const newTime = new Date(record['出勤日時']);
                    
                    if (newTime < existingTime) {
                      existingRecord['出勤日時'] = record['出勤日時'];
                    }
                  } else if (!existingRecord['出勤日時'] && record['出勤日時']) {
                    existingRecord['出勤日時'] = record['出勤日時'];
                  }
                  
                  // 退勤時間は最も遅い時間を保持
                  if (existingRecord['退勤日時'] && record['退勤日時']) {
                    const existingTime = new Date(existingRecord['退勤日時']);
                    const newTime = new Date(record['退勤日時']);
                    
                    if (newTime > existingTime) {
                      existingRecord['退勤日時'] = record['退勤日時'];
                    }
                  } else if (!existingRecord['退勤日時'] && record['退勤日時']) {
                    existingRecord['退勤日時'] = record['退勤日時'];
                  }
                  
                  // 滞在時間は新しいデータを採用
                  if (record['滞在時間（秒）']) {
                    existingRecord['滞在時間（秒）'] = record['滞在時間（秒）'];
                  }
                  
                  if (record['滞在時間']) {
                    existingRecord['滞在時間'] = record['滞在時間'];
                  }
                  
                  // 学生名も更新
                  if (record['学生名']) {
                    existingRecord['学生名'] = record['学生名'];
                  }
                } else {
                  // 新規追加
                  console.log(`新規レコード追加: ${key}`);
                  recordMap.set(key, record);
                }
              }
            });
            
            // マップからレコードの配列に変換
            const combinedData = Array.from(recordMap.values());
            
            // 日付でソート
            combinedData.sort((a: any, b: any) => {
              if (!a['日付'] || !b['日付']) return 0;
              
              const [aMonth, aDay] = a['日付'].split('/').map(Number);
              const [bMonth, bDay] = b['日付'].split('/').map(Number);
              
              if (aMonth !== bMonth) {
                return aMonth - bMonth;
              }
              return aDay - bDay;
            });
            
            // CSV形式に変換
            const headers = parsedExisting.meta.fields || ['日付', '学生ID', '学生名', '出勤日時', '退勤日時', '滞在時間（秒）', '滞在時間'];
            finalCsvData = Papa.unparse({
              fields: headers,
              data: combinedData
            });
            
            console.log(`マージ完了: ${combinedData.length}件のレコード`);
          } else {
            console.log('既存ファイルが空または無効です。新しいデータのみで保存します。');
            finalCsvData = generateCsvFromRecords(newAttendanceRecords);
          }
        } else {
          console.log('既存ファイルが空です。新しいデータのみで保存します。');
          finalCsvData = generateCsvFromRecords(newAttendanceRecords);
        }
      } catch (error) {
        console.error('既存ファイル読み込みエラー:', error);
        // エラーが発生した場合は新しいデータのみで続行
        finalCsvData = generateCsvFromRecords(newAttendanceRecords);
      }
    } else {
      console.log('ファイルが存在しません。新規作成します。');
      finalCsvData = generateCsvFromRecords(newAttendanceRecords);
    }

    // データ検証
    try {
      const dataCheck = Papa.parse(finalCsvData, { header: true });
      console.log(`保存するCSVデータの行数: ${dataCheck.data.length}件`);
    } catch (e) {
      console.error('CSVデータの検証に失敗:', e);
    }
    
    // ファイル保存
    let result;
    try {
      result = await electronAPI.saveFile({
        filePath,
        data: finalCsvData,
      });
    } catch (error) {
      console.error('saveFile API error:', error);
      // エラーの場合はブラウザモードでダウンロードを試みる
      const blob = new Blob([finalCsvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return {
        success: true,
        message: `Electron保存に失敗しましたが、ブラウザでダウンロードしました: ${fileName}`,
      };
    }

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

// 出勤データから年月とレコードを抽出する関数
function extractYearMonthAndRecords(
  attendanceStates: { [studentId: string]: AttendanceState },
  students: Student[]
): {
  yearMonth: { year: number; month: number },
  newAttendanceRecords: any[]
} {
  // 学生IDから名前を取得するマッピングを作成
  const studentMap: { [id: string]: string } = {};
  students.forEach(student => {
    studentMap[student.id] = student.name;
  });
  
  // 年月の集計用マップ - 各年月のデータ件数をカウント
  const yearMonthCounts: Record<string, number> = {};
  
  // レコード配列に変換
  const records = Object.entries(attendanceStates).map(([studentId, state]) => {
    const studentName = studentMap[studentId] || 'Unknown';
    
    // 出勤日時から日付（年月日）を抽出
    let attendanceDate = '';
    let fullAttendanceTime = '';
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    
    if (state.attendanceTime) {
      const date = new Date(state.attendanceTime);
      // 月/日 形式の日付
      attendanceDate = `${date.getMonth() + 1}/${date.getDate()}`;
      year = date.getFullYear();
      month = date.getMonth() + 1;
      fullAttendanceTime = date.toLocaleString('ja-JP');
      
      // 年月のカウントを増やす
      const yearMonthKey = `${year}-${month}`;
      yearMonthCounts[yearMonthKey] = (yearMonthCounts[yearMonthKey] || 0) + 1;
    }
    
    const leavingTime = state.leavingTime ? new Date(state.leavingTime).toLocaleString('ja-JP') : '';
    const totalSeconds = state.totalStayTime || 0;
    const formattedTime = `${Math.floor(totalSeconds / 3600)}時間${Math.floor((totalSeconds % 3600) / 60)}分`;

    return {
      '日付': attendanceDate,
      '学生ID': studentId,
      '学生名': studentName,
      '出勤日時': fullAttendanceTime,
      '退勤日時': leavingTime,
      '滞在時間（秒）': totalSeconds.toString(),
      '滞在時間': formattedTime,
      '_year': year,
      '_month': month
    };
  });
  
  // 最も多い年月を特定
  let maxCount = 0;
  let mostCommonYearMonth = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  
  for (const [yearMonthKey, count] of Object.entries(yearMonthCounts)) {
    if (count > maxCount) {
      maxCount = count;
      const [yearStr, monthStr] = yearMonthKey.split('-');
      mostCommonYearMonth = {
        year: parseInt(yearStr),
        month: parseInt(monthStr)
      };
    }
  }
  
  console.log(`データから検出された最も多い年月: ${mostCommonYearMonth.year}年${mostCommonYearMonth.month}月 (${maxCount}件)`);
  
  // _yearと_monthフィールドを削除
  const cleanedRecords = records.map(record => {
    const { _year, _month, ...rest } = record;
    return rest;
  });
  
  return {
    yearMonth: mostCommonYearMonth,
    newAttendanceRecords: cleanedRecords
  };
}

// 既存レコードと新規レコードをマージする関数
function mergeAttendanceRecords(existingRecords: any[], newRecords: any[]): any[] {
  // 日付と学生IDの組み合わせをキーにしたマップを作成
  const recordMap: { [key: string]: any } = {};
  
  // 既存レコードをマップに追加
  existingRecords.forEach(record => {
    if (record['日付'] && record['学生ID']) {
      const key = `${record['日付']}_${record['学生ID']}`;
      recordMap[key] = record;
    }
  });
  
  // 新規レコードを追加または上書き
  newRecords.forEach(record => {
    if (record['日付'] && record['学生ID']) {
      const key = `${record['日付']}_${record['学生ID']}`;
      recordMap[key] = record; // 既存キーがあれば上書き、なければ新規追加
    }
  });
  
  // マップから配列に戻す
  const mergedRecords = Object.values(recordMap);
  
  // 日付でソート (MM/DD形式を考慮したソート)
  mergedRecords.sort((a, b) => {
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
  
  return mergedRecords;
}

// レコード配列からCSVデータを生成するヘルパー関数
function generateCsvFromRecords(records: any[]): string {
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
  
  return Papa.unparse({
    fields: headers,
    data: sortedRecords
  });
}
