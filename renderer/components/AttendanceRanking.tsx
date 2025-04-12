import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Heading, Badge, Flex, Spacer, Divider, useTheme } from '@chakra-ui/react';
import { getStudentNameById, getStudentGradeById } from '../utils/studentsManager';
import { formatStayTime } from '../utils/timeManager';
import Papa from 'papaparse';
import { FaTrophy, FaClock } from 'react-icons/fa';

// ランキング用データ型
interface RankingData {
  studentId: string;
  name: string;
  grade: string;
  value: number;
  displayValue: string;
  orderIndex?: number; // 登録順を保持するためのプロパティを追加
}

// 学年の優先度を数値化する関数を追加
const getGradePriority = (grade: string): number => {
  switch (grade) {
    case '教員': return 0;
    case 'M2': return 1;
    case 'M1': return 2;
    case 'B4': return 3;
    default: return 4;
  }
};

interface AttendanceRankingProps {
  maxRanks?: number;
}

const AttendanceRanking: React.FC<AttendanceRankingProps> = ({ maxRanks = 5 }) => {
  const theme = useTheme();

  // テーマから色を取得 (fallbackとして元の色配列を使用)
  const rankColors = theme.customTheme?.rankingColors || [
    { 
      bg: "linear-gradient(135deg, #FFD700 10%, #FFC800 40%, #FFD700 60%, #FFEF9A 100%)", 
      text: "#131113", 
      border: "#FFB700", 
      shadowColor: "rgba(255, 215, 0, 0.6)",
      highlight: "rgba(255, 255, 200, 0.7)"
    }, // 1位
    { 
      bg: "linear-gradient(135deg, #E8E8E8 10%, #C0C0C0 40%, #D8D8D8 60%, #F5F5F5 100%)", 
      text: "#131113", 
      border: "#A0A0A0", 
      shadowColor: "rgba(192, 192, 192, 0.6)",
      highlight: "rgba(255, 255, 255, 0.7)"
    }, // 2位
    { 
      bg: "linear-gradient(135deg, #CD7F32 10%, #A05B2C 40%, #CD7F32 60%, #E0A872 100%)", 
      text: "#131113", 
      border: "#B06000", 
      shadowColor: "rgba(205, 127, 50, 0.6)",
      highlight: "rgba(255, 235, 205, 0.7)"
    }, // 3位
    { 
      bg: "linear-gradient(135deg, #E2E8F0 10%, #CBD5E0 40%, #E2E8F0 60%, #EDF2F7 100%)", 
      text: "#131113", 
      border: "#CBD5E0", 
      shadowColor: "rgba(160, 174, 192, 0.4)",
      highlight: "rgba(255, 255, 255, 0.5)"
    }, // 4位
    { 
      bg: "linear-gradient(135deg, #F7FAFC 10%, #EDF2F7 40%, #F7FAFC 60%, #FFFFFF 100%)", 
      text: "#131113", 
      border: "#E2E8F0", 
      shadowColor: "rgba(160, 174, 192, 0.3)",
      highlight: "rgba(255, 255, 255, 0.5)"
    }, // 5位
  ];

  // トロフィーアイコンカラー
  const trophyColors = theme.customTheme?.trophyColors || ["#FFD700", "#C0C0C0", "#CD7F32"];

  // 学年バッジカラー
  const gradeBadgeColors = theme.customTheme?.gradeBadgeColors || {
    '教員': 'purple',
    'M2': 'blue',
    'M1': 'green',
    'B4': 'orange'
  };

  const [daysRanking, setDaysRanking] = useState<RankingData[]>([]);
  const [timeRanking, setTimeRanking] = useState<RankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setIsLoading(true);
        
        // 学生別の出勤日数と時間を集計
        const attendanceMap: Record<string, { days: Set<string>; totalTime: number }> = {};
        
        // CSVファイルからデータを読み込み
        const csvData = await loadAttendanceFromCSV();
        
        // CSVデータの処理
        csvData.forEach(record => {
          const { studentId, date, stayTimeSeconds } = record;
          
          if (!attendanceMap[studentId]) {
            attendanceMap[studentId] = { 
              days: new Set<string>(), 
              totalTime: 0 
            };
          }
          
          // 日付を追加
          if (date) {
            attendanceMap[studentId].days.add(date);
          }
          
          // 滞在時間を加算
          attendanceMap[studentId].totalTime += stayTimeSeconds;
        });
        
        // ローカルストレージから現在のデータも取得して合算
        const currentData = loadCurrentAttendanceData();
        
        // 現在のデータを合算
        Object.entries(currentData).forEach(([studentId, data]) => {
          if (!attendanceMap[studentId]) {
            attendanceMap[studentId] = { 
              days: new Set<string>(), 
              totalTime: 0 
            };
          }
          
          // 日付を追加
          if (data.date) {
            attendanceMap[studentId].days.add(data.date);
          }
          
          // 滞在時間を加算
          attendanceMap[studentId].totalTime += data.stayTimeSeconds;
        });
        
        // 登録順を保持するためローカルストレージから学生リストを取得
        const storedStudentsString = localStorage.getItem('students') || '[]';
        const storedStudents = JSON.parse(storedStudentsString);
        
        // 学生IDをキーとした順序マップを作成（登録順を記録）
        const studentOrderMap: Record<string, number> = {};
        storedStudents.forEach((student: any, index: number) => {
          if (student?.id) {
            studentOrderMap[student.id] = index;
          }
        });
        
        // 出勤日数ランキングを作成 - 同点の場合は学年を考慮し、学年内では登録順を維持
        const dayRankingData: RankingData[] = Object.entries(attendanceMap)
          .map(([studentId, data]) => ({
            studentId,
            name: getStudentNameById(studentId),
            grade: getStudentGradeById(studentId),
            value: data.days.size,
            displayValue: `${data.days.size}日`,
            orderIndex: studentOrderMap[studentId] !== undefined ? studentOrderMap[studentId] : 999999
          }))
          .filter(item => item.value > 0) // 0日のユーザーは除外
          .sort((a, b) => {
            // 値が異なる場合はその値で並べる
            if (b.value !== a.value) {
              return b.value - a.value;
            }
            // 値が同じ場合は学年の優先度で並べる
            const gradePriorityDiff = getGradePriority(a.grade) - getGradePriority(b.grade);
            if (gradePriorityDiff !== 0) {
              return gradePriorityDiff;
            }
            // 学年も同じ場合は登録順で並べる
            return a.orderIndex - b.orderIndex;
          })
          .slice(0, maxRanks);
        
        // 滞在時間ランキングを作成 - 同点の場合は学年を考慮し、学年内では登録順を維持
        const timeRankingData: RankingData[] = Object.entries(attendanceMap)
          .map(([studentId, data]) => ({
            studentId,
            name: getStudentNameById(studentId),
            grade: getStudentGradeById(studentId),
            value: data.totalTime,
            displayValue: formatStayTime(data.totalTime),
            orderIndex: studentOrderMap[studentId] !== undefined ? studentOrderMap[studentId] : 999999
          }))
          .filter(item => item.value > 0) // 0秒のユーザーは除外
          .sort((a, b) => {
            // 値が異なる場合はその値で並べる
            if (b.value !== a.value) {
              return b.value - a.value;
            }
            // 値が同じ場合は学年の優先度で並べる
            const gradePriorityDiff = getGradePriority(a.grade) - getGradePriority(b.grade);
            if (gradePriorityDiff !== 0) {
              return gradePriorityDiff;
            }
            // 学年も同じ場合は登録順で並べる
            return a.orderIndex - b.orderIndex;
          })
          .slice(0, maxRanks);
        
        setDaysRanking(dayRankingData);
        setTimeRanking(timeRankingData);
      } catch (error) {
        console.error('ランキングデータ読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAttendanceData();
  }, [maxRanks]);

  // CSVファイルからデータを読み込む関数
  const loadAttendanceFromCSV = async (): Promise<Array<{
    studentId: string;
    date: string;
    stayTimeSeconds: number;
  }>> => {
    const records: Array<{
      studentId: string;
      date: string;
      stayTimeSeconds: number;
    }> = [];
    
    // Electron APIが利用可能かチェック
    if (typeof window === 'undefined' || !window.electron) {
      console.log('Electron APIが利用できません。CSVデータの読み込みをスキップします。');
      return records;
    }

    const exportPath = localStorage.getItem('exportPath');
    if (!exportPath) {
      console.log('エクスポートパスが設定されていません。CSVデータの読み込みをスキップします。');
      return records;
    }

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // 今年のすべての月のCSVファイルをチェック
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, '0')}`;
        const fileName = `attendance_${monthKey}.csv`;
        const filePath = `${exportPath}/${fileName}`;
        
        try {
          // ファイルが存在するかチェック
          const exists = await window.electron.fileExists(filePath);
          
          if (exists.exists) {
            const csvContent = await window.electron.readFile(filePath);
            
            // CSVをパース
            const parsedData = Papa.parse(csvContent, { header: true });
            
            if (parsedData.data && Array.isArray(parsedData.data)) {
              parsedData.data.forEach((record: any) => {
                if (record['学生ID'] && record['日付']) {
                  const stayTimeSeconds = parseInt(record['滞在時間（秒）'] || '0', 10);
                  
                  records.push({
                    studentId: record['学生ID'],
                    date: record['日付'],
                    stayTimeSeconds: isNaN(stayTimeSeconds) ? 0 : stayTimeSeconds
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error(`${filePath}の読み込み中にエラー:`, error);
        }
      }
    } catch (error) {
      console.error('CSVファイル読み込みエラー:', error);
    }
    
    return records;
  };

  // ローカルストレージから現在のデータを取得する関数
  const loadCurrentAttendanceData = (): Record<string, {
    date: string;
    stayTimeSeconds: number;
  }> => {
    const result: Record<string, {
      date: string;
      stayTimeSeconds: number;
    }> = {};
    
    try {
      const attendanceStates = JSON.parse(localStorage.getItem('attendanceStates') || '{}');
      
      Object.entries(attendanceStates).forEach(([studentId, data]: [string, any]) => {
        if (data.attendanceTime) {
          const date = new Date(data.attendanceTime);
          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
          
          result[studentId] = {
            date: dateStr,
            stayTimeSeconds: data.totalStayTime || 0
          };
        }
      });
    } catch (error) {
      console.error('ローカルストレージデータ読み込みエラー:', error);
    }
    
    return result;
  };
  
  // ランキングアイテムのレンダリング
  const renderRankingItem = (item: RankingData, index: number, type: '出勤日数' | '滞在時間') => {
    const colorScheme = rankColors[index] || 
      { 
        bg: "linear-gradient(135deg, #E2E8F0 10%, #CBD5E0 40%, #E2E8F0 60%, #EDF2F7 100%)", 
        text: "#131113", 
        border: "#CBD5E0", 
        shadowColor: "rgba(160, 174, 192, 0.4)",
        highlight: "rgba(255, 255, 255, 0.5)",
      };
    
    // 滞在時間の表示をフォーマット
    const formatTimeDisplay = (displayValue: string, value: number) => {
      if (type === '滞在時間') {
        // 総秒数から時間、分、秒に変換
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        const seconds = value % 60;
        
        // 時間がある場合
        if (hours > 0) {
          return (
            <>
              <span style={{ fontSize: '1.5em' }}>{hours}</span>時間
              <span style={{ fontSize: '1.5em' }}>{minutes}</span>分
              <span style={{ fontSize: '1.5em' }}>{seconds}</span>秒
            </>
          );
        }
        // 分だけの場合
        else if (minutes > 0) {
          return (
            <>
              <span style={{ fontSize: '1.5em' }}>{minutes}</span>分
              <span style={{ fontSize: '1.5em' }}>{seconds}</span>秒
            </>
          );
        }
        // 秒だけの場合
        else {
          return <><span style={{ fontSize: '1.5em' }}>{seconds}</span>秒</>;
        }
      }
      
      // 出勤日数の場合
      return (
        <>
          <span style={{ fontSize: '1.5em' }}>{item.value}</span>日
        </>
      );
    };
    
    return (
    <Box 
      key={item.studentId} 
      mb={4}
      p={2} 
      borderWidth="5px" 
      borderColor={colorScheme.border}
      borderStyle="solid"
      borderRadius="3xl"
      bgImage={colorScheme.bg}
      color={colorScheme.text}
      boxShadow={`0 4px 12px ${colorScheme.shadowColor}, 0 0 0 2px ${colorScheme.border}`}
      position="relative"
      userSelect="none"
      transition="all 0.3s"
      overflow="visible"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: `linear-gradient(45deg, transparent 45%, ${colorScheme.highlight} 45%, ${colorScheme.highlight} 60%, transparent 10%), 
            linear-gradient(45deg, transparent 45%, ${colorScheme.highlight} 70%, ${colorScheme.highlight} 73%, transparent 70%)`,
        opacity: 0.3,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}
    >
        <Box
          position="absolute"
          top={-3}
          left={4}
          borderRadius="full"
          bg={theme.colors.neutral[900] || "#131113"}
          p="2px"
          boxShadow="0 2px 5px rgba(0, 0, 0, 0.3)"
          zIndex={2}
        >
          <Badge
            fontSize="lg"
            px={3}
            py={1}
            borderRadius="full"
            bg="transparent"
            color={index < 3 ? trophyColors[index] : "white"}
            fontWeight="bold"
          >
            {index + 1}位
          </Badge>
        </Box>

        <Flex align="center" position="relative" zIndex={1} mt={1} ml={9}>
          <Box mr={3} ml={8}>
            <Badge colorScheme={gradeBadgeColors[item.grade]} fontSize="md" px={2} py={1} borderRadius="md">
              {item.grade}
            </Badge>
          </Box>
          
          <Text fontWeight="bold" fontSize="xl" textShadow = "0px 1px 10px rgba(255, 255, 255, 0.9)">
            {item.name}
          </Text>
          
          <Spacer />
          
          <Text
            fontSize="xl"
            fontWeight="bold"
            letterSpacing="wider"
            textShadow="0 1px 2px rgba(0,0,0,0.1)"
            mr={2}
          >
            {formatTimeDisplay(item.displayValue, item.value)}
          </Text>
        </Flex>
      </Box>
    );
  };

  // セクションヘッダーのスタイル
  const sectionHeaderStyle = {
    position: "relative" as const,
    mb: 5,
    pb: 2,
    borderBottom: "6px solid #131113",
    padding: "8px 16px",
  };
  
  // ヘッディングのテキストスタイル
  const headingTextStyle = {
    fontWeight: 900,
    fontFamily: "Impact, 'Arial Black', sans-serif",
    letterSpacing: "0.05em",
    textShadow: "0 1px 0 rgba(0,0,0,0.2)"
  };

  // アイコン用の円形背景スタイル
  const iconCircleStyle = {
    bg: "#131113",
    p: 3.5,
    borderRadius: "full",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
  };
  
  return (
    <Box width="100%" mt={0}>
      <VStack spacing={2} align="stretch">
        {/* 出勤日数ランキング */}
        <Box>
          <Box {...sectionHeaderStyle}>
            <Flex align="center">
              <Box {...iconCircleStyle}>
                <FaTrophy color="#FFD700" size="1.5em" />
              </Box>
              <Heading size="lg" ml={3} color="#131113" {...headingTextStyle}>出勤日数ランキング</Heading>
            </Flex>
          </Box>
          {daysRanking.length > 0 ? (
            daysRanking.map((item, index) => renderRankingItem(item, index, '出勤日数'))
          ) : (
            <Box
              p={4}
              borderRadius="lg"
              bg="gray.50"
              textAlign="center"
              borderWidth="1px"
            >
              <Text color="gray.500">データがありません</Text>
            </Box>
          )}
        </Box>
        
        {/* 滞在時間ランキング */}
        <Box>
          <Box {...sectionHeaderStyle}>
            <Flex align="center">
              <Box {...iconCircleStyle}>
                <FaClock color="#3182CE" size="1.5em" />
              </Box>
              <Heading size="lg" ml={3} color="#131113" {...headingTextStyle}>滞在時間ランキング</Heading>
            </Flex>
          </Box>
          {timeRanking.length > 0 ? (
            timeRanking.map((item, index) => renderRankingItem(item, index, '滞在時間'))
          ) : (
            <Box
              p={4}
              borderRadius="lg"
              bg="gray.50"
              textAlign="center"
              borderWidth="1px"
            >
              <Text color="gray.500">データがありません</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default AttendanceRanking;
