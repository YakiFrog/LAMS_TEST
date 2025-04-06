import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  VStack,
  HStack,
  Select,
  Input,
  Button,
  Flex,
  useColorModeValue,
  Badge,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  FormControl,
  FormLabel,
  Switch,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
  Divider,
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, TimeIcon } from '@chakra-ui/icons';
import { FaCalendarAlt, FaHistory } from 'react-icons/fa';
import { getCurrentTime, isTimeOverrideEnabled, getOverrideTime } from '../utils/timeManager';

const Tab2Content: React.FC = () => {
  const [savedAttendanceStates, setSavedAttendanceStates] = useState<any>(null);
  const [localStorageSize, setLocalStorageSize] = useState<number>(0);
  const [localStorageMaxSize, setLocalStorageMaxSize] = useState<number>(5 * 1024 * 1024); // 5MB
  const [students, setStudents] = useState<Array<{id: string, name: string, grade: string}>>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayData, setDisplayData] = useState<any[]>([]);
  const toast = useToast();

  const resetTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  const getJapanTime = (): Date => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 9 * 60 * 60000);
  };

  const calculateLocalStorageSize = () => {
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += ((localStorage[x].length + x.length) * 2);
      }
    }
    return total;
  };

  const getAttendanceData = (date: Date) => {
    const attendanceStates = JSON.parse(localStorage.getItem('attendanceStates') || '{}');
    const filteredData = [];

    const isTimeOverride = isTimeOverrideEnabled();

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const isSameDay = (date1: Date, date2: Date) => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    };

    for (const [studentId, state] of Object.entries(attendanceStates)) {
      const typedState = state as {
        isAttending: boolean;
        attendanceTime: string | null;
        leavingTime: string | null;
        totalStayTime: number;
      };

      if (typedState.attendanceTime || typedState.leavingTime) {
        const attendanceDate = typedState.attendanceTime ? new Date(typedState.attendanceTime) : null;
        const leavingDate = typedState.leavingTime ? new Date(typedState.leavingTime) : null;

        if (attendanceDate) {
          console.log(`データ確認 [ID:${studentId}] 出勤時間: ${attendanceDate.toLocaleString()}`);
        }
        if (leavingDate) {
          console.log(`データ確認 [ID:${studentId}] 退勤時間: ${leavingDate.toLocaleString()}`);
        }

        if (
          (attendanceDate && isSameDay(attendanceDate, targetDate)) ||
          (leavingDate && isSameDay(leavingDate, targetDate))
        ) {
          const student = students.find(s => s.id === studentId) || { id: studentId, name: 'Unknown', grade: 'Unknown' as any };
          
          filteredData.push({
            id: studentId,
            name: student.name,
            grade: student.grade,
            attendanceTime: attendanceDate ? attendanceDate.toLocaleTimeString() : '-',
            attendanceTimeFull: attendanceDate,
            leavingTime: leavingDate ? leavingDate.toLocaleTimeString() : '-',
            leavingTimeFull: leavingDate,
            isAttending: typedState.isAttending,
            totalStayTime: typedState.totalStayTime || 0,
            totalStayTimeFormatted: formatTime(typedState.totalStayTime || 0),
          });
        }
      }
    }

    if (isTimeOverride && filteredData.length === 0) {
      console.warn('時間操作モードが有効ですが、選択した日付のデータはありません。');
    }

    console.log(`${targetDate.toLocaleDateString()} のデータ: ${filteredData.length}件`);
    
    return filteredData;
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  };

  useEffect(() => {
    const storedAttendanceStates = localStorage.getItem('attendanceStates');
    if (storedAttendanceStates) {
      const parsedAttendanceStates = JSON.parse(storedAttendanceStates);
      const today = resetTime(getJapanTime());

      Object.keys(parsedAttendanceStates).forEach(studentId => {
        const attendanceState = parsedAttendanceStates[studentId];
        if (attendanceState) {
          if (attendanceState.attendanceTime) {
            const attendanceDate = resetTime(new Date(attendanceState.attendanceTime));
            if (attendanceDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
          }
          if (attendanceState.leavingTime) {
            const leavingDate = resetTime(new Date(attendanceState.leavingTime));
            if (leavingDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.leavingTime = new Date(attendanceState.leavingTime);
          }
        }
      });

      setSavedAttendanceStates(parsedAttendanceStates);
    } else {
      setSavedAttendanceStates('No data');
    }

    setLocalStorageSize(calculateLocalStorageSize());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString();
      const filteredData = getAttendanceData(selectedDate);
      setDisplayData(filteredData);

      if (isTimeOverrideEnabled() && filteredData.length === 0) {
        toast({
          title: '時間操作モードが有効です',
          description: `選択した日付 (${formattedDate}) のデータが見つかりません。日付を変更するか、時間設定を確認してください。`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [selectedDate, students]);

  useEffect(() => {
    const checkTimeOverride = () => {
      if (isTimeOverrideEnabled()) {
        const overrideTime = getOverrideTime();
        if (overrideTime) {
          if (selectedDate && 
              (selectedDate.getFullYear() !== overrideTime.getFullYear() ||
               selectedDate.getMonth() !== overrideTime.getMonth() ||
               selectedDate.getDate() !== overrideTime.getDate())) {
            toast({
              title: '時間操作モードが有効です',
              description: `システム日時は ${overrideTime.toLocaleDateString()} に設定されています。データ表示には影響する可能性があります。`,
              status: 'info',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      }
    };

    checkTimeOverride();
    
    const intervalId = setInterval(checkTimeOverride, 30000);
    
    return () => clearInterval(intervalId);
  }, [selectedDate, toast]);

  const TimeOverrideAlert = () => {
    if (!isTimeOverrideEnabled()) return null;
    
    const overrideTime = getOverrideTime();
    if (!overrideTime) return null;
    
    return (
      <Alert status="warning" mb={4}>
        <AlertIcon />
        <Box flex="1">
          <Text fontWeight="bold">時間操作モードが有効です</Text>
          <Text fontSize="sm">
            システム日時は {overrideTime.toLocaleString()} に設定されています。
            この日時に基づいて処理が実行されます。
          </Text>
        </Box>
        <TimeIcon boxSize="24px" color="orange.500" />
      </Alert>
    );
  };

  const usagePercentage = ((localStorageSize / localStorageMaxSize) * 100).toFixed(2);

  return (
    <Container maxW="container.xl" py={5}>
      <TimeOverrideAlert />
      <Box p={6} height="0vh">
        <Box
          position="absolute"
          top="9%"
          right="1%"
          zIndex={1000}
          bg="red.600"
          py={3}
          px={4}
          borderRadius="full"
          color="white"
          boxShadow="0 4px 8px rgba(255, 0, 0, 0.6)"
          borderWidth="2px"
          borderColor="yellow.300"
        >
          <Text fontSize="md" fontWeight="bold">
            ローカルストレージ容量: {localStorageSize} / {localStorageMaxSize} bytes ({usagePercentage}%)
          </Text>
        </Box>
        <Box
          borderWidth="5px"
          borderColor="#131113"
          borderRadius="3xl"
          px={6}
          pt={3}
          pb={1}
          mt={2}
          boxShadow="0 3px 10px rgba(0, 0, 0, 0.6)"
          color="#131113"
          bg="white"
        >
          <Heading as="h2" size="lg" color="white" bg="#131113" p={4} borderRadius="full"
            width="md" top={"0%"} transform="translate(0%, -70%)"
            textAlign="center" userSelect="none" letterSpacing="wider" boxShadow="0 3px 10px rgba(0, 0, 0, 0.4)"
          >
            保存されている出勤状況
          </Heading>
          <Box mt={-8} mb={4}>
            <pre>
              {typeof savedAttendanceStates === 'object'
                ? JSON.stringify(savedAttendanceStates, null, 2)
                : savedAttendanceStates}
            </pre>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Tab2Content;