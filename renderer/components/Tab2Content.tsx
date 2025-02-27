import React, { useState, useEffect } from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';

const Tab2Content: React.FC = () => {
  const [savedAttendanceStates, setSavedAttendanceStates] = useState<any>(null);
  const [localStorageSize, setLocalStorageSize] = useState<number>(0);
  const [localStorageMaxSize, setLocalStorageMaxSize] = useState<number>(5 * 1024 * 1024); // 5MB

  // ヘルパー関数：日付の時刻部分をリセット
  const resetTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate; // これで月日のみの情報
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

  useEffect(() => {
    // attendanceStatesの初期化処理
    const storedAttendanceStates = localStorage.getItem('attendanceStates');
    if (storedAttendanceStates) {
      const parsedAttendanceStates = JSON.parse(storedAttendanceStates);
      const today = resetTime(getJapanTime());

      Object.keys(parsedAttendanceStates).forEach(studentId => {
        const attendanceState = parsedAttendanceStates[studentId];
        if (attendanceState) {
          // 出勤日時
          if (attendanceState.attendanceTime) {
            const attendanceDate = resetTime(new Date(attendanceState.attendanceTime));
            // 出勤日時が今日でなければ削除
            if (attendanceDate.getTime() !== today.getTime()) {
              delete parsedAttendanceStates[studentId];
              return;
            }
            attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
          }
          // 退勤日時
          if (attendanceState.leavingTime) {
            const leavingDate = resetTime(new Date(attendanceState.leavingTime));
            // 退勤日時が今日でなければ削除
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

    setLocalStorageSize(calculateLocalStorageSize()); // ローカルストレージ容量を更新
  }, []);

  const usagePercentage = ((localStorageSize / localStorageMaxSize) * 100).toFixed(2);

  return (
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
  );
};

export default Tab2Content;