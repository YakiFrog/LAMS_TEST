import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Tooltip,
  Spinner,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
} from '@chakra-ui/react';
import Papa from 'papaparse';
import { getCurrentTime, resetTime } from '../utils/timeManager';

// 色の強度レベル（滞在時間に応じて）- GitHub風の赤色グラデーション
const COLOR_LEVELS = [
  'rgb(235, 237, 240)', // レベル0: 出勤なし
  'rgb(255, 200, 200)', // レベル1: 少し
  'rgb(255, 150, 150)', // レベル2: やや少なめ
  'rgb(255, 100, 100)', // レベル3: 中程度
  'rgb(200, 0, 0)'      // レベル4: 長時間
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
  const [fiscalYear, setFiscalYear] = useState<number>(getCurrentFiscalYear());
  const [maxStayTime, setMaxStayTime] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 月の名前 - 年度順（4月から翌年3月）
  const monthNames = ['4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月'];
  
  // 曜日の名前（月〜日）
  const weekdayNames = ['月', '火', '水', '木', '金', '土', '日'];
  
  // 背景色とテキスト色
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  // 現在の年度を取得する関数
  function getCurrentFiscalYear(): number {
    const now = getCurrentTime();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScriptの月は0からはじまるので+1
    
    // 3月以降は現在の年が年度、1-2月は前年が年度
    return month >= 3 ? year : year - 1;
  }

  // 年度から実際の年と月を計算する関数
  function getActualYearMonth(fiscalYear: number, fiscalMonth: number): { year: number, month: number } {
    // fiscalMonthは0-11で、0が4月、11が翌年3月を表す
    const calendarMonth = (fiscalMonth + 3) % 12 + 1; // 1-12の実際の月に変換
    const calendarYear = fiscalMonth >= 9 ? fiscalYear + 1 : fiscalYear; // 1-3月は次の年
    
    return { year: calendarYear, month: calendarMonth };
  }

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // データを取得 - 年度内の全ての月
        const dataMap = new Map<string, CalendarDataType>();
        let maxTime = 0;
        
        // 年度の4月から翌年3月までのデータを取得
        for (let i = 0; i < 12; i++) {
          const { year, month } = getActualYearMonth(fiscalYear, i);
          const monthData = await getMonthAttendanceData(studentId, year, month);
          
          // データをマージ
          monthData.data.forEach((value, key) => {
            dataMap.set(key, value);
          });
          
          // 最大滞在時間を更新
          if (monthData.maxStayTime > maxTime) {
            maxTime = monthData.maxStayTime;
          }
        }
        
        setCalendarData(dataMap);
        setMaxStayTime(maxTime);
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
  }, [studentId, fiscalYear]);

  // 月ごとの出勤データを取得する関数
  const getMonthAttendanceData = async (
    studentId: string, 
    year: number,
    month: number
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
      
      // ローカルストレージからも当日のデータを確認
      const storedAttendanceStates = localStorage.getItem('attendanceStates');
      if (storedAttendanceStates) {
        const attendanceStates = JSON.parse(storedAttendanceStates);
        const studentState = attendanceStates[studentId];
        
        if (studentState && (studentState.attendanceTime || studentState.leavingTime)) {
          // 出勤または退勤時間がある場合
          const date = studentState.attendanceTime 
            ? new Date(studentState.attendanceTime) 
            : new Date(studentState.leavingTime);
          
          // 現在の年と月と一致するかチェック
          if (date.getFullYear() === year && date.getMonth() + 1 === month) {
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
      console.error('月間出勤データ取得エラー:', error);
      return { data: dataMap, maxStayTime: maxTime };
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
      {/* <Text fontSize="lg" fontWeight="bold" textAlign="center">
        {fiscalYear}年度の出勤記録 ({fiscalYear}年4月〜{fiscalYear+1}年3月)
      </Text> */}
      
      <Box w="100%">
        <VStack spacing={2} align="stretch">
          {monthNames.map((monthName, fiscalMonthIndex) => {
            // 年度内の月から実際のカレンダー年と月を取得
            const { year, month } = getActualYearMonth(fiscalYear, fiscalMonthIndex);
            const calendar = generateMonthCalendar(year, month);
            
            return (
              <VStack key={`${year}-${month}`} spacing={1} align="stretch">
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  {year}年{monthName}
                </Text>
                
                <HStack spacing={0} mb={1} justify="space-between">
                  {weekdayNames.map((name, i) => (
                    <Text key={i} fontSize="xs" flex="1" textAlign="center">
                      {name}
                    </Text>
                  ))}
                </HStack>
                
                {calendar.map((week, weekIndex) => (
                  <HStack key={weekIndex} spacing={1} justify="space-between">
                    {week.map((day, dayIndex) => {
                      if (!day.isValid) {
                        return (
                          <Box
                            key={dayIndex}
                            flex="1"
                            minH="30px"
                            visibility="hidden"
                          />
                        );
                      }
                      
                      const level = day.data?.level || 0;
                      const stayTime = day.data?.stayTimeSeconds || 0;
                      const dateInfo = `${month}月${day.day}日: ${stayTime > 0 ? formatStayTime(stayTime) : '出勤なし'}`;
                      
                      return (
                        <Popover
                          key={dayIndex}
                          isOpen={selectedDay === day.date}
                          onClose={() => setSelectedDay(null)}
                        >
                            <PopoverTrigger>
                            <Box
                              flex="1"
                              minH="30px"
                              bg={COLOR_LEVELS[level]}
                              borderRadius="2px"
                              cursor="pointer"
                              onClick={() => setSelectedDay(day.date)}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              border="1px solid rgba(27, 31, 35, 0.06)"
                              _hover={{ border: "1px solid rgba(27, 31, 35, 0.2)" }}
                            />
                            </PopoverTrigger>
                          <PopoverContent>
                            <PopoverArrow />
                            <PopoverCloseButton />
                            <PopoverBody>
                              {dateInfo}
                            </PopoverBody>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </HStack>
                ))}
              </VStack>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
};

export default YearlyAttendanceCalendar;
