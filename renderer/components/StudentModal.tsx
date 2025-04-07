// このコンポーネントは学生の出退勤管理用モーダルです。
// Propsには、モーダルの表示状態、学生情報、出退勤情報などが含まれます。
import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  useToast,
  Box,
  HStack,
  VStack,
  Circle,
  Spinner,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { keyframes, Global } from '@emotion/react';
import Papa from 'papaparse';
import { getCurrentTime, getJapanTime, formatStayTime } from '../utils/timeManager';
import { fetchCurrentMonthAttendance } from '../utils/attendanceAnalyzer';

// パルスアニメーションをキーフレームとして定義
const pulseKeyframes = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// WeekdayAttendanceIndicatorコンポーネント - 曜日出勤状況を視覚的に表示
const WeekdayAttendanceIndicator = ({ studentId }: { studentId: string }) => {
  const [attendanceDays, setAttendanceDays] = useState<number[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // 曜日ごとの直近の日付情報を保持する状態
  const [recentWeekdayDates, setRecentWeekdayDates] = useState<Record<number, string>>({});
  // 曜日ごとの滞在時間情報を保持する状態
  const [weekdayStayTimes, setWeekdayStayTimes] = useState<Record<number, string>>({});
  
  const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
  
  // パルスアニメーションを定義
  const pulseAnimation = `${pulseKeyframes} 2s infinite`;

  // タッチされている曜日のインデックスを追跡
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setIsLoading(true);
        // 基本的な出勤データを取得
        const result = await fetchCurrentMonthAttendance(studentId);
        let detectedAttendanceDays = [...result.attendanceDays];
        setCurrentDayIndex(result.currentDayIndex);
        
        // 直近の出勤曜日の日付を計算
        const dates = calculateRecentWeekdayDates();
        
        // CSVファイルからの出勤履歴チェック
        const { attendanceDays: csvAttendanceDays, stayTimes } = await loadAttendanceFromCSV(studentId, dates);
        if (csvAttendanceDays.length > 0) {
          // 既存の出勤日と CSV からの出勤日をマージ
          const mergedDays = Array.from(new Set([...detectedAttendanceDays, ...csvAttendanceDays]));
          detectedAttendanceDays = mergedDays;
          // 滞在時間情報を保存
          setWeekdayStayTimes(stayTimes);
        }
        
        setAttendanceDays(detectedAttendanceDays);
      } catch (err) {
        console.error('出勤データ読み込みエラー:', err);
        setError('出勤データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    // CSV ファイルから出勤履歴を読み込む関数
    const loadAttendanceFromCSV = async (
      studentId: string,
      weekdayDates: Record<number, string>
    ): Promise<{ attendanceDays: number[], stayTimes: Record<number, string> }> => {
      // Electron API が利用可能かチェック
      if (typeof window === 'undefined' || !window.electron) {
        console.log('Electron API が利用できません。CSV ファイルの読み込みをスキップします。');
        return { attendanceDays: [], stayTimes: {} };
      }

      const exportPath = localStorage.getItem('exportPath');
      if (!exportPath) {
        console.log('エクスポートパスが設定されていません。CSV ファイルの読み込みをスキップします。');
        return { attendanceDays: [], stayTimes: {} };
      }

      try {
        const today = getCurrentTime();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        
        // 必要な月の CSV ファイルを特定
        const neededMonths = new Set<string>();
        
        // 各曜日の日付から必要なファイルを特定
        Object.values(weekdayDates).forEach(dateStr => {
          const [month, day] = dateStr.split('/').map(Number);
          // 年は現在の年と仮定
          if (!isNaN(month) && !isNaN(day)) {
            const fileKey = `${currentYear}-${String(month).padStart(2, '0')}`;
            neededMonths.add(fileKey);
          }
        });
        
        console.log('読み込む必要のある月:', Array.from(neededMonths));
        
        // 各月の CSV ファイルを読み込み、学生の出勤データを抽出
        const attendanceDays = new Set<number>();
        const stayTimes: Record<number, string> = {};
        
        for (const monthKey of Array.from(neededMonths)) {
          const fileName = `attendance_${monthKey}.csv`;
          const filePath = `${exportPath}/${fileName}`;
          
          console.log(`CSVファイルを確認: ${filePath}`);
          
          // ファイルが存在するかチェック
          const exists = await window.electron.fileExists(filePath);
          
          if (exists.exists) {
            console.log(`CSVファイルが見つかりました: ${filePath}`);
            const csvContent = await window.electron.readFile(filePath);
            
            if (csvContent) {
              // CSV をパース
              const parsedData = Papa.parse(csvContent, { header: true });
              
              if (parsedData.data && Array.isArray(parsedData.data)) {
                // 学生IDでフィルタリング
                const studentRecords = parsedData.data.filter((record: any) => 
                  record['学生ID'] === studentId && record['日付']
                );
                
                console.log(`学生ID ${studentId} のレコード数:`, studentRecords.length);
                
                // 各レコードの日付から曜日を特定
                studentRecords.forEach((record: any) => {
                  try {
                    const dateStr = record['日付'];
                    if (!dateStr) return;
                    
                    const [month, day] = dateStr.split('/').map(Number);
                    if (isNaN(month) || isNaN(day)) return;
                    
                    // 日付から曜日を取得
                    const date = new Date(currentYear, month - 1, day);
                    let weekday = date.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
                    weekday = weekday === 0 ? 6 : weekday - 1; // 0: 月曜, ..., 6: 日曜に変換
                    
                    attendanceDays.add(weekday);
                    
                    // 滞在時間情報があれば保存
                    const stayTimeSeconds = parseInt(record['滞在時間（秒）'] || '0');
                    if (stayTimeSeconds > 0) {
                      const hours = Math.floor(stayTimeSeconds / 3600);
                      const minutes = Math.floor((stayTimeSeconds % 3600) / 60);
                      stayTimes[weekday] = `${hours}時間${minutes}分`;
                    } else if (record['滞在時間']) {
                      // 直接滞在時間フィールドがある場合
                      stayTimes[weekday] = record['滞在時間'];
                    }
                  } catch (e) {
                    console.error('日付解析エラー:', e);
                  }
                });
              }
            }
          } else {
            console.log(`CSVファイルが見つかりません: ${filePath}`);
          }
        }
        
        return { attendanceDays: Array.from(attendanceDays), stayTimes };
      } catch (error) {
        console.error('CSV ファイル読み込みエラー:', error);
        return { attendanceDays: [], stayTimes: {} };
      }
    };
    
    // 直近の曜日ごとの日付を計算する関数
    const calculateRecentWeekdayDates = (): Record<number, string> => {
      // 時間操作モードを考慮した現在時刻を取得
      const today = getCurrentTime();
      const currentWeekday = (today.getDay() + 6) % 7; // 0: 月曜, ..., 6: 日曜
      
      // 各曜日の直近の日付を計算
      const dates: Record<number, string> = {};
      
      // 今日から過去7日間をさかのぼって、各曜日の直近の日付を特定
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        
        const targetWeekday = (targetDate.getDay() + 6) % 7; // 0: 月曜, ..., 6: 日曜
        
        // その曜日の日付がまだ記録されていなければ記録（より直近のものを優先）
        if (!dates[targetWeekday]) {
          const month = targetDate.getMonth() + 1;
          const day = targetDate.getDate();
          dates[targetWeekday] = `${month}/${day}`;
        }
      }
      
      setRecentWeekdayDates(dates);
      return dates;
    };
    
    if (studentId) {
      loadAttendanceData();
    }
  }, [studentId]);

  // タッチまたはクリック時のハンドラー
  const handleDaySelect = (index: number) => {
    setActiveDayIndex(index);
    onOpen();
  };
  
  if (isLoading) {
    return (
      <Box textAlign="center" py={4}>
        <Spinner size="sm" mr={2} />
        <Text display="inline">出勤データを読み込み中...</Text>
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
    <VStack spacing={2} align="center" w="100%">
      {/* <Text fontSize="mg" fontWeight="bold" mb={2}>
        直近の出勤曜日
      </Text> */}
      <HStack spacing={3} justify="center">
        {weekdays.map((day, index) => {
          const isAttendance = attendanceDays.includes(index);
          const isToday = index === currentDayIndex;
          
          // 直近の日付を取得
          const recentDate = recentWeekdayDates[index] || '日付なし';
          
          // 表示するコンテンツを作成
          let popoverContent = '';
          if (isAttendance) {
            const stayTime = weekdayStayTimes[index] || '滞在時間不明';
            popoverContent = `${recentDate}：${stayTime}`;
          } else {
            popoverContent = `${recentDate}：未出勤`;
          }
          
          if (isToday) {
            popoverContent += ' (今日)';
          }
          
          return (
            <Popover
              key={index}
              isOpen={isOpen && activeDayIndex === index}
              onClose={onClose}
              placement="top"
            >
              <PopoverTrigger>
                <Box
                  position="relative"
                  display="inline-block"
                >
                      {isToday && (
                      <Box
                        position="absolute"
                        top="-5px"
                        left="-6px"
                        right="-6px"
                        bottom="-5px"
                        borderRadius="full"
                        borderWidth="4px"
                        borderColor="green.400"
                        animation={pulseAnimation}
                        zIndex={0}
                      />
                      )}
                    <Circle
                    size="40px"
                    bg={isAttendance ? "red.500" : "gray.300"}
                    color="white"
                    fontWeight="bold"
                    cursor="pointer"
                    onClick={() => handleDaySelect(index)}
                    onTouchStart={() => handleDaySelect(index)}
                    _hover={{ transform: 'scale(1.0)', transition: 'transform 0.2s' }}
                    transition="all 0.3s"
                    position="relative"
                    zIndex={1}
                  >
                    {day}
                  </Circle>
                </Box>
              </PopoverTrigger>
              <PopoverContent width="auto" p={1}>
                <PopoverArrow />
                <PopoverBody 
                  textAlign="center" 
                  fontFamily="inherit"
                  fontSize="md"
                  fontWeight="medium"
                >
                  {popoverContent}
                </PopoverBody>
              </PopoverContent>
            </Popover>
          );
        })}
      </HStack>
    </VStack>
  );
};

