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
} from '@chakra-ui/react';

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

const getJapanTime = (): Date => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
};

const StudentModal: React.FC<Props> = ({ isOpen, onClose, student, attendanceStates, setAttendanceStates }) => {
  // --- ボタンがクリックされた際の挙動 ---  
  // 学生情報が存在する場合、現在の出退勤状況に応じて出勤/退勤を切り替え、ローカルストレージに状態を保存します。
  const handleAttendance = () => {
    // 学生情報が無ければ処理を中断
    if (!student) return;

    let now = getJapanTime();          // 現在時刻をJSTで取得
    const studentId = student.id;      // 対象学生のIDを取得

    // テストで日にちを-1日する
    // now = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

      // 更新された状態をローカルストレージに保存
      localStorage.setItem('attendanceStates', JSON.stringify(newState));
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
      <ModalOverlay />
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
            <>
            <p>今週何曜日にきたかを視覚的に表示</p>
            <p>週あたりの出勤日数・滞在時間を表示</p>
            <p>月あたりの出勤日数・滞在時間を表示</p>
            <p>年あたりの出勤日数・滞在時間を表示</p>
            </>
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
            fontSize={"3xl"}
            fontWeight="black"
            letterSpacing="wider"
          >
            {student && getAttendanceState(student.id).isAttending ? "退勤" : "出勤"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StudentModal;