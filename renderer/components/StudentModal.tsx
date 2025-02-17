import React from 'react';
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
}
import { useState, useEffect } from 'react';

const StudentModal: React.FC<Props> = ({ isOpen, onClose, student }) => {
  // 学生ごとの出勤状況を管理するstate
  const [attendanceStates, setAttendanceStates] = useState<{
    [studentId: string]: {
      isAttending: boolean;    // 出勤中かどうか
      attendanceTime: Date | null; // 出勤時間
      leavingTime: Date | null;    // 退勤時間
    };
  }>({});

  useEffect(() => {
    // ローカルストレージから出勤状況を読み込む
    const storedAttendanceStates = localStorage.getItem('attendanceStates');
    if (storedAttendanceStates) {
      const parsedAttendanceStates = JSON.parse(storedAttendanceStates);
      // attendanceTime と leavingTime を Date オブジェクトに変換
      Object.keys(parsedAttendanceStates).forEach(studentId => {
        const attendanceTime = parsedAttendanceStates[studentId].attendanceTime;
        const leavingTime = parsedAttendanceStates[studentId].leavingTime;
        if (attendanceTime) {
          parsedAttendanceStates[studentId].attendanceTime = new Date(attendanceTime);
        }
        if (leavingTime) {
          parsedAttendanceStates[studentId].leavingTime = new Date(leavingTime);
        }
      });
      setAttendanceStates(parsedAttendanceStates);
    }
  }, []);

  // 出勤・退勤ボタンが押された際の処理
  const handleAttendance = () => {
    // student が存在しない場合は処理を中断
    if (!student) return;

    const now = new Date();          // 現在時刻を取得
    const studentId = student.id;  // 現在の学生のID

    // attendanceStates を更新
    setAttendanceStates((prevStates) => {
      // 既存の studentState を取得。存在しない場合は初期値を設定
      const studentState = prevStates[studentId] || {
        isAttending: false,
        attendanceTime: null,
        leavingTime: null,
      };
      let updatedState;
      if (!studentState.isAttending) {
        // 出勤時
        updatedState = {
          ...studentState,
          isAttending: true,       // 出勤中に設定
          attendanceTime: now,      // 出勤時間を現在時刻に設定
          leavingTime: null,        // 退勤時間をクリア
        };
        console.log(`Student ${studentId} 出勤:`, now);
      } else {
        // 退勤時
        updatedState = {
          ...studentState,
          isAttending: false,      // 出勤中でない状態に設定
          leavingTime: now,         // 退勤時間を現在時刻に設定
        };
        console.log(`Student ${studentId} 退勤:`, now);
      }
      // 新しい state を返す
      const newState = {
        ...prevStates,
        [studentId]: updatedState,  // studentId に対応する state を更新
      };

      // ローカルストレージに保存
      localStorage.setItem('attendanceStates', JSON.stringify(newState));
      return newState;
    });
  };

  // 学生の出勤状況を取得する関数
  const getAttendanceState = (studentId: string | undefined | null) => {
    // studentId が存在しない場合は初期値を返す
    if (!studentId) {
      return { isAttending: false, attendanceTime: null, leavingTime: null };
    }
    // studentId に対応する attendanceState を返す。存在しない場合は初期値を返す
    return attendanceStates[studentId] || {
      isAttending: false,
      attendanceTime: null,
      leavingTime: null,
    };
  };

  const [attendanceTimeStr, setAttendanceTimeStr] = useState<string | null>(null);
  const [leavingTimeStr, setLeavingTimeStr] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      const attendanceTime = getAttendanceState(student.id).attendanceTime;
      const leavingTime = getAttendanceState(student.id).leavingTime;

      setAttendanceTimeStr(attendanceTime ? attendanceTime.toLocaleTimeString() : null);
      setLeavingTimeStr(leavingTime ? leavingTime.toLocaleTimeString() : null);
    }
  }, [student, attendanceStates]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent width="50%" height="50%" borderRadius="2xl">
        <ModalHeader fontSize={"xl"} left={6} top={4} fontWeight={"bold"} justifyContent="center" display="flex"
        >{student ? student.name : "学生情報"}</ModalHeader>
        <ModalCloseButton size="lg" right={6} top={4} border={"1px solid red"} borderRadius="xl" bg="red.500" _hover={{ bg: "red.600" }} color="white"/>

        {/* 出勤時間，退勤時間を表示 */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', 
          }}>
            <Text fontSize={"xl"} fontWeight={"bold"} mt={2}>
            {/* 出勤時間: student が存在し、かつ対応する attendanceState の attendanceTime が存在する場合、時刻を表示 */}
            出勤: <Text as="span" fontSize="3xl">{attendanceTimeStr ? attendanceTimeStr : "未登録"}</Text>
            </Text>
            <Text fontSize={"xl"} fontWeight={"bold"} mt={2} ml={6}>
            {/* 退勤時間: student が存在し、かつ対応する attendanceState の leavingTime が存在する場合、時刻を表示 */}
            退勤: <Text as="span" fontSize="3xl">{leavingTimeStr ? leavingTimeStr : "未登録"}</Text>
            </Text>
        </div>

        <ModalBody border="1px solid #ccc" borderRadius="2xl" p={4} ml={6} mr={6} mt={4}>
          {student ? (
            <>
              <Text>Name: {student.name}</Text>
              <Text>ID: {student.id}</Text>
            </>
          ) : (
            <Text>No student selected.</Text>
          )}
        </ModalBody>

        <ModalFooter>
            <Button
            colorScheme={student && getAttendanceState(student.id).isAttending ? "red" : "blue"}
            onClick={handleAttendance}
            borderRadius="2xl"
            width="100%"
            height="7vh"
            fontSize={"2xl"}
            fontWeight="black"
            >
            {/* ボタンの表示: student が存在し、かつ対応する attendanceState が出勤中の場合、"退勤" を表示。それ以外の場合は "出勤" を表示 */}
            {student && getAttendanceState(student.id).isAttending ? "退勤" : "出勤"}
            </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StudentModal;