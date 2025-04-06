// このコンポーネントは学生の出退勤管理用モーダルです。
// Propsには、モーダルの表示状態、学生情報、出退勤情報などが含まれます。
import React, { useEffect, useState } from 'react';
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
} from '@chakra-ui/react';
import { keyframes, Global } from '@emotion/react';
import { getCurrentTime, getJapanTime } from '../utils/timeManager';
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
  
  const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
  
  // パルスアニメーションを定義
  const pulseAnimation = `${pulseKeyframes} 2s infinite`;
  
  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchCurrentMonthAttendance(studentId);
        setAttendanceDays(result.attendanceDays);
        setCurrentDayIndex(result.currentDayIndex);
        
        // 直近の出勤曜日の日付を計算
        calculateRecentWeekdayDates();
      } catch (err) {
        console.error('出勤データ読み込みエラー:', err);
        setError('出勤データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    // 直近の曜日ごとの日付を計算する関数
    const calculateRecentWeekdayDates = () => {
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
    };
    
    if (studentId) {
      loadAttendanceData();
    }
  }, [studentId]);
  
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
      <Text fontSize="md" fontWeight="bold" mb={1}>
        直近の出勤曜日
      </Text>
      <HStack spacing={3} justify="center">
        {weekdays.map((day, index) => {
          const isAttendance = attendanceDays.includes(index);
          const isToday = index === currentDayIndex;
          
          // 直近の日付を取得
          const recentDate = recentWeekdayDates[index] || '日付なし';
          
          // ツールチップのラベルを作成
          const tooltipLabel = `${recentDate}：${isAttendance ? '出勤あり' : '出勤なし'}${isToday ? ' (今日)' : ''}`;
          
          return (
            <Tooltip
              key={index}
              label={tooltipLabel}
              placement="top"
              hasArrow
            >
              <Circle
                size="40px"
                bg={isAttendance ? "red.500" : "gray.300"}
                color="white"
                fontWeight="bold"
                cursor="pointer"
                _hover={{ transform: 'scale(1.1)', transition: 'transform 0.2s' }}
                transition="all 0.3s"
                boxShadow={isToday ? "0 0 0 3px teal.400" : "none"}
                borderWidth={isToday ? "4px" : "0"}
                borderColor="teal.400"
                position="relative"
                _after={isToday ? {
                  content: '""',
                  position: 'absolute',
                  top: '-4px',
                  left: '-4px',
                  right: '-4px',
                  bottom: '-4px',
                  borderRadius: 'full',
                  borderWidth: '3px',
                  borderColor: 'teal.400',
                  animation: pulseAnimation
                } : {}}
              >
                {day}
              </Circle>
            </Tooltip>
          );
        })}
      </HStack>
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
}

const StudentModal: React.FC<Props> = ({ isOpen, onClose, student, attendanceStates, setAttendanceStates }) => {
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
      // 時間と分で表示（秒→時間換算）
      setTotalStayTimeStr(
        totalStayTime
          ? `${Math.floor(totalStayTime / 3600)}時間 ${Math.floor((totalStayTime % 3600) / 60)}分`
          : null
      );
    }
  }, [student, attendanceStates]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay/>
      <ModalContent width="50%" height="50%" borderRadius="3xl">
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
              
              {/* 以下は将来の実装のためのプレースホルダー */}
              <Box as="p" fontSize="sm" color="gray.500" mt={2}>
                週あたりの出勤日数・滞在時間を表示
              </Box>
              <Box as="p" fontSize="sm" color="gray.500">
                月あたりの出勤日数・滞在時間を表示
              </Box>
              <Box as="p" fontSize="sm" color="gray.500">
                年あたりの出勤日数・滞在時間を表示
              </Box>
            </VStack>
          ) : (
            <Text>No student selected.</Text>
          )}
        </ModalBody>
        <Text fontSize={"xl"} fontWeight={"bold"} textAlign={"center"} mt={2}>
          滞在時間: <Text as="span" fontSize="3xl">{totalStayTimeStr ? totalStayTimeStr : "未登録"}</Text>
        </Text>
        <ModalFooter>
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