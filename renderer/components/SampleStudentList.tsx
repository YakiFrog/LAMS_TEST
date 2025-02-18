// このコンポーネントは学生リストの表示と出退勤状況を管理します
import React, { useState, useEffect } from 'react';
import { Box, Wrap, WrapItem, Text, Badge } from '@chakra-ui/react';
import StudentModal from './StudentModal';

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
}

const SampleStudentList: React.FC<Props> = ({ students }) => {
  // モーダル表示状態と選択された学生の状態管理
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceStates, setAttendanceStates] = useState<{
    [studentId: string]: {
      isAttending: boolean;
      attendanceTime: Date | null;
      leavingTime: Date | null;
    };
  }>({});

  useEffect(() => {
    const loadAttendanceStates = () => {
      // 出勤状況の初期化処理：ローカルストレージからデータを読み込み、日付が今日でない場合はリセットする
      const storedAttendanceStates = localStorage.getItem('attendanceStates');
      console.log("attendanceStates", storedAttendanceStates);
      if (storedAttendanceStates) {
        const parsedAttendanceStates = JSON.parse(storedAttendanceStates);

        // 今日の日付を取得（時刻情報をリセット）
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 各学生の出退勤情報を検証し、今日の日付と一致しない場合はデータを削除する
        Object.keys(parsedAttendanceStates).forEach(studentId => {
          const attendanceState = parsedAttendanceStates[studentId];
          if (attendanceState) {
            if (attendanceState.attendanceTime) {
              const attendanceDate = new Date(attendanceState.attendanceTime);
              attendanceDate.setHours(0, 0, 0, 0);
              // 出勤日時が今日でなければ削除
              if (attendanceDate.getTime() !== today.getTime()) {
                delete parsedAttendanceStates[studentId];
                return;
              }
              attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
            }

            if (attendanceState.leavingTime) {
              const leavingDate = new Date(attendanceState.leavingTime);
              leavingDate.setHours(0, 0, 0, 0);
              // 退勤日時が今日でなければ削除
              if (leavingDate.getTime() !== today.getTime()) {
                delete parsedAttendanceStates[studentId];
                return;
              }
              attendanceState.leavingTime = new Date(attendanceState.leavingTime);
            }
          }
        });

        setAttendanceStates(parsedAttendanceStates);
      }
    };
    // 初回ロード時に実行
    loadAttendanceStates();
    // 5分ごとに実行
    const intervalId = setInterval(loadAttendanceStates, 5 * 60 * 1000);
    // クリーンアップ関数：コンポーネントがアンマウントされたときにsetIntervalをクリアする
    return () => clearInterval(intervalId);
  }, []);

  const onClose = () => {
    // モーダルを閉じる処理
    setIsOpen(false);
  };

  // 学生がクリックされた場合、選択状態を更新しモーダルを表示する
  const onOpen = (student: Student) => {
    setSelectedStudent(student);
    setIsOpen(true);
  };

  return (
    <>
      <Wrap spacing={2} mt={2}>
        {students.map(student => (
          <WrapItem key={student.id}>
            <Box
              borderWidth="2px"
              borderRadius="xl"
              py={3}
              px={6}
              mb={0}
              cursor="pointer"
              onClick={() => onOpen(student)}
              position="relative"
              // 出退勤状態に応じた枠線の色を設定：出勤中は緑、退勤済は赤、その他はグレー
              borderColor={
                attendanceStates[student.id]?.isAttending
                  ? "green.400"
                  : attendanceStates[student.id]?.leavingTime
                  ? "red.400"
                  : "gray.200"
              }
            >
              <Text fontSize="2xl" color="gray.700" fontWeight="light">
                {student.name}
              </Text>
              {/* 出勤中の場合のバッジ表示 */}
              {attendanceStates[student.id]?.isAttending && (
                <Badge
                  colorScheme="green"
                  position="absolute"
                  bottom="-2"
                  right="-2"
                  fontSize="md"
                  zIndex={2}
                  borderRadius="full"
                  px={2}
                >
                  出勤中
                </Badge>
              )}
              {/* 退勤済の場合のバッジ表示（出勤中ではない場合） */}
              {attendanceStates[student.id]?.leavingTime && !attendanceStates[student.id]?.isAttending && (
                <Badge
                  colorScheme="red"
                  position="absolute"
                  bottom="-2"
                  right="-2"
                  fontSize="md"
                  zIndex={2}
                  borderRadius="full"
                  px={2}
                >
                  退勤済
                </Badge>
              )}
            </Box>
          </WrapItem>
        ))}
      </Wrap>

      <StudentModal 
        isOpen={isOpen} 
        onClose={onClose} 
        student={selectedStudent} 
        attendanceStates={attendanceStates}
        setAttendanceStates={setAttendanceStates}
      />
    </>
  );
};

export default SampleStudentList;
