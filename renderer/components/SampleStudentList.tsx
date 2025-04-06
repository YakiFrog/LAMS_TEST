// このコンポーネントは学生リストの表示と出退勤状況を管理します
import React, { useState, useEffect } from 'react';
import { Box, Wrap, WrapItem, Text, Badge, useToast } from '@chakra-ui/react';
import StudentModal from './StudentModal';
import { exportAttendanceToCSV } from '../utils/exportAttendance';
import { getCurrentTime, resetTime } from '../utils/timeManager';

interface Student {
  id: string;
  name: string;
  grade: '教員' | 'M2' | 'M1' | 'B4';
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
  const toast = useToast();

  useEffect(() => {
    const loadAttendanceStates = () => {
      // 出勤状況の初期化処理：ローカルストレージからデータを読み込み、日付が今日でない場合はリセットする
      const storedAttendanceStates = localStorage.getItem('attendanceStates');
      if (storedAttendanceStates) {
        const parsedAttendanceStates = JSON.parse(storedAttendanceStates);

        // 現在の日付を取得（時刻情報をリセット）
        const today = resetTime(getCurrentTime());

        let needsExport = false; // エクスポートが必要かのフラグ
        let expiredStudentIds = []; // 期限切れの学生ID

        // 1. 期限切れのデータをチェックする（削除はまだしない）
        Object.keys(parsedAttendanceStates).forEach(studentId => {
          const attendanceState = parsedAttendanceStates[studentId];
          if (attendanceState) {
            if (attendanceState.attendanceTime) {
              const attendanceDate = resetTime(new Date(attendanceState.attendanceTime));
              // 日付が違う場合は期限切れとしてマーク
              if (attendanceDate.getTime() !== today.getTime()) {
                needsExport = true;
                if (!expiredStudentIds.includes(studentId)) {
                  expiredStudentIds.push(studentId);
                }
              }
            }

            if (attendanceState.leavingTime) {
              const leavingDate = resetTime(new Date(attendanceState.leavingTime));
              // 日付が違う場合は期限切れとしてマーク
              if (leavingDate.getTime() !== today.getTime()) {
                needsExport = true;
                if (!expiredStudentIds.includes(studentId)) {
                  expiredStudentIds.push(studentId);
                }
              }
            }

            // totalStayTime が存在しない場合は初期化
            if (attendanceState.totalStayTime === undefined) {
              attendanceState.totalStayTime = 0;
            }
          }
        });

        // 日付変換処理（Date型に変換）
        Object.values(parsedAttendanceStates).forEach(state => {
          const attendanceState = state as {
            isAttending: boolean;
            attendanceTime: Date | null;
            leavingTime: Date | null;
            totalStayTime: number;
          };
          
          if (attendanceState.attendanceTime) {
            attendanceState.attendanceTime = new Date(attendanceState.attendanceTime);
          }
          if (attendanceState.leavingTime) {
            attendanceState.leavingTime = new Date(attendanceState.leavingTime);
          }
        });

        // 2. 必要に応じてエクスポート処理
        if (needsExport && expiredStudentIds.length > 0) {
          console.log('期限切れの出勤データを検出しました。エクスポートします。', expiredStudentIds);
          console.log('現在のstudentsデータ:', students.map(s => ({ id: s.id, name: s.name })));
          
          try {
            const exportPath = localStorage.getItem('exportPath');
            if (exportPath) {
              // 現在の学生データのキャッシュをローカル変数に保存
              const currentStudents = [...students];
              
              // 念のためローカルストレージからも学生データを取得してマージする
              const storedStudents = localStorage.getItem('students');
              let finalStudentsList = currentStudents;
              
              if (storedStudents) {
                try {
                  const parsedStoredStudents = JSON.parse(storedStudents) as Student[];
                  console.log('ローカルストレージから読み込んだ学生数:', parsedStoredStudents.length);
                  
                  // IDの重複を避けるためのマップを作成
                  const studentsMap: Record<string, Student> = {};
                  
                  // 現在のstudentsをマップに追加
                  currentStudents.forEach(student => {
                    studentsMap[student.id] = student;
                  });
                  
                  // ストレージからの学生をマップに追加（重複するIDは上書き）
                  parsedStoredStudents.forEach(student => {
                    if (!studentsMap[student.id]) {
                      studentsMap[student.id] = student;
                    }
                  });
                  
                  // マップから配列に戻す
                  finalStudentsList = Object.values(studentsMap);
                  console.log('マージ後の学生数:', finalStudentsList.length);
                } catch (error) {
                  console.error('ローカルストレージの学生データ解析エラー:', error);
                }
              }

              // エクスポート用のデータを作成（期限切れのデータのみ）
              const dataToExport = {};
              expiredStudentIds.forEach(id => {
                if (parsedAttendanceStates[id]) {
                  dataToExport[id] = { ...parsedAttendanceStates[id] };
                }
              });
              
              // studentsデータを直接使用してエクスポート
              exportAttendanceToCSV(dataToExport, finalStudentsList, false)
                .then(result => {
                  if (result.success) {
                    console.log('自動エクスポート成功:', result.message);
                    toast({
                      title: "自動エクスポート成功",
                      description: "日付が変わったため、前日の出勤データを自動エクスポートしました",
                      status: "success",
                      duration: 5000,
                      isClosable: true,
                    });
                    
                    // エクスポート成功後に期限切れデータを削除
                    expiredStudentIds.forEach(id => {
                      delete parsedAttendanceStates[id];
                    });
                    
                    // 更新されたデータをローカルストレージに保存
                    localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
                    
                    // UIの状態を更新
                    setAttendanceStates({ ...parsedAttendanceStates });
                  } else {
                    console.error('自動エクスポート失敗:', result.message);
                    toast({
                      title: "自動エクスポート失敗",
                      description: result.message,
                      status: "error",
                      duration: 5000,
                      isClosable: true,
                    });
                    
                    // エクスポートに失敗しても期限切れデータは削除する
                    expiredStudentIds.forEach(id => {
                      delete parsedAttendanceStates[id];
                    });
                    
                    localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
                    setAttendanceStates({ ...parsedAttendanceStates });
                  }
                })
                .catch(error => {
                  console.error('自動エクスポートエラー:', error);
                  toast({
                    title: "自動エクスポートエラー",
                    description: `${error}`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                  });
                  
                  // エラー時にも期限切れデータは削除する
                  expiredStudentIds.forEach(id => {
                    delete parsedAttendanceStates[id];
                  });
                  
                  localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
                  setAttendanceStates({ ...parsedAttendanceStates });
                });
            } else {
              console.warn('エクスポートパスが設定されていないため、自動エクスポートをスキップします');
              
              // エクスポートパスがない場合も期限切れデータは削除
              expiredStudentIds.forEach(id => {
                delete parsedAttendanceStates[id];
              });
              
              localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
              setAttendanceStates({ ...parsedAttendanceStates });
            }
          } catch (error) {
            console.error('自動エクスポート処理中にエラー:', error);
            
            // エラー時にも期限切れデータは削除
            expiredStudentIds.forEach(id => {
              delete parsedAttendanceStates[id];
            });
            
            localStorage.setItem('attendanceStates', JSON.stringify(parsedAttendanceStates));
            setAttendanceStates({ ...parsedAttendanceStates });
          }
        } else {
          // エクスポートが不要な場合は直接状態を更新
          setAttendanceStates({ ...parsedAttendanceStates });
        }
      }
    };
    
    // 初回ロード時に実行
    loadAttendanceStates();
    
    // 日付変更や時間変更の検出のためにインターバルを設定
    const intervalId = setInterval(loadAttendanceStates, 10 * 1000); // 10秒ごとに確認（デバッグ用に短縮）
    
    // クリーンアップ関数：コンポーネントがアンマウントされたときにsetIntervalをクリアする
    return () => clearInterval(intervalId);
  }, [students, toast]);