// 週・月・年の出勤統計を表示するコンポーネント
interface AttendanceStatisticsProps {
  studentId: string;
}

const AttendanceStatistics: React.FC<AttendanceStatisticsProps> = ({ studentId }) => {
  const [statistics, setStatistics] = useState<{
    weekly: { days: number; totalTime: string };
    monthly: { days: number; totalTime: string };
    yearly: { days: number; totalTime: string };
  }>({
    weekly: { days: 0, totalTime: '0時間0分' },
    monthly: { days: 0, totalTime: '0時間0分' },
    yearly: { days: 0, totalTime: '0時間0分' },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateAttendanceStatistics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 現在の日時を取得（時間操作モードを考慮）
        const today = getCurrentTime();
        
        // CSV ファイルからデータを取得
        const attendanceData = await fetchAttendanceData(studentId);
        
        if (!attendanceData || attendanceData.length === 0) {
          console.log('出勤データが見つかりませんでした');
          setStatistics({
            weekly: { days: 0, totalTime: '0時間0分' },
            monthly: { days: 0, totalTime: '0時間0分' },
            yearly: { days: 0, totalTime: '0時間0分' },
          });
          setIsLoading(false);
          return;
        }

        // 週の始まり（月曜日）を取得
        const currentWeekStart = new Date(today);
        const dayOfWeek = currentWeekStart.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日までの日数を計算
        currentWeekStart.setDate(currentWeekStart.getDate() - diff);
        currentWeekStart.setHours(0, 0, 0, 0);

        // 月の始まりを取得
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // 年の始まりを取得
        const currentYearStart = new Date(today.getFullYear(), 0, 1);

        // 週・月・年の統計を計算
        const weeklyStats = calculatePeriodStatistics(attendanceData, currentWeekStart, today);
        const monthlyStats = calculatePeriodStatistics(attendanceData, currentMonthStart, today);
        const yearlyStats = calculatePeriodStatistics(attendanceData, currentYearStart, today);

        setStatistics({
          weekly: weeklyStats,
          monthly: monthlyStats,
          yearly: yearlyStats,
        });
      } catch (err) {
        console.error('統計計算エラー:', err);
        setError('出勤統計の計算中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      calculateAttendanceStatistics();
    }
  }, [studentId]);

  // 特定期間の統計を計算する関数
  const calculatePeriodStatistics = (
    data: any[],
    startDate: Date,
    endDate: Date
  ): { days: number; totalTime: string } => {
    // 期間内のデータをフィルタリング
    const filteredData = data.filter(record => {
      const recordDate = parseDate(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });

    // 日数をカウント（ユニークな日付の数）
    const uniqueDates = new Set(filteredData.map(record => record.date));
    const daysCount = uniqueDates.size;

    // 滞在時間の合計を計算
    let totalSeconds = 0;
    filteredData.forEach(record => {
      totalSeconds += record.stayTimeSeconds;
    });

    // 滞在時間を時間と分に変換
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedTime = `${hours}時間${minutes}分`;

    return { days: daysCount, totalTime: formattedTime };
  };

  // CSV ファイルから出勤データを取得する関数
  const fetchAttendanceData = async (studentId: string): Promise<any[]> => {
    // Electron API が利用可能かチェック
    if (typeof window === 'undefined' || !window.electron) {
      console.log('Electron API が利用できません');
      return [];
    }

    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      console.log('エクスポートパスが設定されていません');
      return [];
    }

    try {
      const today = getCurrentTime();
      const currentYear = today.getFullYear();
      
      // 収集したすべての出勤データを保持する配列
      const allAttendanceData: any[] = [];
      
      // 現在の年のすべての月のデータを取得
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
        const fileName = `attendance_${monthKey}.csv`;
        const filePath = `${exportPath}/${fileName}`;
        
        // ファイルが存在するかチェック
        const exists = await window.electron.fileExists(filePath);
        
        if (exists.exists) {
          console.log(`CSVファイルが見つかりました: ${filePath}`);
          const csvContent = await window.electron.readFile(filePath);
          
          if (csvContent) {
            // CSV をパース
            const parsedData = Papa.parse(csvContent, { header: true });
            
            if (parsedData.data && Array.isArray(parsedData.data)) {
              // 学生IDでフィルタリング
              const studentRecords = parsedData.data.filter((record: any) => 
                record['学生ID'] === studentId && record['日付']
              );
              
              // データを標準形式に変換
              studentRecords.forEach((record: any) => {
                try {
                  if (!record['日付']) return;
                  
                  const stayTimeSeconds = parseInt(record['滞在時間（秒）'] || '0');
                  
                  allAttendanceData.push({
                    date: record['日付'],
                    stayTimeSeconds: stayTimeSeconds,
                  });
                } catch (e) {
                  console.error('データ変換エラー:', e);
                }
              });
            }
          }
        }
      }
      
      return allAttendanceData;
    } catch (error) {
      console.error('出勤データ取得エラー:', error);
      return [];
    }
  };

  // MM/DD形式の日付をDateオブジェクトに変換
  const parseDate = (dateStr: string): Date => {
    const [month, day] = dateStr.split('/').map(Number);
    const year = getCurrentTime().getFullYear();
    return new Date(year, month - 1, day);
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={2}>
        <Spinner size="sm" mr={2} />
        <Text display="inline" fontSize="sm">統計データを計算中...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={2} color="red.500" fontSize="sm">
        <Text>{error}</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="center" w="100%" textAlign="center">
      <Box>
        <Text fontSize="sm" fontWeight="bold" color="gray.700">
          今週の出勤: <Text as="span" fontSize="2xl" fontWeight="bold">{statistics.weekly.days}</Text><Text as="span" fontSize="sm" fontWeight="bold">日間</Text> <Text as="span" mx={1}>-</Text> <Text as="span" fontSize="2xl" fontWeight="bold">{statistics.weekly.totalTime}</Text>
        </Text>
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="bold" color="gray.700">
          今月の出勤: <Text as="span" fontSize="2xl" fontWeight="bold">{statistics.monthly.days}</Text><Text as="span" fontSize="sm" fontWeight="bold">日間</Text> <Text as="span" mx={1}>-</Text> <Text as="span" fontSize="2xl" fontWeight="bold">{statistics.monthly.totalTime}</Text>
        </Text>
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="bold" color="gray.700">
          今年の出勤: <Text as="span" fontSize="2xl" fontWeight="bold">{statistics.yearly.days}</Text><Text as="span" fontSize="sm" fontWeight="bold">日間</Text> <Text as="span" mx={1}>-</Text> <Text as="span" fontSize="2xl" fontWeight="bold">{statistics.yearly.totalTime}</Text>
        </Text>
      </Box>
    </VStack>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: { id: string; name: string } | null;
  attendanceStates: {
    [studentId: string]: {
      isAttending: boolean;
      attendanceTime: Date | null;
      leavingTime: Date | null;
      totalStayTime: number; // 追加: 累積滞在時間（秒単位）
    };
  };
  setAttendanceStates: React.Dispatch<React.SetStateAction<{
    [studentId: string]: {
      isAttending: boolean;
      attendanceTime: Date | null;
      leavingTime: Date | null;
      totalStayTime: number; // 追加: 累積滞在時間
    };
  }>>;
  onAttendanceChange?: () => void; // 追加: 出退勤状態変更時のコールバック
}

