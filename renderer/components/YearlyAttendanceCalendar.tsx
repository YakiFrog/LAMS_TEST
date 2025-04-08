import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Tooltip,
  Spinner,
  useColorModeValue
} from '@chakra-ui/react';
import Papa from 'papaparse';
import { getCurrentTime, resetTime } from '../utils/timeManager';

// 色の強度レベル（滞在時間に応じて）
const COLOR_LEVELS = [
  'rgb(235, 237, 240)', // レベル0: 出勤なし
  'rgb(172, 213, 242)', // レベル1: 少し
  'rgb(127, 168, 201)', // レベル2: やや少なめ
  'rgb(82, 123, 160)',  // レベル3: 中程度
  'rgb(37, 78, 119)'    // レベル4: 長時間
];

// 滞在時間のしきい値（秒単位）
const STAY_TIME_THRESHOLDS = [
  0,       // レベル0
  1800,    // レベル1: 30分
  3600,    // レベル2: 1時間
  10800,   // レベル3: 3時間
  21600    // レベル4: 6時間以上
];

interface CalendarDataType {
  date: string; // YYYY-MM-DD形式
  stayTimeSeconds: number;
  level: number; // 0-4の強度レベル
}

interface YearlyAttendanceCalendarProps {
  studentId: string;
}

