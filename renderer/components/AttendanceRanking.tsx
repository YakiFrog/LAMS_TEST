import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Heading, Badge, Flex, Spacer, Divider } from '@chakra-ui/react';
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

// 各ランキング項目のカラーマップ
const rankColors = [
  { bg: "#FFD700", text: "#131113", border: "#FFB700", shadowColor: "rgba(255, 215, 0, 0.6)" }, // 1位
  { bg: "#C0C0C0", text: "#131113", border: "#A0A0A0", shadowColor: "rgba(192, 192, 192, 0.6)" }, // 2位
  { bg: "#CD7F32", text: "#131113", border: "#B06000", shadowColor: "rgba(205, 127, 50, 0.6)" }, // 3位
];

// トロフィーアイコンカラー
const trophyColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

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

const AttendanceRanking: React.FC<AttendanceRankingProps> = ({ maxRanks = 3 }) => {
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
      { bg: "#E2E8F0", text: "#131113", border: "#CBD5E0", shadowColor: "rgba(160, 174, 192, 0.4)" };
    
    return (
      <Box 
        key={item.studentId} 
        mb={4}
        p={2} 
        borderWidth="5px" 
        borderColor={colorScheme.border}
        borderRadius="3xl"
        bg={colorScheme.bg}
        color={colorScheme.text}
        boxShadow={`0 3px 10px ${colorScheme.shadowColor}`}
        position="relative"
        userSelect="none"
        _hover={{
          transform: "translateY(-3px)",
          transition: "transform 0.2s"
        }}
        transition="all 0.3s"
      >
        <Flex align="center">
          <Badge
            position="absolute"
            top={0}
            left={2}
            transform="translate(0%, -50%)"
            fontSize="lg"
            px={3}
            py={1}
            borderRadius="full"
            bg="#131113"
            color="white"
            fontWeight="bold"
          >
            {index + 1}位
          </Badge>

          <Box ml={10} mr={3}>
            <Badge colorScheme={
              item.grade === '教員' ? 'purple' : 
              item.grade === 'M2' ? 'blue' :
              item.grade === 'M1' ? 'green' : 'orange'
            } fontSize="md" px={2} py={1} borderRadius="md">
              {item.grade}
            </Badge>
          </Box>
          
          <Text fontWeight="bold" fontSize="xl">
            {item.name}
          </Text>
          
          <Spacer />
          
          <Text
            fontSize="2xl"
            fontWeight="bold"
            letterSpacing="wider"
          >
            {type === '出勤日数' ? 
              <span>{item.displayValue}</span> : 
              <span>{item.displayValue}</span>
            }
          </Text>
        </Flex>
      </Box>
    );
  };

  // セクションヘッダーのスタイル
  const sectionHeaderStyle = {
    position: "relative" as const,
    mb: 6,
    pb: 2,
    borderBottom: "4px solid #131113",
  };
  
  return (
    <Box width="100%" mt={10}>
      <VStack spacing={8} align="stretch">
        {/* 出勤日数ランキング */}
        <Box>
          <Box {...sectionHeaderStyle}>
            <Flex align="center">
              <FaTrophy color="#FFD700" size="1.8em" />
              <Heading size="lg" ml={2} color="#131113" fontWeight="bold">出勤日数ランキング</Heading>
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
              <FaClock color="#3182CE" size="1.8em" />
              <Heading size="lg" ml={2} color="#131113">滞在時間ランキング</Heading>
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