const StudentModal: React.FC<Props> = ({ isOpen, onClose, student, attendanceStates, setAttendanceStates, onAttendanceChange }) => {
  // トースト通知を使用するためのフック
  const toast = useToast();
  
  // ローカルストレージへの保存を確認する関数
  const verifyLocalStorageSave = (data: any): boolean => {
    try {
      localStorage.setItem('attendanceStates', JSON.stringify(data));
      const savedData = localStorage.getItem('attendanceStates');
      return savedData !== null && JSON.stringify(data) === savedData;
    } catch (error) {
      console.error('ローカルストレージ保存エラー:', error);
      return false;
    }
  };

  // --- ボタンがクリックされた際の挙動 ---  
  // 学生情報が存在する場合、現在の出退勤状況に応じて出勤/退勤を切り替え、ローカルストレージに状態を保存します。
  const handleAttendance = () => {
    // 学生情報が無ければ処理を中断
    if (!student) return;

    let now = getJapanTime();          // 現在時刻をJSTで取得
    const studentId = student.id;      // 対象学生のIDを取得

    // 出退勤状態の更新処理
    setAttendanceStates((prevStates) => {
      // 既存情報がない場合は初期状態を設定
      const studentState = prevStates[studentId] || {
        isAttending: false,
        attendanceTime: null,
        leavingTime: null,
        totalStayTime: 0,
      };
      let updatedState;
      if (!studentState.isAttending) {
        // 出勤の場合: 出勤状態に変更し、現在時刻を出勤時刻に設定
        updatedState = {
          ...studentState,
          isAttending: true,
          attendanceTime: now,
          leavingTime: null,
        };
        console.log(`Student ${studentId} 出勤:`, now);
      } else {
        // 退勤の場合: 出勤状態を解除し、現在時刻を退勤時刻に設定
        updatedState = {
          ...studentState, // 既存情報をコピー
          isAttending: false,
          leavingTime: now,
        };
        console.log(`Student ${studentId} 退勤:`, now);
        // 滞在時間を計算（秒単位）し、累積
        const attendanceTime = studentState.attendanceTime ? studentState.attendanceTime.getTime() : now.getTime();
        const stayTime = Math.floor((now.getTime() - attendanceTime) / 1000);
        updatedState = {
          ...updatedState, 
          totalStayTime: studentState.totalStayTime + stayTime
        };
      }
      const newState = {
        ...prevStates,
        [studentId]: updatedState,
      };

      // 更新された状態をローカルストレージに保存し、結果を確認
      const saveSuccessful = verifyLocalStorageSave(newState);
      
      // 保存結果に応じてトースト通知
      const action = updatedState.isAttending ? '出勤' : '退勤';
      if (saveSuccessful) {
        toast({
          title: `${action}記録が保存されました`,
          description: `${student.name}さんの${action}情報がローカルストレージに保存されました`,
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'bottom',
        });
      } else {
        toast({
          title: `${action}記録の保存に失敗しました`,
          description: `${student.name}さんの${action}情報の保存に問題が発生しました。再度お試しください。`,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'bottom',
        });
        // 問題が発生した場合でも、アプリケーションの状態は更新する
        console.error('ローカルストレージへの保存に失敗しました');
      }

      return newState;
    });

    // 出退勤状態変更を通知
    if (onAttendanceChange) {
      setTimeout(onAttendanceChange, 300); // レンダリングが完了した後に実行
    }

    onClose(); // モーダルを閉じる
  };

  // --- 学生の出退勤状態取得用関数 ---
  // 学生IDに応じた状態情報が存在するかをチェックし、なければ初期状態を返します。
  const getAttendanceState = (studentId: string | undefined | null) => {
    if (!studentId) {
      return { isAttending: false, attendanceTime: null, leavingTime: null, totalStayTime: 0 };
    }
    return attendanceStates[studentId] || {
      isAttending: false,
      attendanceTime: null,
      leavingTime: null,
      totalStayTime: 0,
    };
  };

  // 表示用に出勤・退勤時刻を文字列に変換して管理するstate
  const [attendanceTimeStr, setAttendanceTimeStr] = useState<string | null>(null);
  const [leavingTimeStr, setLeavingTimeStr] = useState<string | null>(null);
  const [totalStayTimeStr, setTotalStayTimeStr] = useState<string | null>(null);

  // --- 出退勤状態または選択学生が変更されたときの副作用 ---
  // 学生情報または出退勤状態が更新されると、表示用の時刻文字列を更新します。
  useEffect(() => {
    if (student) {
      const state = getAttendanceState(student.id);
      const attendanceTime = state.attendanceTime;
      const leavingTime = state.leavingTime;
      const totalStayTime = state.totalStayTime;
      // JST表示に変更
      setAttendanceTimeStr(
        attendanceTime ? attendanceTime.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' }) : null
      );
      setLeavingTimeStr(
        leavingTime ? leavingTime.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' }) : null
      );
      // formatStayTime 関数を使用して滞在時間を表示
      setTotalStayTimeStr(formatStayTime(totalStayTime));
    }
  }, [student, attendanceStates]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay/>
      <ModalContent width="50%" maxHeight="80%" borderRadius="3xl" pb={4}>
        {/* ヘッダー: 学生名またはデフォルトのタイトルが表示されます */}
        <ModalHeader
          fontSize={"2xl"}
          fontWeight={"bold"}
          justifyContent="center"
          textAlign="center"
          display="flex"
          flexDirection="column" // 追加: 縦方向に並べることでIDを改行表示
          mt={2}
          mb={0}
        >
            {student ? student.name : "学生情報"}
            <Text fontSize={"sm"} fontWeight={"bold"} color={"gray.500"} mt={0}>
              ID: {student?.id}
            </Text>
        </ModalHeader>
        {/* モーダルを閉じるボタン */}
        <ModalCloseButton size="lg" right={6} top={4} border={"1px solid red"} borderRadius="xl" bg="red.500" _hover={{ bg: "red.600" }} color="white"/>

        {/* 出退勤時刻の表示エリア */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
          <Text fontSize={"xl"} fontWeight={"bold"} mt={2}>
            出勤: <Text as="span" fontSize="3xl" letterSpacing="wider">{attendanceTimeStr ? attendanceTimeStr : "未登録"}</Text>
          </Text>
          <Text fontSize={"xl"} fontWeight={"bold"} mt={2} ml={6}>
            退勤: <Text as="span" fontSize="3xl" letterSpacing="wider">{leavingTimeStr ? leavingTimeStr : "未登録"}</Text>
          </Text>
        </div>
        <ModalBody border="1px solid #ccc" borderRadius="2xl" p={4} ml={6} mr={6} mt={2}>
          {student ? (
            <VStack spacing={4}>
              {/* 曜日出勤状況の表示 */}
              {student.id && <WeekdayAttendanceIndicator studentId={student.id} />}
              
              {/* 週・月・年の出勤統計を表示 */}
              {student.id && <AttendanceStatistics studentId={student.id} />}
            </VStack>
          ) : (
            <Text>No student selected.</Text>
          )}
        </ModalBody>
        <Text fontSize={"xl"} fontWeight={"bold"} textAlign={"center"} mt={2} mb={2}>
          滞在時間: <Text as="span" fontSize="3xl">{totalStayTimeStr ? totalStayTimeStr : "未登録"}</Text>
        </Text>
        <ModalFooter px={4} pb={0}>
          {/* ボタンの色とテキストは出退勤状態に応じて切り替わります */}
          <Button
            colorScheme={student && getAttendanceState(student.id).isAttending ? "red" : "green"}
            onClick={handleAttendance}
            borderRadius="3xl"
            width="100%"
            height="7vh"
            fontSize={"4xl"}
            fontWeight="black"
            letterSpacing="widest"
            boxShadow="0 0 5px 1px rgba(0, 0, 0, 0.3), inset 0 3px 10px rgba(233, 233, 233, 0.78), inset 0 -3px 10px rgba(0, 0, 0, 0.35)"
          >
            {student && getAttendanceState(student.id).isAttending ? "退勤" : "出勤"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StudentModal;