const YearlyAttendanceCalendar: React.FC<YearlyAttendanceCalendarProps> = ({ studentId }) => {
  const [calendarData, setCalendarData] = useState<Map<string, CalendarDataType>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(getCurrentTime().getFullYear());
  const [maxStayTime, setMaxStayTime] = useState<number>(0);

  // 月の名前
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  // 曜日の名前（月〜日）
  const weekdayNames = ['月', '火', '水', '木', '金', '土', '日'];
  
  // 背景色とテキスト色
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // データを取得
        const yearData = await getYearlyAttendanceData(studentId, year);
        setCalendarData(yearData.data);
        setMaxStayTime(yearData.maxStayTime);
        
      } catch (err) {
        console.error('年間出勤データの取得エラー:', err);
        setError('出勤データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (studentId) {
      fetchAttendanceData();
    }
  }, [studentId, year]);

  // 年間出勤データを取得する関数
  const getYearlyAttendanceData = async (
    studentId: string, 
    year: number
  ): Promise<{ data: Map<string, CalendarDataType>, maxStayTime: number }> => {
    const dataMap = new Map<string, CalendarDataType>();
    let maxTime = 0;
    
    // Electron APIが利用可能かチェック
    if (typeof window === 'undefined' || !window.electron) {
      console.log('Electron APIが利用できません');
      return { data: dataMap, maxStayTime: maxTime };
    }

    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      console.log('エクスポートパスが設定されていません');
      return { data: dataMap, maxStayTime: maxTime };
    }

    try {
      // 当該年の各月のCSVファイルを確認
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const fileName = `attendance_${monthKey}.csv`;
        const filePath = `${exportPath}/${fileName}`;
        
        // ファイルが存在するか確認
        const exists = await window.electron.fileExists(filePath);
        
        if (exists.exists) {
          console.log(`CSVファイルが見つかりました: ${filePath}`);
          const csvContent = await window.electron.readFile(filePath);
          
          if (csvContent) {
            // CSVをパース
            const parsedData = Papa.parse(csvContent, { header: true });
            
            if (parsedData.data && Array.isArray(parsedData.data)) {
              // 学生IDでフィルタリング
              const studentRecords = parsedData.data.filter((record: any) => 
                record['学生ID'] === studentId && record['日付']
              );
              
              // 各レコードを処理
              studentRecords.forEach((record: any) => {
                try {
                  if (!record['日付']) return;
                  
                  // MM/DD形式を YYYY-MM-DD 形式に変換
                  const [recordMonth, recordDay] = record['日付'].split('/').map(Number);
                  if (isNaN(recordMonth) || isNaN(recordDay)) return;
                  
                  const dateStr = `${year}-${String(recordMonth).padStart(2, '0')}-${String(recordDay).padStart(2, '0')}`;
                  
                  // 滞在時間を取得
                  const stayTimeSeconds = parseInt(record['滞在時間（秒）'] || '0');
                  
                  // 最大滞在時間を更新
                  if (stayTimeSeconds > maxTime) {
                    maxTime = stayTimeSeconds;
                  }
                  
                  // 強度レベルを計算
                  let level = 0;
                  for (let i = STAY_TIME_THRESHOLDS.length - 1; i >= 0; i--) {
                    if (stayTimeSeconds >= STAY_TIME_THRESHOLDS[i]) {
                      level = i;
                      break;
                    }
                  }
                  
                  // データマップに追加
                  dataMap.set(dateStr, {
                    date: dateStr,
                    stayTimeSeconds,
                    level
                  });
                } catch (e) {
                  console.error('日付解析エラー:', e);
                }
              });
            }
          }
        }
      }
      
      // ローカルストレージからも当日のデータを取得して追加
      const storedAttendanceStates = localStorage.getItem('attendanceStates');
      if (storedAttendanceStates) {
        const attendanceStates = JSON.parse(storedAttendanceStates);
        const studentState = attendanceStates[studentId];
        
        if (studentState && (studentState.attendanceTime || studentState.leavingTime)) {
          // 出勤または退勤時間がある場合
          const date = studentState.attendanceTime 
            ? new Date(studentState.attendanceTime) 
            : new Date(studentState.leavingTime);
          
          // 現在の年と一致するかチェック
          if (date.getFullYear() === year) {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // 滞在時間
            const stayTimeSeconds = studentState.totalStayTime || 0;
            
            // 最大滞在時間を更新
            if (stayTimeSeconds > maxTime) {
              maxTime = stayTimeSeconds;
            }
            
            // 強度レベルを計算
            let level = 0;
            for (let i = STAY_TIME_THRESHOLDS.length - 1; i >= 0; i--) {
              if (stayTimeSeconds >= STAY_TIME_THRESHOLDS[i]) {
                level = i;
                break;
              }
            }
            
            // データマップに追加（すでに存在する場合は上書き）
            dataMap.set(dateStr, {
              date: dateStr,
              stayTimeSeconds,
              level
            });
          }
        }
      }
      
      return { data: dataMap, maxStayTime: maxTime };
    } catch (error) {
      console.error('年間出勤データ取得エラー:', error);
      throw error;
    }
  };

  // 日付から曜日を取得する関数
  const getDayOfWeek = (dateStr: string): number => {
    const date = new Date(dateStr);
    let day = date.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
    return day === 0 ? 6 : day - 1; // 0: 月曜, ..., 6: 日曜に変換
  };

  // 特定の月の週数を計算する関数
  const getWeeksInMonth = (year: number, month: number): number => {
    // 月の最初の日の曜日を取得
    const firstDayOfMonth = new Date(year, month - 1, 1);
    let firstDayOfWeek = firstDayOfMonth.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0: 月曜, ..., 6: 日曜に変換
    
    // 月の日数を取得
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 週数を計算 (最初の日の曜日 + 月の日数) / 7 の切り上げ
    return Math.ceil((firstDayOfWeek + daysInMonth) / 7);
  };

  // 特定の月のカレンダーデータを生成する関数
  const generateMonthCalendar = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    let firstDayOfWeek = firstDayOfMonth.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0: 月曜, ..., 6: 日曜に変換
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const weeksInMonth = getWeeksInMonth(year, month);
    
    const calendar = [];
    
    // 各週
    for (let week = 0; week < weeksInMonth; week++) {
      const weekDays = [];
      
      // 各曜日
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dayIndex = week * 7 + dayOfWeek - firstDayOfWeek + 1;
        
        if (dayIndex > 0 && dayIndex <= daysInMonth) {
          // 有効な日
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayIndex).padStart(2, '0')}`;
          const dayData = calendarData.get(dateStr);
          
          weekDays.push({
            date: dateStr,
            day: dayIndex,
            isValid: true,
            data: dayData
          });
        } else {
          // 無効な日（前月または翌月）
          weekDays.push({
            date: '',
            day: 0,
            isValid: false,
            data: null
          });
        }
      }
      
      calendar.push(weekDays);
    }
    
    return calendar;
  };

  // 滞在時間を表示用の文字列に変換する関数
  const formatStayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={4}>
        <Spinner size="md" mb={2} />
        <Text>年間の出勤データを読み込み中...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={4} color="red.500">
        <Text>{error}</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" w="100%" bg={bgColor} p={4} borderRadius="md">
      <Text fontSize="lg" fontWeight="bold" textAlign="center">
        {year}年の出勤記録
      </Text>
      
      <HStack spacing={2} justify="center" mb={2}>
        {[...Array(5)].map((_, i) => (
          <HStack key={i} align="center">
            <Box
              w="12px"
              h="12px"
              bg={COLOR_LEVELS[i]}
              borderRadius="sm"
            />
            <Text fontSize="xs">
              {i === 0 ? '0' : 
               i === 1 ? '~30分' : 
               i === 2 ? '~1時間' : 
               i === 3 ? '~3時間' : '6時間~'}
            </Text>
          </HStack>
        ))}
      </HStack>
      
      <Box overflowX="auto">
        <HStack spacing={2} align="start">
          {monthNames.map((monthName, monthIndex) => {
            const month = monthIndex + 1;
            const calendar = generateMonthCalendar(year, month);
            
            return (
              <VStack key={month} spacing={1} align="start">
                <Text fontSize="xs" fontWeight="medium" mb={1}>
                  {monthName}
                </Text>
                
                <HStack spacing={0} mb={1}>
                  {weekdayNames.map((name, i) => (
                    <Text key={i} fontSize="6px" width="14px" textAlign="center">
                      {i === 0 || i === 6 ? name : ''}
                    </Text>
                  ))}
                </HStack>
                
                {calendar.map((week, weekIndex) => (
                  <HStack key={weekIndex} spacing="2px">
                    {week.map((day, dayIndex) => {
                      if (!day.isValid) {
                        return (
                          <Box
                            key={dayIndex}
                            w="12px"
                            h="12px"
                            visibility="hidden"
                          />
                        );
                      }
                      
                      const level = day.data?.level || 0;
                      const stayTime = day.data?.stayTimeSeconds || 0;
                      
                      return (
                        <Tooltip
                          key={dayIndex}
                          label={`${month}月${day.day}日: ${stayTime > 0 ? formatStayTime(stayTime) : '出勤なし'}`}
                          placement="top"
                          hasArrow
                        >
                          <Box
                            w="12px"
                            h="12px"
                            bg={COLOR_LEVELS[level]}
                            borderRadius="sm"
                            _hover={{ transform: 'scale(1.2)', transition: 'transform 0.2s' }}
                            transition="all 0.2s"
                            cursor="pointer"
                          />
                        </Tooltip>
                      );
                    })}
                  </HStack>
                ))}
              </VStack>
            );
          })}
        </HStack>
      </Box>
    </VStack>
  );
};

export default YearlyAttendanceCalendar;
