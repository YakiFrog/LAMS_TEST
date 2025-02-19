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
      totalStayTime: number; // 追加: 累積滞在時間
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

        let updated = false; // 更新フラグ

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
                updated = true;
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
                updated = true;
                return;
              }
              attendanceState.leavingTime = new Date(attendanceState.leavingTime);
            }
            // totalStayTime が存在しない場合は初期化
            if (attendanceState.totalStayTime === undefined) {
              attendanceState.totalStayTime = 0;
            }
          }
        });

        setAttendanceStates(parsedAttendanceStates);
      }
    };
    // 初回ロード時に実行
    loadAttendanceStates();
    const intervalId = setInterval(loadAttendanceStates, 30 * 60 * 1000); // 30分ごとに実行
    // クリーンアップ関数：コンポーネントがアンマウントされたときにsetIntervalをクリアする
    return () => clearInterval(intervalId);
  }, []);

  // 22:30を超えたときに出勤中の学生を22:30時点で自動退勤に更新するuseEffect
  useEffect(() => {
    const checkLateAttendance = () => {
      const now = new Date();
      const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 30, 0);
      if (now >= threshold) {
        setAttendanceStates(prevStates => {
          const newStates = { ...prevStates };
          let updated = false; // 更新フラグ
          Object.keys(newStates).forEach(studentId => {
            const state = newStates[studentId];
            if (state && state.isAttending) {
              const attendanceTime = state.attendanceTime;
              if (attendanceTime) { // 出勤時刻が存在する場合、滞在時間を計算
                const duration = Math.floor((threshold.getTime() - new Date(attendanceTime).getTime()) / 1000);
                state.totalStayTime += duration;
              }
              state.isAttending = false;
              state.leavingTime = threshold; // 22:30時点を退勤時刻とする
              updated = true;
            }
          });
          if (updated) { // 更新があった場合のみローカルストレージに保存
            localStorage.setItem('attendanceStates', JSON.stringify(newStates));
            window.location.reload(); // ページリロード
          }
          return newStates;
        });
      }
    };
    const intervalId = setInterval(checkLateAttendance, 10 * 60 * 1000); // 10分ごとに実行
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
              borderWidth={
              attendanceStates[student.id]?.isAttending
                ? "3px"
                : attendanceStates[student.id]?.leavingTime
                ? "3px"
                : "2px"
              }
              borderRadius="3xl"
              py={3}
              px={6}
              mr={0.5}
              minW="120px" // 最小幅を設定
              minH="60px" // 最小高さを設定
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
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="white"
              // ドロップシャドウを設定
              boxShadow={
              attendanceStates[student.id]?.isAttending
                ? "0 2px 4px rgb(0, 255, 0)"
                : attendanceStates[student.id]?.leavingTime
                ? "0 2px 4px rgb(255, 0, 0)"
                : "0 2px 2px rgba(0, 0, 0, 0.3)"
              }
            >
              <Text fontSize="2xl" color="#131113" fontWeight="medium" noOfLines={1}>
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
                boxShadow={"0px 0px 3px rgb(109, 109, 109)"}
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
                boxShadow={"0px 0px 3px rgb(109, 109, 109)"}
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