  // 22:30を超えたときに出勤中の学生を22:30時点で自動退勤に更新するuseEffect
  useEffect(() => {
    const checkLateAttendance = () => {
      const now = getCurrentTime();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 現在時刻が22:30以降かどうかチェック
      if (hours > 22 || (hours === 22 && minutes >= 30)) {
        // 22:30のDateオブジェクトを作成
        const threshold = new Date(now);
        threshold.setHours(22, 30, 0, 0);
        
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
            toast({
              title: "自動退勤処理実行",
              description: "22:30を過ぎたため、出勤中の学生を自動的に退勤状態にしました",
              status: "info",
              duration: 5000,
              isClosable: true,
            });
          }
          
          return newStates;
        });
      }
    };
    
    // 初回実行
    checkLateAttendance();
    
    // 1分ごとにチェック
    const intervalId = setInterval(checkLateAttendance, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [toast]);

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
                {attendanceStates[student.id]?.attendanceTime ? 
                  `${new Date(attendanceStates[student.id].attendanceTime!).getHours()}:${String(new Date(attendanceStates[student.id].attendanceTime!).getMinutes()).padStart(2, '0')} 出勤` : 
                  '出勤中'}
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
                {attendanceStates[student.id]?.leavingTime ? 
                  `${new Date(attendanceStates[student.id].leavingTime!).getHours()}:${String(new Date(attendanceStates[student.id].leavingTime!).getMinutes()).padStart(2, '0')} 退勤` : 
                  '退勤済'}
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
